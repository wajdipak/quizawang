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
  Zap,
  Radio
} from 'lucide-react';
import { Quiz, StudentSubmission, QuizSessionSettings, QuizSession } from '../types/quiz.js';
import { GeminiUsageWidget } from './GeminiUsageWidget.js';
import { PWAInstallButton } from './PWAInstallButton.js';
import { QuizModeSelectModal } from './QuizModeSelectModal.js';

interface Props {
  quizzes: Quiz[];
  submissions: StudentSubmission[];
  quizSessions: QuizSession[];
  onCreateNew: () => void;
  onOpenFileUpload: () => void;
  onEditQuiz: (quiz: Quiz) => void;
  onDeleteQuiz: (quizId: string) => void;
  onShareQuiz: (quiz: Quiz) => void;
  onPlayQuiz: (quiz: Quiz, settings?: QuizSessionSettings) => void;
  onViewSubmissions: (quizId: string) => void;
  onManageSession: (session: QuizSession) => void;
}

export const TeacherQuizManager: React.FC<Props> = ({
  quizzes,
  submissions,
  quizSessions,
  onCreateNew,
  onOpenFileUpload,
  onEditQuiz,
  onDeleteQuiz,
  onShareQuiz,
  onPlayQuiz,
  onViewSubmissions,
  onManageSession
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showQuotaMonitor, setShowQuotaMonitor] = useState(false);
  const [selectedQuizForMode, setSelectedQuizForMode] = useState<Quiz | null>(null);

  const activeSessions = quizSessions.filter((s) => s.isExamStarted);
  const scheduledSessions = quizSessions.filter((s) => !s.isExamStarted && s.scheduledStartTime != null);

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
 <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-5 bg-[var(--paper)] p-5 sm:p-7 border-2 border-[var(--line)]">
        <div className="space-y-2">
          <span className="poster-label text-[var(--ink-soft)]">02 / Kuis Guru</span>
          <h1 className="poster-display text-[clamp(1.9rem,4vw,2.9rem)]">
            Manajemen Kuis Guru
          </h1>
          <p className="lede">
            Buat kuis tugas baru, bagikan tautan pengerjaan otomatis ke siswa, dan pantau hasil penilaian seketika.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          <PWAInstallButton />
          
          <button
            type="button"
            onClick={() => setShowQuotaMonitor(!showQuotaMonitor)}
            className={`px-3 py-2.5 border-2 text-[0.75rem] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
              showQuotaMonitor
                ? 'bg-[var(--signal)] text-[#0a0a0a] border-[var(--line)]'
                : 'bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:bg-[var(--paper-2)]'
            }`}
            title="Lihat status penggunaan limit kuota API Gemini saat ini"
          >
            <Zap className="w-3.5 h-3.5 text-amber-700" />
            <span>Kuota AI Gemini</span>
          </button>

          <button
            type="button"
            onClick={onOpenFileUpload}
            className="flex-1 sm:flex-none px-3.5 sm:px-4 py-2.5 border-2 border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-2)] font-bold text-[0.75rem] flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer transition-colors"
          >
 <span> Upload Dokumen (AI)</span>
          </button>

          <button
            type="button"
            onClick={onCreateNew}
            className="btn-ink flex-1 sm:flex-none px-4 sm:px-5 py-2.5 text-[0.75rem] gap-1.5 sm:gap-2"
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

      {/* Sessions Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Active Sessions */}
 <div className="border-2 border-[var(--line)] border-t-4 border-t-[var(--signal)] bg-[var(--paper)] p-5">
          <div className="flex items-center gap-2.5 mb-4">
            <Radio className="w-5 h-5 animate-pulse" />
 <h2 className="poster-display text-xl leading-none">Kuis Sedang Berjalan <span className="tnum">({activeSessions.length})</span></h2>
          </div>
          {activeSessions.length === 0 ? (
            <p className="text-[0.8125rem] text-[var(--ink-soft)]">Tidak ada kuis aktif saat ini.</p>
          ) : (
            <div className="space-y-2">
              {activeSessions.map(s => (
 <div key={s.id} className="flex justify-between items-center gap-3 text-[0.8125rem] px-3 py-2.5 border-2 border-[var(--line)] bg-[var(--paper-2)] cursor-pointer hover:bg-[var(--paper-3)] transition-colors" onClick={() => onManageSession(s)}>
 <span className="font-semibold truncate">{s.quizTitle}</span>
 <span className="tnum font-mono bg-[var(--paper)] px-2 py-0.5 border-2 border-[var(--line)] shrink-0">{s.code}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Scheduled Sessions */}
 <div className="border-2 border-[var(--line)] border-t-4 border-t-[var(--danger)] bg-[var(--paper)] p-5">
          <div className="flex items-center gap-2.5 mb-4">
            <Clock className="w-5 h-5" />
 <h2 className="poster-display text-xl leading-none">Kuis Terjadwal <span className="tnum">({scheduledSessions.length})</span></h2>
          </div>
          {scheduledSessions.length === 0 ? (
            <p className="text-[0.8125rem] text-[var(--ink-soft)]">Tidak ada kuis terjadwal.</p>
          ) : (
            <div className="space-y-2">
              {scheduledSessions.map(s => (
 <div key={s.id} className="flex justify-between items-center gap-3 text-[0.8125rem] px-3 py-2.5 border-2 border-[var(--line)] bg-[var(--paper-2)] cursor-pointer hover:bg-[var(--paper-3)] transition-colors" onClick={() => onManageSession(s)}>
 <span className="font-semibold truncate">{s.quizTitle}</span>
 <span className="tnum">
                    {s.scheduledStartTime ? new Date(s.scheduledStartTime).toLocaleTimeString() : 'N/A'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Student Link Workflow Info Banner */}
 <div className="p-4 sm:p-5 border-2 border-[var(--line)] bg-[var(--paper-2)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="space-y-1">
 <span className="poster-label block">
              Alur Halaman Siswa Otomatis (Sesi 1 &amp; Sesi 2)
            </span>
 <p className="lede text-[0.8125rem]">
              Setiap kuis otomatis memiliki link pengerjaan siswa. Siswa akan melalui <strong>Sesi 1 (Input Keterangan Diri)</strong> lalu lanjut ke <strong>Sesi 2 (Pengerjaan 1 Soal per Halaman dengan Navigasi Nomor Soal & Submit)</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
 <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 " />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari judul kuis, mata pelajaran, atau kode PIN..."
            className="w-full pl-10 pr-4 py-2.5 text-sm border-2 border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:border-[var(--ink)] transition-colors"
          />
        </div>

 <div className="tnum text-[0.8125rem] font-medium text-[var(--ink-soft)]">
          Menampilkan {filteredQuizzes.length} dari {quizzes.length} kuis
        </div>
      </div>

      {/* Quiz Cards Grid */}
      {filteredQuizzes.length === 0 ? (
 <div className="p-12 text-center bg-[var(--paper)] border-2 border-[var(--line)] space-y-4">
          <div className="space-y-1.5">
 <h3 className="text-[1rem] text-[var(--ink)]">Tidak ada kuis yang ditemukan</h3>
 <p className="text-[0.8125rem] leading-relaxed text-[var(--ink-soft)]">
              Coba cari dengan kata kunci lain atau buat kuis baru melalui generator AI.
            </p>
          </div>
          <button
            type="button"
            onClick={onCreateNew}
            className="btn-ink px-4 py-2.5 text-[0.75rem]"
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
                className="bg-[var(--paper)] border-2 border-[var(--line)] hover:bg-[var(--paper-2)] transition-colors flex flex-col justify-between overflow-hidden group"
              >
                {/* Card Top Stripe */}
                <div className="p-5 pb-3 space-y-3">
                  <div className="flex items-center justify-between">
 <span className="text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-teal-50  text-teal-800  border border-teal-200  flex items-center">
                      {quiz.subject || 'Umum'}
                    </span>

                    {/* PIN Pill with Copy */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => handleCopyExamLink(quiz, e)}
                        className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg bg-cyan-100  text-cyan-900  transition-colors border border-cyan-300  cursor-pointer hover:bg-cyan-200  w-[190px] shrink-0"
                        title="Salin Link Langsung Siswa"
                      >
 <Link className="w-3 h-3 text-cyan-700  shrink-0" />
                        <span className="truncate">{copiedLinkId === quiz.id ? 'Link Disalin!' : 'Link Siswa'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleCopyCode(quiz, e)}
                        className="flex items-center gap-1 text-xs font-mono font-bold px-2 py-0.5 rounded-lg bg-slate-100  hover:bg-slate-200  text-slate-700  transition-colors border border-slate-200  cursor-pointer"
                        title="Klik untuk salin Kode PIN Kuis"
                      >
                        <span>PIN: {quiz.code}</span>
                        {copiedCodeId === quiz.id ? (
 <Check className="w-3 h-3 text-emerald-600 " />
                        ) : (
 <Copy className="w-3 h-3 text-slate-400 " />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
 <h3 className="text-[1.125rem] line-clamp-2 leading-snug">
                      {quiz.title}
                    </h3>
 <p className="text-[0.8125rem] leading-relaxed text-[var(--ink-soft)] line-clamp-2 mt-1.5">
                      {quiz.description || 'Tidak ada deskripsi.'}
                    </p>
                  </div>

                  {/* Categories Pills */}
                  {quiz.categories && quiz.categories.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {quiz.categories.map((c) => (
 <span key={c} className="text-[10px] bg-slate-100  text-slate-600  px-2 py-0.5 rounded-md font-medium border border-slate-200 ">
                           {c}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Metadata Chips */}
 <div className="tnum flex flex-wrap items-center gap-1.5 pt-1 text-[0.75rem] text-[var(--ink-soft)]">
 <span className="flex items-center gap-1 bg-slate-50  px-2 py-0.5 rounded-md border border-slate-100 ">
                       {quiz.questions.length} Soal
                    </span>
 <span className="flex items-center gap-1 bg-slate-50  px-2 py-0.5 rounded-md border border-slate-100 ">
                       {quiz.durationMinutes > 0 ? `${quiz.durationMinutes}m` : 'Bebas'}
                    </span>
 <span className="flex items-center gap-1 bg-slate-50  px-2 py-0.5 rounded-md border border-slate-100 ">
                       KKM: {quiz.passingGrade}
                    </span>
                  </div>
                </div>

                {/* Submissions summary stats */}
 <div className="px-5 py-3 bg-[var(--paper-2)] border-y-2 border-[var(--line)] flex items-center justify-between gap-2 text-[0.8125rem]">
 <div className="flex items-center gap-1.5 text-[var(--ink)]">
 <Users className="w-3.5 h-3.5 text-slate-400 " />
                    <span>{quizSubs.length} Siswa Mengerjakan</span>
                  </div>
                  {quizSubs.length > 0 && (
 <span className="font-semibold text-emerald-700  bg-emerald-50  px-2 py-0.5 rounded-md border border-emerald-200  text-[11px]">
                      Rata-rata: {avgScore}
                    </span>
                  )}
                </div>

                {/* Card Actions Bottom */}
 <div className="p-4 border-t-2 border-[var(--line)] flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onEditQuiz(quiz)}
                        className="p-2.5 border-2 border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-3)] transition-colors cursor-pointer"
                        title="Edit / Tambah Soal Kuis"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onViewSubmissions(quiz.id)}
                        className="p-2.5 border-2 border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--signal)] hover:text-[#0a0a0a] transition-colors cursor-pointer"
                        title="Lihat Rekap Nilai Siswa"
                      >
                        <Award className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(quiz.id)}
                        className="p-2.5 border-2 border-[var(--line)] bg-[var(--paper)] text-[var(--danger-ink)] hover:bg-[var(--danger-pale)] transition-colors cursor-pointer"
                        title="Hapus Kuis"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onShareQuiz(quiz)}
                        className="px-3 py-2 border-2 border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-3)] font-bold text-[0.75rem] flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Mulai & Bagikan Link Siswa"
                      >
 <Share2 className="w-3.5 h-3.5 text-teal-600 " />
                        <span>Bagikan Link</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedQuizForMode(quiz)}
                        className="btn-signal px-3.5 py-2 text-[0.75rem] gap-1.5"
                        title="Pilih Format Mode & Uji Coba Kuis"
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
 <div className="bg-[var(--paper)] max-w-sm w-full p-6 space-y-4 border-2 border-[var(--line)]">
 <div className="w-12 h-12 bg-[var(--danger-pale)] text-[var(--danger-ink)] flex items-center justify-center mx-auto border-2 border-[var(--line)]">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1.5">
 <h3 className="text-[1.0625rem] text-[var(--ink)]">Hapus Kuis Ini?</h3>
 <p className="text-[0.8125rem] leading-relaxed text-[var(--ink-soft)]">
                Kuis dan riwayat pengerjaan terkait akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 px-4 py-2.5 border-2 border-[var(--line)] bg-[var(--paper)] font-semibold text-[0.75rem] hover:bg-[var(--paper-2)] transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteQuiz(deleteConfirmId);
                  setDeleteConfirmId(null);
                }}
                className="btn-ink flex-1 px-4 py-2.5 text-[0.75rem]"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Quiz Engine Mode Selection Modal */}
      {selectedQuizForMode && (
        <QuizModeSelectModal
          quiz={selectedQuizForMode}
          isOpen={Boolean(selectedQuizForMode)}
          onClose={() => setSelectedQuizForMode(null)}
          onLaunchMode={(quizToRun, settings) => {
            setSelectedQuizForMode(null);
            onPlayQuiz(quizToRun, settings);
          }}
        />
      )}

    </div>
  );
};
