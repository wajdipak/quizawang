import React, { useState, useEffect } from 'react';
import { StudentQuizRoom } from './StudentQuizRoom.js';
import { PWAInstallButton } from './PWAInstallButton.js';
import { AccessibilityFloatingWidget } from './AccessibilityFloatingWidget.js';
import { Quiz, StudentSubmission } from '../types/quiz.js';
import {
  subscribeQuizzesRealtime,
  saveSubmissionToFirebase,
} from '../services/firebaseSync.js';

export const StudentPortalPWA: React.FC = () => {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [studentActiveQuiz, setStudentActiveQuiz] = useState<Quiz | null>(null);
  const [quizCode, setQuizCode] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const unsubQuizzes = subscribeQuizzesRealtime((syncedQuizzes) => {
      setQuizzes(syncedQuizzes);
    });
    return () => unsubQuizzes();
  }, []);

  const handleJoinQuiz = () => {
    const found = quizzes.find((q) => q.code.toUpperCase() === quizCode.toUpperCase());
    if (found) {
      setStudentActiveQuiz(found);
      setError('');
    } else {
      setError('Kode kuis tidak ditemukan.');
    }
  };

  if (studentActiveQuiz) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-3 sm:p-6 text-slate-800 dark:text-slate-100 transition-colors">
        <StudentQuizRoom
          initialQuiz={studentActiveQuiz}
          availableQuizzes={quizzes}
          onSubmissionComplete={async (sub: StudentSubmission) => {
            await saveSubmissionToFirebase(sub);
            setStudentActiveQuiz(null);
            alert('Jawaban berhasil dikirim!');
          }}
          isStandaloneExam={true}
          onBackToHome={() => setStudentActiveQuiz(null)}
        />
        <AccessibilityFloatingWidget />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E8F8F5] via-[#F4F9F9] to-[#EBF5FB] dark:from-slate-950 dark:via-slate-900 dark:to-[#0b1324] flex flex-col items-center justify-center p-4 sm:p-6 text-slate-800 dark:text-slate-100 transition-colors">
      <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl shadow-xl w-full max-w-md text-center border border-slate-200 dark:border-slate-800 space-y-4">
        {/* Brand Asset Logo with Dark/Light Mode Filter */}
        <div className="flex justify-center">
          <img
            src="/assets/aistudio/Quiz_20261023_131259_0000_ee40cbac.png"
            alt="Logo Awang Long Quiz"
            className="w-14 h-14 object-contain hover:scale-105 transition-transform dark:brightness-0 dark:invert dark:opacity-95"
          />
        </div>

        <div>
          <h1 className="text-xl sm:text-2xl font-black text-teal-800 dark:text-teal-300">
            Awang Long Quiz - Siswa
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Portal PWA resmi pengerjaan asesmen & kuis mandiri
          </p>
        </div>

        <div className="space-y-3 pt-2">
          <input
            type="text"
            value={quizCode}
            onChange={(e) => setQuizCode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleJoinQuiz();
            }}
            placeholder="Masukkan Kode Kuis (misal AWG101)"
            className="w-full p-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-center text-base sm:text-lg uppercase tracking-wider font-bold focus:ring-2 focus:ring-teal-500 outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />

          <button
            onClick={handleJoinQuiz}
            className="w-full bg-teal-600 hover:bg-teal-700 text-white p-3.5 rounded-xl font-bold text-sm shadow-md transition-all cursor-pointer"
          >
            Mulai Ujian
          </button>
        </div>

        {error && (
          <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 p-2 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800">
            {error}
          </p>
        )}

        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
          <PWAInstallButton />
        </div>
      </div>

      {/* Floating Accessibility Widget */}
      <AccessibilityFloatingWidget />
    </div>
  );
};
