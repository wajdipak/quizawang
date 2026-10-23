import React, { useState } from 'react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../firebase';

export function LoginPage() {
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Error signing in with Google', error);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#E8F8F5] via-[#F4F9F9] to-[#EBF5FB] dark:from-slate-950 dark:via-slate-900 dark:to-[#0b1324] p-4">
      <div className="w-full max-w-md p-8 bg-white dark:bg-slate-900 shadow-2xl rounded-2xl border border-slate-200 dark:border-slate-800 text-center">
        <div className="text-4xl mb-4">🎓</div>
        <h1 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 mb-2">Awang Long Quiz</h1>
        <p className="text-slate-600 dark:text-slate-400 mb-8">
          Masuk ke akun guru Anda untuk mulai mengelola kuis.
        </p>
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-lg transition-all duration-200 disabled:bg-slate-400 dark:disabled:bg-slate-700"
        >
          {loading ? 'Memproses...' : 'Login dengan Google'}
        </button>
      </div>
    </div>
  );
}
