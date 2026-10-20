import React, { useState, useEffect } from 'react';
import { Navbar, NavTab } from './components/Navbar.js';
import { AiQuizWorkspace } from './components/AiQuizWorkspace.js';
import { TeacherQuizManager } from './components/TeacherQuizManager.js';
import { CategoryQuestionBank } from './components/CategoryQuestionBank.js';
import { QuizEditorModal } from './components/QuizEditorModal.js';
import { ShareQuizModal } from './components/ShareQuizModal.js';
import { FileUploadExtractorModal } from './components/FileUploadExtractorModal.js';
import { StudentQuizRoom } from './components/StudentQuizRoom.js';
import { SubmissionsAnalytics } from './components/SubmissionsAnalytics.js';
import { AccessibilityFloatingWidget } from './components/AccessibilityFloatingWidget.js';
import { Quiz, StudentSubmission } from './types/quiz.js';
import {
  loadStoredQuizzes,
  saveStoredQuizzes,
  loadStoredSubmissions,
  saveStoredSubmissions,
  loadStoredCategories,
  saveStoredCategories
} from './utils/storage.js';
import {
  saveQuizToFirebase,
  deleteQuizFromFirebase,
  saveSubmissionToFirebase,
  subscribeQuizzesRealtime,
  subscribeSubmissionsRealtime
} from './services/firebaseSync.js';
import { ArrowLeft, BookOpen } from 'lucide-react';

export default function App() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [submissions, setSubmissions] = useState<StudentSubmission[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<NavTab>('beranda');

  // Modals & Active selections
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);

  const [shareOpen, setShareOpen] = useState(false);
  const [sharingQuiz, setSharingQuiz] = useState<Quiz | null>(null);

  const [fileUploadOpen, setFileUploadOpen] = useState(false);

  const [studentActiveQuiz, setStudentActiveQuiz] = useState<Quiz | null>(null);
  const [analyticsSelectedQuizId, setAnalyticsSelectedQuizId] = useState<string | null>(null);
  const [isStudentLinkMode, setIsStudentLinkMode] = useState(false);

  // Load persistent storage & subscribe to live Firebase real-time updates
  useEffect(() => {
    // 1. Initial immediate load from local cache for instant zero-latency UI
    const loadedQuizzes = loadStoredQuizzes();
    const loadedSubs = loadStoredSubmissions();
    const loadedCats = loadStoredCategories();

    setQuizzes(loadedQuizzes);
    setSubmissions(loadedSubs);
    setCategories(loadedCats);

    // Check if ?code= or ?exam= is present in URL on initial load
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const examParam = params.get('exam');
      const urlCode = examParam || params.get('code');
      const autostart = params.get('autostart');

      if (urlCode) {
        setIsStudentLinkMode(true);
        setActiveTab('ruang-siswa');
        const found = loadedQuizzes.find((q) => q.code.toUpperCase() === urlCode.toUpperCase());
        if (found) {
          setStudentActiveQuiz(found);
        }
      } else if (autostart) {
        setActiveTab('beranda');
      }
    }

    // 2. Real-time Firebase Firestore synchronizer for Quizzes
    const unsubQuizzes = subscribeQuizzesRealtime((syncedQuizzes) => {
      setQuizzes(syncedQuizzes);

      // Check if student link mode is active and we need to match quiz by code
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const examParam = params.get('exam');
        const urlCode = examParam || params.get('code');
        if (urlCode) {
          setIsStudentLinkMode(true);
          setActiveTab('ruang-siswa');
          setStudentActiveQuiz((prev) => {
            if (prev) return prev;
            return syncedQuizzes.find((q) => q.code.toUpperCase() === urlCode.toUpperCase()) || null;
          });
        }
      }

      // Automatically derive and sync categories
      const allCats = new Set(loadedCats);
      syncedQuizzes.forEach((q) => {
        if (q.categories) q.categories.forEach((c) => allCats.add(c));
      });
      const updatedCats = Array.from(allCats);
      setCategories(updatedCats);
      saveStoredCategories(updatedCats);
    });

    // 3. Real-time Firebase Firestore synchronizer for Student Submissions
    const unsubSubmissions = subscribeSubmissionsRealtime((syncedSubs) => {
      setSubmissions(syncedSubs);
    });

    return () => {
      unsubQuizzes();
      unsubSubmissions();
    };
  }, []);

  // Save quizzes helper with real-time Firebase upload
  const handleSaveQuiz = async (quiz: Quiz) => {
    setQuizzes((prev) => {
      const existsIndex = prev.findIndex((q) => q.id === quiz.id);
      let updated: Quiz[];
      if (existsIndex >= 0) {
        updated = [...prev];
        updated[existsIndex] = quiz;
      } else {
        updated = [quiz, ...prev];
      }
      saveStoredQuizzes(updated);
      return updated;
    });

    // Also update categories if quiz has new ones
    if (quiz.categories && quiz.categories.length > 0) {
      setCategories((prev) => {
        const set = new Set([...prev, ...quiz.categories]);
        const updatedCats = Array.from(set);
        saveStoredCategories(updatedCats);
        return updatedCats;
      });
    }

    setEditorOpen(false);
    setEditingQuiz(null);

    // Live push to Firebase Firestore in real-time
    try {
      await saveQuizToFirebase(quiz);
    } catch (err) {
      console.error('[Firebase] Error saving quiz in real-time:', err);
    }
  };

  const handleAddNewCategory = (newCat: string) => {
    setCategories((prev) => {
      if (prev.includes(newCat)) return prev;
      const updated = [...prev, newCat];
      saveStoredCategories(updated);
      return updated;
    });
  };

  const handleDeleteQuiz = async (quizId: string) => {
    setQuizzes((prev) => {
      const updated = prev.filter((q) => q.id !== quizId);
      saveStoredQuizzes(updated);
      return updated;
    });

    // Live delete from Firebase Firestore in real-time
    try {
      await deleteQuizFromFirebase(quizId);
    } catch (err) {
      console.error('[Firebase] Error deleting quiz in real-time:', err);
    }
  };

  const handleOpenCreateNew = () => {
    setEditingQuiz(null);
    setEditorOpen(true);
  };

  const handleOpenEditQuiz = (quiz: Quiz) => {
    setEditingQuiz(quiz);
    setEditorOpen(true);
  };

  const handleOpenShareQuiz = (quiz: Quiz) => {
    setSharingQuiz(quiz);
    setShareOpen(true);
  };

  const handlePlayQuiz = (quiz: Quiz) => {
    setStudentActiveQuiz(quiz);
    setActiveTab('ruang-siswa');
  };

  const handleSubmissionComplete = async (submission: StudentSubmission) => {
    setSubmissions((prev) => {
      const updated = [submission, ...prev];
      saveStoredSubmissions(updated);
      return updated;
    });

    // Live push student exam submission to Firebase Firestore in real-time
    try {
      await saveSubmissionToFirebase(submission);
    } catch (err) {
      console.error('[Firebase] Error saving submission in real-time:', err);
    }
  };

  const handleClearSubmissions = (quizId?: string) => {
    setSubmissions((prev) => {
      const updated = quizId ? prev.filter((s) => s.quizId !== quizId) : [];
      saveStoredSubmissions(updated);
      return updated;
    });
  };

  const handleViewAnalyticsForQuiz = (quizId: string) => {
    setAnalyticsSelectedQuizId(quizId);
    setActiveTab('rekap-nilai');
  };

  const existingCodes = quizzes.map((q) => q.code);

  // If accessed via student exam link (e.g. ?exam=CODE), render standalone student portal strictly without teacher navigation/tools
  if (isStudentLinkMode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#E8F8F5] via-[#F4F9F9] to-[#EBF5FB] dark:from-slate-950 dark:via-slate-900 dark:to-[#0b1324] text-slate-800 dark:text-slate-100 flex flex-col font-sans antialiased selection:bg-teal-200 dark:selection:bg-teal-900 transition-colors duration-200">
        
        {/* Dedicated Student Header */}
        <header className="sticky top-0 z-40 backdrop-blur-md bg-white/95 dark:bg-slate-900/95 border-b border-slate-200 dark:border-slate-800 shadow-xs px-4 sm:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-600 to-cyan-500 text-white flex items-center justify-center font-bold shadow-xs">
              🎓
            </div>
            <div>
              <span className="font-extrabold text-base sm:text-lg text-slate-800 dark:text-slate-100 block leading-tight">
                Awang Long Quiz
              </span>
              <span className="text-[11px] text-teal-700 dark:text-teal-300 font-semibold">
                Portal Ujian Online Resmi Siswa
              </span>
            </div>
          </div>
          <div className="text-[11px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
            🔒 Mode Ujian Siswa Terisolasi
          </div>
        </header>

        {/* Standalone Student Main Content */}
        <main className="flex-1 max-w-4xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 pb-16">
          <StudentQuizRoom
            initialQuiz={studentActiveQuiz}
            availableQuizzes={quizzes.filter((q) => q.isActive)}
            onSubmissionComplete={handleSubmissionComplete}
            isStandaloneExam={true}
            onBackToHome={() => {}}
          />
        </main>

        {/* Floating Accessibility Widget (Dark Mode & Font Scaler) */}
        <AccessibilityFloatingWidget />

        {/* Dedicated Student Footer */}
        <footer className="py-6 border-t border-teal-100/60 dark:border-slate-800 bg-white/40 dark:bg-slate-900/60 text-center text-xs text-slate-500 dark:text-slate-400 transition-colors">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-bold text-teal-800 dark:text-teal-400">Awang Long Quiz Siswa</span>
              <span>•</span>
              <span>Evaluasi & Tugas Online Terpadu</span>
            </div>
            <div className="text-[11px] text-slate-400 dark:text-slate-500">
              Siswa wajib mengisi keterangan diri (Sesi 1) dan menyelesaikan seluruh soal sebelum mengirim jawaban.
            </div>
          </div>
        </footer>

      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E8F8F5] via-[#F4F9F9] to-[#EBF5FB] dark:from-slate-950 dark:via-slate-900 dark:to-[#0b1324] text-slate-800 dark:text-slate-100 flex flex-col font-sans antialiased selection:bg-teal-200 dark:selection:bg-teal-900 transition-colors duration-200">
      
      {/* Top Navigation Bar with Teacher Portal Focus */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        savedQuizCount={quizzes.length}
      />

      {/* Teacher Quiz Preview Notice when simulating a quiz */}
      {activeTab === 'ruang-siswa' && (
        <div className="bg-gradient-to-r from-teal-800 via-cyan-900 to-indigo-900 text-white text-xs px-4 py-2.5 flex items-center justify-between shadow-xs border-b border-teal-700/50">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold">Mode Simulasi & Uji Kuis Guru</span>
            <span className="hidden sm:inline text-teal-200">• Anda sedang menguji coba pengerjaan soal sebagai simulasi kuis</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setStudentActiveQuiz(null);
              setActiveTab('kuis-guru');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white font-semibold text-xs transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali ke Kuis Guru</span>
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-6 pb-28 md:pb-8">
        {activeTab === 'beranda' && (
          <AiQuizWorkspace
            onSaveQuiz={handleSaveQuiz}
            onPlayQuiz={handlePlayQuiz}
            onShareQuiz={handleOpenShareQuiz}
            onOpenFileUpload={() => setFileUploadOpen(true)}
            existingCodes={existingCodes}
          />
        )}

        {activeTab === 'kuis-guru' && (
          <TeacherQuizManager
            quizzes={quizzes}
            submissions={submissions}
            onCreateNew={handleOpenCreateNew}
            onOpenFileUpload={() => setFileUploadOpen(true)}
            onEditQuiz={handleOpenEditQuiz}
            onDeleteQuiz={handleDeleteQuiz}
            onShareQuiz={handleOpenShareQuiz}
            onPlayQuiz={handlePlayQuiz}
            onViewSubmissions={handleViewAnalyticsForQuiz}
          />
        )}

        {activeTab === 'bank-kategori' && (
          <CategoryQuestionBank
            quizzes={quizzes}
            categories={categories}
            onAddCategory={handleAddNewCategory}
            onEditQuiz={handleOpenEditQuiz}
          />
        )}

        {activeTab === 'ruang-siswa' && (
          <StudentQuizRoom
            initialQuiz={studentActiveQuiz}
            availableQuizzes={quizzes.filter((q) => q.isActive)}
            onSubmissionComplete={handleSubmissionComplete}
            isStandaloneExam={false}
            onBackToHome={() => {
              setStudentActiveQuiz(null);
              setActiveTab('kuis-guru');
            }}
          />
        )}

        {activeTab === 'rekap-nilai' && (
          <SubmissionsAnalytics
            quizzes={quizzes}
            submissions={submissions}
            selectedQuizId={analyticsSelectedQuizId}
            onClearSubmissions={handleClearSubmissions}
          />
        )}
      </main>

      {/* Global Modals */}
      {editorOpen && (
        <QuizEditorModal
          initialQuiz={editingQuiz}
          existingCodes={existingCodes}
          globalCategories={categories}
          onAddNewCategory={handleAddNewCategory}
          onSave={handleSaveQuiz}
          onClose={() => {
            setEditorOpen(false);
            setEditingQuiz(null);
          }}
        />
      )}

      {shareOpen && sharingQuiz && (
        <ShareQuizModal
          quiz={sharingQuiz}
          onClose={() => {
            setShareOpen(false);
            setSharingQuiz(null);
          }}
          onPlay={handlePlayQuiz}
        />
      )}

      {fileUploadOpen && (
        <FileUploadExtractorModal
          isOpen={fileUploadOpen}
          onClose={() => setFileUploadOpen(false)}
          onQuizExtracted={handleSaveQuiz}
          existingCodes={existingCodes}
        />
      )}

      {/* Floating Accessibility Controls: Dark Mode, Font Scaler Slider */}
      <AccessibilityFloatingWidget />

      {/* Footer */}
      <footer className="py-6 mb-16 md:mb-0 border-t border-teal-100/60 dark:border-slate-800 bg-white/40 dark:bg-slate-900/60 text-center text-xs text-slate-500 dark:text-slate-400 transition-colors">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-teal-800 dark:text-teal-400">Awang Long Quiz</span>
            <span>•</span>
            <span>Portal Kuis & Evaluasi Belajar Guru</span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-slate-400 dark:text-slate-500">
            <span>Ditenagai Google AI Studio (Gemini API)</span>
            <span>•</span>
            <span>Mode Akun Guru Eksklusif</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
