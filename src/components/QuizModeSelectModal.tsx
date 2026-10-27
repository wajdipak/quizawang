import React, { useState } from 'react';
import {
  X,
  Zap,
  Mountain,
  Gamepad2,
  ShieldAlert,
  Users,
  CheckCircle2,
  Sparkles,
  Play,
  Share2,
  Copy,
  Check,
  ChevronRight,
  Info,
  Timer,
  Award,
  Eye,
  Sliders,
  Flame,
  Shield,
  Coins
} from 'lucide-react';
import { Quiz, QuizGameMode, QuizSessionSettings } from '../types/quiz.js';

interface Props {
  quiz: Quiz;
  isOpen: boolean;
  onClose: () => void;
  onLaunchMode: (quiz: Quiz, settings: QuizSessionSettings) => void;
}

interface ModeCardInfo {
  id: QuizGameMode;
  name: string;
  subtitle: string;
  icon: React.ReactNode;
  tag: string;
  themeColor: string;
  borderColor: string;
  bgLight: string;
  bgActive: string;
  textColor: string;
  features: string[];
  pedagogy: string;
}

export const QuizModeSelectModal: React.FC<Props> = ({
  quiz,
  isOpen,
  onClose,
  onLaunchMode
}) => {
  const [selectedMode, setSelectedMode] = useState<QuizGameMode>('CLASSIC');
  const [enablePowerUps, setEnablePowerUps] = useState(true);
  const [streakBonusEnabled, setStreakBonusEnabled] = useState(true);
  const [masteryThreshold, setMasteryThreshold] = useState<number>(2);
  const [maxTabViolations, setMaxTabViolations] = useState<number>(3);
  const [teamName, setTeamName] = useState<'Tim Garuda' | 'Tim Rajawali'>('Tim Garuda');
  const [arcadeDurationMinutes, setArcadeDurationMinutes] = useState<number>(7);
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isOpen) return null;

  const modeCards: ModeCardInfo[] = [
    {
      id: 'CLASSIC',
      name: 'Mode Klasik (Classic)',
      subtitle: 'Gamifikasi Penuh & Pacuan Kecepatan',
      icon: <Zap className="w-5 h-5 text-amber-500" />,
      tag: 'Cepat & Kompetitif',
      themeColor: 'from-amber-500 to-orange-500',
      borderColor: 'border-amber-400 dark:border-amber-600',
      bgLight: 'bg-amber-50/70 dark:bg-amber-950/30',
      bgActive: 'border-amber-500 bg-amber-500/10 shadow-amber-500/10 shadow-md',
      textColor: 'text-amber-700 dark:text-amber-300',
      features: [
        'Formula Poin: Ketepatan × Sisa Waktu × Multiplier Streak',
        'Streak Bonus: 1.0x hingga 1.5x (5 berturut-turut)',
        '4 Power-Ups: 2x Poin, 50/50, Eraser, dan Perisai Imunitas',
        'Peringkat skor langsung (Dynamic Leaderboard)'
      ],
      pedagogy: 'Ideal untuk ice breaking, review materi mingguan, dan pengulangan konsep cepat yang memicu antusiasme.'
    },
    {
      id: 'MASTERY',
      name: 'Mode Penguasaan (Mastery Peak)',
      subtitle: 'Pendakian Puncak & Repetisi Adaptif',
      icon: <Mountain className="w-5 h-5 text-emerald-500" />,
      tag: 'Formatif & Mendalam',
      themeColor: 'from-emerald-500 to-teal-500',
      borderColor: 'border-emerald-400 dark:border-emerald-600',
      bgLight: 'bg-emerald-50/70 dark:bg-emerald-950/30',
      bgActive: 'border-emerald-500 bg-emerald-500/10 shadow-emerald-500/10 shadow-md',
      textColor: 'text-emerald-700 dark:text-emerald-300',
      features: [
        'Tanpa Tekanan Waktu: Fokus pada ketepatan dan pemahaman',
        'Adaptive Spaced Re-Queue: Soal salah otomatis diputar kembali',
        'Target Tuntas: 2x berturut-turut benar atau 1x tuntas bersih',
        'Peta Jalur Pendakian Gunung (Climbing Path Visualizer)'
      ],
      pedagogy: 'Bagus untuk pemahaman konsep sulit (HOTS) di mana kesalahan dijadikan momen belajar dan evaluasi mandiri.'
    },
    {
      id: 'PLAYGROUND',
      name: 'Mode Tempat Bermain (Arcade)',
      subtitle: 'Koin Arcade, Vault Heist & Freeze',
      icon: <Gamepad2 className="w-5 h-5 text-indigo-500" />,
      tag: 'Interaktif & Seru',
      themeColor: 'from-indigo-500 to-purple-500',
      borderColor: 'border-indigo-400 dark:border-indigo-600',
      bgLight: 'bg-indigo-50/70 dark:bg-indigo-950/30',
      bgActive: 'border-indigo-500 bg-indigo-500/10 shadow-indigo-500/10 shadow-md',
      textColor: 'text-indigo-700 dark:text-indigo-300',
      features: [
        'Jawab Benar = +50 Koin Arcade & +1 Energi Mini-Game',
        'Vault Heist: Bobol brankas skor acak dengan peluang jackpot',
        'Screen Freeze: Efek sabotase es interaktif dengan ketukan pecah es',
        'Time-Boxed Sync: Batas waktu game terkoordinasi (7 Menit)'
      ],
      pedagogy: 'Meningkatkan keterlibatan siswa pasif melalui gamifikasi kasual yang seru di kelas.'
    },
    {
      id: 'TEST',
      name: 'Mode Ujian (Proctored Test)',
      subtitle: 'Asesmen Formal & Pengawasan Anti-Cheat',
      icon: <ShieldAlert className="w-5 h-5 text-sky-600" />,
      tag: 'Formal & Aman',
      themeColor: 'from-sky-600 to-blue-700',
      borderColor: 'border-sky-400 dark:border-sky-600',
      bgLight: 'bg-sky-50/70 dark:bg-sky-950/30',
      bgActive: 'border-sky-500 bg-sky-500/10 shadow-sky-500/10 shadow-md',
      textColor: 'text-sky-800 dark:text-sky-300',
      features: [
        'Anti-Distraksi: Musik, meme, power-up & bocoran jawaban dinonaktifkan',
        'Anti-Cheat Detector: Deteksi perpindahan tab & minimize (window.blur)',
        'Sistem Peringatan Bertingkat & Auto-Submit jika melanggar 3x',
        'Grid Navigasi Soal: Lompat bebas, tandai ragu-ragu, tinjau jawaban'
      ],
      pedagogy: 'Sempurna untuk Penilaian Harian (PH), UTS, UAS, dan Ujian Sekolah bersuasana formal.'
    },
    {
      id: 'TEAM',
      name: 'Mode Tim (Collaborative Team)',
      subtitle: 'Adu Balap Kolektif Antar Regu',
      icon: <Users className="w-5 h-5 text-rose-500" />,
      tag: 'Kolaboratif & Gotong Royong',
      themeColor: 'from-rose-500 to-pink-500',
      borderColor: 'border-rose-400 dark:border-rose-600',
      bgLight: 'bg-rose-50/70 dark:bg-rose-950/30',
      bgActive: 'border-rose-500 bg-rose-500/10 shadow-rose-500/10 shadow-md',
      textColor: 'text-rose-700 dark:text-rose-300',
      features: [
        'Pertarungan Antar Tim: Tim Garuda (Merah) vs Tim Rajawali (Biru)',
        'Akumulasi Skor Kolektif yang mendorong kerjasama tim',
        'Weighted Average Balancing: Tim dengan anggota sedikit tetap adil',
        'Animasi Live Race Board meluncur menuju garis finish'
      ],
      pedagogy: 'Membangun kohesi kelompok, kerja sama tim, dan semangat saling dukung antar teman sekelas.'
    }
  ];

  const currentCard = modeCards.find((m) => m.id === selectedMode) || modeCards[0];

  const handleStart = () => {
    const settings: QuizSessionSettings = {
      gameMode: selectedMode,
      enablePowerUps,
      streakBonusEnabled,
      masteryThreshold,
      maxTabViolations,
      teamName,
      arcadeDurationSeconds: arcadeDurationMinutes * 60,
      isTeacherTesting: true
    };
    onLaunchMode(quiz, settings);
  };

  const handleCopyLink = () => {
    if (typeof window === 'undefined') return;
    const origin = window.location.origin;
    const shareUrl = `${origin}/?exam=${quiz.code}&mode=${selectedMode.toLowerCase()}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        
        {/* Modal Top Header */}
        <div className="p-4 sm:p-6 bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-700 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center text-xl shadow-inner font-black">
              🚀
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/20 text-white border border-white/20">
                  Engine Mode Pengerjaan Multi-Format
                </span>
                <span className="text-[10px] sm:text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-amber-400 text-slate-900">
                  PIN: {quiz.code}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black tracking-tight leading-snug mt-0.5">
                Pilih Mode Uji Soal: {quiz.title}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            title="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content Scrollable Area */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-slate-800 dark:text-slate-100">
          
          {/* Instruction banner */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
              <p className="text-slate-600 dark:text-slate-300 text-[11px] sm:text-xs">
                Pilih format engine yang ingin Anda uji coba. Setiap mode memiliki aturan penskoran, dinamika antarmuka, dan fitur pedagogis yang berbeda.
              </p>
            </div>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider shrink-0 hidden sm:inline">
              5 Mode Aktif
            </span>
          </div>

          {/* Mode Selector Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {modeCards.map((mode) => {
              const isSelected = selectedMode === mode.id;
              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setSelectedMode(mode.id)}
                  className={`p-3.5 rounded-2xl border-2 text-left transition-all flex flex-col justify-between cursor-pointer relative overflow-hidden ${
                    isSelected
                      ? `${mode.bgActive} border-teal-500 dark:border-teal-400`
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  {/* Top indicator tag */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800">
                      {mode.icon}
                    </span>
                    {isSelected && (
                      <span className="w-5 h-5 rounded-full bg-teal-500 text-white flex items-center justify-center text-[10px] font-black animate-in zoom-in">
                        ✓
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-100 line-clamp-1">
                      {mode.name.split(' (')[0]}
                    </h3>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5 leading-snug">
                      {mode.subtitle}
                    </p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {mode.tag}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Selected Mode Detail Box */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/90 dark:border-slate-700/80 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-700 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-teal-100 dark:bg-teal-950 flex items-center justify-center text-teal-700 dark:text-teal-300">
                  {currentCard.icon}
                </div>
                <div>
                  <h4 className="font-black text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <span>{currentCard.name}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200">
                      {currentCard.tag}
                    </span>
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {currentCard.pedagogy}
                  </p>
                </div>
              </div>

              {/* Mode-specific badge */}
              <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 shrink-0">
                <Info className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                <span>Engine Siap Diuji</span>
              </div>
            </div>

            {/* Feature Checklist */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {currentCard.features.map((feat, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 p-2 rounded-xl bg-white dark:bg-slate-900/90 border border-slate-200/70 dark:border-slate-700/70 text-slate-700 dark:text-slate-200"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="leading-snug">{feat}</span>
                </div>
              ))}
            </div>

            {/* Mode-Specific Fine Tuning Controls */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
              <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-teal-600" />
                <span>Pengaturan Parameter Mode Ini:</span>
              </h5>

              {selectedMode === 'CLASSIC' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enablePowerUps}
                      onChange={(e) => setEnablePowerUps(e.target.checked)}
                      className="rounded text-teal-600 focus:ring-teal-500 w-4 h-4"
                    />
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200 block">
                        Power-Up Drawer Aktif
                      </span>
                      <span className="text-[10px] text-slate-500">
                        2x Poin, 50/50, Eraser, & Imunitas
                      </span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={streakBonusEnabled}
                      onChange={(e) => setStreakBonusEnabled(e.target.checked)}
                      className="rounded text-teal-600 focus:ring-teal-500 w-4 h-4"
                    />
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200 block">
                        Multiplier Streak (1.0x - 1.5x)
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Bonus berlipat saat menjawab benar beruntun
                      </span>
                    </div>
                  </label>
                </div>
              )}

              {selectedMode === 'MASTERY' && (
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 block">
                      Target Ketuntasan Setiap Butir Soal:
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Soal yang salah diulang otomatis (*re-queue*) hingga target tercapai
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setMasteryThreshold(1)}
                      className={`px-3 py-1.5 rounded-lg font-bold text-xs cursor-pointer transition-colors ${
                        masteryThreshold === 1
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      1x Benar Bersih
                    </button>
                    <button
                      type="button"
                      onClick={() => setMasteryThreshold(2)}
                      className={`px-3 py-1.5 rounded-lg font-bold text-xs cursor-pointer transition-colors ${
                        masteryThreshold === 2
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      2x Benar Berturut-turut (PRD)
                    </button>
                  </div>
                </div>
              )}

              {selectedMode === 'PLAYGROUND' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200 block">
                        Durasi Sesi Arcade:
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Time-boxed batas waktu game
                      </span>
                    </div>
                    <select
                      value={arcadeDurationMinutes}
                      onChange={(e) => setArcadeDurationMinutes(Number(e.target.value))}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-bold"
                    >
                      <option value={5}>5 Menit</option>
                      <option value={7}>7 Menit (Standar PRD)</option>
                      <option value={10}>10 Menit</option>
                      <option value={15}>15 Menit</option>
                    </select>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center gap-2">
                    <Coins className="w-4 h-4 text-amber-500 shrink-0" />
                    <span className="text-[11px] text-slate-600 dark:text-slate-300">
                      Setiap jawaban benar memberi <strong>+50 Koin</strong> untuk aksi <strong>Vault Heist</strong> & <strong>Screen Freeze</strong>.
                    </span>
                  </div>
                </div>
              )}

              {selectedMode === 'TEST' && (
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 block">
                      Toleransi Pelanggaran Tab Switch / Window Blur:
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Siswa berpindah tab / jendela browser akan diberi peringatan otomatis
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 5].map((count) => (
                      <button
                        key={count}
                        type="button"
                        onClick={() => setMaxTabViolations(count)}
                        className={`px-2.5 py-1 rounded-lg font-bold text-xs cursor-pointer transition-colors ${
                          maxTabViolations === count
                            ? 'bg-sky-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {count}x {count === 3 ? '(PRD)' : ''}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {selectedMode === 'TEAM' && (
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 block">
                      Pilih Regu Anda untuk Simulasi:
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Skor Anda akan dikontribusikan ke total regu dengan sistem adu balap
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setTeamName('Tim Garuda')}
                      className={`px-3 py-1.5 rounded-lg font-bold text-xs cursor-pointer transition-colors flex items-center gap-1.5 ${
                        teamName === 'Tim Garuda'
                          ? 'bg-rose-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span>🦅 Tim Garuda (Merah)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTeamName('Tim Rajawali')}
                      className={`px-3 py-1.5 rounded-lg font-bold text-xs cursor-pointer transition-colors flex items-center gap-1.5 ${
                        teamName === 'Tim Rajawali'
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span>🦅 Tim Rajawali (Biru)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Bottom Action Footer */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleCopyLink}
              className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              title="Salin Link Siswa dengan Mode Ini"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Link Mode Disalin!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 text-slate-500" />
                  <span>Salin Link Siswa ({selectedMode})</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 text-xs font-bold transition-colors cursor-pointer"
            >
              Batal
            </button>

            <button
              type="button"
              onClick={handleStart}
              className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white font-bold text-xs shadow-md shadow-teal-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Mulai Uji Soal ({currentCard.name.split(' (')[0]})</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
