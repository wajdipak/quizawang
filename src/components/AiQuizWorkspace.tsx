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
  GraduationCap,
  Zap,
  X
} from 'lucide-react';
import { Quiz, Question } from '../types/quiz.js';
import { generateQuizCode } from '../utils/quizLogic.js';
import { GeminiUsageWidget } from './GeminiUsageWidget.js';

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
  const [gradeLevel, setGradeLevel] = useState('SD');
  const [difficulty, setDifficulty] = useState('Sedang');
  const [durationMinutes, setDurationMinutes] = useState(10);

  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [generatedQuiz, setGeneratedQuiz] = useState<Quiz | null>(null);
  const [feedbackGiven, setFeedbackGiven] = useState<'up' | 'down' | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isSmartScoring, setIsSmartScoring] = useState(false);
  const [smartScoreNote, setSmartScoreNote] = useState<string | null>(null);

  const handleSmartScoreInWorkspace = async () => {
    if (!generatedQuiz || !generatedQuiz.questions || generatedQuiz.questions.length === 0) return;
    setIsSmartScoring(true);
    setSmartScoreNote(null);
    try {
      const res = await fetch('/api/smart-score-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions: generatedQuiz.questions })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.questions && Array.isArray(data.questions)) {
          setGeneratedQuiz({
            ...generatedQuiz,
            questions: data.questions
          });
          setSmartScoreNote(data.summary || 'Poin diselaraskan cerdas ke total 100 poin!');
          setTimeout(() => setSmartScoreNote(null), 6000);
          return;
        }
      }
      throw new Error('Local fallback');
    } catch {
      const qs = generatedQuiz.questions;
      const basePt = Math.floor(100 / qs.length);
      const rem = 100 - basePt * qs.length;
      const balanced = qs.map((q, i) => ({
        ...q,
        points: basePt + (i < rem ? 1 : 0),
        difficultyTag: 'Seimbang'
      }));
      setGeneratedQuiz({ ...generatedQuiz, questions: balanced });
      setSmartScoreNote('Poin diselaraskan seimbang ke total 100 poin!');
      setTimeout(() => setSmartScoreNote(null), 6000);
    } finally {
      setIsSmartScoring(false);
    }
  };

  const quickPresets = [
    { label: 'Sejarah Awang Long Kutai', text: 'Bikin kuis tentang sejarah perjuangan kepahlawanan Panglima Awang Long di Kutai Kartanegara' },
    { label: 'Ekosistem Tropis & IPA', text: 'Kuis IPA tentang rantai makanan, fotosintesis, dan pelestarian satwa langka Nusantara' },
    { label: 'Matematika Logika Seru', text: 'Kuis matematika logika, pecahan, dan bangun datar kontekstual' },
    { label: 'Bahasa & Sastra Nusantara', text: 'Kuis Bahasa Indonesia seputar majas, puisi daerah, dan ejaan baku' }
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
            materialContent: data.materialContent,
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
            materialContent: data.materialContent,
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
    <div className="space-y-8 sm:space-y-10">
      
      {/* Visual Workspace Hero Banner */}
 <div className="border-2 border-[var(--line)] bg-[var(--paper)] p-5 sm:p-8 lg:p-10 relative overflow-hidden">
        <div className="relative z-10 grid gap-6 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)] lg:items-center lg:gap-10">
          <div className="space-y-4 text-left">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <span className="inline-flex items-center gap-2 border-2 border-[var(--line)] px-2.5 py-1 poster-label">
                <Sparkles className="w-3.5 h-3.5" />
                Studio Pembuat Kuis Cerdas Guru
              </span>
              <span className="poster-label text-[var(--ink-soft)]">01 / Beranda</span>
            </div>
 <h1 className="poster-display max-w-[19ch] text-[clamp(2.25rem,6vw,4.25rem)]">
              Tugas Online & Kuis Interaktif Awang Long
            </h1>
 <p className="lede">
              Bantu guru merancang soal kuis seru secara instan, otomatis memberikan penjelasan edukatif, dan bagikan kode PIN langsung kepada siswa di kelas.
            </p>
          </div>

 <div className="flex items-center gap-4 bg-[var(--paper-2)] border-2 border-[var(--line)] p-4 sm:p-5 w-full">
            <img 
              src="/assets/aistudio/Quiz_20261023_131259_0000_ee40cbac.png" 
              alt="Logo Awang Long Quiz" 
              className={`w-14 h-14 sm:w-16 sm:h-16 ${isLoading ? 'animate-bounce' : ''} object-contain hover:scale-105 transition-transform   `}
            />
            <div className="min-w-0 space-y-1.5">
 <span className="block text-[0.9375rem] font-extrabold leading-tight">Awang Long AI Engine</span>
 <span className="block text-[0.8125rem] text-[var(--ink-soft)]">Asisten Kuis Guru Cerdas</span>
 <span className="inline-flex items-center gap-1.5 pt-0.5 poster-label">
                <span className="w-2 h-2 bg-[var(--signal)] border border-[var(--line)]" aria-hidden="true" />
                Mesin AI Gemini Aktif
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tool Selector Buttons */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 className="poster-label font-sans">Pilih alat AI</h2>
          <span className="text-[0.8125rem] text-[var(--ink-soft)]">Pilih mode kreasi edukasi</span>
        </div>

 <div className="tool-grid grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-0 border-t-2 border-l-2 border-[var(--line)]">
          <button
            type="button"
            onClick={() => setActiveTool('pembuat-kuis')}
            aria-pressed={activeTool === 'pembuat-kuis'}
            className="tool-cell"
          >
            <div>
 <span className="block font-bold text-xs sm:text-sm text-slate-800 ">Pembuat Kuis</span>
 <span className="block text-[10px] sm:text-[11px] text-slate-500 ">Prompt & Topik</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              if (onOpenFileUpload) onOpenFileUpload();
            }}
            className="tool-cell"
          >
            <div>
 <span className="block font-bold text-sm text-slate-800 ">Upload File</span>
 <span className="block text-[11px] text-slate-500 ">Ekstrak PDF/Foto</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTool('kuis-seru');
              setPromptText('Tantangan kuis cepat Awang Long dan budaya Kalimantan Timur');
            }}
            aria-pressed={activeTool === 'kuis-seru'}
            className="tool-cell"
          >
            <div>
 <span className="block font-bold text-sm text-slate-800 ">Kuis Seru</span>
 <span className="block text-[11px] text-slate-500 ">Tantangan Cepat</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTool('asisten');
              setPromptText('Rangkuman materi sejarah Awang Long dan konsep kedaulatan Nusantara');
            }}
            aria-pressed={activeTool === 'asisten'}
            className="tool-cell"
          >
            <div>
 <span className="block font-bold text-sm text-slate-800 ">Asisten Belajar</span>
 <span className="block text-[11px] text-slate-500 ">Bimbingan Materi</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTool('tanya-jawab');
              setPromptText('Apa peran penting benteng Tenggarong dalam pertempuran tahun 1844?');
            }}
            aria-pressed={activeTool === 'tanya-jawab'}
            className="tool-cell"
          >
            <div>
 <span className="block font-bold text-sm text-slate-800 ">Tanya Jawab</span>
 <span className="block text-[11px] text-slate-500 ">Eksplorasi Soal</span>
            </div>
          </button>
        </div>
      </section>

      {/* Live Gemini API Quota Monitor */}
      <GeminiUsageWidget variant="banner" />

      {/* Main Workspace 2-Column Split */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-8 items-start">
        
        {/* Left Column: Input Panel */}
 <div className="border-2 border-[var(--line)] bg-[var(--paper)] p-5 sm:p-7 space-y-5">
          <div className="flex items-baseline justify-between gap-3 border-b-2 border-[var(--line)] pb-3">
 <h2 className="poster-display text-2xl sm:text-3xl leading-none">
              Masukkan Imajinasimu!
            </h2>
 <span className="poster-label text-[var(--ink-soft)]">Google AI Studio</span>
          </div>

          <div className="space-y-2">
 <label htmlFor="prompt-input" className="poster-label block text-[var(--ink-soft)]">
              Materi / Topik Kuis yang Ingin Dibuat:
            </label>
            <div className="relative">
              <textarea
                id="prompt-input"
                rows={4}
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                placeholder="Ketik topik kuis atau tempel rangkuman materi pelajaran..."
                className="w-full min-h-[7.5rem] p-3.5 sm:p-4 border-2 border-[var(--line)] bg-[var(--paper)] outline-none text-sm sm:text-[0.9375rem] leading-relaxed text-[var(--ink)] placeholder:text-[var(--ink-soft)] transition-colors resize-none focus:border-[var(--ink)]"
              />
            </div>
          </div>

          {/* Preset Chips */}
          <div className="space-y-2">
 <span className="poster-label block text-[var(--ink-soft)]">Contoh topik cepat</span>
            <div className="flex flex-wrap gap-1.5">
              {quickPresets.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setPromptText(preset.text)}
                  className="text-[0.8125rem] px-2.5 py-1.5 bg-[var(--paper-2)] text-[var(--ink)] border-2 border-[var(--line)] hover:bg-[var(--signal)] hover:text-[#0a0a0a] transition-colors cursor-pointer"
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
                  className="text-[0.8125rem] font-semibold cursor-pointer"
                >
                  Sesuaikan Kreativitas & Parameter Soal
                </label>
              </div>

 <span className="tnum text-[0.75rem] text-[var(--ink-soft)]">
                {questionCount} Soal • {gradeLevel}
              </span>
            </div>

            {/* Expandable Settings */}
            {showAdjustDrawer && (
 <div className="mt-4 p-4 rounded-2xl bg-slate-50/90  border border-slate-200  space-y-4 transition-colors">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Kebebasan Menentukan Jumlah Soal dengan Ketik Langsung */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
 <label htmlFor="custom-question-count-input" className="text-xs font-semibold text-slate-700  flex items-center gap-1.5">
                        <span>Jumlah Soal:</span>
 <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-teal-100  text-teal-800 ">
                          Bebas Ketik Langsung
                        </span>
                      </label>
 <span className="text-[11px] font-bold text-teal-700  bg-teal-50  px-2 py-0.5 rounded-md border border-teal-200 ">
                        {questionCount} Soal
                      </span>
                    </div>

                    {/* Stepper + Direct Typing Input */}
                    <div className="flex items-center gap-2">
 <div className="flex items-center border border-teal-300  focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-200 rounded-xl bg-white  overflow-hidden shadow-xs flex-1">
                        <button
                          type="button"
                          onClick={() => handleCountStep(-1)}
                          disabled={questionCount <= 1}
                          className="px-3 py-2 text-slate-500  hover:text-teal-700  hover:bg-teal-50  active:bg-teal-100 disabled:opacity-40 font-bold text-sm transition-colors cursor-pointer border-r border-slate-200 "
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
                          className="w-full text-center py-2 px-2 text-sm font-bold text-slate-800  bg-transparent outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleCountStep(1)}
                          className="px-3 py-2 text-slate-500  hover:text-teal-700  hover:bg-teal-50  active:bg-teal-100 font-bold text-sm transition-colors cursor-pointer border-l border-slate-200 "
                          title="Tambah 1 soal"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Quick Preset Buttons */}
                    <div className="flex items-center flex-wrap gap-1.5 pt-1">
 <span className="text-[10px] text-slate-400  font-medium">Pilihan Cepat:</span>
                      {[3, 5, 8, 10, 15, 20, 30, 50, 100].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => handleCountPreset(preset)}
                          className={`text-[11px] px-2 py-0.5 rounded-lg border font-semibold transition-all cursor-pointer ${
                            questionCount === preset
                              ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                              : 'bg-white  text-slate-600  border-slate-200  hover:border-teal-300 hover:text-teal-700 '
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
 <p className="text-[10px] text-slate-400 ">
                       Bebas ketik angka berapa pun tanpa batasan kuantitas sesuai kebutuhan belajar.
                    </p>
                  </div>

                  <div>
 <label className="text-xs font-semibold text-slate-600  block mb-1">
                      Jenjang Sekolah:
                    </label>
                    <select
                      value={gradeLevel}
                      onChange={(e) => setGradeLevel(e.target.value)}
                      className="w-full text-xs p-2 rounded-xl border border-slate-300  bg-white  text-slate-800  focus:outline-none"
                    >
                      <option value="SD">SD / Madrasah Ibtidaiyah</option>
                      <option value="SMP">SMP / MTs</option>
                      <option value="SMA">SMA / SMK / MA</option>
                      <option value="Umum">Umum / Komunitas</option>
                    </select>
                  </div>

                  <div>
 <label className="text-xs font-semibold text-slate-600  block mb-1">
                      Tingkat Kesulitan:
                    </label>
                    <select
                      value={difficulty}
                      onChange={(e) => setDifficulty(e.target.value)}
                      className="w-full text-xs p-2 rounded-xl border border-slate-300  bg-white  text-slate-800  focus:outline-none"
                    >
                      <option value="Mudah">Mudah (Mengingat)</option>
                      <option value="Sedang">Sedang (Memahami)</option>
                      <option value="HOTS Menantang">HOTS (Analisis Tinggi)</option>
                    </select>
                  </div>

                  <div>
 <label className="text-xs font-semibold text-slate-600  block mb-1">
                      Batas Waktu:
                    </label>
                    <select
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(Number(e.target.value))}
                      className="w-full text-xs p-2 rounded-xl border border-slate-300  bg-white  text-slate-800  focus:outline-none"
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
              className="btn-ink w-full sm:w-auto px-6 py-3.5 text-[0.8125rem] disabled:opacity-50 disabled:cursor-not-allowed"
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
 <div className="border-2 border-[var(--line)] bg-[var(--paper)] p-5 sm:p-7 space-y-5 min-h-[380px] sm:min-h-[440px] flex flex-col justify-between">
          <div>
 <div className="flex items-baseline justify-between gap-3 pb-3 border-b-2 border-[var(--line)]">
 <h2 className="poster-display text-2xl leading-none">
                Hasil Kuis Ajaib
              </h2>

 <div className="flex items-center gap-1.5 text-slate-400 ">
                <button
                  type="button"
                  onClick={() => setFeedbackGiven('up')}
                  className={`p-1.5 rounded-lg hover:bg-slate-100  transition-colors ${
                    feedbackGiven === 'up' ? 'text-teal-600 bg-teal-50 ' : ''
                  }`}
                  aria-label="Suka hasil kuis"
                >
                  <ThumbsUp className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setFeedbackGiven('down')}
                  className={`p-1.5 rounded-lg hover:bg-slate-100  transition-colors ${
                    feedbackGiven === 'down' ? 'text-rose-600 bg-rose-50 ' : ''
                  }`}
                  aria-label="Kurang suka hasil kuis"
                >
                  <ThumbsDown className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleGenerate}
                  className="p-1.5 rounded-lg hover:bg-slate-100  transition-colors"
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
 <div className="absolute inset-0 rounded-2xl bg-teal-500/20  animate-ping" />
                  <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-tr from-teal-600 via-cyan-500 to-indigo-600 p-[2px] shadow-lg">
 <div className="w-full h-full rounded-[14px] bg-white  flex items-center justify-center text-teal-600 ">
                      <Sparkles className="w-8 h-8 animate-spin-slow text-teal-500" />
                    </div>
                  </div>
                </div>
                <div className="space-y-1">
 <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50  border border-teal-200  text-teal-800  text-xs font-semibold">
                    <span className="w-2 h-2 rounded-full bg-teal-500 animate-ping" />
 <span>Sedang merancang butir soal... </span>
                  </div>
 <p className="text-xs text-slate-500  max-w-xs">{statusMessage}</p>
                </div>
              </div>
            )}

            {/* Generated Quiz Result */}
            {!isLoading && generatedQuiz && (
              <div className="space-y-4 pt-2">
 <div className="bg-[var(--paper-2)] p-4 border-2 border-[var(--line)] space-y-2.5">
                  <div className="flex items-center justify-between">
 <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[var(--signal)] text-[var(--on-accent)] ">
                      {generatedQuiz.subject} • {generatedQuiz.gradeLevel}
                    </span>
                    <div className="flex items-center gap-1.5">
 <span className="text-xs font-mono font-bold text-slate-700  bg-white  px-2 py-0.5 rounded-lg border border-teal-200 ">
                        PIN: {generatedQuiz.code}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyCode}
                        className="p-1 rounded-md text-slate-600  hover:bg-white  transition-colors cursor-pointer"
                        title="Salin PIN Kuis"
                      >
                        {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600 " /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

 <h3 className="text-[1.0625rem] leading-snug">
                    {generatedQuiz.title}
                  </h3>
 <p className="text-[0.8125rem] leading-relaxed text-[var(--ink-soft)]">
                    {generatedQuiz.description}
                  </p>

 <div className="tnum flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.75rem] text-[var(--ink-soft)] pt-1">
                    <span>{generatedQuiz.questions.length} Soal Pilihan Ganda</span>
                    <span>•</span>
                    <span>{generatedQuiz.durationMinutes > 0 ? `${generatedQuiz.durationMinutes} Menit` : 'Tanpa Waktu'}</span>
                    <span>•</span>
                    <span>KKM: {generatedQuiz.passingGrade}</span>
                  </div>
                </div>

                {/* Preview Soal with AI Smart Scoring */}
                <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
 <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-slate-100 ">
                    <div className="flex items-center gap-1.5 flex-wrap">
 <span className="text-xs font-bold text-slate-600  uppercase tracking-wider">
                        Kisi-kisi:
                      </span>
 <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100  text-emerald-800  border border-emerald-300 ">
                         Total {generatedQuiz.questions.reduce((sum, q) => sum + (Number(q.points) || 0), 0)} / 100 Poin
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleSmartScoreInWorkspace}
                      disabled={isSmartScoring}
                      title="AI menganalisis tingkat kesulitan dan jenis soal agar total tepat 100 poin"
                      className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-teal-500 via-cyan-500 to-indigo-600 hover:from-teal-600 hover:to-indigo-700 text-white font-bold text-[10px] flex items-center gap-1 shadow-xs transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Sparkles className={`w-3 h-3 ${isSmartScoring ? 'animate-spin' : ''}`} />
                      <span>{isSmartScoring ? 'Menilai...' : 'Atur Poin Pintar (AI)'}</span>
                    </button>
                  </div>

                  {smartScoreNote && (
 <div className="p-2 rounded-lg bg-teal-50  border border-teal-200  text-teal-800  text-[11px] flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                        <span>{smartScoreNote}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSmartScoreNote(null)}
                        className="text-teal-600 p-0.5 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  {generatedQuiz.questions.map((q, qIndex) => (
 <div key={q.id || qIndex} className="p-3 rounded-xl bg-slate-50  border border-slate-200/80  text-xs space-y-1.5">
 <div className="font-semibold text-slate-800  flex items-start justify-between gap-1.5">
                        <div className="flex items-start gap-1.5 min-w-0">
 <span className="w-5 h-5 rounded-full bg-teal-100  text-teal-800  text-[10px] flex items-center justify-center shrink-0">
                            {qIndex + 1}
                          </span>
                          <span className="line-clamp-2">{q.text}</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {q.difficultyTag && (
 <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-50  text-indigo-700  border border-indigo-200  font-medium">
                              {q.difficultyTag}
                            </span>
                          )}
 <span className="text-[10px] font-bold text-teal-700  bg-teal-50  px-1.5 py-0.5 rounded border border-teal-200 ">
                            {q.points || 10}p
                          </span>
                        </div>
                      </div>
                      {q.options && q.options.length > 0 && (
                        <div className="grid grid-cols-2 gap-1 pl-6 pt-1">
                          {q.options.map((opt, oIdx) => (
                            <div
                              key={oIdx}
                              className={`px-2 py-1 rounded-lg text-[11px] truncate ${
                                oIdx === q.correctOption
                                  ? 'bg-emerald-100  text-emerald-900  font-semibold border border-emerald-300 '
                                  : 'bg-white  text-slate-600  border border-slate-200 '
                              }`}
                            >
                              <span className="font-bold mr-1">{String.fromCharCode(65 + oIdx)}.</span> {opt}
                            </div>
                          ))}
                        </div>
                      )}
                      {q.acceptedAnswers && q.acceptedAnswers.length > 0 && (
 <div className="pl-6 pt-1 text-[11px] text-teal-700  font-medium">
 <span className="bg-teal-50  px-2 py-0.5 rounded border border-teal-200 ">
                            Kunci Jawaban: {q.acceptedAnswers.join(', ')}
                          </span>
                        </div>
                      )}
                      {q.matchingPairs && q.matchingPairs.length > 0 && (
                        <div className="pl-6 pt-1 text-[11px] space-y-1">
                          {q.matchingPairs.map((p, pIdx) => (
 <span key={pIdx} className="inline-block mr-2 px-2 py-0.5 rounded bg-indigo-50  border border-indigo-200  text-indigo-700 ">
                              {p.left} ⇄ {p.right}
                            </span>
                          ))}
                        </div>
                      )}
                      {q.explanation && (
 <div className="pl-6 pt-1 text-[11px] text-slate-500  italic">
                           {q.explanation}
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
                        ? 'bg-emerald-100  text-emerald-800  border border-emerald-300 '
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
                    className="px-4 py-2.5 rounded-xl bg-teal-50  hover:bg-teal-100  text-teal-800  font-bold text-xs flex items-center gap-1.5 border border-teal-200  transition-colors cursor-pointer"
                  >
 <Share2 className="w-4 h-4 text-teal-600 " />
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
 <div className="py-14 flex flex-col items-center justify-center text-center space-y-4 text-[var(--ink-soft)]">
 <div className="w-20 h-20 rounded-2xl bg-teal-50  border border-teal-200/80  flex items-center justify-center text-teal-600  shadow-xs">
                  <BookOpen className="w-10 h-10" />
                </div>
                <div className="space-y-1">
 <p className="text-[0.9375rem] font-semibold text-[var(--ink)]">
                    Kuis Anda Siap Dirancang
                  </p>
 <p className="text-[0.8125rem] leading-relaxed text-[var(--ink-soft)] max-w-xs">
                    Ketik topik atau pilih salah satu inspirasi di sebelah kiri, lalu klik &quot;Mulai Kirim!&quot; untuk menghasilkan kuis interaktif berpenjelasan cerdas.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer note in mockup */}
 <div className="pt-4 border-t-2 border-[var(--line)] text-center">
 <p className="text-[0.75rem] text-[var(--ink-soft)]">
              Kekuatan Google AI Studio • Terdeploy di Vercel via GitHub
            </p>
          </div>
        </div>

      </div>

    </div>
  );
};
