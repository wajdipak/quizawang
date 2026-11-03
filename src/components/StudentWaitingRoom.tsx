import React, { useState, useEffect } from 'react';
import {
  Clock,
  Sparkles,
  Shield,
  Users,
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Radio
} from 'lucide-react';
import { Quiz, QuizSession, StudentSubmission } from '../types/quiz.js';
import { subscribeQuizSessionsRealtime } from '../services/firebaseSync.js';
import { StudentExamPortal } from './StudentExamPortal.js';

interface Props {
  quiz: Quiz;
  session: QuizSession;
  availableQuizzes: Quiz[];
  onSubmissionComplete: (submission: StudentSubmission) => void;
  onBackToHome: () => void;
  isStandaloneExam?: boolean;
}

export const StudentWaitingRoom: React.FC<Props> = ({
  quiz,
  session: initialSession,
  availableQuizzes,
  onSubmissionComplete,
  onBackToHome,
  isStandaloneExam = false
}) => {
  const [session, setSession] = useState<QuizSession>(initialSession);
  const [countdownText, setCountdownText] = useState<string>('');

  // Subscribe to real-time session updates so that when teacher clicks "Mulai Ujian", session.isExamStarted becomes true instantly!
  useEffect(() => {
    const unsubscribe = subscribeQuizSessionsRealtime((sessions) => {
      const found = sessions.find((s) => s.id === initialSession.id || s.code.toUpperCase() === initialSession.code.toUpperCase());
      if (found) {
        setSession(found);
      }
    });
    return unsubscribe;
  }, [initialSession.id, initialSession.code]);

  // Check scheduled start time countdown if set
  useEffect(() => {
    if (!session.scheduledStartTime) return;

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const target = new Date(session.scheduledStartTime!).getTime();
      const diff = target - now;

      if (diff <= 0) {
        setCountdownText('Waktu mulai dijadwalkan telah tiba! Menunggu guru membuka ujian...');
        clearInterval(interval);
      } else {
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setCountdownText(`Ujian dimulai dalam: ${hours}j ${minutes}m ${seconds}d`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [session.scheduledStartTime]);

  // If teacher has started the exam, render StudentExamPortal!
  if (session.isExamStarted) {
    return (
      <StudentExamPortal
        quiz={quiz}
        availableQuizzes={availableQuizzes}
        onSubmissionComplete={onSubmissionComplete}
        onBackToHome={onBackToHome}
        isStandaloneExam={isStandaloneExam}
      />
    );
  }

  // Otherwise, render Waiting Room Screen
  return (
    <div className="max-w-xl mx-auto space-y-6 animate-in fade-in duration-300 py-6">
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xl text-center space-y-6 transition-colors">
        
        {/* Animated Waiting Icon */}
        <div className="relative w-20 h-20 mx-auto">
          <div className="absolute inset-0 rounded-full bg-amber-400/20 animate-ping" />
          <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center text-3xl shadow-lg">
            ⏳
          </div>
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold text-xs border border-amber-200 dark:border-amber-800">
            <Radio className="w-3.5 h-3.5 animate-pulse text-amber-600" />
            <span>Ruang Tunggu Ujian (Waiting Room)</span>
          </div>

          <h1 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-100">
            Menunggu Guru Memulai Ujian...
          </h1>

          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
            Anda telah berhasil masuk dengan PIN <strong>{session.code}</strong> untuk kuis <strong>{quiz.title}</strong>. Sesi ujian belum dimulai secara real-time oleh guru. Halaman ini akan otomatis beralih begitu ujian dimulai.
          </p>
        </div>

        {session.scheduledStartTime && (
          <div className="p-3.5 rounded-2xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-200 text-xs font-bold flex items-center justify-center gap-2">
            <Clock className="w-4 h-4 text-teal-600" />
            <span>{countdownText || `Jadwal Mulai: ${new Date(session.scheduledStartTime).toLocaleString()}`}</span>
          </div>
        )}

        {/* Info checklist */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-left space-y-2 text-xs text-slate-600 dark:text-slate-300">
          <div className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
            <span>📌 Informasi Sesi:</span>
          </div>
          <ul className="list-disc list-inside space-y-1 pl-1 text-[11px] text-slate-500 dark:text-slate-400">
            <li>Mode Ujian: <strong className="text-teal-700 dark:text-teal-300">{session.gameMode}</strong></li>
            <li>Mata Pelajaran: {quiz.subject} ({quiz.gradeLevel})</li>
            <li>Jumlah Butir Soal: {quiz.questions.length} Soal</li>
            <li>Sinkronisasi Real-Time: Aktif (Otomatis masuk saat guru menekan tombol mulai).</li>
          </ul>
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={onBackToHome}
            className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs inline-flex items-center gap-2 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Keluar / Masukkan PIN Lain</span>
          </button>
        </div>

      </div>
    </div>
  );
};
