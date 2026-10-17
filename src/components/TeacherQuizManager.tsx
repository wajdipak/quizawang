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
  GraduationCap
} from 'lucide-react';
import { Quiz, StudentSubmission } from '../types/quiz.js';

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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 sm:p-2 rounded-xl bg-teal-100 text-teal-700 text-base sm:text-lg">
              📚
            </span>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-slate-800">
                Manajemen Kuis Guru
              </h1>
              <p className="text-[11px] sm:text-xs text-slate-500">
                Buat kuis tugas baru, bagikan tautan pengerjaan otomatis ke siswa, dan pantau hasil penilaian seketika.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={onOpenFileUpload}
            className="flex-1 sm:flex-none px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border border-cyan-200 font-bold text-xs shadow-xs flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer transition-all"
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

      {/* Student Link Workflow Info Banner */}
      <div className="p-3 sm:p-4 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-teal-50 via-cyan-50 to-emerald-50 border border-teal-200 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 sm:gap-3 shadow-xs">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl sm:rounded-2xl bg-teal-600 text-white flex items-center justify-center shrink-0 text-xs sm:text-sm shadow-xs font-bold">
            🎓
          </div>
          <div className="space-y-0.5">
            <span className="font-bold text-teal-950 block text-xs">
              Alur Halaman Siswa Otomatis (Sesi 1 & Sesi 2)
            </span>
            <p className="text-slate-600 text-[10px] sm:text-[11px] leading-snug">
              Setiap kuis otomatis memiliki link pengerjaan siswa. Siswa akan melalui <strong>Sesi 1 (Input Keterangan Diri)</strong> lalu lanjut ke <strong>Sesi 2 (Pengerjaan 1 Soal per Halaman dengan Navigasi Nomor Soal & Submit)</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari judul kuis, mata pelajaran, atau kode PIN..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-2xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400/40"
          />
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Menampilkan {filteredQuizzes.length} dari {quizzes.length} kuis
        </div>
      </div>

      {/* Quiz Cards Grid */}
      {filteredQuizzes.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-4">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-2xl text-slate-400">
            🔍
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-slate-700 text-sm">Tidak ada kuis yang ditemukan</h3>
            <p className="text-xs text-slate-400">
              Coba cari dengan kata kunci lain atau buat kuis baru melalui generator AI.
            </p>
          </div>
          <button
            type="button"
            onClick={onCreateNew}
            className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs inline-flex items-center gap-1.5"
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
                className="bg-white rounded-3xl border border-slate-200/90 hover:border-teal-300 hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
              >
                {/* Card Top Stripe */}
                <div className="p-5 pb-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                      {quiz.subject || 'Umum'}
                    </span>

                    {/* PIN Pill with Copy */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => handleCopyExamLink(quiz, e)}
                        className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg bg-cyan-50 hover:bg-cyan-100 text-cyan-800 transition-colors border border-cyan-200 cursor-pointer"
                        title="Salin Link Langsung Siswa"
                      >
                        <Link className="w-3 h-3 text-cyan-700" />
                        <span>{copiedLinkId === quiz.id ? 'Link Disalin!' : 'Link Siswa'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleCopyCode(quiz, e)}
                        className="flex items-center gap-1 text-xs font-mono font-bold px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors border border-slate-200 cursor-pointer"
                        title="Klik untuk salin Kode PIN Kuis"
                      >
                        <span>PIN: {quiz.code}</span>
                        {copiedCodeId === quiz.id ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3 text-slate-400" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-bold text-base text-slate-800 line-clamp-2 leading-snug group-hover:text-teal-700 transition-colors">
                      {quiz.title}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-2 mt-1">
                      {quiz.description || 'Tidak ada deskripsi.'}
                    </p>
                  </div>

                  {/* Categories Pills */}
                  {quiz.categories && quiz.categories.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {quiz.categories.map((c) => (
                        <span key={c} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-medium border border-slate-200">
                          🏷️ {c}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Metadata Chips */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                      📝 {quiz.questions.length} Soal
                    </span>
                    <span className="flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                      ⏱️ {quiz.durationMinutes > 0 ? `${quiz.durationMinutes}m` : 'Bebas'}
                    </span>
                    <span className="flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                      🎯 KKM: {quiz.passingGrade}
                    </span>
                  </div>
                </div>

                {/* Submissions summary stats */}
                <div className="px-5 py-2.5 bg-slate-50/70 border-t border-b border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>{quizSubs.length} Siswa Mengerjakan</span>
                  </div>
                  {quizSubs.length > 0 && (
                    <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 text-[11px]">
                      Rata-rata: {avgScore}
                    </span>
                  )}
                </div>

                {/* Card Actions Bottom */}
                <div className="p-4 bg-white flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onEditQuiz(quiz)}
                        className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                        title="Edit / Tambah Soal Kuis"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onViewSubmissions(quiz.id)}
                        className="p-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 transition-colors cursor-pointer"
                        title="Lihat Rekap Nilai Siswa"
                      >
                        <Award className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(quiz.id)}
                        className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors cursor-pointer"
                        title="Hapus Kuis"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onShareQuiz(quiz)}
                        className="px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-teal-200"
                        title="Mulai & Bagikan Link Siswa"
                      >
                        <Share2 className="w-3.5 h-3.5 text-teal-600" />
                        <span>Bagikan Link</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onPlayQuiz(quiz)}
                        className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                        title="Mulai Kuis (Sesi 1 & Sesi 2)"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>Mulai</span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-xl space-y-4 border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-bold text-slate-800 text-base">Hapus Kuis Ini?</h3>
              <p className="text-xs text-slate-500">
                Kuis dan riwayat pengerjaan terkait akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition-colors"
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
