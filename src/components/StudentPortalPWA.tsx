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
      <div className="min-h-screen bg-slate-50  p-3 sm:p-6 text-slate-800  transition-colors">
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
    <div className="min-h-screen bg-[var(--paper)] flex flex-col items-center justify-center p-4 sm:p-6 text-[var(--ink)]">
      <div className="bg-[var(--paper)] p-6 sm:p-8 w-full max-w-md text-center border-2 border-[var(--line)] space-y-4">
        {/* Brand Asset Logo with Dark/Light Mode Filter */}
        <div className="flex justify-center">
          <img
            src="/logo-awang-quiz.png"
            alt="Logo Awang Long Quiz"
            className="w-14 h-14 object-contain hover:scale-105 transition-transform   "
          />
        </div>

        <div>
          <h1 className="text-xl sm:text-2xl font-black text-teal-800 ">
            Awang Long Quiz - Siswa
          </h1>
          <p className="text-xs text-slate-500  mt-1">
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
            className="w-full p-3.5 rounded-xl border border-slate-300  bg-white  text-slate-900  text-center text-base sm:text-lg uppercase tracking-wider font-bold focus:ring-2 focus:ring-teal-500 outline-none placeholder:text-slate-400 "
          />

          <button
            onClick={handleJoinQuiz}
            className="w-full bg-teal-600 hover:bg-teal-700 text-white p-3.5 rounded-xl font-bold text-sm shadow-md transition-all cursor-pointer"
          >
            Mulai Ujian
          </button>
        </div>

        {error && (
          <p className="text-xs font-semibold text-rose-600  p-2 rounded-lg bg-rose-50  border border-rose-200 ">
            {error}
          </p>
        )}

        <div className="mt-6 pt-4 border-t border-slate-100 ">
          <PWAInstallButton />
        </div>
      </div>

      {/* Floating Accessibility Widget */}
      <AccessibilityFloatingWidget />
    </div>
  );
};
