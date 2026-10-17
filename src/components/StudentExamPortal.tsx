import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  RotateCcw,
  Award,
  ArrowRight,
  ArrowLeft,
  Volume2,
  VolumeX,
  Sparkles,
  Send,
  BookOpen,
  Tag,
  Flag,
  User,
  GraduationCap,
  Hash,
  AlertTriangle,
  FileCheck,
  Check,
  ChevronRight,
  Share2,
  Copy,
  ExternalLink
} from 'lucide-react';
import {
  Quiz,
  Question,
  StudentSubmission,
  QuizResultCalculation,
  StudentAnswerValue,
  QuestionType
} from '../types/quiz.js';
import { calculateQuizScore, formatTimeRemaining } from '../utils/quizLogic.js';
import { playSelectSound, playSuccessSound, playTickSound } from '../utils/audio.js';
import { PesutMahakamMascot } from './PesutMahakamMascot.js';

interface Props {
  quiz: Quiz;
  availableQuizzes?: Quiz[];
  onSubmissionComplete: (submission: StudentSubmission) => void;
  onBackToHome?: () => void;
  isStandaloneExam?: boolean; // When opened via direct student link
}

export const StudentExamPortal: React.FC<Props> = ({
  quiz,
  availableQuizzes = [],
  onSubmissionComplete,
  onBackToHome,
  isStandaloneExam = false
}) => {
  // Session Step: 1 = Student Information, 2 = Question Answering, 3 = Instant Results
  const [currentSession, setCurrentSession] = useState<1 | 2 | 3>(1);

  // Sesi 1: Student Information State
  const [studentName, setStudentName] = useState('');
  const [studentNis, setStudentNis] = useState('');
  const [studentClass, setStudentClass] = useState('8-A SMP Awang Long');
  const [studentNote, setStudentNote] = useState('');
  const [infoError, setInfoError] = useState<string | null>(null);

  // Sesi 2: Question Examination State (1 question per page)
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, StudentAnswerValue>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Record<string, boolean>>({});
  const [secondsRemaining, setSecondsRemaining] = useState<number>(
    quiz.durationMinutes > 0 ? quiz.durationMinutes * 60 : 0
  );
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [timeSpentSeconds, setTimeSpentSeconds] = useState(0);

  // Sesi 3: Result State
  const [result, setResult] = useState<QuizResultCalculation | null>(null);

  const timerRef = useRef<any>(null);
  const startTimeRef = useRef<number>(Date.now());

  // Handle countdown timer during Session 2
  useEffect(() => {
    if (currentSession !== 2 || result !== null) return;

    if (quiz.durationMinutes > 0) {
      timerRef.current = setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            handleSubmitQuiz();
            return 0;
          }
          if (prev <= 10 && soundEnabled) {
            playTickSound();
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentSession, quiz.durationMinutes, result, soundEnabled]);

  // Handle keyboard shortcuts (A, B, C, D) for multiple choice questions
  useEffect(() => {
    if (currentSession !== 2 || result !== null) return;
    const currentQ = quiz.questions[currentIndex];
    if (!currentQ || currentQ.type !== 'multiple_choice') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }
      const key = e.key.toUpperCase();
      if (['A', 'B', 'C', 'D'].includes(key)) {
        const index = key.charCodeAt(0) - 65;
        if (currentQ.options && index < currentQ.options.length) {
          handleSelectMultipleChoice(currentQ.id, index);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSession, quiz, currentIndex, result]);

  // Sesi 1 Validation & Proceed to Sesi 2
  const handleProceedToSession2 = (e: React.FormEvent) => {
    e.preventDefault();
    setInfoError(null);

    if (!studentName.trim()) {
      setInfoError('Silakan masukkan Nama Lengkap siswa.');
      return;
    }

    if (!studentNis.trim()) {
      setInfoError('Silakan masukkan Nomor Absen atau NIS siswa.');
      return;
    }

    if (!studentClass.trim()) {
      setInfoError('Silakan isi Kelas / Rombel siswa.');
      return;
    }

    if (!quiz.questions || quiz.questions.length === 0) {
      setInfoError('Kuis ini belum memiliki butir soal.');
      return;
    }

    // Reset session 2 timer and start
    const initialSeconds = quiz.durationMinutes > 0 ? quiz.durationMinutes * 60 : 0;
    setSecondsRemaining(initialSeconds);
    startTimeRef.current = Date.now();
    setCurrentIndex(0);
    setCurrentSession(2);

    if (soundEnabled) {
      playSuccessSound();
    }
  };

  // Multiple Choice Answer
  const handleSelectMultipleChoice = (questionId: string, optionIndex: number) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: optionIndex
    }));
    if (soundEnabled) playSelectSound();
  };

  // Short Answer Text
  const handleShortAnswerChange = (questionId: string, text: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: text
    }));
  };

  // Matching Answer
  const handleMatchingSelect = (questionId: string, leftText: string, rightText: string) => {
    setAnswers((prev) => {
      const currentMap = ((prev[questionId] as Record<string, string>) || {}) as Record<string, string>;
      const updated = { ...currentMap };

      if (!rightText) {
        delete updated[leftText];
      } else {
        updated[leftText] = rightText;
      }

      return {
        ...prev,
        [questionId]: updated
      };
    });
    if (soundEnabled) playSelectSound();
  };

  // Toggle Flag / Ragu-ragu
  const toggleFlagQuestion = (questionId: string) => {
    setFlaggedQuestions((prev) => ({
      ...prev,
      [questionId]: !prev[questionId]
    }));
  };

  // Submit and Grade Quiz
  const handleSubmitQuiz = () => {
    setShowSubmitModal(false);

    const calculation = calculateQuizScore(answers, quiz.questions, quiz.passingGrade);
    setResult(calculation);

    const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
    setTimeSpentSeconds(duration);

    // Build category scores
    const categoryScores: Record<string, { earned: number; total: number; percentage: number }> = {};
    Object.entries(calculation.categoryBreakdown).forEach(([cat, val]) => {
      categoryScores[cat] = {
        earned: val.earned,
        total: val.total,
        percentage: val.percentage
      };
    });

    const newSubmission: StudentSubmission = {
      id: `sub-${Date.now()}`,
      quizId: quiz.id,
      quizCode: quiz.code,
      studentName: studentName.trim(),
      studentNis: studentNis.trim(),
      studentClass: studentClass.trim() || 'Kelas Reguler',
      studentNote: studentNote.trim(),
      answers,
      score: calculation.score,
      earnedPoints: calculation.earnedPoints,
      totalPoints: calculation.totalPoints,
      correctCount: calculation.correctCount,
      totalQuestions: calculation.totalQuestions,
      isPassed: calculation.isPassed,
      timeSpentSeconds: Math.max(duration, 10),
      submittedAt: new Date().toISOString(),
      categoryScores
    };

    onSubmissionComplete(newSubmission);
    setCurrentSession(3);

    // Audio & Confetti on completion
    if (soundEnabled) playSuccessSound();

    if (calculation.isPassed) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  };

  // Count answered questions
  const totalQuestions = quiz.questions.length;
  const answeredQuestionIds = Object.keys(answers).filter((k) => {
    const a = answers[k];
    if (a === undefined || a === null) return false;
    if (typeof a === 'string') return a.trim().length > 0;
    if (typeof a === 'object') return Object.keys(a).length > 0;
    return true;
  });
  const answeredCount = answeredQuestionIds.length;
  const unansweredCount = totalQuestions - answeredCount;

  // Find first unanswered index for quick jump
  const getFirstUnansweredIndex = (): number => {
    for (let i = 0; i < totalQuestions; i++) {
      const q = quiz.questions[i];
      const ans = answers[q.id];
      const isAns =
        ans !== undefined &&
        ans !== null &&
        (typeof ans === 'string' ? ans.trim().length > 0 : typeof ans === 'object' ? Object.keys(ans).length > 0 : true);
      if (!isAns) return i;
    }
    return 0;
  };

  // ==========================================
  // SESI 1: KETERANGAN DIRI SISWA
  // ==========================================
  if (currentSession === 1) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-300">
        
        {/* Top Header Card */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 border border-slate-200/90 shadow-sm space-y-4 sm:space-y-6">
          
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3.5 sm:gap-4 text-center sm:text-left">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl sm:rounded-3xl bg-gradient-to-tr from-cyan-400 via-teal-400 to-emerald-400 text-white flex items-center justify-center text-2xl sm:text-3xl shadow-md shrink-0">
              🎓
            </div>
            <div className="space-y-1 sm:space-y-1.5 flex-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 sm:gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 font-bold text-[11px] sm:text-xs">
                  Sesi 1: Keterangan Diri Siswa
                </span>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono font-bold text-[11px] sm:text-xs">
                  PIN: {quiz.code}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-800 leading-tight">
                {quiz.title}
              </h1>
              <p className="text-xs text-slate-500 max-w-xl">
                {quiz.description || 'Silakan lengkapi data diri Anda sebelum masuk ke Sesi 2 untuk pengerjaan soal ujian kuis.'}
              </p>
            </div>
          </div>

          {/* Quiz Metadata Highlights */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-teal-50/50 border border-teal-100 text-center">
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 block">Jumlah Soal</span>
              <span className="text-base sm:text-lg font-black text-teal-900">{quiz.questions.length} Soal</span>
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 block">Mata Pelajaran</span>
              <span className="text-xs sm:text-sm font-bold text-teal-900 truncate block">{quiz.subject}</span>
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 block">Durasi Waktu</span>
              <span className="text-xs sm:text-sm font-bold text-teal-900">
                {quiz.durationMinutes > 0 ? `${quiz.durationMinutes} Menit` : 'Tanpa Batas'}
              </span>
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 block">KKM Kelulusan</span>
              <span className="text-base sm:text-lg font-black text-emerald-700">{quiz.passingGrade}</span>
            </div>
          </div>

          {infoError && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{infoError}</span>
            </div>
          )}

          {/* Sesi 1 Form Input */}
          <form onSubmit={handleProceedToSession2} className="space-y-4">
            <div className="border-t border-slate-100 pt-4">
              <h2 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">
                Identitas Siswa Pengerja:
              </h2>

              <div className="space-y-3.5">
                {/* Nama Lengkap */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-teal-600" />
                    <span>Nama Lengkap Siswa: <span className="text-rose-500">*</span></span>
                  </label>
                  <input
                    type="text"
                    required
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder="Contoh: Muhammad Rizky Pratama"
                    className="w-full text-xs p-3 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400/50"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* NIS / No. Absen */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Hash className="w-3.5 h-3.5 text-teal-600" />
                      <span>Nomor Absen / NIS: <span className="text-rose-500">*</span></span>
                    </label>
                    <input
                      type="text"
                      required
                      value={studentNis}
                      onChange={(e) => setStudentNis(e.target.value)}
                      placeholder="Contoh: Absen 18 / 20241029"
                      className="w-full text-xs p-3 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400/50"
                    />
                  </div>

                  {/* Kelas */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5 text-teal-600" />
                      <span>Kelas / Rombel: <span className="text-rose-500">*</span></span>
                    </label>
                    <input
                      type="text"
                      required
                      value={studentClass}
                      onChange={(e) => setStudentClass(e.target.value)}
                      placeholder="Contoh: 8-A / IX-IPA 2"
                      className="w-full text-xs p-3 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400/50"
                    />
                  </div>
                </div>

                {/* Catatan / Sekolah (Opsional) */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 block">
                    Asal Sekolah / Catatan Tambahan (Opsional):
                  </label>
                  <input
                    type="text"
                    value={studentNote}
                    onChange={(e) => setStudentNote(e.target.value)}
                    placeholder="Contoh: SMP Negeri Awang Long / Siap mengerjakan"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400/50"
                  />
                </div>
              </div>
            </div>

            {/* Petunjuk Pengerjaan */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 space-y-1.5">
              <div className="font-bold text-slate-700 flex items-center gap-1.5">
                <span>ℹ️ Petunjuk Pengerjaan di Sesi 2:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 pl-1 text-[11px] text-slate-500">
                <li>Sesi 2 menampilkan <strong>1 soal per halaman</strong> agar siswa dapat fokus penuh.</li>
                <li>Gunakan <strong>nomor soal di bagian atas</strong> untuk langsung berpindah ke nomor mana pun.</li>
                <li>Nomor berwarna <strong>hijau</strong> menandakan soal sudah dijawab.</li>
                <li>Tekan tombol <strong>"Selesai & Kumpulkan"</strong> saat Anda merasa sudah yakin dengan semua jawaban.</li>
              </ul>
            </div>

            {/* Action Button to Session 2 */}
            <button
              type="submit"
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-teal-500 via-cyan-500 to-sky-500 hover:from-teal-600 hover:to-sky-600 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Lanjut ke Sesi 2: Mulai Kerjakan Soal</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

        </div>

      </div>
    );
  }

  // ==========================================
  // SESI 2: PENGERJAAN SOAL (1 SOAL PER HALAMAN)
  // ==========================================
  if (currentSession === 2) {
    const currentQ = quiz.questions[currentIndex];
    const isLastQuestion = currentIndex === totalQuestions - 1;
    const progressPercent = Math.round(((currentIndex + 1) / totalQuestions) * 100);

    // Matching helper data
    const matchingPairs = currentQ?.matchingPairs || [];
    const availableRightOptions = Array.from(new Set(matchingPairs.map((p) => p.right)));
    const studentMatchingMap = ((answers[currentQ?.id] as Record<string, string>) || {}) as Record<string, string>;

    const currentAnswer = answers[currentQ?.id];
    const isCurrentAnswered =
      currentAnswer !== undefined &&
      currentAnswer !== null &&
      (typeof currentAnswer === 'string' ? currentAnswer.trim().length > 0 : typeof currentAnswer === 'object' ? Object.keys(currentAnswer).length > 0 : true);

    const isCurrentFlagged = Boolean(flaggedQuestions[currentQ?.id]);

    return (
      <div className="max-w-3xl mx-auto space-y-4 animate-in fade-in duration-300">
        
        {/* Top Header: Student Info, Title, Timer */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-slate-200 shadow-sm space-y-2.5 sm:space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2.5 sm:gap-3">
            
            {/* Student & Quiz info pill */}
            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl sm:rounded-2xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-xs sm:text-sm shrink-0">
                👤
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <span className="font-bold text-slate-800 text-xs sm:text-sm truncate">
                    {studentName}
                  </span>
                  <span className="text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold shrink-0">
                    {studentClass} • No. {studentNis}
                  </span>
                </div>
                <p className="text-[10px] sm:text-[11px] text-teal-700 font-medium truncate max-w-xs">
                  {quiz.title}
                </p>
              </div>
            </div>

            {/* Timer and Controls */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                title={soundEnabled ? 'Matikan Efek Suara' : 'Nyalakan Efek Suara'}
              >
                {soundEnabled ? <Volume2 className="w-4 h-4 text-teal-600" /> : <VolumeX className="w-4 h-4" />}
              </button>

              {quiz.durationMinutes > 0 && (
                <div
                  className={`flex items-center gap-1 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl text-[11px] sm:text-xs font-mono font-bold ${
                    secondsRemaining < 120
                      ? 'bg-rose-100 text-rose-700 border border-rose-200 animate-pulse'
                      : 'bg-teal-50 text-teal-800 border border-teal-200'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>{formatTimeRemaining(secondsRemaining)}</span>
                </div>
              )}

              {/* Direct Submit Button in Top Header */}
              <button
                type="button"
                onClick={() => setShowSubmitModal(true)}
                className="px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-[11px] sm:text-xs shadow-xs flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer"
                title="Kumpulkan Jawaban"
              >
                <Send className="w-3 h-3" />
                <span>Kumpulkan</span>
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-teal-400 via-cyan-400 to-emerald-400 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* CLICKABLE QUESTION NUMBER NAVIGATOR (SESI 2) */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-slate-200 shadow-sm space-y-2.5 sm:space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-1.5">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                Nomor Soal:
              </span>
              <span className="text-[10px] sm:text-[11px] text-slate-500">
                (Klik untuk berpindah)
              </span>
            </div>

            {/* Answer count indicator */}
            <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-semibold">
              <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                Terjawab: {answeredCount}/{totalQuestions}
              </span>
              {unansweredCount > 0 && (
                <span className="text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                  Belum: {unansweredCount}
                </span>
              )}
            </div>
          </div>

          {/* Question Grid Buttons */}
          <div className="flex flex-wrap gap-1 sm:gap-1.5 pt-1">
            {quiz.questions.map((q, idx) => {
              const ans = answers[q.id];
              const isAns =
                ans !== undefined &&
                ans !== null &&
                (typeof ans === 'string' ? ans.trim().length > 0 : typeof ans === 'object' ? Object.keys(ans).length > 0 : true);
              const isCurrent = idx === currentIndex;
              const isFlagged = Boolean(flaggedQuestions[q.id]);

              return (
                <button
                  key={q.id || idx}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  className={`relative min-w-8 h-8 sm:min-w-9 sm:h-9 md:min-w-10 md:h-10 px-1 rounded-xl sm:rounded-2xl font-bold text-xs transition-all flex items-center justify-center gap-0.5 cursor-pointer ${
                    isCurrent
                      ? 'ring-2 ring-teal-400 bg-teal-600 text-white shadow-md scale-105 z-10'
                      : isFlagged
                      ? 'bg-amber-100 text-amber-900 border border-amber-400 shadow-xs'
                      : isAns
                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                  }`}
                  title={`Soal No. ${idx + 1}${isAns ? ' (Sudah Dijawab)' : ' (Belum Dijawab)'}${isFlagged ? ' (Ragu-ragu)' : ''}`}
                >
                  <span>{idx + 1}</span>

                  {/* Status indicators */}
                  {isFlagged ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  ) : isAns && !isCurrent ? (
                    <Check className="w-2.5 h-2.5 text-emerald-700" />
                  ) : null}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 pt-2 border-t border-slate-100 text-[9px] sm:text-[10px] text-slate-500">
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-600 ring-1 ring-teal-300" />
              <span>Dibuka</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-200 border border-emerald-400" />
              <span>Sudah</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-200 border border-slate-300" />
              <span>Belum</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-300 border border-amber-500" />
              <span>Ragu</span>
            </div>
          </div>
        </div>

        {/* SINGLE QUESTION CARD (1 SOAL PER HALAMAN) */}
        {currentQ && (
          <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 border border-slate-200 shadow-sm space-y-4 sm:space-y-6 animate-in fade-in duration-200">
            
            {/* Top Badges for Current Question */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-teal-50 text-teal-800 font-black text-xs border border-teal-200">
                  <span>Nomor {currentIndex + 1} dari {totalQuestions}</span>
                </span>

                <span
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-xl border ${
                    currentQ.type === 'multiple_choice'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : currentQ.type === 'short_answer'
                      ? 'bg-cyan-50 text-cyan-800 border-cyan-200'
                      : 'bg-indigo-50 text-indigo-800 border-indigo-200'
                  }`}
                >
                  {currentQ.type === 'multiple_choice'
                    ? 'Pilihan Ganda'
                    : currentQ.type === 'short_answer'
                    ? 'Isian Singkat'
                    : 'Menjodohkan'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-medium text-slate-500 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200">
                  🏷️ {currentQ.category || 'Materi Umum'} • {currentQ.points || 10} Poin
                </span>

                <button
                  type="button"
                  onClick={() => toggleFlagQuestion(currentQ.id)}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    isCurrentFlagged
                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                  title="Tandai soal jika ragu-ragu"
                >
                  <Flag className={`w-3.5 h-3.5 ${isCurrentFlagged ? 'fill-amber-500 text-amber-600' : ''}`} />
                  <span className="hidden sm:inline">{isCurrentFlagged ? 'Ragu-ragu' : 'Tandai'}</span>
                </button>
              </div>
            </div>

            {/* Question Text */}
            <div className="space-y-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-800 leading-relaxed">
                {currentQ.text}
              </h2>
            </div>

            {/* ANSWER INPUT: PILIHAN GANDA */}
            {currentQ.type === 'multiple_choice' && (
              <div className="space-y-2.5 sm:space-y-3 pt-1 sm:pt-2">
                {(currentQ.options || []).map((opt, optIdx) => {
                  const isSelected = answers[currentQ.id] === optIdx;
                  const letter = String.fromCharCode(65 + optIdx);

                  return (
                    <button
                      key={optIdx}
                      type="button"
                      onClick={() => handleSelectMultipleChoice(currentQ.id, optIdx)}
                      className={`w-full text-left p-3 sm:p-4 rounded-xl sm:rounded-2xl border-2 transition-all flex items-center gap-2.5 sm:gap-3.5 cursor-pointer shadow-xs ${
                        isSelected
                          ? 'border-teal-500 bg-teal-50/70 text-teal-950 font-semibold ring-2 ring-teal-200/60'
                          : 'border-slate-200 bg-white hover:bg-slate-50/80 text-slate-700'
                      }`}
                    >
                      <span
                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-teal-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
                        }`}
                      >
                        {letter}
                      </span>
                      <span className="text-xs sm:text-sm flex-1 leading-snug">{opt}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* ANSWER INPUT: ISIAN SINGKAT */}
            {currentQ.type === 'short_answer' && (
              <div className="space-y-2.5 sm:space-y-3 pt-1 sm:pt-2">
                <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <label className="text-xs font-bold text-slate-700 block">
                    Ketikkan Jawaban Singkat Anda di bawah ini:
                  </label>
                  <input
                    type="text"
                    value={(answers[currentQ.id] as string) || ''}
                    onChange={(e) => handleShortAnswerChange(currentQ.id, e.target.value)}
                    placeholder="Ketik kata kunci jawaban yang tepat..."
                    className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400 font-medium text-slate-800"
                  />
                  <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] sm:text-[11px] text-slate-500 pt-1">
                    <span>💡 Tips: Jawaban tidak membedakan huruf besar/kecil.</span>
                    {(answers[currentQ.id] as string)?.trim() && (
                      <span className="text-emerald-700 font-bold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Jawaban Tersimpan
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ANSWER INPUT: MENJODOHKAN */}
            {currentQ.type === 'matching' && (
              <div className="space-y-2.5 sm:space-y-3 pt-1 sm:pt-2">
                <div className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-indigo-50/60 border border-indigo-200 text-xs text-indigo-900">
                  <span className="font-bold">Instruksi Menjodohkan:</span> Pilih pasangan yang paling tepat di kolom sebelah kanan untuk setiap butir pernyataan di kolom sebelah kiri.
                </div>

                <div className="space-y-2">
                  {matchingPairs.map((pair, pIdx) => {
                    const selectedRight = studentMatchingMap[pair.left] || '';

                    return (
                      <div
                        key={pair.id || pIdx}
                        className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3"
                      >
                        <div className="flex items-center gap-2 sm:w-1/2">
                          <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-indigo-100 text-indigo-800 font-bold text-xs flex items-center justify-center shrink-0">
                            {pIdx + 1}
                          </span>
                          <span className="text-xs font-semibold text-slate-800">{pair.left}</span>
                        </div>

                        <div className="sm:w-1/2">
                          <select
                            value={selectedRight}
                            onChange={(e) => handleMatchingSelect(currentQ.id, pair.left, e.target.value)}
                            className={`w-full text-xs p-2 sm:p-2.5 rounded-xl border font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
                              selectedRight
                                ? 'bg-indigo-50/80 border-indigo-300 text-indigo-950 font-bold'
                                : 'bg-white border-slate-300 text-slate-500'
                            }`}
                          >
                            <option value="">-- Pilih Pasangan yang Cocok --</option>
                            {availableRightOptions.map((opt, oIdx) => (
                              <option key={oIdx} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* BOTTOM NAVIGATION & SUBMIT BUTTON */}
            <div className="pt-3.5 sm:pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-3">
              
              {/* Previous Button */}
              <button
                type="button"
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                className="w-full sm:w-auto px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Soal Sebelumnya</span>
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                {/* Next Button (if not last) */}
                {!isLastQuestion && (
                  <button
                    type="button"
                    onClick={() => setCurrentIndex((prev) => Math.min(totalQuestions - 1, prev + 1))}
                    className="flex-1 sm:flex-none px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span>Soal Berikutnya</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}

                {/* Submit Button */}
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(true)}
                  className={`flex-1 sm:flex-none px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl text-white font-bold text-xs shadow-md flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    isLastQuestion
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700'
                      : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  <Send className="w-4 h-4" />
                  <span>Selesai & Kumpulkan</span>
                </button>
              </div>

            </div>

          </div>
        )}

        {/* SUBMIT CONFIRMATION MODAL */}
        {showSubmitModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95">
              
              <div className="w-14 h-14 rounded-3xl bg-gradient-to-tr from-teal-400 to-emerald-400 text-white flex items-center justify-center mx-auto text-2xl shadow-md">
                📝
              </div>

              <div className="text-center space-y-2">
                <h3 className="font-extrabold text-slate-800 text-lg">
                  Kumpulkan Tugas Kuis Sekarang?
                </h3>
                <p className="text-xs text-slate-500">
                  Pastikan Anda telah memeriksa kembali seluruh jawaban sebelum mengumpulkan ke guru.
                </p>
              </div>

              {/* Status summary */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Total Soal Kuis:</span>
                  <span className="font-bold text-slate-800">{totalQuestions} Butir</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-emerald-700 font-semibold">Sudah Terjawab:</span>
                  <span className="font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                    {answeredCount} Soal
                  </span>
                </div>
                {unansweredCount > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-rose-700 font-semibold">Belum Terjawab:</span>
                    <span className="font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded-md">
                      {unansweredCount} Soal
                    </span>
                  </div>
                )}
              </div>

              {/* Warning if there are unanswered questions */}
              {unansweredCount > 0 && (
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs space-y-1.5">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Perhatian: Masih ada {unansweredCount} soal belum terjawab!</span>
                  </div>
                  <p className="text-[11px] text-amber-700">
                    Anda disarankan untuk menjawab semua soal agar mendapatkan nilai maksimal.
                  </p>
                </div>
              )}

              {/* Modal Actions */}
              <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
                {unansweredCount > 0 ? (
                  <button
                    type="button"
                    onClick={() => {
                      setShowSubmitModal(false);
                      const targetIdx = getFirstUnansweredIndex();
                      setCurrentIndex(targetIdx);
                    }}
                    className="w-full sm:flex-1 py-3 rounded-2xl bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-xs transition-colors cursor-pointer"
                  >
                    Periksa Soal Kosong
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowSubmitModal(false)}
                    className="w-full sm:flex-1 py-3 rounded-2xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 cursor-pointer"
                  >
                    Periksa Kembali
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleSubmitQuiz}
                  className="w-full sm:flex-1 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                >
                  Ya, Kumpulkan Jawaban!
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    );
  }

  // ==========================================
  // SESI 3: HASIL & PENILAIAN OTOMATIS
  // ==========================================
  if (currentSession === 3 && result) {
    return (
      <div className="max-w-3xl mx-auto space-y-4 sm:space-y-6 animate-in fade-in duration-300">
        
        {/* Score & Congratulation Card */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 border border-slate-200 shadow-sm text-center space-y-4 sm:space-y-6 relative overflow-hidden">
          
          <div className="space-y-1.5 sm:space-y-2">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-teal-700 bg-teal-50 px-2.5 sm:px-3 py-1 rounded-full border border-teal-200">
              Penilaian Otomatis Selesai
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-800 leading-tight">
              {result.isPassed ? '🎉 Selamat! Anda Lulus Kuis' : '📚 Tetap Semangat, Tingkatkan Belajar!'}
            </h1>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Jawaban tugas kuis Anda telah dinilai secara otomatis oleh sistem Awang Long Quiz dan tersimpan langsung ke rekap guru.
            </p>
          </div>

          {/* Big Score Gauge */}
          <div className="inline-flex flex-col items-center justify-center w-32 h-32 sm:w-36 sm:h-36 rounded-full border-6 sm:border-8 border-teal-100 bg-gradient-to-b from-teal-50 to-white shadow-inner">
            <span className="text-3xl sm:text-4xl font-black text-teal-800">{result.score}</span>
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 sm:mt-1">
              Dari 100
            </span>
          </div>

          {/* Student Info Pill */}
          <div className="p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-200/80 inline-flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-xs text-slate-600">
            <span>👤 <strong>{studentName}</strong></span>
            <span>•</span>
            <span>🏫 {studentClass}</span>
            <span>•</span>
            <span>🔖 No. Absen: {studentNis}</span>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 text-left">
            <div className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-200/70">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Soal Benar</span>
              <span className="text-sm sm:text-base font-extrabold text-emerald-700">
                {result.correctCount} / {result.totalQuestions}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Poin Diperoleh</span>
              <span className="text-base font-extrabold text-teal-700">
                {result.earnedPoints} / {result.totalPoints}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">KKM Kelulusan</span>
              <span className="text-base font-extrabold text-slate-700">{quiz.passingGrade}</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Waktu Selesai</span>
              <span className="text-base font-extrabold text-cyan-700">
                {Math.floor(timeSpentSeconds / 60)}m {timeSpentSeconds % 60}s
              </span>
            </div>
          </div>

          {/* Category Breakdown */}
          {Object.keys(result.categoryBreakdown).length > 0 && (
            <div className="border-t border-slate-100 pt-5 text-left space-y-3">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-teal-600" />
                <span>Rincian Penguasaan Materi per Kategori:</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {Object.entries(result.categoryBreakdown).map(([category, val]) => (
                  <div key={category} className="p-3 rounded-2xl bg-teal-50/50 border border-teal-100 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">{category}</span>
                      <span className="font-extrabold text-teal-800">{val.percentage}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-teal-200/60 overflow-hidden">
                      <div
                        className="h-full bg-teal-600 rounded-full"
                        style={{ width: `${val.percentage}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Poin: {val.earned} / {val.total} ({val.questionCount} Soal)
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setAnswers({});
                setFlaggedQuestions({});
                setResult(null);
                setCurrentSession(1);
              }}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Kerjakan Ulang Kuis</span>
            </button>

            {onBackToHome && (
              <button
                type="button"
                onClick={onBackToHome}
                className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Selesai & Ke Beranda</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>

        </div>

        {/* Detailed Question Review Sheet */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-teal-100 text-teal-800 font-bold text-sm">
                📖
              </span>
              <div>
                <h2 className="font-bold text-base text-slate-800">
                  Lembar Pembahasan Jawaban
                </h2>
                <p className="text-xs text-slate-500">
                  Tinjau jawaban Anda dan pelajari pembahasan materi dari guru
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {result.breakdown.map((b, idx) => (
              <div
                key={b.questionId || idx}
                className={`p-4 sm:p-5 rounded-2xl border text-xs space-y-3 ${
                  b.isCorrect
                    ? 'bg-emerald-50/40 border-emerald-200'
                    : b.isPartial
                    ? 'bg-amber-50/40 border-amber-200'
                    : 'bg-rose-50/40 border-rose-200'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-6 h-6 rounded-lg font-bold text-xs flex items-center justify-center text-white ${
                        b.isCorrect
                          ? 'bg-emerald-600'
                          : b.isPartial
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <span className="font-bold text-slate-800 text-xs sm:text-sm">
                      {b.questionText}
                    </span>
                  </div>

                  <span
                    className={`font-bold px-2.5 py-1 rounded-xl text-[11px] shrink-0 ${
                      b.isCorrect
                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                        : b.isPartial
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : 'bg-rose-100 text-rose-900 border border-rose-300'
                    }`}
                  >
                    +{b.earnedPoints} / {b.points} Poin
                  </span>
                </div>

                {/* Answer Summary */}
                <div className="pl-8 space-y-1.5 text-xs">
                  <div>
                    <span className="font-semibold text-slate-600">Kunci Jawaban: </span>
                    <span className="font-bold text-emerald-800">{b.correctAnswerSummary}</span>
                  </div>

                  {b.matchingDetails && (
                    <div className="space-y-1 pt-1">
                      {b.matchingDetails.map((md, mIdx) => (
                        <div key={mIdx} className="text-[11px] flex items-center gap-2">
                          <span>{md.isMatched ? '✅' : '❌'}</span>
                          <span className="font-semibold">{md.left}</span>
                          <span>→</span>
                          <span>{md.studentRight || '(Kosong)'}</span>
                          {!md.isMatched && (
                            <span className="text-emerald-700 italic font-medium">
                              (Seharusnya: {md.correctRight})
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {b.explanation && (
                    <div className="pt-2 text-[11px] text-slate-600 bg-white/70 p-2.5 rounded-xl border border-slate-200/60 leading-relaxed">
                      💡 <strong>Pembahasan:</strong> {b.explanation}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

        </div>

      </div>
    );
  }

  return null;
};
