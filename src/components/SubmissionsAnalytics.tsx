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
import { formatTimeRemaining } from '../utils/quizLogic.js';

interface Props {
  quizzes: Quiz[];
  submissions: StudentSubmission[];
  selectedQuizId?: string | null;
  onClearSubmissions: (quizId?: string) => void;
}

export const SubmissionsAnalytics: React.FC<Props> = ({
  quizzes,
  submissions,
  selectedQuizId: initialSelectedQuizId,
  onClearSubmissions
}) => {
  const [filterQuizId, setFilterQuizId] = useState<string>(initialSelectedQuizId || 'ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [inspectSubmission, setInspectSubmission] = useState<StudentSubmission | null>(null);

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
    <div className="space-y-6">
      
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xl">
            🏆
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">
              Rekap & Penilaian Otomatis Siswa
            </h1>
            <p className="text-xs text-slate-500">
              Hasil penilaian terhitung otomatis berdasarkan jenis soal (Pilihan Ganda, Isian Singkat, dan Menjodohkan).
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleExportCSV}
          disabled={filtered.length === 0}
          className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Ekspor Rekap CSV / Excel</span>
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-1">
          <span className="text-xs font-semibold text-slate-400 block">Siswa Mengikuti</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-800">{totalSubmissions}</span>
            <span className="text-xs text-slate-500">orang</span>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-1">
          <span className="text-xs font-semibold text-slate-400 block">Rata-Rata Nilai</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-teal-700">{avgScore}</span>
            <span className="text-xs text-slate-500">/ 100</span>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-1">
          <span className="text-xs font-semibold text-slate-400 block">Nilai Tertinggi</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-600">{highestScore}</span>
            <span className="text-xs text-slate-500">poin</span>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-1">
          <span className="text-xs font-semibold text-slate-400 block">Tingkat Kelulusan (KKM)</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-600">{passRate}%</span>
            <span className="text-xs text-slate-500">({passedCount} lulus)</span>
          </div>
        </div>
      </div>

      {/* Category Performance Analytics */}
      {Object.keys(categoryAggregates).length > 0 && (
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-teal-600" />
              <span>Rata-rata Penguasaan Materi per Kategori:</span>
            </span>
            <span className="text-xs text-slate-400">Analisis Otomatis Guru</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {Object.entries(categoryAggregates).map(([cat, agg]) => {
              const catAverage = Math.round(agg.totalPct / agg.count);
              return (
                <div key={cat} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-800">{cat}</span>
                    <span className={catAverage >= 70 ? 'text-emerald-700 font-bold' : 'text-amber-700 font-bold'}>
                      {catAverage}%
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className={`h-full ${catAverage >= 70 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                      style={{ width: `${catAverage}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 block">
                    Berdasarkan {agg.count} lembar pengerjaan siswa
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={filterQuizId}
              onChange={(e) => setFilterQuizId(e.target.value)}
              className="text-xs p-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-700 focus:outline-none w-full sm:w-64"
            >
              <option value="ALL">Semua Kuis Guru</option>
              {quizzes.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.title} ({q.code})
                </option>
              ))}
            </select>
          </div>

          <div className="relative w-full sm:w-60">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama siswa atau kelas..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none"
            />
          </div>
        </div>

        {filtered.length > 0 && (
          <button
            type="button"
            onClick={() => onClearSubmissions(filterQuizId === 'ALL' ? undefined : filterQuizId)}
            className="text-xs text-rose-600 hover:text-rose-800 font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-rose-50 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Reset Riwayat</span>
          </button>
        )}
      </div>

      {/* Submissions Table */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
        {filtered.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-xl">
              📊
            </div>
            <p className="font-bold text-slate-700 text-sm">Belum Ada Rekap Nilai Siswa</p>
            <p className="text-xs text-slate-500">
              Bagikan PIN Kuis kepada siswa untuk mulai menerima hasil pengerjaan secara real-time.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
                  <th className="py-3.5 px-4">Peringkat</th>
                  <th className="py-3.5 px-4">Nama Siswa</th>
                  <th className="py-3.5 px-4">Kelas</th>
                  <th className="py-3.5 px-4">Kode Kuis</th>
                  <th className="py-3.5 px-4">Nilai</th>
                  <th className="py-3.5 px-4">Poin</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Waktu</th>
                  <th className="py-3.5 px-4">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filtered
                  .sort((a, b) => b.score - a.score)
                  .map((sub, idx) => {
                    return (
                      <tr key={sub.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-bold">
                          {idx === 0 ? (
                            <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 inline-flex items-center justify-center text-xs font-black">
                              🥇
                            </span>
                          ) : idx === 1 ? (
                            <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 inline-flex items-center justify-center text-xs font-black">
                              🥈
                            </span>
                          ) : idx === 2 ? (
                            <span className="w-6 h-6 rounded-full bg-amber-50 text-amber-700 inline-flex items-center justify-center text-xs font-black">
                              🥉
                            </span>
                          ) : (
                            <span className="text-slate-400 pl-2">#{idx + 1}</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{sub.studentName}</div>
                          {sub.studentNis && (
                            <div className="text-[10px] text-slate-500 font-medium">No/NIS: {sub.studentNis}</div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {sub.studentClass}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-700">
                          {sub.quizCode}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2.5 py-1 rounded-lg font-black text-xs ${
                              sub.score >= 80
                                ? 'bg-emerald-100 text-emerald-800'
                                : sub.isPassed
                                ? 'bg-teal-100 text-teal-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {sub.score}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-600">
                          {sub.earnedPoints ?? sub.score} / {sub.totalPoints ?? 100}
                        </td>
                        <td className="py-3 px-4">
                          {sub.isPassed ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Lulus</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600">
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Remedial</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-500 font-mono">
                          {formatTimeRemaining(sub.timeSpentSeconds)}
                        </td>
                        <td className="py-3 px-4">
                          <button
                            type="button"
                            onClick={() => setInspectSubmission(sub)}
                            className="p-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 transition-colors flex items-center gap-1 text-[11px] font-semibold"
                            title="Lihat Lembar Jawaban Siswa"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Rincian</span>
                          </button>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 my-auto">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-800">
                  Lembar Jawaban: {inspectSubmission.studentName}
                </h3>
                <p className="text-xs text-slate-500">
                  {inspectSubmission.studentClass} • Kode {inspectSubmission.quizCode} • Skor: {inspectSubmission.score} / 100
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspectSubmission(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto p-6 space-y-4 flex-1">
              {/* Category Scores Breakdown */}
              {inspectSubmission.categoryScores && (
                <div className="p-4 rounded-2xl bg-teal-50/60 border border-teal-200 space-y-2 text-xs">
                  <span className="font-bold text-teal-900 block">Nilai per Kategori:</span>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(inspectSubmission.categoryScores).map(([cat, data]) => (
                      <div key={cat} className="bg-white p-2.5 rounded-xl border border-teal-100 flex items-center justify-between">
                        <span className="font-semibold text-slate-700">{cat}</span>
                        <span className="font-bold text-teal-800">{data.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Question list answers */}
              {currentInspectedQuiz?.questions.map((q, idx) => {
                const studentAns = inspectSubmission.answers[q.id];

                return (
                  <div key={q.id || idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                    <div className="flex items-start justify-between">
                      <span className="font-bold text-slate-800">
                        Soal {idx + 1} ({q.type === 'multiple_choice' ? 'Pilihan Ganda' : q.type === 'short_answer' ? 'Isian Singkat' : 'Menjodohkan'})
                      </span>
                      <span className="text-[10px] bg-white px-2 py-0.5 rounded-md border text-slate-600 font-semibold">
                        🏷️ {q.category || 'Umum'}
                      </span>
                    </div>

                    <p className="text-slate-700 font-medium">{q.text}</p>

                    <div className="p-2.5 rounded-xl bg-white border border-slate-200 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500">Jawaban Siswa:</span>
                        <span className="font-bold text-slate-800">
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
                        <p className="text-[11px] text-slate-500 italic pt-1">
                          💡 Pembahasan: {q.explanation}
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
