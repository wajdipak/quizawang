import React from 'react';
import { Sparkles, BookOpen, Users, Award, Shield, Tag, GraduationCap } from 'lucide-react';

export type NavTab = 'beranda' | 'kuis-guru' | 'bank-kategori' | 'ruang-siswa' | 'rekap-nilai';
export type UserRole = 'guru' | 'siswa';

interface Props {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  savedQuizCount: number;
}

import { FirebaseSyncBadge } from './FirebaseSyncBadge.js';

export const Navbar: React.FC<Props> = ({
  activeTab,
  setActiveTab,
  userRole,
  setUserRole,
  savedQuizCount
}) => {
  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-white/70 border-b border-teal-100/60 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('beranda')}>
            <div className="relative w-10 h-10 rounded-full p-[2px] bg-gradient-to-tr from-pink-500 via-amber-400 via-emerald-400 to-cyan-500 shadow-sm hover:scale-105 transition-transform flex items-center justify-center">
              <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                <span className="text-lg">🐬</span>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-teal-700 via-cyan-700 to-indigo-800 bg-clip-text text-transparent">
                  Awang Long Quiz
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 border border-teal-200">
                  AI Play
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                Platform Kuis Online Guru & Siswa Nusantara
              </p>
            </div>
          </div>

          {/* Desktop Nav Tabs */}
          <nav className="hidden md:flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-2xl border border-slate-200/80">
            <button
              onClick={() => setActiveTab('beranda')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
                activeTab === 'beranda'
                  ? 'bg-white text-teal-800 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-teal-600" />
              <span>Beranda</span>
            </button>

            <button
              onClick={() => setActiveTab('kuis-guru')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
                activeTab === 'kuis-guru'
                  ? 'bg-white text-teal-800 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
              <span>Kuis Guru</span>
              {savedQuizCount > 0 && (
                <span className="ml-0.5 text-[10px] px-1.5 py-0.2 rounded-full bg-teal-100 text-teal-700 font-semibold">
                  {savedQuizCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('bank-kategori')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
                activeTab === 'bank-kategori'
                  ? 'bg-white text-teal-800 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Tag className="w-3.5 h-3.5 text-indigo-600" />
              <span>Bank Soal & Kategori</span>
            </button>

            <button
              onClick={() => setActiveTab('ruang-siswa')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
                activeTab === 'ruang-siswa'
                  ? 'bg-white text-teal-800 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5 text-sky-600" />
              <span>Ruang Siswa</span>
            </button>

            <button
              onClick={() => setActiveTab('rekap-nilai')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
                activeTab === 'rekap-nilai'
                  ? 'bg-white text-teal-800 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Award className="w-3.5 h-3.5 text-amber-600" />
              <span>Rekap Nilai</span>
            </button>
          </nav>

          {/* Right Controls */}
          <div className="flex items-center gap-2.5">
            {/* Live Firebase Sync Badge */}
            <FirebaseSyncBadge />

            {/* Role switch toggle */}
            <div className="flex items-center p-0.5 bg-slate-200/70 rounded-full border border-slate-300/60">
              <button
                type="button"
                onClick={() => setUserRole('guru')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  userRole === 'guru'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Beralih ke Mode Guru"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Guru</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setUserRole('siswa');
                  if (activeTab === 'kuis-guru' || activeTab === 'bank-kategori') {
                    setActiveTab('ruang-siswa');
                  }
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  userRole === 'siswa'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Beralih ke Mode Siswa"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Siswa</span>
              </button>
            </div>

            {/* Karya Saya */}
            <button
              onClick={() => setActiveTab('kuis-guru')}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-700 text-xs font-medium hover:bg-slate-50 transition-colors shadow-xs"
            >
              <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-amber-200 to-teal-200 flex items-center justify-center text-slate-700 font-bold text-[10px]">
                WL
              </div>
              <span>Karya Saya</span>
            </button>
          </div>

        </div>

        {/* Mobile Navigation bar */}
        <div className="flex md:hidden items-center justify-around py-2 border-t border-slate-100 overflow-x-auto gap-1">
          <button
            onClick={() => setActiveTab('beranda')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${
              activeTab === 'beranda' ? 'bg-teal-50 text-teal-800 font-semibold' : 'text-slate-600'
            }`}
          >
            Beranda
          </button>
          <button
            onClick={() => setActiveTab('kuis-guru')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${
              activeTab === 'kuis-guru' ? 'bg-teal-50 text-teal-800 font-semibold' : 'text-slate-600'
            }`}
          >
            Kuis Guru ({savedQuizCount})
          </button>
          <button
            onClick={() => setActiveTab('bank-kategori')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${
              activeTab === 'bank-kategori' ? 'bg-teal-50 text-teal-800 font-semibold' : 'text-slate-600'
            }`}
          >
            Kategori
          </button>
          <button
            onClick={() => setActiveTab('ruang-siswa')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${
              activeTab === 'ruang-siswa' ? 'bg-teal-50 text-teal-800 font-semibold' : 'text-slate-600'
            }`}
          >
            Ruang Siswa
          </button>
          <button
            onClick={() => setActiveTab('rekap-nilai')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${
              activeTab === 'rekap-nilai' ? 'bg-teal-50 text-teal-800 font-semibold' : 'text-slate-600'
            }`}
          >
            Rekap Nilai
          </button>
        </div>
      </div>
    </header>
  );
};
