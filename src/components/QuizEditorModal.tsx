import React, { useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Check,
  Tag,
  ListOrdered,
  Type,
  Shuffle
} from 'lucide-react';
import { Quiz, Question, QuestionType, MatchingPair } from '../types/quiz.js';
import { validateQuizData, generateQuizCode } from '../utils/quizLogic.js';

interface Props {
  initialQuiz?: Quiz | null;
  existingCodes: string[];
  globalCategories: string[];
  onAddNewCategory: (category: string) => void;
  onSave: (quiz: Quiz) => void;
  onClose: () => void;
}

export const QuizEditorModal: React.FC<Props> = ({
  initialQuiz,
  existingCodes,
  globalCategories,
  onAddNewCategory,
  onSave,
  onClose
}) => {
  const [title, setTitle] = useState(initialQuiz?.title || '');
  const [description, setDescription] = useState(initialQuiz?.description || '');
  const [materialContent, setMaterialContent] = useState(initialQuiz?.materialContent || '');
  const [materialType, setMaterialType] = useState<'text' | 'pdf' | 'ppt' | 'youtube'>(initialQuiz?.materialType || 'text');
  const [materialFileUrl, setMaterialFileUrl] = useState(initialQuiz?.materialFileUrl || '');
  const [materialFileName, setMaterialFileName] = useState(initialQuiz?.materialFileName || '');
  const [materialYoutubeUrl, setMaterialYoutubeUrl] = useState(initialQuiz?.materialYoutubeUrl || '');
  const [subject, setSubject] = useState(initialQuiz?.subject || 'Sejarah Nusantara');
  const [gradeLevel, setGradeLevel] = useState(initialQuiz?.gradeLevel || 'SMP');
  const [durationMinutes, setDurationMinutes] = useState(initialQuiz?.durationMinutes ?? 10);
  const [passingGrade, setPassingGrade] = useState(initialQuiz?.passingGrade ?? 70);

  const [categories, setCategories] = useState<string[]>(
    initialQuiz?.categories && initialQuiz.categories.length > 0
      ? initialQuiz.categories
      : globalCategories.slice(0, 3)
  );

  const [newCatInput, setNewCatInput] = useState('');
  const [showAddCatInput, setShowAddCatInput] = useState(false);

  const [questions, setQuestions] = useState<Question[]>(
    initialQuiz?.questions && initialQuiz.questions.length > 0
      ? initialQuiz.questions
      : [
          {
            id: `q-${Date.now()}-1`,
            type: 'multiple_choice',
            category: globalCategories[0] || 'Umum',
            points: 20,
            text: '',
            options: ['', '', '', ''],
            correctOption: 0,
            explanation: ''
          }
        ]
  );

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAiScoring, setIsAiScoring] = useState(false);
  const [aiScoringFeedback, setAiScoringFeedback] = useState<string | null>(null);

  const totalPoints = questions.reduce((sum, q) => sum + (Number(q.points) || 0), 0);

  // AI Smart Point Allocation (proportional by difficulty & types, strictly 100 pts)
  const handleAiSmartScoring = async () => {
    if (questions.length === 0) return;
    setIsAiScoring(true);
    setAiScoringFeedback(null);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/smart-score-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.questions && Array.isArray(data.questions)) {
          setQuestions(data.questions);
          setAiScoringFeedback(
            data.summary || 'AI berhasil mendistribusikan poin secara pintar! Total skor tepat 100 poin.'
          );
          setTimeout(() => setAiScoringFeedback(null), 8000);
          return;
        }
      }
      throw new Error('Fallback local smart calculation');
    } catch {
      // Local pedagogical fallback
      const sumWeights = questions.reduce(
        (acc, q) => acc + (q.type === 'matching' ? 2.0 : q.type === 'short_answer' ? 1.5 : 1.0),
        0
      );
      let allocated = 0;
      const scored = questions.map((q) => {
        const weight = q.type === 'matching' ? 2.0 : q.type === 'short_answer' ? 1.5 : 1.0;
        const pts = Math.max(1, Math.round((weight / sumWeights) * 100));
        allocated += pts;
        return {
          ...q,
          points: pts,
          difficultyTag:
            q.type === 'matching'
              ? 'Sulit (Menjodohkan)'
              : q.type === 'short_answer'
              ? 'Sedang-Tinggi (Isian)'
              : 'Standar'
        };
      });

      const diff = 100 - allocated;
      if (diff !== 0 && scored.length > 0) {
        scored[scored.length - 1].points = Math.max(1, scored[scored.length - 1].points + diff);
      }

      setQuestions(scored);
      setAiScoringFeedback('Poin berhasil diselaraskan otomatis berdasarkan bobot tipe soal. Total tepat 100 poin.');
      setTimeout(() => setAiScoringFeedback(null), 8000);
    } finally {
      setIsAiScoring(false);
    }
  };

  // Category addition
  const handleCreateCategory = () => {
    const trimmed = newCatInput.trim();
    if (!trimmed) return;
    if (!categories.includes(trimmed)) {
      setCategories([...categories, trimmed]);
      onAddNewCategory(trimmed);
    }
    setNewCatInput('');
    setShowAddCatInput(false);
  };

  // Add Question with chosen type
  const handleAddQuestion = (type: QuestionType = 'multiple_choice') => {
    let newQ: Question;
    const defaultCat = categories[0] || globalCategories[0] || 'Umum';

    if (type === 'multiple_choice') {
      newQ = {
        id: `q-${Date.now()}-${questions.length + 1}`,
        type: 'multiple_choice',
        category: defaultCat,
        points: 20,
        text: '',
        options: ['', '', '', ''],
        correctOption: 0,
        explanation: ''
      };
    } else if (type === 'short_answer') {
      newQ = {
        id: `q-${Date.now()}-${questions.length + 1}`,
        type: 'short_answer',
        category: defaultCat,
        points: 20,
        text: '',
        acceptedAnswers: [''],
        caseSensitive: false,
        explanation: ''
      };
    } else {
      newQ = {
        id: `q-${Date.now()}-${questions.length + 1}`,
        type: 'matching',
        category: defaultCat,
        points: 20,
        text: '',
        matchingPairs: [
          { id: `p-${Date.now()}-1`, left: '', right: '' },
          { id: `p-${Date.now()}-2`, left: '', right: '' }
        ],
        explanation: ''
      };
    }

    setQuestions([...questions, newQ]);
  };

  const handleRemoveQuestion = (index: number) => {
    if (questions.length <= 1) {
      setErrorMessage('Kuis harus memiliki minimal 1 butir soal.');
      return;
    }
    setQuestions(questions.filter((_, idx) => idx !== index));
    setErrorMessage(null);
  };

  // Change question type dynamically
  const handleChangeQuestionType = (qIndex: number, newType: QuestionType) => {
    const next = [...questions];
    const curr = next[qIndex];
    if (curr.type === newType) return;

    if (newType === 'multiple_choice') {
      next[qIndex] = {
        ...curr,
        type: 'multiple_choice',
        options: curr.options && curr.options.length >= 2 ? curr.options : ['', '', '', ''],
        correctOption: curr.correctOption ?? 0
      };
    } else if (newType === 'short_answer') {
      next[qIndex] = {
        ...curr,
        type: 'short_answer',
        acceptedAnswers: curr.acceptedAnswers && curr.acceptedAnswers.length > 0 ? curr.acceptedAnswers : [''],
        caseSensitive: false
      };
    } else if (newType === 'matching') {
      next[qIndex] = {
        ...curr,
        type: 'matching',
        matchingPairs: curr.matchingPairs && curr.matchingPairs.length >= 2
          ? curr.matchingPairs
          : [
              { id: `p-${Date.now()}-1`, left: '', right: '' },
              { id: `p-${Date.now()}-2`, left: '', right: '' }
            ]
      };
    }
    setQuestions(next);
  };

  const handleQuestionFieldChange = (qIndex: number, fields: Partial<Question>) => {
    const next = [...questions];
    next[qIndex] = { ...next[qIndex], ...fields };
    setQuestions(next);
  };

  // Multiple Choice Helpers
  const handleOptionChange = (qIndex: number, optIndex: number, text: string) => {
    const next = [...questions];
    const newOptions = [...(next[qIndex].options || ['', '', '', ''])];
    newOptions[optIndex] = text;
    next[qIndex] = { ...next[qIndex], options: newOptions };
    setQuestions(next);
  };

  // Short Answer Helpers
  const handleAddAcceptedAnswer = (qIndex: number) => {
    const next = [...questions];
    const currentList = next[qIndex].acceptedAnswers || [];
    next[qIndex] = { ...next[qIndex], acceptedAnswers: [...currentList, ''] };
    setQuestions(next);
  };

  const handleUpdateAcceptedAnswer = (qIndex: number, aIndex: number, val: string) => {
    const next = [...questions];
    const currentList = [...(next[qIndex].acceptedAnswers || [])];
    currentList[aIndex] = val;
    next[qIndex] = { ...next[qIndex], acceptedAnswers: currentList };
    setQuestions(next);
  };

  const handleRemoveAcceptedAnswer = (qIndex: number, aIndex: number) => {
    const next = [...questions];
    const currentList = (next[qIndex].acceptedAnswers || []).filter((_, idx) => idx !== aIndex);
    next[qIndex] = { ...next[qIndex], acceptedAnswers: currentList.length > 0 ? currentList : [''] };
    setQuestions(next);
  };

  // Matching Pairs Helpers
  const handleAddMatchingPair = (qIndex: number) => {
    const next = [...questions];
    const pairs = next[qIndex].matchingPairs || [];
    next[qIndex] = {
      ...next[qIndex],
      matchingPairs: [...pairs, { id: `p-${Date.now()}-${pairs.length + 1}`, left: '', right: '' }]
    };
    setQuestions(next);
  };

  const handleUpdateMatchingPair = (
    qIndex: number,
    pairIndex: number,
    field: 'left' | 'right',
    val: string
  ) => {
    const next = [...questions];
    const pairs = [...(next[qIndex].matchingPairs || [])];
    pairs[pairIndex] = { ...pairs[pairIndex], [field]: val };
    next[qIndex] = { ...next[qIndex], matchingPairs: pairs };
    setQuestions(next);
  };

  const handleRemoveMatchingPair = (qIndex: number, pairIndex: number) => {
    const next = [...questions];
    const pairs = (next[qIndex].matchingPairs || []).filter((_, idx) => idx !== pairIndex);
    next[qIndex] = { ...next[qIndex], matchingPairs: pairs };
    setQuestions(next);
  };

  const handleMaterialFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMaterialFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setMaterialFileUrl(reader.result as string);
      if (file.type.includes('pdf') || file.name.toLowerCase().endsWith('.pdf')) {
        setMaterialType('pdf');
      } else {
        setMaterialType('ppt');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const validation = validateQuizData(title, questions);
    if (!validation.isValid) {
      setErrorMessage(validation.error || 'Mohon lengkapi seluruh isian kuis.');
      return;
    }

    const quizToSave: Quiz = {
      id: initialQuiz?.id || `quiz-${Date.now()}`,
      code: initialQuiz?.code || generateQuizCode(existingCodes),
      title: title.trim(),
      description: description.trim(),
      subject: subject.trim(),
      gradeLevel,
      durationMinutes,
      passingGrade,
      createdAt: initialQuiz?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: initialQuiz?.createdBy || 'Guru Awang Long',
      isActive: initialQuiz?.isActive !== undefined ? initialQuiz.isActive : true,
      categories: categories.length > 0 ? categories : ['Umum'],
      materialContent: materialContent.trim(),
      materialType,
      materialFileUrl,
      materialFileName,
      materialYoutubeUrl: materialYoutubeUrl.trim(),
      questions
    };

    onSave(quizToSave);
  };

  // Available categories for selector
  const allSelectableCategories = Array.from(new Set([...globalCategories, ...categories]));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 md:p-6 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl max-w-4xl w-full max-h-[94vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 my-auto transition-colors">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-teal-100 dark:bg-teal-950/80 text-teal-700 dark:text-teal-400 flex items-center justify-center font-bold text-base sm:text-lg shrink-0">
              ✏️
            </div>
            <div>
              <h2 className="font-bold text-base sm:text-lg text-slate-800 dark:text-slate-100 leading-snug">
                {initialQuiz ? 'Edit Kuis & Bank Soal Multi-Tipe' : 'Buat Kuis Baru (Multi-Tipe & Kategori)'}
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
                Mendukung Pilihan Ganda, Isian Singkat, dan Menjodohkan dengan kategorisasi soal.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-3.5 sm:p-6 space-y-4 sm:space-y-6 flex-1">
          {errorMessage && (
            <div className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Section 1: Basic Information */}
          <div className="bg-slate-50/70 dark:bg-slate-800/70 p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-slate-700/80 space-y-3 sm:space-y-4 transition-colors">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
              1. Informasi Umum Kuis & Kategori
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2 space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                  Judul Kuis <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Misal: Kuis Perjuangan Awang Long & Sains Mahakam"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-400/40 transition-colors"
                />
              </div>

              <div className="md:col-span-2 space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                  Deskripsi / Petunjuk Singkat
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Petunjuk pengerjaan bagi siswa..."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-400/40 transition-colors"
                />
              </div>

              <div className="md:col-span-2 space-y-3 p-4 rounded-2xl bg-teal-50/50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <label className="text-xs font-bold text-teal-900 dark:text-teal-200 uppercase tracking-wider flex items-center gap-1.5">
                    <span>📚 Bahan Bacaan & Materi Awal (PDF, PPT, YouTube, atau Teks)</span>
                  </label>
                  <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-teal-200 dark:border-teal-800 text-[11px] font-semibold">
                    <button
                      type="button"
                      onClick={() => setMaterialType('text')}
                      className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${materialType === 'text' ? 'bg-teal-600 text-white' : 'text-slate-600 dark:text-slate-300'}`}
                    >
                      📝 Teks
                    </button>
                    <button
                      type="button"
                      onClick={() => setMaterialType('pdf')}
                      className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${materialType === 'pdf' || materialType === 'ppt' ? 'bg-teal-600 text-white' : 'text-slate-600 dark:text-slate-300'}`}
                    >
                      📄 PDF / PPT
                    </button>
                    <button
                      type="button"
                      onClick={() => setMaterialType('youtube')}
                      className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${materialType === 'youtube' ? 'bg-teal-600 text-white' : 'text-slate-600 dark:text-slate-300'}`}
                    >
                      ▶️ YouTube
                    </button>
                  </div>
                </div>

                {materialType === 'text' && (
                  <textarea
                    rows={4}
                    value={materialContent}
                    onChange={(e) => setMaterialContent(e.target.value)}
                    placeholder="Masukkan teks materi bacaan atau ringkasan yang wajib dibaca siswa di awal kuis..."
                    className="w-full text-xs p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-400/40 transition-colors font-sans"
                  />
                )}

                {(materialType === 'pdf' || materialType === 'ppt') && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <label className="flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-teal-300 dark:border-teal-700 bg-white dark:bg-slate-900 hover:bg-teal-50/50 dark:hover:bg-teal-950/50 transition-colors cursor-pointer text-xs font-semibold text-teal-800 dark:text-teal-300">
                        <span>{materialFileName ? `📁 File Terpilih: ${materialFileName}` : '📂 Unggah File PDF atau PPTX'}</span>
                        <input
                          type="file"
                          accept=".pdf,.ppt,.pptx"
                          onChange={handleMaterialFileUpload}
                          className="hidden"
                        />
                      </label>
                      {materialFileUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            setMaterialFileUrl('');
                            setMaterialFileName('');
                            setMaterialType('text');
                          }}
                          className="px-3 py-3 rounded-xl bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 text-xs font-bold hover:bg-rose-200 transition-colors cursor-pointer"
                        >
                          Hapus File
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Mendukung file dokumen PDF dan presentasi PowerPoint (.ppt, .pptx) sebagai pratinjau bacaan siswa.
                    </p>
                  </div>
                )}

                {materialType === 'youtube' && (
                  <div className="space-y-2">
                    <input
                      type="url"
                      value={materialYoutubeUrl}
                      onChange={(e) => setMaterialYoutubeUrl(e.target.value)}
                      placeholder="Masukkan Link YouTube (Contoh: https://www.youtube.com/watch?v=xxxxx atau https://youtu.be/xxxxx)"
                      className="w-full text-xs p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-400/40 transition-colors"
                    />
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Siswa akan dapat langsung menonton video pembelajaran YouTube tersebut di awal kuis sebagai bahan pratinjau.
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                  Mata Pelajaran
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Misal: Sejarah, IPA, Matematika..."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-400/40 transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                  Jenjang Kelas
                </label>
                <select
                  value={gradeLevel}
                  onChange={(e) => setGradeLevel(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-400/40 transition-colors"
                >
                  <option value="SD">SD (Sekolah Dasar)</option>
                  <option value="SMP">SMP / MTs</option>
                  <option value="SMA">SMA / SMK / MA</option>
                  <option value="Umum">Umum / Komunitas</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                  Durasi Pengerjaan (Menit)
                </label>
                <input
                  type="number"
                  min={0}
                  max={180}
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-400/40 transition-colors"
                />
                <span className="text-[10px] text-slate-400 dark:text-slate-500">Isi 0 jika tidak ada batas waktu</span>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                  Nilai KKM (Kelulusan Minimal 0-100)
                </label>
                <input
                  type="number"
                  min={10}
                  max={100}
                  value={passingGrade}
                  onChange={(e) => setPassingGrade(Number(e.target.value))}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-400/40 transition-colors"
                />
              </div>

              {/* Quiz Categories Chip Manager */}
              <div className="md:col-span-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                    <span>Kategori Terkait Kuis Ini:</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAddCatInput(!showAddCatInput)}
                    className="text-xs text-teal-700 dark:text-teal-400 hover:text-teal-900 dark:hover:text-teal-300 font-semibold cursor-pointer"
                  >
                    + Buat Kategori Baru
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {allSelectableCategories.map((cat) => {
                    const isSelected = categories.includes(cat);
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            if (categories.length > 1) {
                              setCategories(categories.filter((c) => c !== cat));
                            }
                          } else {
                            setCategories([...categories, cat]);
                          }
                        }}
                        className={`text-xs px-2.5 py-1 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 border-teal-300 dark:border-teal-700 font-semibold shadow-xs'
                            : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        {isSelected ? '✓ ' : '+ '}
                        {cat}
                      </button>
                    );
                  })}
                </div>

                {showAddCatInput && (
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      value={newCatInput}
                      onChange={(e) => setNewCatInput(e.target.value)}
                      placeholder="Nama kategori baru..."
                      className="text-xs p-2 rounded-xl border border-teal-300 dark:border-teal-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none flex-1 max-w-xs"
                    />
                    <button
                      type="button"
                      onClick={handleCreateCategory}
                      className="px-3 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold cursor-pointer"
                    >
                      Tambah
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Questions Editor */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 sm:p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    2. Butir Soal ({questions.length} Soal)
                  </h3>
                  <div
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1 border transition-all ${
                      totalPoints === 100
                        ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 shadow-xs'
                        : 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800 animate-pulse'
                    }`}
                  >
                    <span>{totalPoints === 100 ? '🎯' : '⚠️'}</span>
                    <span>Total Skor: {totalPoints} / 100 Poin</span>
                    {totalPoints === 100 ? (
                      <span className="text-[10px] opacity-80">(Ideal)</span>
                    ) : (
                      <span className="text-[10px] opacity-80">
                        ({totalPoints < 100 ? `Kurang ${100 - totalPoints}` : `Lebih ${totalPoints - 100}`})
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Total skor seluruh soal disarankan tepat 100 poin untuk mempermudah evaluasi nilai siswa.
                </p>
              </div>

              {/* Action Buttons: Smart AI Scoring + Quick Add */}
              <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={handleAiSmartScoring}
                  disabled={isAiScoring || questions.length === 0}
                  title="Analisis tingkat kognitif dan kesulitan soal secara otomatis agar total skor tepat 100 poin"
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-teal-500 via-cyan-500 to-indigo-600 hover:from-teal-600 hover:to-indigo-700 text-white font-bold text-xs shadow-sm hover:shadow-md flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${isAiScoring ? 'animate-spin' : ''}`} />
                  <span>{isAiScoring ? 'AI Menganalisis Soal...' : 'Atur Poin Pintar (AI)'}</span>
                </button>
              </div>
            </div>

            {/* AI Scoring Feedback Alert */}
            {aiScoringFeedback && (
              <div className="p-3 sm:p-3.5 rounded-xl bg-teal-50 dark:bg-teal-950/70 border border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-300 text-xs flex items-center justify-between gap-2 animate-in fade-in slide-in-from-top-1">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                  <span className="font-medium">{aiScoringFeedback}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setAiScoringFeedback(null)}
                  className="text-teal-600 hover:text-teal-900 dark:hover:text-teal-100 p-0.5 rounded cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Quick Add Buttons by Type */}
            <div className="flex items-center justify-between gap-2 flex-wrap pb-1">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Tambah jenis soal baru:
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleAddQuestion('multiple_choice')}
                  className="px-2.5 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/80 hover:bg-teal-100 dark:hover:bg-teal-900 text-teal-800 dark:text-teal-300 font-semibold text-[11px] inline-flex items-center gap-1 border border-teal-200 dark:border-teal-800 cursor-pointer"
                >
                  <ListOrdered className="w-3.5 h-3.5" />
                  <span>+ Pilihan Ganda</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddQuestion('short_answer')}
                  className="px-2.5 py-1.5 rounded-xl bg-cyan-50 dark:bg-cyan-950/80 hover:bg-cyan-100 dark:hover:bg-cyan-900 text-cyan-800 dark:text-cyan-300 font-semibold text-[11px] inline-flex items-center gap-1 border border-cyan-200 dark:border-cyan-800 cursor-pointer"
                >
                  <Type className="w-3.5 h-3.5" />
                  <span>+ Isian Singkat</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddQuestion('matching')}
                  className="px-2.5 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-800 dark:text-indigo-300 font-semibold text-[11px] inline-flex items-center gap-1 border border-indigo-200 dark:border-indigo-800 cursor-pointer"
                >
                  <Shuffle className="w-3.5 h-3.5" />
                  <span>+ Menjodohkan</span>
                </button>
              </div>
            </div>

            {/* Questions List */}
            <div className="space-y-4 sm:space-y-5">
              {questions.map((q, qIdx) => (
                <div
                  key={q.id || qIdx}
                  className="p-3.5 sm:p-5 rounded-xl sm:rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-xs space-y-3 sm:space-y-4 relative group transition-colors"
                >
                  {/* Top Bar of each Question: Number, Type Selector, Category Selector, Points, Delete */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-xl bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 font-bold text-xs flex items-center justify-center shrink-0">
                        {qIdx + 1}
                      </span>

                      {/* Question Type Switcher */}
                      <div className="flex items-center p-0.5 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                        <button
                          type="button"
                          onClick={() => handleChangeQuestionType(qIdx, 'multiple_choice')}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            q.type === 'multiple_choice'
                              ? 'bg-white dark:bg-slate-800 text-teal-800 dark:text-teal-300 shadow-xs font-bold'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                          }`}
                        >
                          Pilihan Ganda
                        </button>
                        <button
                          type="button"
                          onClick={() => handleChangeQuestionType(qIdx, 'short_answer')}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            q.type === 'short_answer'
                              ? 'bg-white dark:bg-slate-800 text-cyan-800 dark:text-cyan-300 shadow-xs font-bold'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                          }`}
                        >
                          Isian Singkat
                        </button>
                        <button
                          type="button"
                          onClick={() => handleChangeQuestionType(qIdx, 'matching')}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            q.type === 'matching'
                              ? 'bg-white dark:bg-slate-800 text-indigo-800 dark:text-indigo-300 shadow-xs font-bold'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                          }`}
                        >
                          Menjodohkan
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Category Selector */}
                      <div className="flex items-center gap-1">
                        <Tag className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                        <select
                          value={q.category || categories[0] || 'Umum'}
                          onChange={(e) => handleQuestionFieldChange(qIdx, { category: e.target.value })}
                          className="text-xs p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none"
                        >
                          {allSelectableCategories.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Difficulty Tag if present */}
                      {q.difficultyTag && (
                        <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                          {q.difficultyTag}
                        </span>
                      )}

                      {/* Points */}
                      <div className="flex items-center gap-1 text-xs">
                        <span className="text-slate-400 dark:text-slate-400 font-semibold">Poin:</span>
                        <input
                          type="number"
                          min={1}
                          max={100}
                          value={q.points || 10}
                          onChange={(e) => handleQuestionFieldChange(qIdx, { points: Number(e.target.value) })}
                          className="w-14 text-xs p-1 rounded-lg border border-slate-300 dark:border-slate-700 text-center bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-bold"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveQuestion(qIdx)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                        title="Hapus Soal"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Question Text */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                      Pertanyaan / Instruksi:
                    </label>
                    <textarea
                      rows={2}
                      required
                      value={q.text}
                      onChange={(e) => handleQuestionFieldChange(qIdx, { text: e.target.value })}
                      placeholder={
                        q.type === 'multiple_choice'
                          ? 'Ketik teks pertanyaan pilihan ganda...'
                          : q.type === 'short_answer'
                          ? 'Ketik pertanyaan isian singkat (misal: "Sebutkan nama pahlawan yang memimpin...")'
                          : 'Ketik instruksi menjodohkan (misal: "Jodohkan tokoh di kolom kiri dengan perannya di kolom kanan")'
                      }
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-400/40 font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
                    />
                  </div>

                  {/* TYPE A: PILIHAN GANDA (Multiple Choice) */}
                  {q.type === 'multiple_choice' && (
                    <div className="space-y-2 pt-1 pl-4 border-l-2 border-teal-200 dark:border-teal-700">
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                        Pilihan Jawaban (Klik lingkaran huruf untuk menandai kunci jawaban yang benar):
                      </span>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {(q.options || ['', '', '', '']).map((opt, optIdx) => {
                          const isCorrect = q.correctOption === optIdx;
                          const letter = String.fromCharCode(65 + optIdx);
                          return (
                            <div
                              key={optIdx}
                              className={`flex items-center gap-2 p-2 rounded-xl border transition-all ${
                                isCorrect
                                  ? 'bg-emerald-50/80 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-600 ring-1 ring-emerald-300 dark:ring-emerald-600'
                                  : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700'
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => handleQuestionFieldChange(qIdx, { correctOption: optIdx })}
                                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors cursor-pointer ${
                                  isCorrect
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-600 hover:border-slate-400'
                                }`}
                                title={`Tandai Opsi ${letter} sebagai Kunci Jawaban`}
                              >
                                {isCorrect ? <Check className="w-3.5 h-3.5" /> : letter}
                              </button>

                              <input
                                type="text"
                                required
                                value={opt}
                                onChange={(e) => handleOptionChange(qIdx, optIdx, e.target.value)}
                                placeholder={`Opsi ${letter}...`}
                                className="w-full text-xs bg-transparent border-none outline-none text-slate-800 dark:text-slate-100 placeholder-slate-400"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* TYPE B: ISIAN SINGKAT (Short Answer) */}
                  {q.type === 'short_answer' && (
                    <div className="space-y-3 pt-1 pl-4 border-l-2 border-cyan-200 dark:border-cyan-700">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                          Kunci Jawaban yang Diterima (Siswa dianggap benar jika mengetik salah satu kata/variasi ini):
                        </span>
                        <button
                          type="button"
                          onClick={() => handleAddAcceptedAnswer(qIdx)}
                          className="text-xs text-cyan-700 dark:text-cyan-400 hover:text-cyan-900 dark:hover:text-cyan-300 font-bold cursor-pointer"
                        >
                          + Tambah Variasi
                        </button>
                      </div>

                      <div className="space-y-2">
                        {(q.acceptedAnswers || ['']).map((ans, aIdx) => (
                          <div key={aIdx} className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-400 w-5 text-right">{aIdx + 1}.</span>
                            <input
                              type="text"
                              required
                              value={ans}
                              onChange={(e) => handleUpdateAcceptedAnswer(qIdx, aIdx, e.target.value)}
                              placeholder="Ketik kata kunci jawaban yang benar (misal: Awang Long)"
                              className="flex-1 text-xs p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                            />
                            {(q.acceptedAnswers || []).length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveAcceptedAnswer(qIdx, aIdx)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center gap-2 pt-1 text-xs text-slate-600 dark:text-slate-400">
                        <input
                          type="checkbox"
                          id={`case-sens-${qIdx}`}
                          checked={q.caseSensitive || false}
                          onChange={(e) => handleQuestionFieldChange(qIdx, { caseSensitive: e.target.checked })}
                          className="rounded border-slate-300 dark:border-slate-600 text-cyan-600 focus:ring-cyan-500"
                        />
                        <label htmlFor={`case-sens-${qIdx}`} className="cursor-pointer">
                          Sensitif huruf besar/kecil (Case Sensitive) - <em>default: tidak sensitif (huruf kapital diabaikan)</em>
                        </label>
                      </div>
                    </div>
                  )}

                  {/* TYPE C: MENJODOHKAN (Matching Pairs) */}
                  {q.type === 'matching' && (
                    <div className="space-y-3 pt-1 pl-4 border-l-2 border-indigo-200 dark:border-indigo-700">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                          Pasangan Menjodohkan (Kiri dijodohkan dengan Kanan):
                        </span>
                        <button
                          type="button"
                          onClick={() => handleAddMatchingPair(qIdx)}
                          className="text-xs text-indigo-700 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 font-bold cursor-pointer"
                        >
                          + Tambah Pasangan
                        </button>
                      </div>

                      <div className="space-y-2">
                        {(q.matchingPairs || []).map((pair, pIdx) => (
                          <div key={pair.id || pIdx} className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                            <span className="text-xs font-bold text-slate-400 w-5 text-right">{pIdx + 1}.</span>
                            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <input
                                type="text"
                                required
                                value={pair.left}
                                onChange={(e) => handleUpdateMatchingPair(qIdx, pIdx, 'left', e.target.value)}
                                placeholder="Item Sisi Kiri (misal: Awang Long)"
                                className="text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none"
                              />
                              <input
                                type="text"
                                required
                                value={pair.right}
                                onChange={(e) => handleUpdateMatchingPair(qIdx, pIdx, 'right', e.target.value)}
                                placeholder="Pasangan Sisi Kanan (misal: Senapati Sakti Kutai)"
                                className="text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none"
                              />
                            </div>
                            {(q.matchingPairs || []).length > 2 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveMatchingPair(qIdx, pIdx)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Explanation for all types */}
                  <div className="pt-2">
                    <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                      Pembahasan Edukatif (Ditampilkan ke siswa setelah kuis selesai):
                    </label>
                    <input
                      type="text"
                      value={q.explanation || ''}
                      onChange={(e) => handleQuestionFieldChange(qIdx, { explanation: e.target.value })}
                      placeholder="Misal: Penjelasan materi atau kutipan sejarah terkait..."
                      className="w-full text-xs p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:bg-white dark:focus:bg-slate-900"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Add Bottom Buttons */}
            <div className="pt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleAddQuestion('multiple_choice')}
                className="py-2.5 rounded-xl border-2 border-dashed border-teal-300 dark:border-teal-700 hover:border-teal-500 text-teal-700 dark:text-teal-300 font-semibold text-xs flex items-center justify-center gap-1.5 hover:bg-teal-50/40 dark:hover:bg-teal-950/40 cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Pilihan Ganda</span>
              </button>
              <button
                type="button"
                onClick={() => handleAddQuestion('short_answer')}
                className="py-2.5 rounded-xl border-2 border-dashed border-cyan-300 dark:border-cyan-700 hover:border-cyan-500 text-cyan-700 dark:text-cyan-300 font-semibold text-xs flex items-center justify-center gap-1.5 hover:bg-cyan-50/40 dark:hover:bg-cyan-950/40 cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Isian Singkat</span>
              </button>
              <button
                type="button"
                onClick={() => handleAddQuestion('matching')}
                className="py-2.5 rounded-xl border-2 border-dashed border-indigo-300 dark:border-indigo-700 hover:border-indigo-500 text-indigo-700 dark:text-indigo-300 font-semibold text-xs flex items-center justify-center gap-1.5 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/40 cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Menjodohkan</span>
              </button>
            </div>
          </div>

          {/* Footer Submit */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3 transition-colors">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Batal
            </button>

            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Kuis Multi-Tipe</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
