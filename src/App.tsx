import React, { useState, useEffect } from 'react';
import { Navbar, NavTab, UserRole } from './components/Navbar.js';
import { AiQuizWorkspace } from './components/AiQuizWorkspace.js';
import { TeacherQuizManager } from './components/TeacherQuizManager.js';
import { CategoryQuestionBank } from './components/CategoryQuestionBank.js';
import { QuizEditorModal } from './components/QuizEditorModal.js';
import { ShareQuizModal } from './components/ShareQuizModal.js';
import { FileUploadExtractorModal } from './components/FileUploadExtractorModal.js';
import { StudentQuizRoom } from './components/StudentQuizRoom.js';
import { SubmissionsAnalytics } from './components/SubmissionsAnalytics.js';
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

export default function App() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [submissions, setSubmissions] = useState<StudentSubmission[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<NavTab>('beranda');
  const [userRole, setUserRole] = useState<UserRole>('guru');

  // Modals & Active selections
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);

  const [shareOpen, setShareOpen] = useState(false);
  const [sharingQuiz, setSharingQuiz] = useState<Quiz | null>(null);

  const [fileUploadOpen, setFileUploadOpen] = useState(false);

  const [studentActiveQuiz, setStudentActiveQuiz] = useState<Quiz | null>(null);
  const [analyticsSelectedQuizId, setAnalyticsSelectedQuizId] = useState<string | null>(null);

  const [isStandaloneExam, setIsStandaloneExam] = useState(false);

  // Load persistent storage & check URL params on mount
  useEffect(() => {
    const loadedQuizzes = loadStoredQuizzes();
    const loadedSubs = loadStoredSubmissions();
    const loadedCats = loadStoredCategories();

    setQuizzes(loadedQuizzes);
    setSubmissions(loadedSubs);
    setCategories(loadedCats);

    // Check if ?exam= or ?code= is present in URL
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const examParam = params.get('exam');
      const urlCode = examParam || params.get('code');
      const autostart = params.get('autostart');

      if (urlCode) {
        const found = loadedQuizzes.find((q) => q.code.toUpperCase() === urlCode.toUpperCase());
        if (found) {
          setStudentActiveQuiz(found);
          setUserRole('siswa');
          setActiveTab('ruang-siswa');
          if (examParam) {
            setIsStandaloneExam(true);
          }
        }
      } else if (autostart) {
        setActiveTab('beranda');
      }
    }
  }, []);

  // Save quizzes helper
  const handleSaveQuiz = (quiz: Quiz) => {
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
  };

  const handleAddNewCategory = (newCat: string) => {
    setCategories((prev) => {
      if (prev.includes(newCat)) return prev;
      const updated = [...prev, newCat];
      saveStoredCategories(updated);
      return updated;
    });
  };

  const handleDeleteQuiz = (quizId: string) => {
    setQuizzes((prev) => {
      const updated = prev.filter((q) => q.id !== quizId);
      saveStoredQuizzes(updated);
      return updated;
    });
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
    setUserRole('siswa');
    setActiveTab('ruang-siswa');
  };

  const handleSubmissionComplete = (submission: StudentSubmission) => {
    setSubmissions((prev) => {
      const updated = [submission, ...prev];
      saveStoredSubmissions(updated);
      return updated;
    });
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E8F8F5] via-[#F4F9F9] to-[#EBF5FB] text-slate-800 flex flex-col font-sans antialiased selection:bg-teal-200">
      
      {/* Top Banner for Direct Exam Link Mode */}
      {isStandaloneExam && (
        <div className="bg-gradient-to-r from-teal-800 to-cyan-900 text-white text-xs px-4 py-2 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold">Mode Pengerjaan Siswa (Tautan Langsung Tugas)</span>
            <span className="hidden sm:inline text-teal-200">• Sesi 1 Data Diri & Sesi 2 Pengerjaan Soal</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setIsStandaloneExam(false);
              setUserRole('guru');
              setActiveTab('kuis-guru');
            }}
            className="px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white font-medium text-[11px] transition-colors cursor-pointer"
          >
            Kembali ke Mode Guru
          </button>
        </div>
      )}

      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        userRole={userRole}
        setUserRole={setUserRole}
        savedQuizCount={quizzes.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
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
            isStandaloneExam={isStandaloneExam}
            onBackToHome={() => {
              setStudentActiveQuiz(null);
              setIsStandaloneExam(false);
              setActiveTab('beranda');
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

      {/* Footer */}
      <footer className="py-6 border-t border-teal-100/60 bg-white/40 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-teal-800">Awang Long Quiz</span>
            <span>•</span>
            <span>Tugas Online Guru & Siswa Nusantara</span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-slate-400">
            <span>Ditenagai Google AI Studio (Gemini API)</span>
            <span>•</span>
            <span>Multi-Tipe Soal & Penilaian Otomatis</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
