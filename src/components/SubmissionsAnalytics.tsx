import React, { useState } from 'react';
import {
  Award,
  Download,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Filter,
  Trash2,
  TrendingUp,
  FileSpreadsheet,
  Tag,
  Eye,
  X
} from 'lucide-react';
import { Quiz, StudentSubmission } from '../types/quiz.js';
import { formatTimeRemaining, resolveQuestionAssets } from '../utils/quizLogic.js';
import { QuestionAssets } from './QuestionAssets.js';

interface Props {
  quizzes: Quiz[];
  submissions: StudentSubmission[];
  selectedQuizId?: string | null;
  onDeleteSubmission: (submissionId: string) => void;
}

export const SubmissionsAnalytics: React.FC<Props> = ({
  quizzes,
  submissions,
  selectedQuizId: initialSelectedQuizId,
  onDeleteSubmission
}) => {
  // Helper to find the quiz ID of the most recently submitted quiz
  const getLatestSubmittedQuizId = (): string => {
    if (initialSelectedQuizId) return initialSelectedQuizId;
    if (submissions && submissions.length > 0) {
      const sortedSubs = [...submissions].sort(
        (a, b) => new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime()
      );
      if (sortedSubs[0]?.quizId) {
        return sortedSubs[0].quizId;
      }
    }
    if (quizzes && quizzes.length > 0) {
      return quizzes[0].id;
    }
    return 'ALL';
  };

  const [filterQuizId, setFilterQuizId] = useState<string>(getLatestSubmittedQuizId);
  const [hasUserChangedFilter, setHasUserChangedFilter] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [inspectSubmission, setInspectSubmission] = useState<StudentSubmission | null>(null);

  // Synchronize filter when initialSelectedQuizId or submissions update
  React.useEffect(() => {
    if (initialSelectedQuizId) {
      setFilterQuizId(initialSelectedQuizId);
      setHasUserChangedFilter(false);
    } else if (!hasUserChangedFilter && submissions.length > 0) {
      const sortedSubs = [...submissions].sort(
        (a, b) => new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime()
      );
      if (sortedSubs[0]?.quizId) {
        setFilterQuizId(sortedSubs[0].quizId);
      }
    }
  }, [initialSelectedQuizId, submissions, hasUserChangedFilter]);

  const filtered = submissions.filter((sub) => {
    const matchesQuiz = filterQuizId === 'ALL' || sub.quizId === filterQuizId;
    const matchesSearch =
      sub.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.studentClass.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.quizCode.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesQuiz && matchesSearch;
  });

  // Calculate statistics
  const totalSubmissions = filtered.length;
  const avgScore =
    totalSubmissions > 0
      ? Math.round(filtered.reduce((acc, curr) => acc + curr.score, 0) / totalSubmissions)
      : 0;
  const highestScore =
    totalSubmissions > 0 ? Math.max(...filtered.map((s) => s.score)) : 0;
  const passedCount = filtered.filter((s) => s.isPassed).length;
  const passRate = totalSubmissions > 0 ? Math.round((passedCount / totalSubmissions) * 100) : 0;

  // Aggregate Category performance across submissions
  const categoryAggregates: Record<string, { totalPct: number; count: number }> = {};
  filtered.forEach((sub) => {
    if (sub.categoryScores) {
      Object.entries(sub.categoryScores).forEach(([cat, data]) => {
        if (!categoryAggregates[cat]) {
          categoryAggregates[cat] = { totalPct: 0, count: 0 };
        }
        categoryAggregates[cat].totalPct += data.percentage;
        categoryAggregates[cat].count += 1;
      });
    }
  });

  // Export to CSV
  const handleExportCSV = () => {
    if (filtered.length === 0) return;

    const headers = [
      'Nama Siswa',
      'Kelas',
      'Kode Kuis',
      'Nilai (0-100)',
      'Poin Diperoleh',
      'Total Poin',
      'Soal Benar',
      'Total Soal',
      'Status Kelulusan',
      'Waktu (detik)',
      'Tanggal Selesai'
    ];

    const rows = filtered.map((s) => [
      `"${s.studentName.replace(/"/g, '""')}"`,
      `"${s.studentClass.replace(/"/g, '""')}"`,
      s.quizCode,
      s.score,
      s.earnedPoints || s.score,
      s.totalPoints || 100,
      s.correctCount,
      s.totalQuestions,
      s.isPassed ? 'Lulus' : 'Belum Lulus',
      s.timeSpentSeconds,
      `"${new Date(s.submittedAt).toLocaleString('id-ID')}"`
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `rekap_nilai_awang_long_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const currentInspectedQuiz = inspectSubmission
    ? quizzes.find((q) => q.id === inspectSubmission.quizId || q.code === inspectSubmission.quizCode)
    : null;

  return (
    <div className="space-y-8">
      
      {/* Header bar */}
 <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-5 bg-[var(--paper)] p-5 sm:p-7 border-2 border-[var(--line)]">
        <div className="space-y-2">
          <span className="poster-label text-[var(--ink-soft)]">04 / Rekap Nilai</span>
          <h1 className="poster-display text-[clamp(1.9rem,4vw,2.9rem)]">
            Rekap & Penilaian Otomatis Siswa
          </h1>
          <p className="lede">
            Hasil penilaian terhitung otomatis berdasarkan jenis soal (Pilihan Ganda, Isian Singkat, dan Menjodohkan).
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportCSV}
          disabled={filtered.length === 0}
          className="btn-ink w-full sm:w-auto px-4 py-2.5 text-[0.75rem] gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Ekspor Rekap CSV / Excel</span>
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 border-2 border-[var(--line)]">
 <div className="p-4 sm:p-5 border-r-2 border-b-2 border-[var(--line)] lg:border-b-0 bg-[var(--paper)] space-y-2">
 <span className="poster-label block text-[var(--ink-soft)]">Siswa Mengikuti</span>
          <div className="flex items-baseline gap-2">
 <span className="stat-value">{totalSubmissions}</span>
 <span className="text-[0.75rem] text-[var(--ink-soft)]">orang</span>
          </div>
        </div>

 <div className="p-4 sm:p-5 border-b-2 border-[var(--line)] lg:border-b-0 lg:border-r-2 bg-[var(--paper)] space-y-2">
 <span className="poster-label block text-[var(--ink-soft)]">Rata-Rata Nilai</span>
          <div className="flex items-baseline gap-2">
 <span className="stat-value">{avgScore}</span>
 <span className="text-[0.75rem] text-[var(--ink-soft)]">/ 100</span>
          </div>
        </div>

 <div className="p-4 sm:p-5 border-r-2 border-[var(--line)] bg-[var(--paper)] space-y-2">
 <span className="poster-label block text-[var(--ink-soft)]">Nilai Tertinggi</span>
          <div className="flex items-baseline gap-2">
 <span className="stat-value">{highestScore}</span>
 <span className="text-[0.75rem] text-[var(--ink-soft)]">poin</span>
          </div>
        </div>

 <div className="p-4 sm:p-5 bg-[var(--paper)] space-y-2">
 <span className="poster-label block text-[var(--ink-soft)]">Tingkat Kelulusan (KKM)</span>
          <div className="flex items-baseline gap-2">
 <span className="stat-value">{passRate}%</span>
 <span className="text-[0.75rem] text-[var(--ink-soft)]">({passedCount} lulus)</span>
          </div>
        </div>
      </div>

      {/* Category Performance Analytics */}
      {Object.keys(categoryAggregates).length > 0 && (
 <div className="bg-[var(--paper)] p-5 border-2 border-[var(--line)] space-y-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
 <span className="poster-label flex items-center gap-2">
 <Tag className="w-3.5 h-3.5" />
              <span>Penguasaan Materi per Kategori</span>
            </span>
 <span className="text-[0.75rem] text-[var(--ink-soft)]">Analisis otomatis guru</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {Object.entries(categoryAggregates).map(([cat, agg]) => {
              const catAverage = Math.round(agg.totalPct / agg.count);
              return (
 <div key={cat} className="p-3.5 bg-[var(--paper-2)] border-2 border-[var(--line)] space-y-2">
                  <div className="tnum flex items-center justify-between gap-2 text-[0.8125rem] font-semibold">
 <span className="truncate">{cat}</span>
 <span className={`font-bold ${catAverage >= 70 ? 'text-[var(--ink)]' : 'text-[var(--danger-ink)]'}`}>
                      {catAverage}%
                    </span>
                  </div>
 <div className="w-full h-2 bg-[var(--paper-3)] border border-[var(--line)] overflow-hidden">
                    <div
                      className={`h-full ${catAverage >= 70 ? 'bg-[var(--ink)]' : 'bg-[var(--danger)]'}`}
                      style={{ width: `${catAverage}%` }}
                    />
                  </div>
 <span className="tnum text-[0.6875rem] text-[var(--ink-soft)] block">
                    Berdasarkan {agg.count} lembar pengerjaan siswa
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
 <div className="bg-[var(--paper)] p-4 border-2 border-[var(--line)] flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
 <Filter className="w-4 h-4 text-slate-400  shrink-0" />
            <select
              value={filterQuizId}
              onChange={(e) => {
                setFilterQuizId(e.target.value);
                setHasUserChangedFilter(true);
              }}
              className="text-sm p-2.5 border-2 border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] focus:outline-none w-full sm:w-72"
            >
              <option value="ALL">Semua Kuis Guru</option>
              {quizzes.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.title} ({q.code})
                </option>
              ))}
            </select>
            {filterQuizId !== 'ALL' && (
 <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-teal-50  text-teal-800  border border-teal-200  shrink-0 self-start sm:self-auto">
                {filterQuizId === getLatestSubmittedQuizId() && !initialSelectedQuizId
                  ? 'Kuis Terakhir Dikerjakan'
                  : 'Filter Kuis Aktif'}
              </span>
            )}
          </div>

          <div className="relative w-full sm:w-60">
 <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 " />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama siswa atau kelas..."
              className="w-full pl-9 pr-3 py-2.5 text-sm border-2 border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:border-[var(--ink)]"
            />
          </div>
        </div>
      </div>

      {/* Submissions Table */}
 <div className="bg-[var(--paper)] border-2 border-[var(--line)] overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center space-y-2">
 <p className="text-[0.9375rem] font-bold text-[var(--ink)]">Belum Ada Rekap Nilai Siswa</p>
 <p className="text-[0.8125rem] leading-relaxed text-[var(--ink-soft)] max-w-md mx-auto">
              Bagikan PIN Kuis kepada siswa untuk mulai menerima hasil pengerjaan secara real-time.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-left border-collapse text-[0.8125rem]">
              <thead>
 <tr className="bg-[var(--paper-2)] border-b-2 border-[var(--line)] text-[var(--ink)] text-[0.6875rem] uppercase tracking-[0.1em] font-bold">
                  <th className="py-3.5 px-4 font-bold">Peringkat</th>
                  <th className="py-3.5 px-4 font-bold">Nama Siswa</th>
                  <th className="py-3.5 px-4 font-bold">Kelas</th>
                  <th className="py-3.5 px-4 font-bold">Kode Kuis</th>
                  <th className="py-3.5 px-4 font-bold">Nilai</th>
                  <th className="py-3.5 px-4 font-bold">Poin</th>
                  <th className="py-3.5 px-4 font-bold">Status</th>
                  <th className="py-3.5 px-4 font-bold">Waktu</th>
                  <th className="py-3.5 px-4 font-bold">Aksi</th>
                </tr>
              </thead>
 <tbody className="divide-y-2 divide-[var(--line)] text-[var(--ink)]">
                {filtered
                  .sort((a, b) => b.score - a.score)
                  .map((sub, idx) => {
                    return (
 <tr key={sub.id} className="hover:bg-[var(--paper-2)] transition-colors">
                        <td className="py-3 px-4 font-bold">
                          <span
                            className={`inline-flex w-6 h-6 items-center justify-center border-2 border-[var(--line)] text-xs font-black ${
                              idx === 0
                                ? 'bg-[var(--signal)] text-[var(--on-accent)]'
                                : idx === 1
                                ? 'bg-[var(--ink)] text-[var(--paper)]'
                                : 'bg-[var(--paper-2)] text-[var(--ink)]'
                            }`}
                          >
                            {idx + 1}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
 <div className="text-[0.875rem] font-bold">{sub.studentName}</div>
                          {sub.studentNis && (
 <div className="tnum text-[0.6875rem] text-[var(--ink-soft)] font-medium">No/NIS: {sub.studentNis}</div>
                          )}
                        </td>
 <td className="py-3.5 px-4">
                          {sub.studentClass}
                        </td>
 <td className="tnum py-3.5 px-4 font-mono font-bold">
                          {sub.quizCode}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2.5 py-1 rounded-lg font-black text-xs ${
                              sub.score >= 80
                                ? 'bg-emerald-100  text-emerald-800 '
                                : sub.isPassed
                                ? 'bg-teal-100  text-teal-800 '
                                : 'bg-rose-100  text-rose-800 '
                            }`}
                          >
                            {sub.score}
                          </span>
                        </td>
 <td className="tnum py-3.5 px-4 font-semibold">
                          {sub.earnedPoints ?? sub.score} / {sub.totalPoints ?? 100}
                        </td>
                        <td className="py-3 px-4">
                          {sub.isPassed ? (
 <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 ">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Lulus</span>
                            </span>
                          ) : (
 <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 ">
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Remedial</span>
                            </span>
                          )}
                        </td>
 <td className="tnum py-3.5 px-4 font-mono text-[var(--ink-soft)]">
                          {formatTimeRemaining(sub.timeSpentSeconds)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setInspectSubmission(sub)}
                              className="p-1.5 rounded-lg bg-teal-50  hover:bg-teal-100  text-teal-700  transition-colors flex items-center gap-1 text-[11px] font-semibold cursor-pointer"
                              title="Lihat Lembar Jawaban Siswa"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Rincian</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const subId = sub.id || `${sub.quizId}-${sub.studentName}-${sub.submittedAt}`;
                                if (window.confirm(`Hapus data nilai siswa ${sub.studentName}?`)) {
                                  onDeleteSubmission(subId);
                                }
                              }}
                              className="p-1.5 rounded-lg bg-rose-50  hover:bg-rose-100  text-rose-700  transition-colors flex items-center gap-1 text-[11px] font-semibold cursor-pointer relative z-10"
                              title="Hapus Nilai Siswa Ini"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Hapus</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Inspect Student Paper Modal */}
      {inspectSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
 <div className="bg-[var(--paper)] max-w-2xl w-full max-h-[90vh] flex flex-col border-2 border-[var(--line)] my-auto">
 <div className="p-5 sm:p-6 border-b-2 border-[var(--line)] flex items-start justify-between gap-3">
              <div className="space-y-1">
 <h3 className="text-[1.0625rem] text-[var(--ink)]">
                  Lembar Jawaban: {inspectSubmission.studentName}
                </h3>
 <p className="tnum text-[0.8125rem] text-[var(--ink-soft)]">
                  {inspectSubmission.studentClass} • Kode {inspectSubmission.quizCode} • Skor: {inspectSubmission.score} / 100
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspectSubmission(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700  cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto p-6 space-y-4 flex-1">
              {/* Category Scores Breakdown */}
              {inspectSubmission.categoryScores && (
 <div className="p-4 rounded-2xl bg-teal-50/60  border border-teal-200  space-y-2 text-xs">
 <span className="font-bold text-teal-900  block">Nilai per Kategori:</span>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(inspectSubmission.categoryScores).map(([cat, data]) => (
 <div key={cat} className="bg-white  p-2.5 rounded-xl border border-teal-100  flex items-center justify-between">
 <span className="font-semibold text-slate-700 ">{cat}</span>
 <span className="font-bold text-teal-800 ">{data.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Question list answers */}
              {currentInspectedQuiz?.questions.map((q, idx) => {
                const studentAns = inspectSubmission.answers[q.id];

                return (
 <div key={q.id || idx} className="p-4 bg-[var(--paper-2)] border-2 border-[var(--line)] text-[0.8125rem] space-y-2">
                    <div className="flex items-start justify-between">
 <span className="font-bold text-slate-800 ">
                        Soal {idx + 1} ({q.type === 'multiple_choice' ? 'Pilihan Ganda' : q.type === 'short_answer' ? 'Isian Singkat' : 'Menjodohkan'})
                      </span>
 <span className="text-xs bg-white  px-2 py-0.5 rounded-md border border-slate-200  text-slate-600  font-semibold">
                         {q.category || 'Umum'}
                      </span>
                    </div>

 <p className="text-slate-700  font-medium">{q.text}</p>

                    <QuestionAssets
                      assets={resolveQuestionAssets(currentInspectedQuiz, q)}
                      imageClassName="w-full max-h-56 object-contain rounded-xl border border-slate-200  bg-white"
                    />

 <div className="p-2.5 rounded-xl bg-white  border border-slate-200  space-y-1">
                      <div className="flex items-center gap-2">
 <span className="text-slate-500 ">Jawaban Siswa:</span>
 <span className="font-bold text-slate-800 ">
                          {typeof studentAns === 'object' && studentAns !== null
                            ? JSON.stringify(studentAns)
                            : typeof studentAns === 'number' && q.options
                            ? `${String.fromCharCode(65 + studentAns)}. ${q.options[studentAns]}`
                            : studentAns !== undefined
                            ? String(studentAns)
                            : '(Tidak Dijawab)'}
                        </span>
                      </div>

                      {q.explanation && (
 <p className="text-xs sm:text-sm text-slate-500  italic pt-1">
                           Pembahasan: {q.explanation}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
