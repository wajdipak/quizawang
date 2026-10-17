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
import { PesutMahakamMascot } from './PesutMahakamMascot.js';

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
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-6">
        
        {/* Welcome Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-cyan-400 via-teal-400 to-sky-400 text-white flex items-center justify-center mx-auto text-3xl shadow-md">
            🎓
          </div>
          <h1 className="text-2xl font-black text-slate-800">
            Portal Ujian Siswa
          </h1>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Masukkan Kode PIN Kuis yang diberikan oleh guru Anda untuk memulai ujian online (Sesi 1 Identitas, Sesi 2 Pengerjaan Soal).
          </p>
        </div>

        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs text-center font-semibold flex items-center justify-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* PIN Entry Form */}
        <form onSubmit={handleSelectQuizByPin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block text-center">
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
                className="w-full text-center font-mono font-black text-2xl sm:text-3xl tracking-widest py-3 px-4 rounded-2xl border-2 border-teal-300 focus:border-teal-500 bg-teal-50/40 text-teal-900 focus:outline-none uppercase shadow-inner placeholder:text-slate-300"
              />
            </div>
            <p className="text-[11px] text-center text-slate-400">
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
          <div className="pt-5 border-t border-slate-100 space-y-3">
            <span className="text-xs font-bold text-slate-600 block uppercase tracking-wider text-center">
              Atau Pilih Kuis Aktif dari Guru:
            </span>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {availableQuizzes.map((quiz) => (
                <div
                  key={quiz.id}
                  onClick={() => setActiveQuiz(quiz)}
                  className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-teal-50/60 hover:border-teal-300 transition-all cursor-pointer flex items-center justify-between gap-3 group"
                >
                  <div className="space-y-0.5">
                    <span className="font-bold text-xs text-slate-800 group-hover:text-teal-800 transition-colors block">
                      {quiz.title}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {quiz.subject} • {quiz.questions.length} Butir Soal • KKM {quiz.passingGrade}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono text-xs font-black px-2.5 py-1 rounded-xl bg-white border border-slate-200 text-teal-800 shadow-xs">
                      {quiz.code}
                    </span>
                    <span className="p-1.5 rounded-xl bg-teal-100 text-teal-700 group-hover:bg-teal-600 group-hover:text-white transition-colors">
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
