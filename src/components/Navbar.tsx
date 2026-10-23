import React from 'react';
import { Sparkles, BookOpen, Award, Shield, Tag, GraduationCap, CheckCircle } from 'lucide-react';
import { FirebaseSyncBadge } from './FirebaseSyncBadge.js';

export type NavTab = 'beranda' | 'kuis-guru' | 'bank-kategori' | 'ruang-siswa' | 'rekap-nilai';
export type UserRole = 'guru';

interface Props {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  savedQuizCount: number;
}

export const Navbar: React.FC<Props> = ({
  activeTab,
  setActiveTab,
  savedQuizCount
}) => {
  return (
    <>
      {/* Top Header for Desktop & Mobile Brand */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-white/90 dark:bg-slate-900/95 border-b border-slate-200/80 dark:border-slate-800 shadow-xs transition-colors">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16 gap-2">
            
            {/* Logo & Brand */}
            <div 
              className="flex items-center gap-2 sm:gap-3 cursor-pointer shrink-0" 
              onClick={() => setActiveTab('beranda')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter') setActiveTab('beranda'); }}
              aria-label="Kembali ke Beranda Awang Long Quiz"
            >
              <img src="/assets/aistudio/Quiz_20261023_131259_0000_ee40cbac.png" alt="Logo" className="w-8 h-8 sm:w-10 sm:h-10 object-contain hover:scale-105 transition-transform" />
              <div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="font-extrabold text-base sm:text-lg lg:text-xl tracking-tight bg-gradient-to-r from-teal-700 via-cyan-700 to-indigo-800 dark:from-teal-300 dark:via-cyan-200 dark:to-indigo-300 bg-clip-text text-transparent">
                    Awang Long
                  </span>
                  <span className="text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/90 text-teal-800 dark:text-teal-300 border border-teal-200/90 dark:border-teal-700/80 shrink-0">
                    Guru AI
                  </span>
                </div>
                <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
                  Portal Guru & Evaluasi Pembelajaran Cerdas
                </p>
              </div>
            </div>

            {/* Desktop Nav Tabs for Teacher - Dynamic: icon-only on constrained screens, full text on larger screens */}
            <nav className="hidden md:flex items-center gap-1 lg:gap-2 xl:gap-3">
              <button
                type="button"
                onClick={() => setActiveTab('beranda')}
                title="Beranda & Generator AI"
                aria-label="Beranda"
                className={`relative flex items-center gap-1.5 py-2 px-2.5 lg:px-3 text-xs tracking-tight transition-all duration-200 cursor-pointer group bg-transparent border-0 shrink-0 ${
                  activeTab === 'beranda'
                    ? 'text-teal-700 dark:text-teal-300 font-extrabold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-teal-700 dark:hover:text-teal-300 font-medium'
                }`}
              >
                <Sparkles className={`w-4 h-4 transition-transform duration-200 shrink-0 ${
                  activeTab === 'beranda' 
                    ? 'scale-110 text-teal-600 dark:text-teal-400' 
                    : 'text-slate-400 dark:text-slate-500 group-hover:scale-110 group-hover:text-teal-600 dark:group-hover:text-teal-400'
                }`} />
                <span className="hidden lg:inline whitespace-nowrap line-clamp-2 max-w-[110px] xl:max-w-none truncate leading-snug">
                  Beranda
                </span>
                {activeTab === 'beranda' && (
                  <span className="absolute bottom-0 left-1.5 right-1.5 lg:left-2 lg:right-2 h-0.5 bg-gradient-to-r from-teal-500 via-cyan-400 to-indigo-500 rounded-full shadow-[0_1px_6px_rgba(20,184,166,0.6)] animate-in fade-in zoom-in-95 duration-200" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('kuis-guru')}
                title="Kuis Guru"
                aria-label="Kuis Guru"
                className={`relative flex items-center gap-1.5 py-2 px-2.5 lg:px-3 text-xs tracking-tight transition-all duration-200 cursor-pointer group bg-transparent border-0 shrink-0 ${
                  activeTab === 'kuis-guru'
                    ? 'text-emerald-700 dark:text-emerald-300 font-extrabold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium'
                }`}
              >
                <div className="relative shrink-0">
                  <BookOpen className={`w-4 h-4 transition-transform duration-200 ${
                    activeTab === 'kuis-guru' 
                      ? 'scale-110 text-emerald-600 dark:text-emerald-400' 
                      : 'text-slate-400 dark:text-slate-500 group-hover:scale-110 group-hover:text-emerald-600 dark:group-hover:text-emerald-400'
                  }`} />
                  {savedQuizCount > 0 && (
                    <span className="absolute -top-1 -right-2 px-1 py-0.2 min-w-3.5 h-3.5 rounded-full bg-emerald-600 dark:bg-emerald-500 text-white font-black text-[8px] flex items-center justify-center shadow-xs">
                      {savedQuizCount}
                    </span>
                  )}
                </div>
                <span className="hidden lg:inline whitespace-nowrap line-clamp-2 max-w-[110px] xl:max-w-none truncate leading-snug">
                  Kuis Guru
                </span>
                {activeTab === 'kuis-guru' && (
                  <span className="absolute bottom-0 left-1.5 right-1.5 lg:left-2 lg:right-2 h-0.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 rounded-full shadow-[0_1px_6px_rgba(16,185,129,0.6)] animate-in fade-in zoom-in-95 duration-200" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('bank-kategori')}
                title="Bank Soal & Kategori"
                aria-label="Bank Soal"
                className={`relative flex items-center gap-1.5 py-2 px-2.5 lg:px-3 text-xs tracking-tight transition-all duration-200 cursor-pointer group bg-transparent border-0 shrink-0 ${
                  activeTab === 'bank-kategori'
                    ? 'text-indigo-700 dark:text-indigo-300 font-extrabold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium'
                }`}
              >
                <Tag className={`w-4 h-4 transition-transform duration-200 shrink-0 ${
                  activeTab === 'bank-kategori' 
                    ? 'scale-110 text-indigo-600 dark:text-indigo-400' 
                    : 'text-slate-400 dark:text-slate-500 group-hover:scale-110 group-hover:text-indigo-600 dark:group-hover:text-indigo-400'
                }`} />
                <span className="hidden lg:inline whitespace-nowrap line-clamp-2 max-w-[110px] xl:max-w-none truncate leading-snug">
                  Bank Soal
                </span>
                {activeTab === 'bank-kategori' && (
                  <span className="absolute bottom-0 left-1.5 right-1.5 lg:left-2 lg:right-2 h-0.5 bg-gradient-to-r from-indigo-500 via-purple-400 to-teal-500 rounded-full shadow-[0_1px_6px_rgba(99,102,241,0.6)] animate-in fade-in zoom-in-95 duration-200" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('rekap-nilai')}
                title="Rekap Nilai Siswa"
                aria-label="Rekap Nilai Siswa"
                className={`relative flex items-center gap-1.5 py-2 px-2.5 lg:px-3 text-xs tracking-tight transition-all duration-200 cursor-pointer group bg-transparent border-0 shrink-0 ${
                  activeTab === 'rekap-nilai'
                    ? 'text-amber-700 dark:text-amber-300 font-extrabold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-amber-700 dark:hover:text-amber-300 font-medium'
                }`}
              >
                <Award className={`w-4 h-4 transition-transform duration-200 shrink-0 ${
                  activeTab === 'rekap-nilai' 
                    ? 'scale-110 text-amber-600 dark:text-amber-400' 
                    : 'text-slate-400 dark:text-slate-500 group-hover:scale-110 group-hover:text-amber-600 dark:group-hover:text-amber-400'
                }`} />
                <span className="hidden lg:inline whitespace-nowrap line-clamp-2 max-w-[130px] xl:max-w-none truncate leading-snug">
                  <span className="hidden xl:inline">Rekap Nilai Siswa</span>
                  <span className="xl:hidden">Rekap Nilai</span>
                </span>
                {activeTab === 'rekap-nilai' && (
                  <span className="absolute bottom-0 left-1.5 right-1.5 lg:left-2 lg:right-2 h-0.5 bg-gradient-to-r from-amber-500 via-orange-400 to-teal-500 rounded-full shadow-[0_1px_6px_rgba(245,158,11,0.6)] animate-in fade-in zoom-in-95 duration-200" />
                )}
              </button>
            </nav>

            {/* Right Controls: Teacher Account Indicator & Sync */}
            <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
              {/* Live Firebase Sync Badge */}
              <FirebaseSyncBadge />

              {/* Permanent Teacher Account Badge */}
              <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200/90 dark:border-emerald-700/80 text-emerald-800 dark:text-emerald-200 shadow-xs">
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[10px] sm:text-[11px] shadow-xs shrink-0">
                  <Shield className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-[11px] sm:text-xs font-bold leading-tight flex items-center gap-1 text-emerald-900 dark:text-emerald-100">
                    Akun Guru
                    <CheckCircle className="w-3 h-3 text-emerald-600 dark:text-emerald-400 inline" />
                  </span>
                  <span className="text-[9px] sm:text-[10px] text-emerald-700 dark:text-emerald-300 hidden sm:inline leading-none">
                    Mode Pendidik
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </header>

      {/* Dynamic Mobile Bottom Navigation Bar: Background-free buttons with active icon/text glow and underline */}
      <nav 
        aria-label="Navigasi Bawah Layar Mobile"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200/90 dark:border-slate-800/90 shadow-[0_-4px_25px_rgba(0,0,0,0.15)] px-3 py-1.5 pb-[max(0.6rem,env(safe-area-inset-bottom))] transition-colors"
      >
        <div className="grid grid-cols-4 gap-1 max-w-md mx-auto items-center">
          {/* Beranda */}
          <button
            type="button"
            onClick={() => setActiveTab('beranda')}
            className={`flex flex-col items-center justify-center py-1.5 px-1 transition-all duration-200 cursor-pointer relative bg-transparent border-0 group ${
              activeTab === 'beranda'
                ? 'text-teal-700 dark:text-teal-300'
                : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
            title="Beranda & Generator AI"
          >
            <div className="relative">
              <Sparkles className={`w-5 h-5 transition-transform duration-200 ${
                activeTab === 'beranda' 
                  ? 'scale-115 -translate-y-0.5 text-teal-600 dark:text-teal-400 drop-shadow-[0_2px_8px_rgba(20,184,166,0.4)]' 
                  : 'group-hover:scale-105'
              }`} />
            </div>
            <span className={`text-[10px] mt-0.5 tracking-tight transition-all max-w-[68px] truncate line-clamp-1 max-[340px]:hidden ${
              activeTab === 'beranda' 
                ? 'font-bold text-teal-700 dark:text-teal-300' 
                : 'font-medium'
            }`}>
              Beranda
            </span>
            {activeTab === 'beranda' && (
              <span className="w-4 h-0.5 bg-gradient-to-r from-teal-500 to-cyan-400 rounded-full mt-0.5 shadow-[0_0_6px_rgba(20,184,166,0.7)] animate-in fade-in zoom-in-95 duration-200" />
            )}
          </button>

          {/* Kuis Guru */}
          <button
            type="button"
            onClick={() => setActiveTab('kuis-guru')}
            className={`flex flex-col items-center justify-center py-1.5 px-1 transition-all duration-200 cursor-pointer relative bg-transparent border-0 group ${
              activeTab === 'kuis-guru'
                ? 'text-emerald-700 dark:text-emerald-300'
                : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
            title="Kuis Guru"
          >
            <div className="relative">
              <BookOpen className={`w-5 h-5 transition-transform duration-200 ${
                activeTab === 'kuis-guru' 
                  ? 'scale-115 -translate-y-0.5 text-emerald-600 dark:text-emerald-400 drop-shadow-[0_2px_8px_rgba(16,185,129,0.4)]' 
                  : 'group-hover:scale-105'
              }`} />
              {savedQuizCount > 0 && (
                <span className="absolute -top-1 -right-2 px-1 py-0.2 min-w-3.5 h-3.5 rounded-full bg-emerald-600 dark:bg-emerald-500 text-white font-black text-[8px] flex items-center justify-center shadow-xs">
                  {savedQuizCount}
                </span>
              )}
            </div>
            <span className={`text-[10px] mt-0.5 tracking-tight transition-all max-w-[68px] truncate line-clamp-1 max-[340px]:hidden ${
              activeTab === 'kuis-guru' 
                ? 'font-bold text-emerald-700 dark:text-emerald-300' 
                : 'font-medium'
            }`}>
              Kuis Guru
            </span>
            {activeTab === 'kuis-guru' && (
              <span className="w-4 h-0.5 bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full mt-0.5 shadow-[0_0_6px_rgba(16,185,129,0.7)] animate-in fade-in zoom-in-95 duration-200" />
            )}
          </button>

          {/* Bank Soal */}
          <button
            type="button"
            onClick={() => setActiveTab('bank-kategori')}
            className={`flex flex-col items-center justify-center py-1.5 px-1 transition-all duration-200 cursor-pointer relative bg-transparent border-0 group ${
              activeTab === 'bank-kategori'
                ? 'text-indigo-700 dark:text-indigo-300'
                : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
            title="Bank Soal & Kategori"
          >
            <div className="relative">
              <Tag className={`w-5 h-5 transition-transform duration-200 ${
                activeTab === 'bank-kategori' 
                  ? 'scale-115 -translate-y-0.5 text-indigo-600 dark:text-indigo-400 drop-shadow-[0_2px_8px_rgba(99,102,241,0.4)]' 
                  : 'group-hover:scale-105'
              }`} />
            </div>
            <span className={`text-[10px] mt-0.5 tracking-tight transition-all max-w-[68px] truncate line-clamp-1 max-[340px]:hidden ${
              activeTab === 'bank-kategori' 
                ? 'font-bold text-indigo-700 dark:text-indigo-300' 
                : 'font-medium'
            }`}>
              Bank Soal
            </span>
            {activeTab === 'bank-kategori' && (
              <span className="w-4 h-0.5 bg-gradient-to-r from-indigo-500 to-purple-400 rounded-full mt-0.5 shadow-[0_0_6px_rgba(99,102,241,0.7)] animate-in fade-in zoom-in-95 duration-200" />
            )}
          </button>

          {/* Rekap Nilai */}
          <button
            type="button"
            onClick={() => setActiveTab('rekap-nilai')}
            className={`flex flex-col items-center justify-center py-1.5 px-1 transition-all duration-200 cursor-pointer relative bg-transparent border-0 group ${
              activeTab === 'rekap-nilai'
                ? 'text-amber-700 dark:text-amber-300'
                : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
            title="Rekap Nilai Siswa"
          >
            <div className="relative">
              <Award className={`w-5 h-5 transition-transform duration-200 ${
                activeTab === 'rekap-nilai' 
                  ? 'scale-115 -translate-y-0.5 text-amber-600 dark:text-amber-400 drop-shadow-[0_2px_8px_rgba(245,158,11,0.4)]' 
                  : 'group-hover:scale-105'
              }`} />
            </div>
            <span className={`text-[10px] mt-0.5 tracking-tight transition-all max-w-[68px] truncate line-clamp-1 max-[340px]:hidden ${
              activeTab === 'rekap-nilai' 
                ? 'font-bold text-amber-700 dark:text-amber-300' 
                : 'font-medium'
            }`}>
              Rekap Nilai
            </span>
            {activeTab === 'rekap-nilai' && (
              <span className="w-4 h-0.5 bg-gradient-to-r from-amber-500 to-orange-400 rounded-full mt-0.5 shadow-[0_0_6px_rgba(245,158,11,0.7)] animate-in fade-in zoom-in-95 duration-200" />
            )}
          </button>
        </div>
      </nav>
    </>
  );
};
