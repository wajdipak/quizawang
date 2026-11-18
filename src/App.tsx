import React, { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './firebase.js';
import { LoginPage } from './components/LoginPage.js';
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
import { StudentPortalPWA } from './components/StudentPortalPWA.js';
import { QuizModeSelectModal } from './components/QuizModeSelectModal.js';
import { InteractiveQuizEngine } from './components/InteractiveQuizEngine.js';
import { Quiz, StudentSubmission, QuizSessionSettings, QuizGameMode } from './types/quiz.js';
import {
  loadStoredQuizzes,
  saveStoredQuizzes,
  loadStoredSubmissions,
  saveStoredSubmissions,
  loadStoredCategories,
  saveStoredCategories
} from './utils/storage.js';
import { readInitialExamParams } from './utils/examParams.js';
import {
  saveQuizToFirebase,
  deleteQuizFromFirebase,
  saveSubmissionToFirebase,
  deleteSubmissionFromFirebase,
  subscribeQuizzesRealtime,
  subscribeSubmissionsRealtime,
  subscribeQuizSessionsRealtime,
  saveQuizSessionToFirebase
} from './services/firebaseSync.js';
import { TeacherLiveSessionModal } from './components/TeacherLiveSessionModal.js';
import { QuizSession } from './types/quiz.js';
import { ArrowLeft } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // Student link detection is centralized in a small helper.
  const examLink =
    typeof window === 'undefined'
      ? { isStudentLinkMode: false, quizCode: null, autostart: false }
      : readInitialExamParams({ toString: () => window.location.search });
  const urlCode = examLink.quizCode;
  const autostart = examLink.autostart;

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [submissions, setSubmissions] = useState<StudentSubmission[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const categoriesRef = useRef(categories);
  categoriesRef.current = categories;
  const [activeTab, setActiveTab] = useState<NavTab>('beranda');

  // Modals & Active selections
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);

  const [shareOpen, setShareOpen] = useState(false);
  const [sharingQuiz, setSharingQuiz] = useState<Quiz | null>(null);

  const [fileUploadOpen, setFileUploadOpen] = useState(false);

  const [studentActiveQuiz, setStudentActiveQuiz] = useState<Quiz | null>(null);
  const [interactiveSessionQuiz, setInteractiveSessionQuiz] = useState<{
    quiz: Quiz;
    settings: QuizSessionSettings;
  } | null>(null);
  const [selectedQuizForModeSelect, setSelectedQuizForModeSelect] = useState<Quiz | null>(null);
  const [analyticsSelectedQuizId, setAnalyticsSelectedQuizId] = useState<string | null>(null);
  const [isStudentLinkMode, setIsStudentLinkMode] = useState(false);
  const [quizSessions, setQuizSessions] = useState<QuizSession[]>([]);
  const [activeLiveSession, setActiveLiveSession] = useState<{
    quiz: Quiz;
    session: QuizSession;
  } | null>(null);

  // Read student exam link on the initial client render only.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const examParam = params.get('exam');
    const urlCode = examParam || params.get('code');
    const autostart = params.get('autostart');

    if (urlCode) {
      setIsStudentLinkMode(true);
      setActiveTab('ruang-siswa');
      const found = loadStoredQuizzes().find(
        (q) => q.code.toUpperCase() === urlCode.toUpperCase()
      );
      if (found) setStudentActiveQuiz(found);
    } else if (autostart) {
      setActiveTab('beranda');
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoadingAuth(false);
    });
    return unsubscribe;
  }, []);

  // Load persistent storage & subscribe to live Firebase real-time updates
  useEffect(() => {
    const loadedQuizzes = loadStoredQuizzes();
    const loadedSubs = loadStoredSubmissions();
    const loadedCats = loadStoredCategories();

    setQuizzes(loadedQuizzes);
    setSubmissions(loadedSubs);
    setCategories(loadedCats);

    // 2. Real-time Firebase Firestore synchronizer for Quizzes
    const unsubQuizzes = subscribeQuizzesRealtime((syncedQuizzes) => {
      setQuizzes(syncedQuizzes);

      // Keep the student link mode in sync when Firebase data arrives.
      if (typeof window === 'undefined') return;
        const params = new URLSearchParams(window.location.search);
        const examParam = params.get('exam');
        const urlCode = examParam || params.get('code');

      if (urlCode && !studentActiveQuiz) {
          setIsStudentLinkMode(true);
          setActiveTab('ruang-siswa');
        const found = syncedQuizzes.find(
          (q) => q.code.toUpperCase() === urlCode.toUpperCase()
        );
        if (found) setStudentActiveQuiz(found);
      }

      // Derive and sync categories from the current stored categories.
      const allCats = new Set(categoriesRef.current);
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

    // 4. Real-time Firebase Firestore synchronizer for Quiz Sessions
    const unsubSessions = subscribeQuizSessionsRealtime((syncedSessions) => {
      setQuizSessions(syncedSessions);
    });

    return () => {
      unsubQuizzes();
      unsubSubmissions();
      unsubSessions();
    };
  }, [user]);

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
    if (quiz.categories?.length) {
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
      console.error('[Firebase] Failed to save quiz:', err);
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
      console.error('[Firebase] Failed to delete quiz:', err);
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

  const handlePlayQuiz = async (quiz: Quiz, settings?: QuizSessionSettings) => {
    if (settings) {
      const generateFreshPin = (mode: QuizGameMode): string => {
        const prefix = mode === 'CLASSIC' ? 'CLS' : mode === 'MASTERY' ? 'MST' : mode === 'PLAYGROUND' ? 'ARC' : mode === 'TEST' ? 'TST' : 'TEM';
        const rand = Math.floor(100 + Math.random() * 900);
        return `${prefix}${rand}`;
      };
      const freshCode = generateFreshPin(settings.gameMode);
      const newSession: QuizSession = {
        id: `sess-${Date.now()}`,
        quizId: quiz.id,
        quizTitle: quiz.title,
        code: freshCode,
        gameMode: settings.gameMode,
        isExamStarted: false,
        scheduledStartTime: null,
        createdAt: new Date().toISOString(),
        settings
      };
      await saveQuizSessionToFirebase(newSession);
      setActiveLiveSession({ quiz, session: newSession });
    } else {
      setSelectedQuizForModeSelect(quiz);
    }
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
      console.error('[Firebase] Failed to save submission:', err);
    }
  };

  const handleDeleteSubmission = async (submissionId: string) => {
    setSubmissions((prev) => {
      const updated = prev.filter((s) => {
        const sId = s.id || `${s.quizId}-${s.studentName}-${s.submittedAt}`;
        return sId !== submissionId && s.id !== submissionId;
      });
      saveStoredSubmissions(updated);
      return updated;
    });

    try {
      await deleteSubmissionFromFirebase(submissionId);
    } catch (err) {
      console.error('[Firebase] Failed to delete submission:', err);
    }
  };

  const handleViewAnalyticsForQuiz = (quizId: string) => {
    setAnalyticsSelectedQuizId(quizId);
    setActiveTab('rekap-nilai');
  };

  const handleManageSession = (session: QuizSession) => {
    const quiz = quizzes.find((q) => q.id === session.quizId);
    if (quiz) {
      setActiveLiveSession({ quiz, session });
    }
  };

  const existingCodes = quizzes.map((q) => q.code);

  if (loadingAuth)
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-3 bg-[var(--paper)]">
        <span className="w-3 h-3 bg-[var(--signal)] border-2 border-[var(--line)]" aria-hidden="true" />
        <span className="poster-label text-[var(--ink-soft)]">Memuat ruang guru…</span>
      </div>
    );

  // If accessed via student exam link (e.g. ?exam=CODE or ?code=CODE), render standalone student portal without teacher login
  if (examLink.isStudentLinkMode || (typeof window !== 'undefined' && window.location.pathname === '/siswa')) {
    return (
      <div className="min-h-dvh bg-[var(--paper)] text-[var(--ink)] flex flex-col font-sans antialiased">
        
        {/* Dedicated Student Header */}
        <header className="sticky top-0 z-40 bg-[var(--paper)] border-b-2 border-[var(--line)] pt-[env(safe-area-inset-top)]">
          <div className="flex items-stretch">
            <div className="flex items-center gap-3 px-4 py-3 border-r-2 border-[var(--line)]">
              <img
                src="/logo-awang-quiz.png"
                alt=""
                className="w-8 h-8 object-contain"
              />
            <div>
                <span className="poster-display text-xl sm:text-2xl leading-none block">Awang Long</span>
                <span className="poster-label text-[var(--ink-soft)]">Portal ujian siswa</span>
            </div>
          </div>
            <div className="flex items-center gap-2 px-3 ml-auto">
              <span className="w-2.5 h-2.5 bg-[var(--danger)]" aria-hidden="true" />
              <span className="poster-label">Mode ujian terkunci</span>
          </div>
          </div>
        </header>

        {/* Standalone Student Main Content */}
        <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-9 pb-16">
          <StudentQuizRoom
            initialQuiz={studentActiveQuiz}
            availableQuizzes={quizzes}
            onSubmissionComplete={handleSubmissionComplete}
            isStandaloneExam={true}
            onBackToHome={() => {}}
          />
        </main>

        {/* Floating Accessibility Widget (Dark Mode & Font Scaler) */}
        <AccessibilityFloatingWidget />

        {/* Dedicated Student Footer */}
        <footer className="border-t-2 border-[var(--line)] bg-[var(--paper)] pb-[env(safe-area-inset-bottom)]">
          <div className="mx-auto max-w-4xl px-4 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="poster-label">Awang Long Quiz Siswa &middot; Evaluasi &amp; tugas online</span>
            <span className="text-[0.8125rem] leading-relaxed text-[var(--ink-soft)]">
              Isi keterangan diri di Sesi 1 dan selesaikan semua soal sebelum mengirim jawaban.
            </span>
          </div>
        </footer>

      </div>
    );
  }

  // TEMPORARY: teacher login is switched off so the teacher workspace can be reviewed
  // in preview without a Firebase account. Flip to true to restore the gate.
  // LoginPage.tsx and the checks below are untouched.
  const TEACHER_LOGIN_ENABLED = true;

  if (TEACHER_LOGIN_ENABLED && !user) {
    return <LoginPage />;
  }

  const ADMIN_UID = 'yQNuogQOmVOrLv6YPkUwaAWIfAn1';
  if (TEACHER_LOGIN_ENABLED && user && user.uid !== ADMIN_UID) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--paper)] p-4">
        <div className="max-w-lg w-full border-2 border-[var(--line)] bg-[var(--paper)]">
          <div className="border-b-2 border-[var(--line)] bg-[var(--danger)] px-5 py-3">
            <h1 className="poster-display text-3xl leading-none text-[#0a0a0a]">Akses ditolak</h1>
          </div>
          <div className="p-5 sm:p-6">
            <p className="text-sm font-medium leading-snug mb-4">
              Akun ini bukan admin pengajar, jadi portal guru tidak terbuka. UID akun Anda:
          </p>
            <div className="border-2 border-[var(--line)] bg-[var(--paper-2)] p-2 font-mono text-xs mb-5 break-all">
            {user.uid}
          </div>
          <button
            onClick={() => auth.signOut()}
              className="btn-ink w-full py-2.5 text-xs"
          >
              Keluar
          </button>
        </div>
      </div>
      </div>
    );
  }

  if (examLink.isStudentLinkMode) {
    return (
      <div className="min-h-dvh bg-[var(--paper)] text-[var(--ink)] flex flex-col font-sans antialiased">
        
        {/* Dedicated Student Header */}
        <header className="sticky top-0 z-40 bg-[var(--paper)] border-b-2 border-[var(--line)] pt-[env(safe-area-inset-top)]">
          <div className="flex items-stretch">
            <div className="flex items-center gap-3 px-4 py-3 border-r-2 border-[var(--line)]">
              <img
                src="/logo-awang-quiz.png"
                alt=""
                className="w-8 h-8 object-contain"
              />
            <div>
                <span className="poster-display text-xl sm:text-2xl leading-none block">Awang Long</span>
                <span className="poster-label text-[var(--ink-soft)]">Portal ujian siswa</span>
            </div>
          </div>
            <div className="flex items-center gap-2 px-3 ml-auto">
              <span className="w-2.5 h-2.5 bg-[var(--danger)]" aria-hidden="true" />
              <span className="poster-label">Mode ujian terkunci</span>
          </div>
          </div>
        </header>

        {/* Standalone Student Main Content */}
        <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-9 pb-16">
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
        <footer className="border-t-2 border-[var(--line)] bg-[var(--paper)] pb-[env(safe-area-inset-bottom)]">
          <div className="mx-auto max-w-4xl px-4 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="poster-label">Awang Long Quiz Siswa &middot; Evaluasi &amp; tugas online</span>
            <span className="text-[0.8125rem] leading-relaxed text-[var(--ink-soft)]">
              Isi keterangan diri di Sesi 1 dan selesaikan semua soal sebelum mengirim jawaban.
            </span>
          </div>
        </footer>

      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[var(--paper)] text-[var(--ink)] flex flex-col font-sans antialiased selection:bg-teal-200 transition-colors duration-200 pb-[env(safe-area-inset-bottom)]">
      
      {/* Top Navigation Bar with Teacher Portal Focus */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        savedQuizCount={quizzes.length}
      />

      {/* Teacher Quiz Preview Notice when simulating a quiz */}
      {activeTab === 'ruang-siswa' && (
        <div className="bg-[var(--signal)] text-[#0a0a0a] border-b-2 border-[var(--line)] px-4 py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="poster-label">Mode simulasi</span>
            <span className="hidden sm:inline text-xs font-medium truncate">
              Anda mengerjakan soal ini sebagai guru, bukan sebagai siswa.
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setStudentActiveQuiz(null);
              setActiveTab('kuis-guru');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 border-2 border-[#0a0a0a] bg-transparent hover:bg-[#0a0a0a] hover:text-[var(--signal)] font-bold uppercase tracking-[0.08em] text-[10px] transition-colors cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali</span>
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-6 lg:px-10 py-5 sm:py-8 pb-28 md:pb-12">
        {interactiveSessionQuiz ? (
          <InteractiveQuizEngine
            quiz={interactiveSessionQuiz.quiz}
            settings={interactiveSessionQuiz.settings}
            onExit={() => {
              setInteractiveSessionQuiz(null);
              setActiveTab('kuis-guru');
            }}
            onSubmissionSaved={handleSubmissionComplete}
          />
        ) : (
          <>
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
                quizSessions={quizSessions}
                onCreateNew={handleOpenCreateNew}
                onOpenFileUpload={() => setFileUploadOpen(true)}
                onEditQuiz={handleOpenEditQuiz}
                onDeleteQuiz={handleDeleteQuiz}
                onShareQuiz={handleOpenShareQuiz}
                onPlayQuiz={handlePlayQuiz}
                onViewSubmissions={handleViewAnalyticsForQuiz}
                onManageSession={handleManageSession}
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
                onDeleteSubmission={handleDeleteSubmission}
              />
            )}
          </>
        )}
      </main>

      {/* Global Modals */}
      {selectedQuizForModeSelect && (
        <QuizModeSelectModal
          quiz={selectedQuizForModeSelect}
          isOpen={Boolean(selectedQuizForModeSelect)}
          onClose={() => setSelectedQuizForModeSelect(null)}
          onLaunchMode={async (quizToRun, settings) => {
            setSelectedQuizForModeSelect(null);
            const generateFreshPin = (mode: QuizGameMode): string => {
              const prefix = mode === 'CLASSIC' ? 'CLS' : mode === 'MASTERY' ? 'MST' : mode === 'PLAYGROUND' ? 'ARC' : mode === 'TEST' ? 'TST' : 'TEM';
              const rand = Math.floor(100 + Math.random() * 900);
              return `${prefix}${rand}`;
            };
            const freshCode = generateFreshPin(settings.gameMode);
            const newSession: QuizSession = {
              id: `sess-${Date.now()}`,
              quizId: quizToRun.id,
              quizTitle: quizToRun.title,
              code: freshCode,
              gameMode: settings.gameMode,
              isExamStarted: false,
              scheduledStartTime: null,
              createdAt: new Date().toISOString(),
              settings
            };
            await saveQuizSessionToFirebase(newSession);
            setActiveLiveSession({ quiz: quizToRun, session: newSession });
          }}
        />
      )}

      {activeLiveSession && (
        <TeacherLiveSessionModal
          quiz={activeLiveSession.quiz}
          session={activeLiveSession.session}
          submissions={submissions}
          isOpen={Boolean(activeLiveSession)}
          onClose={() => setActiveLiveSession(null)}
          onStartTeacherEngine={(quizToRun, settings) => {
            setActiveLiveSession(null);
            setInteractiveSessionQuiz({ quiz: quizToRun, settings });
          }}
        />
      )}

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
      <footer className="mt-6 border-t-2 border-[var(--line)] bg-[var(--paper)] pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0 transition-colors">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="poster-display text-lg leading-none">Awang Long Quiz</span>
            <span className="poster-label text-[var(--ink-soft)]">Portal kuis &amp; evaluasi belajar guru</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.75rem] text-[var(--ink-soft)]">
            <span>Ditenagai Google AI Studio (Gemini API)</span>
            <span aria-hidden="true">/</span>
            <span>Mode akun guru eksklusif</span>
          </div>
        </div>
      </footer>

    </div>
  );
}

