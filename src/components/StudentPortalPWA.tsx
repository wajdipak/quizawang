import React, { useState, useEffect } from 'react';
import { StudentQuizRoom } from './StudentQuizRoom.js';
import { PWAInstallButton } from './PWAInstallButton.js';
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
      <div className="min-h-screen bg-white p-4">
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
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md text-center">
        <h1 className="text-2xl font-bold text-teal-800 mb-6">Awang Long Quiz - Siswa</h1>
        <input
          type="text"
          value={quizCode}
          onChange={(e) => setQuizCode(e.target.value)}
          placeholder="Masukkan Kode Kuis"
          className="w-full p-4 rounded-xl border border-slate-300 mb-4 text-center text-lg uppercase"
        />
        <button
          onClick={handleJoinQuiz}
          className="w-full bg-teal-600 text-white p-4 rounded-xl font-bold mb-4"
        >
          Mulai Ujian
        </button>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        <div className="mt-8 border-t pt-6">
          <PWAInstallButton />
        </div>
      </div>
    </div>
  );
};
