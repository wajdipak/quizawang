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
  FileText,
  SlidersHorizontal,
  ChevronDown,
  ArrowRight,
  GraduationCap
} from 'lucide-react';
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
  const [promptText, setPromptText] = useState('Bikin kuis tentang sejarah perjuangan Panglima Awang Long di Kutai Kartanegara');
  const [showAdjustDrawer, setShowAdjustDrawer] = useState(false);
  const [questionCount, setQuestionCount] = useState(5);
  const [countInput, setCountInput] = useState('5');

  const handleCountInputChange = (val: string) => {
    setCountInput(val);
    const num = parseInt(val, 10);
    if (!isNaN(num) && num > 0) {
      setQuestionCount(num);
    }
  };

  const handleCountPreset = (preset: number) => {
    setQuestionCount(preset);
    setCountInput(preset.toString());
  };

  const handleCountStep = (delta: number) => {
    const next = Math.max((questionCount || 1) + delta, 1);
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
    { label: '🏛️ Sejarah Awang Long Kutai', text: 'Bikin kuis tentang sejarah perjuangan kepahlawanan Panglima Awang Long di Kutai Kartanegara' },
    { label: '🌿 Ekosistem Tropis & IPA', text: 'Kuis IPA tentang rantai makanan, fotosintesis, dan pelestarian satwa langka Nusantara' },
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
      <div className="bg-gradient-to-r from-teal-500/10 via-cyan-500/10 to-emerald-500/10 dark:from-teal-950/40 dark:via-cyan-950/30 dark:to-slate-900/40 rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-7 border border-teal-200/50 dark:border-teal-900/50 shadow-xs relative overflow-hidden transition-colors">
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-6">
          <div className="space-y-2 max-w-xl text-center md:text-left">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/80 dark:bg-slate-900/80 border border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-300 text-[11px] sm:text-xs font-semibold shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span>Studio Pembuat Kuis Cerdas Guru</span>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight leading-tight">
              Tugas Online & Kuis Interaktif Awang Long
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Bantu guru merancang soal kuis seru secara instan, otomatis memberikan penjelasan edukatif, dan bagikan kode PIN langsung kepada siswa di kelas.
            </p>
          </div>

          <div className="flex items-center gap-3 sm:gap-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-teal-100 dark:border-teal-900/60 shadow-sm w-full md:w-auto justify-center md:justify-start shrink-0">
            <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-teal-600 via-cyan-500 to-indigo-600 p-[2px] shadow-sm flex items-center justify-center shrink-0">
              <div className="w-full h-full rounded-[14px] bg-white dark:bg-slate-900 flex items-center justify-center text-teal-600 dark:text-teal-400">
                <GraduationCap className={`w-7 h-7 ${isLoading ? 'animate-bounce' : ''}`} />
              </div>
              <Sparkles className="absolute -top-1 -right-1 w-4 h-4 text-amber-500 animate-spin-slow" />
            </div>
            <div className="text-xs space-y-1">
              <span className="font-bold text-slate-800 dark:text-slate-100 block">Awang Long AI Engine</span>
              <span className="text-slate-500 dark:text-slate-400 block">Asisten Kuis Guru Cerdas</span>
              <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-semibold text-[10px]">
                ● Mesin AI Gemini Aktif
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tool Selector Buttons */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Pilih Alat AI:
          </label>
          <span className="text-xs text-slate-500 dark:text-slate-400">Pilih mode kreasi edukasi</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 sm:gap-3">
          <button
            type="button"
            onClick={() => setActiveTool('pembuat-kuis')}
            className={`p-3 sm:p-3.5 rounded-xl sm:rounded-2xl text-left border transition-all flex flex-col items-center sm:items-start gap-1.5 sm:gap-2 shadow-xs cursor-pointer ${
              activeTool === 'pembuat-kuis'
                ? 'bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-950/80 dark:to-emerald-950/60 border-teal-400 dark:border-teal-500 ring-2 ring-teal-300/40 text-teal-900 dark:text-teal-200'
                : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200'
            }`}
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-teal-100/80 dark:bg-teal-950 text-teal-700 dark:text-teal-300 flex items-center justify-center font-bold text-base sm:text-lg">
              📝
            </div>
            <div>
              <span className="block font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-100">Pembuat Kuis</span>
              <span className="block text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400">Prompt & Topik</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              if (onOpenFileUpload) onOpenFileUpload();
            }}
            className="p-3.5 rounded-2xl text-left border transition-all flex flex-col items-center sm:items-start gap-2 shadow-xs bg-gradient-to-br from-cyan-50 to-emerald-50 dark:from-cyan-950/70 dark:to-emerald-950/60 hover:from-cyan-100 hover:to-emerald-100 dark:hover:from-cyan-900/80 dark:hover:to-emerald-900/70 border-teal-300 dark:border-teal-700 text-teal-900 dark:text-teal-200 cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-teal-200/80 dark:bg-teal-900 text-teal-800 dark:text-teal-200 flex items-center justify-center font-bold text-lg shadow-xs">
              📄
            </div>
            <div>
              <span className="block font-bold text-sm text-slate-800 dark:text-slate-100">Upload File</span>
              <span className="block text-[11px] text-slate-500 dark:text-slate-400">Ekstrak PDF/Foto</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTool('kuis-seru');
              setPromptText('Tantangan kuis cepat Awang Long dan budaya Kalimantan Timur');
            }}
            className={`p-3.5 rounded-2xl text-left border transition-all flex flex-col items-center sm:items-start gap-2 shadow-xs cursor-pointer ${
              activeTool === 'kuis-seru'
                ? 'bg-gradient-to-br from-cyan-50 to-sky-50 dark:from-cyan-950/80 dark:to-sky-950/60 border-cyan-400 dark:border-cyan-500 ring-2 ring-cyan-300/40 text-cyan-900 dark:text-cyan-200'
                : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-cyan-100/80 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 flex items-center justify-center font-bold text-lg">
              🤔
            </div>
            <div>
              <span className="block font-bold text-sm text-slate-800 dark:text-slate-100">Kuis Seru</span>
              <span className="block text-[11px] text-slate-500 dark:text-slate-400">Tantangan Cepat</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTool('asisten');
              setPromptText('Rangkuman materi sejarah Awang Long dan konsep kedaulatan Nusantara');
            }}
            className={`p-3.5 rounded-2xl text-left border transition-all flex flex-col items-center sm:items-start gap-2 shadow-xs cursor-pointer ${
              activeTool === 'asisten'
                ? 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/80 dark:to-orange-950/60 border-amber-400 dark:border-amber-500 ring-2 ring-amber-300/40 text-amber-900 dark:text-amber-200'
                : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-amber-100/80 dark:bg-amber-950 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold text-lg">
              🧑‍🏫
            </div>
            <div>
              <span className="block font-bold text-sm text-slate-800 dark:text-slate-100">Asisten Belajar</span>
              <span className="block text-[11px] text-slate-500 dark:text-slate-400">Bimbingan Materi</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTool('tanya-jawab');
              setPromptText('Apa peran penting benteng Tenggarong dalam pertempuran tahun 1844?');
            }}
            className={`p-3.5 rounded-2xl text-left border transition-all flex flex-col items-center sm:items-start gap-2 shadow-xs cursor-pointer ${
              activeTool === 'tanya-jawab'
                ? 'bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-950/80 dark:to-rose-950/60 border-pink-400 dark:border-pink-500 ring-2 ring-pink-300/40 text-pink-900 dark:text-pink-200'
                : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-rose-100/80 dark:bg-rose-950 text-rose-700 dark:text-rose-300 flex items-center justify-center font-bold text-lg">
              ❓
            </div>
            <div>
              <span className="block font-bold text-sm text-slate-800 dark:text-slate-100">Tanya Jawab</span>
              <span className="block text-[11px] text-slate-500 dark:text-slate-400">Eksplorasi Soal</span>
            </div>
          </button>
        </div>
      </div>

      {/* Main Workspace 2-Column Split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 items-start">
        
        {/* Left Column: Input Panel */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-4 sm:space-y-5 transition-colors">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <span>Masukkan Imajinasimu!</span>
            </h2>
            <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">Google AI Studio</span>
          </div>

          <div className="space-y-1.5 sm:space-y-2">
            <label htmlFor="prompt-input" className="text-xs font-semibold text-slate-600 dark:text-slate-300 block">
              Materi / Topik Kuis yang Ingin Dibuat:
            </label>
            <div className="relative">
              <textarea
                id="prompt-input"
                rows={4}
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                placeholder="Ketik topik kuis atau tempel rangkuman materi pelajaran..."
                className="w-full p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-300 dark:border-slate-700 focus:border-teal-500 focus:ring-3 focus:ring-teal-200/50 outline-none text-xs sm:text-sm text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all resize-none shadow-xs"
              />
            </div>
          </div>

          {/* Preset Chips */}
          <div className="space-y-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block">Contoh Topik Cepat:</span>
            <div className="flex flex-wrap gap-1.5">
              {quickPresets.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setPromptText(preset.text)}
                  className="text-xs px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950/70 hover:text-teal-800 dark:hover:text-teal-300 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
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
                  className="text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
                >
                  Sesuaikan Kreativitas & Parameter Soal
                </label>
              </div>

              <span className="text-xs text-slate-400 dark:text-slate-400">
                {questionCount} Soal • {gradeLevel}
              </span>
            </div>

            {/* Expandable Settings */}
            {showAdjustDrawer && (
              <div className="mt-4 p-4 rounded-2xl bg-slate-50/90 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-4 transition-colors">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Kebebasan Menentukan Jumlah Soal dengan Ketik Langsung */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label htmlFor="custom-question-count-input" className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <span>Jumlah Soal:</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300">
                          Bebas Ketik Langsung
                        </span>
                      </label>
                      <span className="text-[11px] font-bold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/70 px-2 py-0.5 rounded-md border border-teal-200 dark:border-teal-800">
                        {questionCount} Soal
                      </span>
                    </div>

                    {/* Stepper + Direct Typing Input */}
                    <div className="flex items-center gap-2">
                      <div className="flex items-center border border-teal-300 dark:border-teal-700 focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-200 rounded-xl bg-white dark:bg-slate-900 overflow-hidden shadow-xs flex-1">
                        <button
                          type="button"
                          onClick={() => handleCountStep(-1)}
                          disabled={questionCount <= 1}
                          className="px-3 py-2 text-slate-500 dark:text-slate-400 hover:text-teal-700 dark:hover:text-teal-300 hover:bg-teal-50 dark:hover:bg-slate-800 active:bg-teal-100 disabled:opacity-40 font-bold text-sm transition-colors cursor-pointer border-r border-slate-200 dark:border-slate-700"
                          title="Kurangi 1 soal"
                        >
                          -
                        </button>
                        <input
                          id="custom-question-count-input"
                          type="number"
                          min={1}
                          value={countInput}
                          onChange={(e) => handleCountInputChange(e.target.value)}
                          onBlur={() => {
                            if (!countInput || isNaN(Number(countInput)) || Number(countInput) < 1) {
                              setCountInput('5');
                              setQuestionCount(5);
                            } else {
                              const val = Math.max(Number(countInput), 1);
                              setCountInput(val.toString());
                              setQuestionCount(val);
                            }
                          }}
                          placeholder="Ketik jumlah soal..."
                          className="w-full text-center py-2 px-2 text-sm font-bold text-slate-800 dark:text-slate-100 bg-transparent outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleCountStep(1)}
                          className="px-3 py-2 text-slate-500 dark:text-slate-400 hover:text-teal-700 dark:hover:text-teal-300 hover:bg-teal-50 dark:hover:bg-slate-800 active:bg-teal-100 font-bold text-sm transition-colors cursor-pointer border-l border-slate-200 dark:border-slate-700"
                          title="Tambah 1 soal"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Quick Preset Buttons */}
                    <div className="flex items-center flex-wrap gap-1.5 pt-1">
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Pilihan Cepat:</span>
                      {[3, 5, 8, 10, 15, 20, 30, 50, 100].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => handleCountPreset(preset)}
                          className={`text-[11px] px-2 py-0.5 rounded-lg border font-semibold transition-all cursor-pointer ${
                            questionCount === preset
                              ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-teal-300 hover:text-teal-700 dark:hover:text-teal-300'
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">
                      💡 Bebas ketik angka berapa pun tanpa batasan kuantitas sesuai kebutuhan belajar.
                    </p>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                      Jenjang Sekolah:
                    </label>
                    <select
                      value={gradeLevel}
                      onChange={(e) => setGradeLevel(e.target.value)}
                      className="w-full text-xs p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none"
                    >
                      <option value="SD">SD / Madrasah Ibtidaiyah</option>
                      <option value="SMP">SMP / MTs</option>
                      <option value="SMA">SMA / SMK / MA</option>
                      <option value="Umum">Umum / Komunitas</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                      Tingkat Kesulitan:
                    </label>
                    <select
                      value={difficulty}
                      onChange={(e) => setDifficulty(e.target.value)}
                      className="w-full text-xs p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none"
                    >
                      <option value="Mudah">Mudah (Mengingat)</option>
                      <option value="Sedang">Sedang (Memahami)</option>
                      <option value="HOTS Menantang">HOTS (Analisis Tinggi)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                      Batas Waktu:
                    </label>
                    <select
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(Number(e.target.value))}
                      className="w-full text-xs p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none"
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
        <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-4 min-h-[380px] sm:min-h-[440px] flex flex-col justify-between transition-colors">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <span>Hasil Kuis Ajaib</span>
              </h2>

              <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
                <button
                  type="button"
                  onClick={() => setFeedbackGiven('up')}
                  className={`p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
                    feedbackGiven === 'up' ? 'text-teal-600 bg-teal-50 dark:bg-teal-950/80' : ''
                  }`}
                  aria-label="Suka hasil kuis"
                >
                  <ThumbsUp className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setFeedbackGiven('down')}
                  className={`p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
                    feedbackGiven === 'down' ? 'text-rose-600 bg-rose-50 dark:bg-rose-950/80' : ''
                  }`}
                  aria-label="Kurang suka hasil kuis"
                >
                  <ThumbsDown className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleGenerate}
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  aria-label="Generate ulang kuis"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Processing State */}
            {isLoading && (
              <div className="py-10 flex flex-col items-center justify-center text-center space-y-4">
                <div className="relative flex items-center justify-center w-20 h-20">
                  <div className="absolute inset-0 rounded-2xl bg-teal-500/20 dark:bg-teal-400/10 animate-ping" />
                  <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-tr from-teal-600 via-cyan-500 to-indigo-600 p-[2px] shadow-lg">
                    <div className="w-full h-full rounded-[14px] bg-white dark:bg-slate-900 flex items-center justify-center text-teal-600 dark:text-teal-400">
                      <Sparkles className="w-8 h-8 animate-spin-slow text-teal-500" />
                    </div>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 dark:bg-teal-950/80 border border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-300 text-xs font-semibold">
                    <span className="w-2 h-2 rounded-full bg-teal-500 animate-ping" />
                    <span>Sedang merancang butir soal... ✨</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs">{statusMessage}</p>
                </div>
              </div>
            )}

            {/* Generated Quiz Result */}
            {!isLoading && generatedQuiz && (
              <div className="space-y-4 pt-2">
                <div className="bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-950/60 dark:to-cyan-950/50 p-4 rounded-2xl border border-teal-100 dark:border-teal-900/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-teal-200/80 dark:bg-teal-900/80 text-teal-800 dark:text-teal-200">
                      {generatedQuiz.subject} • {generatedQuiz.gradeLevel}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-teal-200 dark:border-teal-800">
                        PIN: {generatedQuiz.code}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyCode}
                        className="p-1 rounded-md text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Salin PIN Kuis"
                      >
                        {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 leading-snug">
                    {generatedQuiz.title}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    {generatedQuiz.description}
                  </p>

                  <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 pt-1">
                    <span>{generatedQuiz.questions.length} Soal Pilihan Ganda</span>
                    <span>•</span>
                    <span>{generatedQuiz.durationMinutes > 0 ? `${generatedQuiz.durationMinutes} Menit` : 'Tanpa Waktu'}</span>
                    <span>•</span>
                    <span>KKM: {generatedQuiz.passingGrade}</span>
                  </div>
                </div>

                {/* Preview Soal */}
                <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                  <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Daftar Kisi-kisi Soal:
                  </div>
                  {generatedQuiz.questions.map((q, qIndex) => (
                    <div key={q.id || qIndex} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 text-xs space-y-1.5">
                      <div className="font-semibold text-slate-800 dark:text-slate-100 flex items-start gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 text-[10px] flex items-center justify-center shrink-0">
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
                                  ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-200 font-semibold border border-emerald-300 dark:border-emerald-700'
                                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                              }`}
                            >
                              <span className="font-bold mr-1">{String.fromCharCode(65 + oIdx)}.</span> {opt}
                            </div>
                          ))}
                        </div>
                      )}
                      {q.acceptedAnswers && q.acceptedAnswers.length > 0 && (
                        <div className="pl-6 pt-1 text-[11px] text-teal-700 dark:text-teal-300 font-medium">
                          <span className="bg-teal-50 dark:bg-teal-950/70 px-2 py-0.5 rounded border border-teal-200 dark:border-teal-800">
                            Kunci Jawaban: {q.acceptedAnswers.join(', ')}
                          </span>
                        </div>
                      )}
                      {q.matchingPairs && q.matchingPairs.length > 0 && (
                        <div className="pl-6 pt-1 text-[11px] space-y-1">
                          {q.matchingPairs.map((p, pIdx) => (
                            <span key={pIdx} className="inline-block mr-2 px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300">
                              {p.left} ⇄ {p.right}
                            </span>
                          ))}
                        </div>
                      )}
                      {q.explanation && (
                        <div className="pl-6 pt-1 text-[11px] text-slate-500 dark:text-slate-400 italic">
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
                    className={`flex-1 px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer ${
                      savedSuccess
                        ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
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
                    className="px-4 py-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/70 hover:bg-teal-100 dark:hover:bg-teal-900 text-teal-800 dark:text-teal-300 font-bold text-xs flex items-center gap-1.5 border border-teal-200 dark:border-teal-800 transition-colors cursor-pointer"
                  >
                    <Share2 className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    <span>Bagikan Link Siswa</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onPlayQuiz(generatedQuiz)}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                  >
                    <Play className="w-4 h-4" />
                    <span>Uji Coba Soal</span>
                  </button>
                </div>
              </div>
            )}

            {/* Empty State before generating */}
            {!isLoading && !generatedQuiz && (
              <div className="py-12 flex flex-col items-center justify-center text-center space-y-4 text-slate-400 dark:text-slate-500">
                <div className="w-20 h-20 rounded-2xl bg-teal-50 dark:bg-slate-800/80 border border-teal-200/80 dark:border-slate-700 flex items-center justify-center text-teal-600 dark:text-teal-400 shadow-xs">
                  <BookOpen className="w-10 h-10" />
                </div>
                <div className="space-y-1">
                  <p className="font-semibold text-slate-600 dark:text-slate-300 text-sm">
                    Kuis Anda Siap Dirancang
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 max-w-xs">
                    Ketik topik atau pilih salah satu inspirasi di sebelah kiri, lalu klik &quot;Mulai Kirim!&quot; untuk menghasilkan kuis interaktif berpenjelasan cerdas.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer note in mockup */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              Kekuatan Google AI Studio • Terdeploy di Vercel via GitHub
            </p>
          </div>
        </div>

      </div>

    </div>
  );
};
