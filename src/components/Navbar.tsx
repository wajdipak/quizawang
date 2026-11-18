import React from 'react';
import { FirebaseSyncBadge } from './FirebaseSyncBadge.js';

export type NavTab = 'beranda' | 'kuis-guru' | 'bank-kategori' | 'ruang-siswa' | 'rekap-nilai';
export type UserRole = 'guru';

interface Props {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  savedQuizCount: number;
}

const TABS: { id: NavTab; label: string; note: string }[] = [
  { id: 'beranda', label: 'Beranda', note: 'Generator AI' },
  { id: 'kuis-guru', label: 'Kuis Guru', note: 'Kelola kuis' },
  { id: 'bank-kategori', label: 'Bank Soal', note: 'Kategori' },
  { id: 'rekap-nilai', label: 'Rekap Nilai', note: 'Analitik' }
];

export const Navbar: React.FC<Props> = ({ activeTab, setActiveTab, savedQuizCount }) => {
  return (
    <>
      {/* Masthead: one rule system, tab cells divided by ink lines. */}
      <header className="sticky top-0 z-40 bg-[var(--paper)] border-b-2 border-[var(--line)] pt-[env(safe-area-inset-top)]">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex flex-wrap items-stretch">
            <button
              type="button"
              onClick={() => setActiveTab('beranda')}
              aria-label="Kembali ke Beranda Awang Long Quiz"
              className="flex shrink-0 items-center gap-3 px-3.5 sm:px-6 py-3 sm:py-3.5 border-r-2 border-[var(--line)] cursor-pointer bg-[var(--paper)] hover:bg-[var(--signal)] transition-colors"
            >
              <img 
                src="/logo-awang-quiz.png" 
                alt="Logo Awang Long Quiz" 
                className="w-8 h-8 sm:w-9 sm:h-9 object-contain  "
              />
              <span className="poster-display text-xl sm:text-2xl leading-none whitespace-nowrap">
                    Awang Long
                  </span>
              </button>

            {/* Desktop tabs */}
            {/* Tabs get their own full-width row until lg, where everything fits one row. */}
            <nav
              aria-label="Navigasi utama"
              className="hidden md:flex items-stretch grow w-full lg:w-auto min-w-0 order-3 lg:order-2 border-t-2 lg:border-t-0 border-[var(--line)]"
            >
              {TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
              <button
                    key={tab.id}
                type="button"
                    onClick={() => setActiveTab(tab.id)}
                    aria-current={isActive ? 'page' : undefined}
                    title={tab.note}
                    className={`flex-1 min-w-0 px-3 lg:px-4 py-2.5 text-left border-r-2 border-[var(--line)] transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-[var(--signal)] text-[#0a0a0a] font-extrabold'
                        : 'bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-2)]'
                }`}
              >
                    <span className="poster-label block truncate">{tab.label}</span>
                    <span className="hidden xl:block text-xs leading-tight uppercase tracking-[0.08em] opacity-70 truncate">
                      {isActive && tab.id === 'kuis-guru' && savedQuizCount > 0
                        ? `${savedQuizCount} kuis tersimpan`
                        : tab.note}
                </span>
              </button>
                );
              })}
            </nav>

            <div className="order-2 lg:order-3 flex shrink-0 items-center gap-2 px-2 sm:px-3 ml-auto">
              <FirebaseSyncBadge />
              <div className="hidden sm:flex items-center gap-2 border-2 border-[var(--line)] px-2 py-1">
                <span className="w-2.5 h-2.5 bg-[var(--signal)] shrink-0" aria-hidden="true" />
                <span className="poster-label whitespace-nowrap">Akun Guru</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile navigation: same cells, pinned to the bottom edge. */}
      <nav 
        aria-label="Navigasi bawah"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--paper)] border-t-2 border-[var(--line)] pb-[env(safe-area-inset-bottom,0px)]"
          >
        <div className="grid grid-cols-4">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
          <button
                key={tab.id}
            type="button"
                onClick={() => setActiveTab(tab.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`flex min-h-[56px] items-center justify-center px-1 py-3 border-r-2 last:border-r-0 border-[var(--line)] transition-colors cursor-pointer active:bg-[var(--paper-3)] ${
                  isActive
                    ? 'bg-[var(--signal)] text-[#0a0a0a]'
                    : 'bg-[var(--paper)] text-[var(--ink)]'
            }`}
          >
                <span className="poster-label block text-xs leading-none text-center truncate">
                  {tab.label}
            </span>
          </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
