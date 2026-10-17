import React, { useState } from 'react';
import {
  Sparkles,
  BookOpen,
  HelpCircle,
  MessageSquare,
  Play,
  Share2,
  Copy,
  Check,
  Edit3,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  PlusCircle,
  CheckCircle2,
  Sliders,
  ChevronRight,
  Clock,
  ArrowRight
} from 'lucide-react';
import { PesutMahakamMascot } from './PesutMahakamMascot.js';
import { Quiz, Question } from '../types/quiz.js';
import { generateQuizCode } from '../utils/quizLogic.js';

interface Props {
  onSaveQuiz: (quiz: Quiz) => void;
  onPlayQuiz: (quiz: Quiz) => void;
  onShareQuiz: (quiz: Quiz) => void;
  onOpenFileUpload?: () => void;
  existingCodes: string[];
}

export const AiQuizWorkspace: React.FC<Props> = ({
  onSaveQuiz,
  onPlayQuiz,
  onShareQuiz,
  onOpenFileUpload,
  existingCodes
}) => {
  const [activeTool, setActiveTool] = useState<'pembuat-kuis' | 'kuis-seru' | 'asisten' | 'tanya-jawab'>('pembuat-kuis');
  const [promptText, setPromptText] = useState('Bikin kuis tentang sejarah kepahlawanan Awang Long dan pesut di Sungai Mahakam');
  const [showAdjustDrawer, setShowAdjustDrawer] = useState(false);
  const [questionCount, setQuestionCount] = useState(5);
  const [countInput, setCountInput] = useState('5');

  const handleCountInputChange = (val: string) => {
    setCountInput(val);
    const num = parseInt(val, 10);
    if (!isNaN(num) && num > 0) {
      setQuestionCount(Math.min(Math.max(num, 1), 50));
    }
  };

  const handleCountPreset = (preset: number) => {
    setQuestionCount(preset);
    setCountInput(preset.toString());
  };

  const handleCountStep = (delta: number) => {
    const next = Math.min(Math.max((questionCount || 1) + delta, 1), 50);
    setQuestionCount(next);
    setCountInput(next.toString());
  };
  const [gradeLevel, setGradeLevel] = useState('SMP');
  const [difficulty, setDifficulty] = useState('Sedang');
  const [durationMinutes, setDurationMinutes] = useState(10);

  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [generatedQuiz, setGeneratedQuiz] = useState<Quiz | null>(null);
  const [feedbackGiven, setFeedbackGiven] = useState<'up' | 'down' | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const quickPresets = [
    { label: '🐬 Sejarah Awang Long & Mahakam', text: 'Bikin kuis tentang sejarah kepahlawanan Awang Long dan pesut di Sungai Mahakam' },
    { label: '🌿 Ekosistem Tropis & IPA', text: 'Kuis IPA tentang rantai makanan, fotosintesis, dan pelestarian satwa langka Kalimantan' },
    { label: '📐 Matematika Logika Seru', text: 'Kuis matematika logika, pecahan, dan bangun datar kontekstual' },
    { label: '📜 Bahasa & Sastra Nusantara', text: 'Kuis Bahasa Indonesia seputar majas, puisi daerah, dan ejaan baku' }
  ];

  const handleGenerate = async () => {
    if (!promptText.trim()) return;

    setIsLoading(true);
    setStatusMessage('Memulai pemrosesan kuis AI...');
    setGeneratedQuiz(null);
    setFeedbackGiven(null);
    setSavedSuccess(false);

    try {
      // Connect to SSE streaming endpoint on our server.ts
      const queryParams = new URLSearchParams({
        topic: promptText,
        gradeLevel,
        count: questionCount.toString(),
        difficulty
      });

      const eventSource = new EventSource(`/api/generate-quiz-stream?${queryParams.toString()}`);

      eventSource.addEventListener('status', (e) => {
        try {
          const data = JSON.parse(e.data);
          setStatusMessage(data.message || 'Sedang memproses...');
        } catch {
          // ignore
        }
      });

      eventSource.addEventListener('complete', (e) => {
        try {
          const data = JSON.parse(e.data);
          const newCode = generateQuizCode(existingCodes);
          const quiz: Quiz = {
            id: `quiz-${Date.now()}`,
            code: newCode,
            title: data.title || `Kuis ${promptText}`,
            description: data.description || `Kuis hasil kecerdasan buatan Google AI Studio untuk materi ${promptText}.`,
            subject: data.subject || promptText,
            gradeLevel,
            durationMinutes,
            passingGrade: 70,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: 'Guru Pembuat (AI Assisted)',
            isActive: true,
            categories: [data.subject || promptText, 'Kuis AI'],
            questions: (data.questions || []).map((q: any, idx: number) => ({
              id: q.id || `q-${idx + 1}`,
              type: q.type || 'multiple_choice',
              category: q.category || data.subject || promptText,
              points: q.points || 20,
              text: q.text,
              options: q.options,
              correctOption: q.correctOption,
              acceptedAnswers: q.acceptedAnswers,
              matchingPairs: q.matchingPairs,
              explanation: q.explanation
            }))
          };

          setGeneratedQuiz(quiz);
          setStatusMessage('Kuis selesai dibuat dengan sempurna!');
          setIsLoading(false);
          eventSource.close();
        } catch (err) {
          console.error('Failed to parse SSE complete:', err);
          setIsLoading(false);
          eventSource.close();
        }
      });

      eventSource.onerror = async (err) => {
        console.warn('EventSource error, falling back to POST:', err);
        eventSource.close();

        // Fallback to direct POST route
        try {
          const res = await fetch('/api/generate-quiz', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              topic: promptText,
              gradeLevel,
              count: questionCount,
              difficulty
            })
          });
          const data = await res.json();
          const newCode = generateQuizCode(existingCodes);
          const quiz: Quiz = {
            id: `quiz-${Date.now()}`,
            code: newCode,
            title: data.title || `Kuis ${promptText}`,
            description: data.description || `Kuis online materi ${promptText}.`,
            subject: data.subject || promptText,
            gradeLevel,
            durationMinutes,
            passingGrade: 70,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: 'Guru Pembuat (AI Assisted)',
            isActive: true,
            categories: [data.subject || promptText, 'Kuis AI'],
            questions: (data.questions || []).map((q: any, idx: number) => ({
              id: q.id || `q-${idx + 1}`,
              type: q.type || 'multiple_choice',
              category: q.category || data.subject || promptText,
              points: q.points || 20,
              text: q.text,
              options: q.options,
              correctOption: q.correctOption,
              acceptedAnswers: q.acceptedAnswers,
              matchingPairs: q.matchingPairs,
              explanation: q.explanation
            }))
          };
          setGeneratedQuiz(quiz);
          setStatusMessage('Kuis berhasil dibuat!');
        } catch (fallbackErr) {
          console.error('Fallback error:', fallbackErr);
          setStatusMessage('Gagal membuat kuis. Silakan coba kembali.');
        } finally {
          setIsLoading(false);
        }
      };
    } catch (e) {
      console.error(e);
      setIsLoading(false);
      setStatusMessage('Terjadi kesalahan.');
    }
  };

  const handleSaveToQuizzes = () => {
    if (!generatedQuiz) return;
    onSaveQuiz(generatedQuiz);
    setSavedSuccess(true);
  };

  const handleCopyCode = () => {
    if (!generatedQuiz) return;
    navigator.clipboard.writeText(generatedQuiz.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      
      {/* Visual Workspace Hero Banner */}
      <div className="bg-gradient-to-r from-teal-500/10 via-cyan-500/10 to-emerald-500/10 rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-7 border border-teal-200/50 shadow-xs relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-6">
          <div className="space-y-2 max-w-xl text-center md:text-left">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/80 border border-teal-200 text-teal-800 text-[11px] sm:text-xs font-semibold shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-teal-600" />
              <span>Wayground-style AI Learning Studio</span>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight leading-tight">
              Tugas Online & Kuis Interaktif Awang Long
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Bantu guru merancang soal kuis seru secara instan, otomatis memberikan penjelasan edukatif, dan bagikan kode PIN langsung kepada siswa di kelas.
            </p>
          </div>

          <div className="flex items-center gap-3 sm:gap-4 bg-white/90 backdrop-blur-sm p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-teal-100 shadow-sm w-full md:w-auto justify-center md:justify-start shrink-0">
            <PesutMahakamMascot className="w-16 h-16 sm:w-20 sm:h-20" isProcessing={isLoading} />
            <div className="text-xs space-y-1">
              <span className="font-bold text-slate-800 block">Pesut Mahakam AI</span>
              <span className="text-slate-500 block">Sahabat Belajar Kutai</span>
              <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold text-[10px]">
                ● Mesin AI Aktif
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tool Selector Buttons */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Pilih Alat AI:
          </label>
          <span className="text-xs text-slate-500">Pilih mode kreasi edukasi</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 sm:gap-3">
          <button
            type="button"
            onClick={() => setActiveTool('pembuat-kuis')}
            className={`p-3 sm:p-3.5 rounded-xl sm:rounded-2xl text-left border transition-all flex flex-col items-center sm:items-start gap-1.5 sm:gap-2 shadow-xs ${
              activeTool === 'pembuat-kuis'
                ? 'bg-gradient-to-br from-teal-50 to-emerald-50 border-teal-400 ring-2 ring-teal-300/40 text-teal-900'
                : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
            }`}
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-teal-100/80 text-teal-700 flex items-center justify-center font-bold text-base sm:text-lg">
              📝
            </div>
            <div>
              <span className="block font-bold text-xs sm:text-sm">Pembuat Kuis</span>
              <span className="block text-[10px] sm:text-[11px] text-slate-500">Prompt & Topik</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              if (onOpenFileUpload) onOpenFileUpload();
            }}
            className="p-3.5 rounded-2xl text-left border transition-all flex flex-col items-center sm:items-start gap-2 shadow-xs bg-gradient-to-br from-cyan-50 to-emerald-50 hover:from-cyan-100 hover:to-emerald-100 border-teal-300 text-teal-900 cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-teal-200/80 text-teal-800 flex items-center justify-center font-bold text-lg shadow-xs">
              📄
            </div>
            <div>
              <span className="block font-bold text-sm">Upload File</span>
              <span className="block text-[11px] text-slate-500">Ekstrak PDF/Foto</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTool('kuis-seru');
              setPromptText('Tantangan kuis cepat Awang Long dan budaya Kalimantan Timur');
            }}
            className={`p-3.5 rounded-2xl text-left border transition-all flex flex-col items-center sm:items-start gap-2 shadow-xs ${
              activeTool === 'kuis-seru'
                ? 'bg-gradient-to-br from-cyan-50 to-sky-50 border-cyan-400 ring-2 ring-cyan-300/40 text-cyan-900'
                : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-cyan-100/80 text-cyan-700 flex items-center justify-center font-bold text-lg">
              🤔
            </div>
            <div>
              <span className="block font-bold text-sm">Kuis Seru</span>
              <span className="block text-[11px] text-slate-500">Tantangan Cepat</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTool('asisten');
              setPromptText('Rangkuman materi sejarah Awang Long dan konsep kedaulatan Nusantara');
            }}
            className={`p-3.5 rounded-2xl text-left border transition-all flex flex-col items-center sm:items-start gap-2 shadow-xs ${
              activeTool === 'asisten'
                ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-400 ring-2 ring-amber-300/40 text-amber-900'
                : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-amber-100/80 text-amber-700 flex items-center justify-center font-bold text-lg">
              🧑‍🏫
            </div>
            <div>
              <span className="block font-bold text-sm">Asisten Belajar</span>
              <span className="block text-[11px] text-slate-500">Bimbingan Materi</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTool('tanya-jawab');
              setPromptText('Apa peran penting benteng Tenggarong dalam pertempuran tahun 1844?');
            }}
            className={`p-3.5 rounded-2xl text-left border transition-all flex flex-col items-center sm:items-start gap-2 shadow-xs ${
              activeTool === 'tanya-jawab'
                ? 'bg-gradient-to-br from-pink-50 to-rose-50 border-pink-400 ring-2 ring-pink-300/40 text-pink-900'
                : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-rose-100/80 text-rose-700 flex items-center justify-center font-bold text-lg">
              ❓
            </div>
            <div>
              <span className="block font-bold text-sm">Tanya Jawab</span>
              <span className="block text-[11px] text-slate-500">Eksplorasi Soal</span>
            </div>
          </button>
        </div>
      </div>

      {/* Main Workspace 2-Column Split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 items-start">
        
        {/* Left Column: Input Panel */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200/90 shadow-sm space-y-4 sm:space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
              <span>Masukkan Imajinasimu!</span>
            </h2>
            <span className="text-xs text-slate-400 font-mono">Google AI Studio</span>
          </div>

          <div className="space-y-1.5 sm:space-y-2">
            <label htmlFor="prompt-input" className="text-xs font-semibold text-slate-600 block">
              Materi / Topik Kuis yang Ingin Dibuat:
            </label>
            <div className="relative">
              <textarea
                id="prompt-input"
                rows={4}
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                placeholder="Ketik topik kuis atau tempel rangkuman materi pelajaran..."
                className="w-full p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-300 focus:border-teal-500 focus:ring-3 focus:ring-teal-200/50 outline-none text-xs sm:text-sm text-slate-800 transition-all resize-none shadow-xs"
              />
            </div>
          </div>

          {/* Preset Chips */}
          <div className="space-y-2">
            <span className="text-xs font-medium text-slate-500 block">Contoh Topik Cepat:</span>
            <div className="flex flex-wrap gap-1.5">
              {quickPresets.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setPromptText(preset.text)}
                  className="text-xs px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-teal-50 hover:text-teal-800 text-slate-600 border border-slate-200 transition-all"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Toggle for Adjust Parameters */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  role="switch"
                  aria-checked={showAdjustDrawer}
                  onClick={() => setShowAdjustDrawer(!showAdjustDrawer)}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                    showAdjustDrawer ? 'bg-teal-500' : 'bg-slate-300'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      showAdjustDrawer ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
                <label
                  onClick={() => setShowAdjustDrawer(!showAdjustDrawer)}
                  className="text-xs font-semibold text-slate-700 cursor-pointer"
                >
                  Sesuaikan Kreativitas & Parameter Soal
                </label>
              </div>

              <span className="text-xs text-slate-400">
                {questionCount} Soal • {gradeLevel}
              </span>
            </div>

            {/* Expandable Settings */}
            {showAdjustDrawer && (
              <div className="mt-4 p-4 rounded-2xl bg-slate-50/90 border border-slate-200 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Kebebasan Menentukan Jumlah Soal dengan Ketik Langsung */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label htmlFor="custom-question-count-input" className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                        <span>Jumlah Soal:</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-teal-100 text-teal-800">
                          Bebas Ketik Langsung
                        </span>
                      </label>
                      <span className="text-[11px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                        {questionCount} Soal
                      </span>
                    </div>

                    {/* Stepper + Direct Typing Input */}
                    <div className="flex items-center gap-2">
                      <div className="flex items-center border border-teal-300 focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-200 rounded-xl bg-white overflow-hidden shadow-xs flex-1">
                        <button
                          type="button"
                          onClick={() => handleCountStep(-1)}
                          disabled={questionCount <= 1}
                          className="px-3 py-2 text-slate-500 hover:text-teal-700 hover:bg-teal-50 active:bg-teal-100 disabled:opacity-40 font-bold text-sm transition-colors cursor-pointer border-r border-slate-200"
                          title="Kurangi 1 soal"
                        >
                          -
                        </button>
                        <input
                          id="custom-question-count-input"
                          type="number"
                          min={1}
                          max={50}
                          value={countInput}
                          onChange={(e) => handleCountInputChange(e.target.value)}
                          onBlur={() => {
                            if (!countInput || isNaN(Number(countInput)) || Number(countInput) < 1) {
                              setCountInput('5');
                              setQuestionCount(5);
                            } else {
                              const clamped = Math.min(Math.max(Number(countInput), 1), 50);
                              setCountInput(clamped.toString());
                              setQuestionCount(clamped);
                            }
                          }}
                          placeholder="Ketik jumlah soal..."
                          className="w-full text-center py-2 px-2 text-sm font-bold text-slate-800 outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleCountStep(1)}
                          disabled={questionCount >= 50}
                          className="px-3 py-2 text-slate-500 hover:text-teal-700 hover:bg-teal-50 active:bg-teal-100 disabled:opacity-40 font-bold text-sm transition-colors cursor-pointer border-l border-slate-200"
                          title="Tambah 1 soal"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Quick Preset Buttons */}
                    <div className="flex items-center flex-wrap gap-1.5 pt-1">
                      <span className="text-[10px] text-slate-400 font-medium">Pilihan Cepat:</span>
                      {[3, 5, 8, 10, 15, 20, 25, 30].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => handleCountPreset(preset)}
                          className={`text-[11px] px-2 py-0.5 rounded-lg border font-semibold transition-all cursor-pointer ${
                            questionCount === preset
                              ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                              : 'bg-white text-slate-600 border-slate-200 hover:border-teal-300 hover:text-teal-700'
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-400">
                      💡 Ketik bebas angka berapa pun (1 - 50 soal) sesuai target pembelajaran.
                    </p>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">
                      Jenjang Sekolah:
                    </label>
                    <select
                      value={gradeLevel}
                      onChange={(e) => setGradeLevel(e.target.value)}
                      className="w-full text-xs p-2 rounded-xl border border-slate-300 bg-white"
                    >
                      <option value="SD">SD / Madrasah Ibtidaiyah</option>
                      <option value="SMP">SMP / MTs</option>
                      <option value="SMA">SMA / SMK / MA</option>
                      <option value="Umum">Umum / Komunitas</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">
                      Tingkat Kesulitan:
                    </label>
                    <select
                      value={difficulty}
                      onChange={(e) => setDifficulty(e.target.value)}
                      className="w-full text-xs p-2 rounded-xl border border-slate-300 bg-white"
                    >
                      <option value="Mudah">Mudah (Mengingat)</option>
                      <option value="Sedang">Sedang (Memahami)</option>
                      <option value="HOTS Menantang">HOTS (Analisis Tinggi)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">
                      Batas Waktu:
                    </label>
                    <select
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(Number(e.target.value))}
                      className="w-full text-xs p-2 rounded-xl border border-slate-300 bg-white"
                    >
                      <option value={5}>5 Menit</option>
                      <option value={10}>10 Menit</option>
                      <option value={15}>15 Menit</option>
                      <option value={0}>Tanpa Batas Waktu</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Button */}
          <div className="pt-2 flex items-center justify-end">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isLoading || !promptText.trim()}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-teal-500 via-cyan-500 to-sky-500 hover:from-teal-600 hover:to-sky-600 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Membuat Kuis Cerdas...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Mulai Kirim!</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Output / Result Panel */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200/90 shadow-sm space-y-4 min-h-[380px] sm:min-h-[440px] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <span>Hasil Kuis Ajaib</span>
              </h2>

              <div className="flex items-center gap-1.5 text-slate-400">
                <button
                  type="button"
                  onClick={() => setFeedbackGiven('up')}
                  className={`p-1.5 rounded-lg hover:bg-slate-100 transition-colors ${
                    feedbackGiven === 'up' ? 'text-teal-600 bg-teal-50' : ''
                  }`}
                  aria-label="Suka hasil kuis"
                >
                  <ThumbsUp className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setFeedbackGiven('down')}
                  className={`p-1.5 rounded-lg hover:bg-slate-100 transition-colors ${
                    feedbackGiven === 'down' ? 'text-rose-600 bg-rose-50' : ''
                  }`}
                  aria-label="Kurang suka hasil kuis"
                >
                  <ThumbsDown className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleGenerate}
                  className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                  aria-label="Generate ulang kuis"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Processing State */}
            {isLoading && (
              <div className="py-10 flex flex-col items-center justify-center text-center space-y-4">
                <PesutMahakamMascot className="w-28 h-28" isProcessing={true} />
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold">
                    <span className="w-2 h-2 rounded-full bg-teal-500 animate-ping" />
                    <span>Sedang memproses... ✨</span>
                  </div>
                  <p className="text-xs text-slate-500 max-w-xs">{statusMessage}</p>
                </div>
              </div>
            )}

            {/* Generated Quiz Result */}
            {!isLoading && generatedQuiz && (
              <div className="space-y-4 pt-2">
                <div className="bg-gradient-to-r from-teal-50 to-cyan-50 p-4 rounded-2xl border border-teal-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-teal-200/80 text-teal-800">
                      {generatedQuiz.subject} • {generatedQuiz.gradeLevel}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-mono font-bold text-slate-700 bg-white px-2 py-0.5 rounded-lg border border-teal-200">
                        PIN: {generatedQuiz.code}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyCode}
                        className="p-1 rounded-md text-slate-600 hover:bg-white transition-colors"
                        title="Salin PIN Kuis"
                      >
                        {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <h3 className="font-bold text-base text-slate-900 leading-snug">
                    {generatedQuiz.title}
                  </h3>
                  <p className="text-xs text-slate-600">
                    {generatedQuiz.description}
                  </p>

                  <div className="flex items-center gap-3 text-xs text-slate-500 pt-1">
                    <span>{generatedQuiz.questions.length} Soal Pilihan Ganda</span>
                    <span>•</span>
                    <span>{generatedQuiz.durationMinutes > 0 ? `${generatedQuiz.durationMinutes} Menit` : 'Tanpa Waktu'}</span>
                    <span>•</span>
                    <span>KKM: {generatedQuiz.passingGrade}</span>
                  </div>
                </div>

                {/* Preview Soal */}
                <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Daftar Kisi-kisi Soal:
                  </div>
                  {generatedQuiz.questions.map((q, qIndex) => (
                    <div key={q.id || qIndex} className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs space-y-1.5">
                      <div className="font-semibold text-slate-800 flex items-start gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-800 text-[10px] flex items-center justify-center shrink-0">
                          {qIndex + 1}
                        </span>
                        <span>{q.text}</span>
                      </div>
                      {q.options && q.options.length > 0 && (
                        <div className="grid grid-cols-2 gap-1 pl-6 pt-1">
                          {q.options.map((opt, oIdx) => (
                            <div
                              key={oIdx}
                              className={`px-2 py-1 rounded-lg text-[11px] truncate ${
                                oIdx === q.correctOption
                                  ? 'bg-emerald-100 text-emerald-900 font-semibold border border-emerald-300'
                                  : 'bg-white text-slate-600 border border-slate-200'
                              }`}
                            >
                              <span className="font-bold mr-1">{String.fromCharCode(65 + oIdx)}.</span> {opt}
                            </div>
                          ))}
                        </div>
                      )}
                      {q.acceptedAnswers && q.acceptedAnswers.length > 0 && (
                        <div className="pl-6 pt-1 text-[11px] text-teal-700 font-medium">
                          <span className="bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                            Kunci Jawaban: {q.acceptedAnswers.join(', ')}
                          </span>
                        </div>
                      )}
                      {q.matchingPairs && q.matchingPairs.length > 0 && (
                        <div className="pl-6 pt-1 text-[11px] space-y-1">
                          {q.matchingPairs.map((p, pIdx) => (
                            <span key={pIdx} className="inline-block mr-2 px-2 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-indigo-700">
                              {p.left} ⇄ {p.right}
                            </span>
                          ))}
                        </div>
                      )}
                      {q.explanation && (
                        <div className="pl-6 pt-1 text-[11px] text-slate-500 italic">
                          💡 {q.explanation}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Actions for generated quiz */}
                <div className="pt-2 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSaveToQuizzes}
                    disabled={savedSuccess}
                    className={`flex-1 px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs ${
                      savedSuccess
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-teal-600 hover:bg-teal-700 text-white'
                    }`}
                  >
                    {savedSuccess ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Tersimpan di Kuis Guru!</span>
                      </>
                    ) : (
                      <>
                        <PlusCircle className="w-4 h-4" />
                        <span>Simpan ke Kuis Saya</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => onShareQuiz(generatedQuiz)}
                    className="px-4 py-2.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold text-xs flex items-center gap-1.5 border border-teal-200 transition-colors cursor-pointer"
                  >
                    <Share2 className="w-4 h-4 text-teal-600" />
                    <span>Bagikan Link Siswa</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onPlayQuiz(generatedQuiz)}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                  >
                    <Play className="w-4 h-4" />
                    <span>Buka Halaman Siswa</span>
                  </button>
                </div>
              </div>
            )}

            {/* Empty State before generating */}
            {!isLoading && !generatedQuiz && (
              <div className="py-12 flex flex-col items-center justify-center text-center space-y-4 text-slate-400">
                <PesutMahakamMascot className="w-24 h-24" />
                <div className="space-y-1">
                  <p className="font-semibold text-slate-600 text-sm">
                    Kuis Anda Siap Dirancang
                  </p>
                  <p className="text-xs text-slate-400 max-w-xs">
                    Ketik topik atau pilih salah satu inspirasi di sebelah kiri, lalu klik &quot;Mulai Kirim!&quot; untuk menghasilkan kuis interaktif berpenjelasan cerdas.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer note in mockup: Kekuatan Google AI Studio • Terdeploy di Vercel */}
          <div className="pt-4 border-t border-slate-100 text-center">
            <p className="text-[11px] text-slate-400">
              Kekuatan Google AI Studio • Terdeploy di Vercel via GitHub
            </p>
          </div>
        </div>

      </div>

    </div>
  );
};
