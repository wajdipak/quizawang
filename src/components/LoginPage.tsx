import React, { useState } from 'react';
import { signInWithPopup, signInWithRedirect, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../firebase';

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
      // Popup is blocked in some iframes, so fall back to a full redirect.
      if (error?.code === 'auth/popup-blocked' || error?.code === 'auth/popup-closed-by-user' || error?.message?.includes('popup')) {
        setErrorMsg('Popup Google diblokir browser atau iframe pratinjau. Mencoba metode redirect...');
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
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)] flex flex-col">
      {/* Masthead */}
      <header className="border-b-2 border-[var(--line)]">
        <div className="max-w-[1400px] mx-auto flex items-stretch">
          <div className="flex items-center gap-3 px-4 sm:px-6 py-3 border-r-2 border-[var(--line)]">
            <img
              src="/assets/aistudio/Quiz_20261023_131259_0000_ee40cbac.png"
              alt="Logo Awang Long Quiz"
              className="w-9 h-9 object-contain  "
            />
            <span className="poster-display text-xl sm:text-2xl leading-none">Awang Long</span>
        </div>
          <div className="hidden sm:flex items-center px-4 py-3 border-r-2 border-[var(--line)]">
            <span className="poster-label">Portal Guru</span>
          </div>
          <div className="flex items-center px-4 py-3 ml-auto">
            <span className="poster-label text-[var(--ink-soft)]">Kuis &amp; Evaluasi</span>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-[1400px] mx-auto grid lg:grid-cols-[1.35fr_1fr] border-b-2 border-[var(--line)]">
          {/* Statement */}
          <section className="px-4 sm:px-8 py-8 sm:py-12 border-b-2 lg:border-b-0 lg:border-r-2 border-[var(--line)]">
            <p className="poster-label mb-6">Platform kuis online untuk guru</p>
            <h1 className="poster-display text-[clamp(3rem,9vw,7rem)]">
              Buat kuis,
              <br />
              bagikan
              <br />
              <span className="bg-[var(--signal)] px-2 py-1 text-[#0a0a0a] inline-block">tautannya.</span>
            </h1>

            <p className="mt-8 max-w-xl text-base sm:text-lg font-medium leading-snug">
              Soal dibuat dengan bantuan AI, tautan ujian dibagikan ke siswa, dan nilai
              terkumpul otomatis di rekap. Satu akun guru untuk semuanya.
        </p>

            <div className="mt-8 flex items-center gap-3 border-2 border-[var(--line)] w-fit px-3 py-2">
              <span className="w-3 h-3 bg-[var(--danger)]" aria-hidden="true" />
              <span className="poster-label">Akses khusus akun guru terdaftar</span>
            </div>
          </section>

          {/* Login panel */}
          <section className="px-4 sm:px-8 py-8 sm:py-12 bg-[var(--paper-2)]">
            <div className="border-2 border-[var(--line)] bg-[var(--paper)]">
              <div className="border-b-2 border-[var(--line)] px-4 py-3 flex items-baseline justify-between gap-3">
                <h2 className="text-2xl leading-none">Masuk</h2>
                <span className="poster-label text-[var(--ink-soft)]">01 / Akun</span>
              </div>

              <div className="p-4 sm:p-6">
                <p className="text-sm font-medium leading-snug mb-5">
                  Masuk dengan akun Google yang terdaftar sebagai guru untuk mengelola kuis
                  dan ujian.
                </p>

        {errorMsg && (
                  <div
                    role="alert"
                    className="mb-5 border-2 border-[var(--danger)] bg-[var(--danger-pale)] p-3 text-[13px] leading-snug"
                  >
                    <p className="poster-label mb-1 text-[var(--danger)]">Kendala login Google</p>
              <p>{errorMsg}</p>
            </div>
        )}

                <div className="space-y-2.5">
          <button
                    type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
                    className="btn-ink w-full py-3.5 text-sm"
          >
                    {loading ? 'Memproses...' : 'Masuk dengan Google'}
          </button>

          <button
                    type="button"
            onClick={handleRedirectLogin}
            disabled={loading}
                    className="w-full py-3 border-2 border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-2)] text-[11px] font-bold uppercase tracking-[0.08em] cursor-pointer transition-colors disabled:opacity-45 disabled:cursor-not-allowed"
          >
                    Masuk lewat redirect (alternatif iframe)
          </button>
        </div>

                <div className="mt-6 border-t-2 border-[var(--line)] pt-3 text-[12px] leading-snug text-[var(--ink-soft)]">
                  <p className="poster-label text-[var(--ink)] mb-1.5">Catatan popup</p>
                  <p>
                    Jika popup tidak muncul, browser memblokirnya dari dalam iframe atau domain
                    belum terdaftar di Authorized Domains Firebase Console. Pakai tombol redirect.
                  </p>
        </div>
      </div>
    </div>
          </section>
        </div>

        {/* Feature strip: real capabilities only */}
        <div className="max-w-[1400px] mx-auto grid sm:grid-cols-3 border-b-2 border-[var(--line)]">
          <div className="px-4 sm:px-6 py-4 border-b-2 sm:border-b-0 sm:border-r-2 border-[var(--line)] flex items-baseline gap-3">
            <span className="poster-display text-3xl leading-none">01</span>
            <div>
              <p className="poster-label">Generator AI</p>
              <p className="text-[12px] text-[var(--ink-soft)] mt-0.5">Soal dibuat dari materi atau file.</p>
            </div>
          </div>
          <div className="px-4 sm:px-6 py-4 border-b-2 sm:border-b-0 sm:border-r-2 border-[var(--line)] flex items-baseline gap-3">
            <span className="poster-display text-3xl leading-none">02</span>
            <div>
              <p className="poster-label">Tautan ujian</p>
              <p className="text-[12px] text-[var(--ink-soft)] mt-0.5">Bagikan satu tautan ke siswa.</p>
            </div>
          </div>
          <div className="px-4 sm:px-6 py-4 flex items-baseline gap-3">
            <span className="poster-display text-3xl leading-none">03</span>
            <div>
              <p className="poster-label">Rekap nilai</p>
              <p className="text-[12px] text-[var(--ink-soft)] mt-0.5">Skor dan analitik per kelas.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
