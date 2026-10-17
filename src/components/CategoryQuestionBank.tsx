import React, { useState } from 'react';
import {
  Tag,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  BookOpen,
  ListOrdered,
  Type,
  Shuffle,
  ExternalLink,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { Quiz, Question, QuestionType } from '../types/quiz.js';

interface Props {
  quizzes: Quiz[];
  categories: string[];
  onAddCategory: (category: string) => void;
  onEditQuiz: (quiz: Quiz) => void;
}

export const CategoryQuestionBank: React.FC<Props> = ({
  quizzes,
  categories,
  onAddCategory,
  onEditQuiz
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [newCatName, setNewCatName] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);

  // Extract all questions across quizzes with quiz metadata
  const allQuestionEntries: Array<{
    question: Question;
    quiz: Quiz;
    index: number;
  }> = [];

  quizzes.forEach((quiz) => {
    (quiz.questions || []).forEach((q, idx) => {
      allQuestionEntries.push({
        question: q,
        quiz,
        index: idx
      });
    });
  });

  // Calculate count per category
  const categoryCounts: Record<string, number> = {};
  categories.forEach((cat) => {
    categoryCounts[cat] = 0;
  });
  allQuestionEntries.forEach((entry) => {
    const cat = entry.question.category || 'Umum';
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCatName.trim();
    if (!trimmed) return;
    onAddCategory(trimmed);
    setSelectedCategory(trimmed);
    setNewCatName('');
    setIsAddingCategory(false);
  };

  // Filter questions
  const filteredQuestions = allQuestionEntries.filter((entry) => {
    const q = entry.question;
    const matchesCat = selectedCategory === 'ALL' || (q.category || 'Umum') === selectedCategory;
    const matchesType = selectedType === 'ALL' || q.type === selectedType;
    const matchesSearch =
      q.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.quiz.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (q.explanation && q.explanation.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesCat && matchesType && matchesSearch;
  });

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-lg sm:text-xl shrink-0">
            🏷️
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-800">
              Bank Soal & Kategorisasi Materi
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-500">
              Kelola kategori soal (Sejarah, Biologi, Logika) dan lihat daftar seluruh butir soal per kategori.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsAddingCategory(true)}
          className="w-full sm:w-auto px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Buat Kategori Baru</span>
        </button>
      </div>

      {/* New Category Modal / Inline Box */}
      {isAddingCategory && (
        <form
          onSubmit={handleCreateCategory}
          className="p-5 rounded-3xl bg-teal-50/70 border-2 border-teal-300 flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in"
        >
          <div className="space-y-1 w-full sm:w-auto flex-1">
            <label className="text-xs font-bold text-teal-900 block">
              Nama Kategori Baru:
            </label>
            <input
              type="text"
              required
              autoFocus
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="Contoh: Sejarah Kutai Kartanegara, Biologi Sungai, Matematika Logika..."
              className="w-full text-xs p-2.5 rounded-xl border border-teal-300 bg-white focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto pt-2 sm:pt-4">
            <button
              type="button"
              onClick={() => setIsAddingCategory(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-100"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs"
            >
              Simpan Kategori
            </button>
          </div>
        </form>
      )}

      {/* Category Pills Selector */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
          Pilih Kategori Soal:
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 ${
              selectedCategory === 'ALL'
                ? 'bg-teal-600 text-white'
                : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
            }`}
          >
            <span>Semua Kategori</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
              {allQuestionEntries.length}
            </span>
          </button>

          {categories.map((cat) => {
            const count = categoryCounts[cat] || 0;
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-2 rounded-2xl text-xs font-semibold transition-all shadow-xs flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-teal-600 text-white font-bold'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
                }`}
              >
                <Tag className="w-3 h-3 text-teal-400" />
                <span>{cat}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-white/20' : 'bg-slate-100 text-slate-600'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          {/* Question Type Filter */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="text-xs p-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-700 focus:outline-none w-full sm:w-48"
            >
              <option value="ALL">Semua Jenis Soal</option>
              <option value="multiple_choice">Pilihan Ganda</option>
              <option value="short_answer">Isian Singkat</option>
              <option value="matching">Menjodohkan</option>
            </select>
          </div>

          {/* Search box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari teks soal atau kunci jawaban..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none"
            />
          </div>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Ditemukan {filteredQuestions.length} butir soal
        </div>
      </div>

      {/* Questions by Category Cards Grid */}
      {filteredQuestions.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-xl">
            🔍
          </div>
          <p className="font-bold text-slate-700 text-sm">Tidak ada soal dalam kategori ini</p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Pilih kategori lain atau tambahkan soal dengan kategori ini melalui fitur &quot;Kuis Saya&quot;.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredQuestions.map(({ question: q, quiz, index }) => {
            return (
              <div
                key={`${quiz.id}-${q.id || index}`}
                className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-3 flex flex-col justify-between hover:border-teal-300 transition-all"
              >
                <div className="space-y-2.5">
                  {/* Top badges: Category and Question Type */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                      🏷️ {q.category || 'Umum'}
                    </span>

                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                        q.type === 'multiple_choice'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : q.type === 'short_answer'
                          ? 'bg-cyan-50 text-cyan-800 border-cyan-200'
                          : 'bg-indigo-50 text-indigo-800 border-indigo-200'
                      }`}
                    >
                      {q.type === 'multiple_choice'
                        ? 'Pilihan Ganda'
                        : q.type === 'short_answer'
                        ? 'Isian Singkat'
                        : 'Menjodohkan'}
                    </span>
                  </div>

                  {/* Question Text */}
                  <h3 className="font-bold text-sm text-slate-800 leading-snug">
                    {q.text}
                  </h3>

                  {/* Preview Type-Specific Details */}
                  {q.type === 'multiple_choice' && (
                    <div className="grid grid-cols-2 gap-1 pt-1 text-[11px]">
                      {(q.options || []).map((opt, oIdx) => (
                        <div
                          key={oIdx}
                          className={`p-1.5 rounded-lg truncate ${
                            oIdx === q.correctOption
                              ? 'bg-emerald-100 text-emerald-900 font-bold border border-emerald-200'
                              : 'bg-slate-50 text-slate-600'
                          }`}
                        >
                          <span className="mr-1">{String.fromCharCode(65 + oIdx)}.</span>
                          {opt}
                        </div>
                      ))}
                    </div>
                  )}

                  {q.type === 'short_answer' && (
                    <div className="p-2 rounded-xl bg-cyan-50/70 border border-cyan-200 text-xs space-y-1">
                      <span className="text-[11px] font-semibold text-cyan-800 block">Kunci Jawaban:</span>
                      <div className="flex flex-wrap gap-1">
                        {(q.acceptedAnswers || []).map((ans, aIdx) => (
                          <span key={aIdx} className="bg-white px-2 py-0.5 rounded-md font-mono text-[11px] border border-cyan-200 text-slate-700">
                            &quot;{ans}&quot;
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {q.type === 'matching' && (
                    <div className="p-2 rounded-xl bg-indigo-50/70 border border-indigo-200 text-[11px] space-y-1">
                      <span className="font-semibold text-indigo-800 block">Pasangan Menjodohkan:</span>
                      <div className="space-y-1">
                        {(q.matchingPairs || []).map((pair, pIdx) => (
                          <div key={pIdx} className="flex items-center justify-between bg-white px-2 py-0.5 rounded-md border border-indigo-100 text-slate-700">
                            <span className="font-medium">{pair.left}</span>
                            <span className="text-slate-400">➔</span>
                            <span className="font-bold text-indigo-900">{pair.right}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {q.explanation && (
                    <p className="text-[11px] text-slate-500 italic pt-1">
                      💡 {q.explanation}
                    </p>
                  )}
                </div>

                {/* Footer metadata */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                  <span className="truncate max-w-[200px]">Dari kuis: <strong>{quiz.title}</strong></span>
                  <button
                    type="button"
                    onClick={() => onEditQuiz(quiz)}
                    className="text-teal-700 hover:text-teal-900 font-bold flex items-center gap-1 hover:underline"
                  >
                    <span>Edit Soal</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
