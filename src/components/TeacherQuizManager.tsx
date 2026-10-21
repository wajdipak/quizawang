import React, { useState } from 'react';
import {
  Plus,
  Search,
  Share2,
  Play,
  Edit2,
  Trash2,
  Award,
  Users,
  Copy,
  Check,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  Link,
  GraduationCap,
  Zap
} from 'lucide-react';
import { Quiz, StudentSubmission } from '../types/quiz.js';
import { GeminiUsageWidget } from './GeminiUsageWidget.js';
import { PWAInstallButton } from './PWAInstallButton.js';

interface Props {
  quizzes: Quiz[];
  submissions: StudentSubmission[];
  onCreateNew: () => void;
  onOpenFileUpload: () => void;
  onEditQuiz: (quiz: Quiz) => void;
  onDeleteQuiz: (quizId: string) => void;
  onShareQuiz: (quiz: Quiz) => void;
  onPlayQuiz: (quiz: Quiz) => void;
  onViewSubmissions: (quizId: string) => void;
}

export const TeacherQuizManager: React.FC<Props> = ({
  quizzes,
  submissions,
  onCreateNew,
  onOpenFileUpload,
  onEditQuiz,
  onDeleteQuiz,
  onShareQuiz,
  onPlayQuiz,
  onViewSubmissions
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showQuotaMonitor, setShowQuotaMonitor] = useState(false);

  const filteredQuizzes = quizzes.filter((q) => {
    const qLower = searchQuery.toLowerCase();
    return (
      q.title.toLowerCase().includes(qLower) ||
      q.code.toLowerCase().includes(qLower) ||
      q.subject.toLowerCase().includes(qLower)
    );
  });

  const handleCopyCode = (quiz: Quiz, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(quiz.code);
    setCopiedCodeId(quiz.id);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  const handleCopyExamLink = (quiz: Quiz, e: React.MouseEvent) => {
    e.stopPropagation();
    const examUrl = typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}?exam=${quiz.code}`
      : `https://awanglongquiz.app?exam=${quiz.code}`;

    navigator.clipboard.writeText(examUrl);
    setCopiedLinkId(quiz.id);
    setTimeout(() => setCopiedLinkId(null), 2000);
  };

  return (
    <div className="space-y-6">
      
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 sm:p-2 rounded-xl bg-teal-100 dark:bg-teal-950/80 text-teal-700 dark:text-teal-400 text-base sm:text-lg">
              📚
            </span>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-100">
                Manajemen Kuis Guru
              </h1>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
                Buat kuis tugas baru, bagikan tautan pengerjaan otomatis ke siswa, dan pantau hasil penilaian seketika.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <PWAInstallButton />
          
          <button
            type="button"
            onClick={() => setShowQuotaMonitor(!showQuotaMonitor)}
            className={`px-3 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl border text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
              showQuotaMonitor
                ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
            }`}
            title="Lihat status penggunaan limit kuota API Gemini saat ini"
          >
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>Kuota AI Gemini</span>
          </button>

          <button
            type="button"
            onClick={onOpenFileUpload}
            className="flex-1 sm:flex-none px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl bg-cyan-50 dark:bg-cyan-950/60 hover:bg-cyan-100 dark:hover:bg-cyan-900 text-cyan-800 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800 font-bold text-xs shadow-xs flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer transition-all"
          >
            <span>📄 Upload Dokumen (AI)</span>
          </button>

          <button
            type="button"
            onClick={onCreateNew}
            className="flex-1 sm:flex-none px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Kuis Baru</span>
          </button>
        </div>
      </div>

      {/* Conditionally Expanded Gemini API Quota Monitor */}
      {showQuotaMonitor && (
        <div className="animate-in fade-in slide-in-from-top-2">
          <GeminiUsageWidget variant="card" />
        </div>
      )}

      {/* Student Link Workflow Info Banner */}
      <div className="p-3 sm:p-4 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-teal-50 via-cyan-50 to-emerald-50 dark:from-teal-950/50 dark:via-cyan-950/40 dark:to-slate-900 border border-teal-200 dark:border-teal-900 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 sm:gap-3 shadow-xs transition-colors">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl sm:rounded-2xl bg-teal-600 text-white flex items-center justify-center shrink-0 text-xs sm:text-sm shadow-xs font-bold">
            🎓
          </div>
          <div className="space-y-0.5">
            <span className="font-bold text-teal-950 dark:text-teal-200 block text-xs">
              Alur Halaman Siswa Otomatis (Sesi 1 & Sesi 2)
            </span>
            <p className="text-slate-600 dark:text-slate-300 text-[10px] sm:text-[11px] leading-snug">
              Setiap kuis otomatis memiliki link pengerjaan siswa. Siswa akan melalui <strong>Sesi 1 (Input Keterangan Diri)</strong> lalu lanjut ke <strong>Sesi 2 (Pengerjaan 1 Soal per Halaman dengan Navigasi Nomor Soal & Submit)</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari judul kuis, mata pelajaran, atau kode PIN..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-400/40 transition-colors"
          />
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          Menampilkan {filteredQuizzes.length} dari {quizzes.length} kuis
        </div>
      </div>

      {/* Quiz Cards Grid */}
      {filteredQuizzes.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4 transition-colors">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-2xl text-slate-400 dark:text-slate-500">
            🔍
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-slate-700 dark:text-slate-100 text-sm">Tidak ada kuis yang ditemukan</h3>
            <p className="text-xs text-slate-400 dark:text-slate-400">
              Coba cari dengan kata kunci lain atau buat kuis baru melalui generator AI.
            </p>
          </div>
          <button
            type="button"
            onClick={onCreateNew}
            className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs inline-flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Buat Kuis Baru Sekarang</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredQuizzes.map((quiz) => {
            const quizSubs = submissions.filter((s) => s.quizId === quiz.id);
            const avgScore =
              quizSubs.length > 0
                ? Math.round(
                    quizSubs.reduce((acc, curr) => acc + curr.score, 0) / quizSubs.length
                  )
                : 0;

            return (
              <div
                key={quiz.id}
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 hover:border-teal-300 dark:hover:border-teal-700 hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
              >
                {/* Card Top Stripe */}
                <div className="p-5 pb-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                      {quiz.subject || 'Umum'}
                    </span>

                    {/* PIN Pill with Copy */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => handleCopyExamLink(quiz, e)}
                        className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg bg-cyan-50 dark:bg-cyan-950/60 hover:bg-cyan-100 dark:hover:bg-cyan-900 text-cyan-800 dark:text-cyan-300 transition-colors border border-cyan-200 dark:border-cyan-800 cursor-pointer"
                        title="Salin Link Langsung Siswa"
                      >
                        <Link className="w-3 h-3 text-cyan-700 dark:text-cyan-400" />
                        <span>{copiedLinkId === quiz.id ? 'Link Disalin!' : 'Link Siswa'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleCopyCode(quiz, e)}
                        className="flex items-center gap-1 text-xs font-mono font-bold px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors border border-slate-200 dark:border-slate-700 cursor-pointer"
                        title="Klik untuk salin Kode PIN Kuis"
                      >
                        <span>PIN: {quiz.code}</span>
                        {copiedCodeId === quiz.id ? (
                          <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-bold text-base text-slate-800 dark:text-slate-100 line-clamp-2 leading-snug group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                      {quiz.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                      {quiz.description || 'Tidak ada deskripsi.'}
                    </p>
                  </div>

                  {/* Categories Pills */}
                  {quiz.categories && quiz.categories.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {quiz.categories.map((c) => (
                        <span key={c} className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-md font-medium border border-slate-200 dark:border-slate-700">
                          🏷️ {c}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Metadata Chips */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-100 dark:border-slate-800">
                      📝 {quiz.questions.length} Soal
                    </span>
                    <span className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-100 dark:border-slate-800">
                      ⏱️ {quiz.durationMinutes > 0 ? `${quiz.durationMinutes}m` : 'Bebas'}
                    </span>
                    <span className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-100 dark:border-slate-800">
                      🎯 KKM: {quiz.passingGrade}
                    </span>
                  </div>
                </div>

                {/* Submissions summary stats */}
                <div className="px-5 py-2.5 bg-slate-50/70 dark:bg-slate-800/60 border-t border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                    <Users className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                    <span>{quizSubs.length} Siswa Mengerjakan</span>
                  </div>
                  {quizSubs.length > 0 && (
                    <span className="font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800 text-[11px]">
                      Rata-rata: {avgScore}
                    </span>
                  )}
                </div>

                {/* Card Actions Bottom */}
                <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onEditQuiz(quiz)}
                        className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                        title="Edit / Tambah Soal Kuis"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onViewSubmissions(quiz.id)}
                        className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900 text-amber-700 dark:text-amber-300 transition-colors cursor-pointer"
                        title="Lihat Rekap Nilai Siswa"
                      >
                        <Award className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(quiz.id)}
                        className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900 text-rose-600 dark:text-rose-400 transition-colors cursor-pointer"
                        title="Hapus Kuis"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onShareQuiz(quiz)}
                        className="px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/70 hover:bg-teal-100 dark:hover:bg-teal-900 text-teal-800 dark:text-teal-300 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-teal-200 dark:border-teal-800"
                        title="Mulai & Bagikan Link Siswa"
                      >
                        <Share2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                        <span>Bagikan Link</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onPlayQuiz(quiz)}
                        className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                        title="Mulai Simulasi Kuis Guru"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>Uji Soal</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 shadow-xl space-y-4 border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base">Hapus Kuis Ini?</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Kuis dan riwayat pengerjaan terkait akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteQuiz(deleteConfirmId);
                  setDeleteConfirmId(null);
                }}
                className="flex-1 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-xs transition-colors"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
