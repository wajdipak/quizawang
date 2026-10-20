import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  ArrowRight,
  BookOpen,
  GraduationCap,
  KeyRound,
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import { Quiz, StudentSubmission } from '../types/quiz.js';
import { StudentExamPortal } from './StudentExamPortal.js';

interface Props {
  initialQuiz?: Quiz | null;
  availableQuizzes: Quiz[];
  onSubmissionComplete: (submission: StudentSubmission) => void;
  onBackToHome: () => void;
  isStandaloneExam?: boolean;
}

export const StudentQuizRoom: React.FC<Props> = ({
  initialQuiz,
  availableQuizzes,
  onSubmissionComplete,
  onBackToHome,
  isStandaloneExam = false
}) => {
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(initialQuiz || null);
  const [pinInput, setPinInput] = useState(initialQuiz?.code || '');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (initialQuiz) {
      setActiveQuiz(initialQuiz);
      setPinInput(initialQuiz.code);
    }
  }, [initialQuiz]);

  const handleSelectQuizByPin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanPin = pinInput.trim().toUpperCase();
    if (!cleanPin) {
      setErrorMessage('Silakan ketikkan Kode PIN Kuis dari Guru Anda.');
      return;
    }

    const matched = availableQuizzes.find(
      (q) => q.code.toUpperCase() === cleanPin && q.isActive
    );

    if (!matched) {
      setErrorMessage(`Kode PIN "${cleanPin}" tidak ditemukan atau kuis belum diaktifkan guru.`);
      return;
    }

    if (!matched.questions || matched.questions.length === 0) {
      setErrorMessage('Kuis ini belum memiliki butir soal.');
      return;
    }

    setActiveQuiz(matched);
  };

  // If a quiz is selected or passed via direct link, render the dedicated Student Exam Portal (Session 1 -> Session 2 -> Session 3)
  if (activeQuiz) {
    return (
      <div className="space-y-4">
        {/* Quick Back/Switch Quiz banner if not standalone link */}
        {!isStandaloneExam && (
          <div className="flex items-center justify-between px-2">
            <button
              type="button"
              onClick={() => {
                setActiveQuiz(null);
                setPinInput('');
              }}
              className="text-xs font-semibold text-slate-500 hover:text-teal-700 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span>← Ganti Kuis / Masukkan PIN Lain</span>
            </button>
            <span className="text-[11px] text-slate-400">
              Awang Long Quiz Siswa
            </span>
          </div>
        )}

        <StudentExamPortal
          quiz={activeQuiz}
          availableQuizzes={availableQuizzes}
          onSubmissionComplete={onSubmissionComplete}
          onBackToHome={onBackToHome}
          isStandaloneExam={isStandaloneExam}
        />
      </div>
    );
  }

  // If no quiz has been chosen yet, show PIN entry / Quiz Selector
  return (
    <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-4 sm:space-y-6 transition-colors">
        
        {/* Welcome Header */}
        <div className="text-center space-y-1.5 sm:space-y-2">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl sm:rounded-3xl bg-gradient-to-tr from-cyan-400 via-teal-400 to-sky-400 text-white flex items-center justify-center mx-auto text-2xl sm:text-3xl shadow-md">
            🎓
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-100">
            Portal Ujian Siswa
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            Masukkan Kode PIN Kuis yang diberikan oleh guru Anda untuk memulai ujian online (Sesi 1 Identitas, Sesi 2 Pengerjaan Soal).
          </p>
        </div>

        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs text-center font-semibold flex items-center justify-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* PIN Entry Form */}
        <form onSubmit={handleSelectQuizByPin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block text-center">
              Masukkan Kode PIN Kuis (6 Karakter):
            </label>
            <div className="max-w-xs mx-auto">
              <input
                type="text"
                required
                maxLength={10}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.toUpperCase())}
                placeholder="Contoh: AWG101"
                className="w-full text-center font-mono font-black text-2xl sm:text-3xl tracking-widest py-3 px-4 rounded-2xl border-2 border-teal-300 dark:border-teal-600 focus:border-teal-500 bg-teal-50/40 dark:bg-slate-800 text-teal-900 dark:text-teal-200 focus:outline-none uppercase shadow-inner placeholder:text-slate-300 dark:placeholder:text-slate-600 transition-colors"
              />
            </div>
            <p className="text-[11px] text-center text-slate-400 dark:text-slate-500">
              Kode PIN dapat dilihat di layar guru atau link tugas yang dibagikan.
            </p>
          </div>

          <div className="max-w-xs mx-auto pt-2">
            <button
              type="submit"
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-teal-500 via-cyan-500 to-sky-500 hover:from-teal-600 hover:to-sky-600 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Buka Halaman Ujian Siswa</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>

        {/* Available Active Quizzes list for easy testing & classroom access */}
        {availableQuizzes.length > 0 && (
          <div className="pt-5 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400 block uppercase tracking-wider text-center">
              Atau Pilih Kuis Aktif dari Guru:
            </span>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {availableQuizzes.map((quiz) => (
                <div
                  key={quiz.id}
                  onClick={() => setActiveQuiz(quiz)}
                  className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 hover:bg-teal-50/60 dark:hover:bg-slate-800 hover:border-teal-300 dark:hover:border-teal-700 transition-all cursor-pointer flex items-center justify-between gap-3 group"
                >
                  <div className="space-y-0.5">
                    <span className="font-bold text-xs text-slate-800 dark:text-slate-200 group-hover:text-teal-700 dark:group-hover:text-teal-300 transition-colors block">
                      {quiz.title}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      {quiz.subject} • {quiz.questions.length} Butir Soal • KKM {quiz.passingGrade}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono text-xs font-black px-2.5 py-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-teal-800 dark:text-teal-300 shadow-xs">
                      {quiz.code}
                    </span>
                    <span className="p-1.5 rounded-xl bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-400 group-hover:bg-teal-600 group-hover:text-white transition-colors">
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
