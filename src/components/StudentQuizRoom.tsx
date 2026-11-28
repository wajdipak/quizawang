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
import { Quiz, QuizSession, StudentSubmission } from '../types/quiz.js';
import { StudentExamPortal } from './StudentExamPortal.js';
import { StudentWaitingRoom } from './StudentWaitingRoom.js';
import { findQuizSessionByCode, findQuizById } from '../services/firebaseSync.js';
import { loadStoredQuizzes } from '../utils/storage.js';

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
  const [activeSession, setActiveSession] = useState<QuizSession | null>(null);
  const [pinInput, setPinInput] = useState(initialQuiz?.code || '');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);

  // Direct exam link: resolve only the matching session instead of downloading
  // the whole quiz_sessions collection for every student.
  useEffect(() => {
    if (!initialQuiz) return;
    let cancelled = false;
    findQuizSessionByCode(initialQuiz.code)
      .then((matched) => {
        if (!cancelled && matched) setActiveSession(matched);
      })
      .catch((err) => {
        console.error('[Firebase] Gagal mencari sesi untuk tautan langsung:', err);
      });
    return () => {
      cancelled = true;
    };
  }, [initialQuiz]);

  useEffect(() => {
    if (initialQuiz) {
      setActiveQuiz(initialQuiz);
      setPinInput(initialQuiz.code);
    }
  }, [initialQuiz]);

  const handleSelectQuizByPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanPin = pinInput.trim().toUpperCase();
    if (!cleanPin) {
      setErrorMessage('Silakan ketikkan Kode PIN Kuis dari Guru Anda.');
      return;
    }

    setIsLookingUp(true);
    try {
      // 1. Ask the server for exactly this PIN (one document read).
      const matchedSession = await findQuizSessionByCode(cleanPin);
      if (matchedSession) {
        const matchedQuiz =
          availableQuizzes.find((q) => q.id === matchedSession.quizId) ||
          loadStoredQuizzes().find((q) => q.id === matchedSession.quizId) ||
          (await findQuizById(matchedSession.quizId)) ||
          initialQuiz;
        if (matchedQuiz) {
          setActiveSession(matchedSession);
          setActiveQuiz(matchedQuiz);
          return;
        }
        setErrorMessage(
          `PIN "${cleanPin}" aktif, tetapi kuisnya belum termuat. Minta guru membuka ulang sesi kuis.`
        );
        return;
      }

      // 2. Fallback to direct quiz code
      const matched = availableQuizzes.find(
        (q) => q.code.toUpperCase() === cleanPin
      ) || loadStoredQuizzes().find(
        (q) => q.code.toUpperCase() === cleanPin
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
    } catch (err) {
      console.error('[Firebase] Pencarian PIN gagal:', err);
      setErrorMessage(
        'Server kuis belum bisa dihubungi (kuota/sinkronisasi Firebase). Coba lagi beberapa saat; kalau masih gagal, hubungi guru.'
      );
    } finally {
      setIsLookingUp(false);
    }
  };

  // If a session and quiz are selected, render StudentWaitingRoom (which gates on session.isExamStarted)
  if (activeQuiz && activeSession) {
    return (
      <div className="space-y-4">
        {!isStandaloneExam && (
          <div className="flex items-center justify-between px-2">
            <button
              type="button"
              onClick={() => {
                setActiveQuiz(null);
                setActiveSession(null);
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

        <StudentWaitingRoom
          quiz={activeQuiz}
          session={activeSession}
          availableQuizzes={availableQuizzes}
          onSubmissionComplete={onSubmissionComplete}
          onBackToHome={() => {
            setActiveQuiz(null);
            setActiveSession(null);
          }}
          isStandaloneExam={isStandaloneExam}
        />
      </div>
    );
  }

  // If a quiz is selected without session (fallback direct link)
  if (activeQuiz) {
    return (
      <div className="space-y-4">
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
          session={activeSession}
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
 <div className="bg-[var(--paper)] p-4 sm:p-6 lg:p-8 border-2 border-[var(--line)] space-y-5 sm:space-y-7">
        
        {/* Welcome Header */}
        <div className="text-center space-y-1.5 sm:space-y-2">
  <h1 className="text-xl sm:text-2xl font-black text-slate-800 ">
            Portal Ujian Siswa
          </h1>
 <p className="text-xs text-slate-500  max-w-sm mx-auto">
            Masukkan Kode PIN Kuis yang diberikan oleh guru Anda untuk masuk ke ruang tunggu dan memulai ujian online.
          </p>
        </div>

        {errorMessage && (
 <div className="p-3.5 rounded-2xl bg-rose-50  border border-rose-200  text-rose-700  text-xs text-center font-semibold flex items-center justify-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* PIN Entry Form */}
        <form onSubmit={handleSelectQuizByPin} className="space-y-4">
          <div className="space-y-1.5">
 <label className="text-xs font-bold text-slate-700  block text-center">
              Masukkan Kode PIN Kuis:
            </label>
            <div className="max-w-xs mx-auto">
              <input
                type="text"
                required
                maxLength={12}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.toUpperCase())}
                placeholder="CLS482"
                className="w-full text-center font-mono font-black text-2xl sm:text-3xl tracking-[0.18em] py-3 px-4 border-2 border-[var(--line)] bg-[var(--paper-2)] text-[var(--ink)] focus:outline-2 focus:outline-[var(--ink)] focus:outline-offset-2 uppercase placeholder:text-[var(--ink-soft)] placeholder:text-lg placeholder:tracking-[0.1em]"
              />
            </div>
 <p className="text-xs sm:text-sm text-center text-slate-400 ">
              Kode PIN baru dibuat otomatis oleh guru untuk setiap mode kuis.
            </p>
          </div>

          <div className="max-w-xs mx-auto pt-2">
            <button
              type="submit"
              disabled={isLookingUp}
              className="btn-ink w-full py-3.5 text-sm disabled:opacity-60"
            >
              <span>{isLookingUp ? 'Memeriksa PIN…' : 'Masuk Ruang Ujian'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>

        {/* Available Active Quizzes list for easy testing & classroom access */}
        {availableQuizzes.length > 0 && (
 <div className="pt-5 border-t-2 border-[var(--line)] space-y-3">
 <span className="text-xs font-bold text-slate-600  block uppercase tracking-wider text-center">
              Atau Pilih Kuis Aktif dari Guru:
            </span>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {availableQuizzes.map((quiz) => (
                <div
                  key={quiz.id}
                  onClick={() => setActiveQuiz(quiz)}
                  className="p-3.5 border-2 border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--signal)] transition-colors cursor-pointer flex items-center justify-between gap-3 group"
                >
                  <div className="space-y-0.5">
 <span className="font-bold text-xs text-slate-800  group-hover:text-teal-700  transition-colors block">
                      {quiz.title}
                    </span>
 <span className="text-xs sm:text-sm text-slate-500 ">
                      {quiz.subject} • {quiz.questions.length} Butir Soal • KKM {quiz.passingGrade}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
 <span className="font-mono text-xs font-black px-2.5 py-1 rounded-xl bg-white  border border-slate-200  text-teal-800  shadow-xs">
                      {quiz.code}
                    </span>
 <span className="p-1.5 rounded-xl bg-teal-100  text-teal-700  group-hover:bg-teal-600 group-hover:text-white transition-colors">
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
