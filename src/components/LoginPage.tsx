import React, { useState } from 'react';
import { signInWithPopup, signInWithRedirect, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../firebase';
import { AlertCircle } from 'lucide-react';

export function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error('Error signing in with Google popup:', error);
      // If popup is blocked or cross-origin iframe issue, fallback or suggest redirect
      if (error?.code === 'auth/popup-blocked' || error?.code === 'auth/popup-closed-by-user' || error?.message?.includes('popup')) {
        setErrorMsg('Popup Google diblokir oleh browser atau iframe pratinjau. Mencoba metode Redirect...');
        try {
          const provider = new GoogleAuthProvider();
          await signInWithRedirect(auth, provider);
          return;
        } catch (redirectError: any) {
          console.error('Redirect login error:', redirectError);
          setErrorMsg(`Gagal login: ${redirectError?.message || 'Terjadi kesalahan'}`);
        }
      } else {
        setErrorMsg(`Gagal login: ${error?.message || 'Terjadi kesalahan'}. Pastikan domain Anda diizinkan di Firebase Console.`);
      }
      setLoading(false);
    }
  };

  const handleRedirectLogin = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithRedirect(auth, provider);
    } catch (error: any) {
      console.error('Redirect login error:', error);
      setErrorMsg(`Gagal login (Redirect): ${error?.message || 'Terjadi kesalahan'}`);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#E8F8F5] via-[#F4F9F9] to-[#EBF5FB] dark:from-slate-950 dark:via-slate-900 dark:to-[#0b1324] p-4">
      <div className="w-full max-w-md p-8 bg-white dark:bg-slate-900 shadow-2xl rounded-2xl border border-slate-200 dark:border-slate-800 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-tr from-teal-600 to-cyan-500 text-white flex items-center justify-center text-3xl shadow-lg">
          🎓
        </div>
        <h1 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 mb-2">Awang Long Quiz</h1>
        <p className="text-slate-600 dark:text-slate-400 mb-6 text-sm">
          Masuk ke akun guru Anda untuk mulai mengelola kuis dan ujian online.
        </p>

        {errorMsg && (
          <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-800 dark:text-amber-200 text-xs flex items-start gap-2.5 text-left">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold mb-1">Kendala Login Google</p>
              <p>{errorMsg}</p>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full px-6 py-3.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-lg transition-all duration-200 disabled:bg-slate-400 dark:disabled:bg-slate-700 flex items-center justify-center gap-2 cursor-pointer"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            {loading ? 'Memproses...' : 'Login dengan Google (Popup)'}
          </button>

          <button
            onClick={handleRedirectLogin}
            disabled={loading}
            className="w-full px-6 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-xl text-xs transition border border-slate-300 dark:border-slate-700 cursor-pointer"
          >
            Login dengan Redirect (Alternatif Iframe/Browser Ketat)
          </button>
        </div>

        <div className="mt-8 text-left bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
          <p className="font-bold text-slate-700 dark:text-slate-300">Catatan Popup Login:</p>
          <p>• Jika popup tidak muncul, hal ini disebabkan oleh pembatasan iframe keamanan browser atau domain belum terdaftar di Authorized Domains Firebase Console.</p>
          <p>• Gunakan tombol <strong>Redirect</strong> di atas jika popup diblokir.</p>
        </div>
      </div>
    </div>
  );
}

