import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase.js';
import { Quiz, StudentSubmission } from '../types/quiz.js';
import {
  loadStoredQuizzes,
  saveStoredQuizzes,
  loadStoredSubmissions,
  saveStoredSubmissions,
  INITIAL_QUIZZES,
  INITIAL_SUBMISSIONS
} from '../utils/storage.js';

// Helper to remove undefined keys so Firestore doesn't reject writes
function sanitizeForFirestore<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export interface FirebaseSyncState {
  isConnected: boolean;
  isSyncing: boolean;
  lastSyncedAt: Date | null;
  error: string | null;
}

type SyncStateListener = (state: FirebaseSyncState) => void;
const syncListeners: Set<SyncStateListener> = new Set();

let currentSyncState: FirebaseSyncState = {
  isConnected: true,
  isSyncing: false,
  lastSyncedAt: null,
  error: null
};

function updateSyncState(patch: Partial<FirebaseSyncState>) {
  currentSyncState = { ...currentSyncState, ...patch };
  syncListeners.forEach((listener) => listener(currentSyncState));
}

export function subscribeToSyncState(listener: SyncStateListener): () => void {
  syncListeners.add(listener);
  listener(currentSyncState);
  return () => syncListeners.delete(listener);
}

/**
 * Real-time listener for Quizzes.
 * Syncs automatically with Firestore and updates localStorage as offline cache.
 */
export function subscribeQuizzesRealtime(
  onUpdate: (quizzes: Quiz[]) => void,
  onError?: (err: unknown) => void
): () => void {
  const collectionPath = 'quizzes';
  const colRef = collection(db, collectionPath);

  updateSyncState({ isSyncing: true });

  const unsubscribe = onSnapshot(
    colRef,
    async (snapshot) => {
      try {
        if (snapshot.empty) {
          // If Firestore is empty, seed from localStorage or initial quizzes
          const local = loadStoredQuizzes();
          const toSeed = local.length > 0 ? local : INITIAL_QUIZZES;
          console.log('[Firebase] Seeding initial quizzes to Firestore...', toSeed.length);
          
          const batch = writeBatch(db);
          toSeed.forEach((q) => {
            const docRef = doc(db, collectionPath, q.id);
            batch.set(docRef, sanitizeForFirestore(q));
          });
          await batch.commit();

          saveStoredQuizzes(toSeed);
          onUpdate(toSeed);
          updateSyncState({ isConnected: true, isSyncing: false, lastSyncedAt: new Date(), error: null });
          return;
        }

        const items: Quiz[] = [];
        snapshot.forEach((docSnap) => {
          items.push(docSnap.data() as Quiz);
        });

        // Sort by updatedAt or createdAt desc
        items.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

        // Update local cache
        saveStoredQuizzes(items);
        onUpdate(items);
        updateSyncState({ isConnected: true, isSyncing: false, lastSyncedAt: new Date(), error: null });
      } catch (err) {
        console.error('[Firebase] Error processing quizzes snapshot:', err);
        onError?.(err);
      }
    },
    (err) => {
      console.error('[Firebase] Quizzes onSnapshot error:', err);
      updateSyncState({ isConnected: false, isSyncing: false, error: err.message });
      onError?.(err);
      handleFirestoreError(err, OperationType.GET, collectionPath);
    }
  );

  return unsubscribe;
}

/**
 * Real-time listener for Student Submissions.
 * Automatically synchronizes student exam results live to teacher dashboard.
 */
export function subscribeSubmissionsRealtime(
  onUpdate: (submissions: StudentSubmission[]) => void,
  onError?: (err: unknown) => void
): () => void {
  const collectionPath = 'submissions';
  const colRef = collection(db, collectionPath);

  updateSyncState({ isSyncing: true });

  const unsubscribe = onSnapshot(
    colRef,
    async (snapshot) => {
      try {
        if (snapshot.empty) {
          // If Firestore is empty, seed from local submissions
          const local = loadStoredSubmissions();
          const toSeed = local.length > 0 ? local : INITIAL_SUBMISSIONS;
          console.log('[Firebase] Seeding initial submissions to Firestore...', toSeed.length);

          const batch = writeBatch(db);
          toSeed.forEach((sub) => {
            const docRef = doc(db, collectionPath, sub.id);
            batch.set(docRef, sanitizeForFirestore(sub));
          });
          await batch.commit();

          saveStoredSubmissions(toSeed);
          onUpdate(toSeed);
          updateSyncState({ isConnected: true, isSyncing: false, lastSyncedAt: new Date(), error: null });
          return;
        }

        const items: StudentSubmission[] = [];
        snapshot.forEach((docSnap) => {
          items.push(docSnap.data() as StudentSubmission);
        });

        // Sort by submittedAt desc
        items.sort((a, b) => new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime());

        // Update local cache
        saveStoredSubmissions(items);
        onUpdate(items);
        updateSyncState({ isConnected: true, isSyncing: false, lastSyncedAt: new Date(), error: null });
      } catch (err) {
        console.error('[Firebase] Error processing submissions snapshot:', err);
        onError?.(err);
      }
    },
    (err) => {
      console.error('[Firebase] Submissions onSnapshot error:', err);
      updateSyncState({ isConnected: false, isSyncing: false, error: err.message });
      onError?.(err);
      handleFirestoreError(err, OperationType.GET, collectionPath);
    }
  );

  return unsubscribe;
}

/**
 * Save or update a single Quiz to Firestore in real-time.
 */
export async function saveQuizToFirebase(quiz: Quiz): Promise<void> {
  const collectionPath = 'quizzes';
  try {
    updateSyncState({ isSyncing: true });
    const docRef = doc(db, collectionPath, quiz.id);
    await setDoc(docRef, sanitizeForFirestore(quiz), { merge: true });

    // Update local cache as well
    const current = loadStoredQuizzes();
    const idx = current.findIndex((q) => q.id === quiz.id);
    const updated = idx >= 0
      ? current.map((q) => (q.id === quiz.id ? quiz : q))
      : [quiz, ...current];
    saveStoredQuizzes(updated);

    updateSyncState({ isSyncing: false, lastSyncedAt: new Date(), error: null });
  } catch (err) {
    updateSyncState({ isSyncing: false, error: err instanceof Error ? err.message : String(err) });
    handleFirestoreError(err, OperationType.WRITE, `${collectionPath}/${quiz.id}`);
  }
}

/**
 * Delete a Quiz from Firestore in real-time.
 */
export async function deleteQuizFromFirebase(quizId: string): Promise<void> {
  const collectionPath = 'quizzes';
  try {
    updateSyncState({ isSyncing: true });
    const docRef = doc(db, collectionPath, quizId);
    await deleteDoc(docRef);

    // Update local cache
    const current = loadStoredQuizzes();
    saveStoredQuizzes(current.filter((q) => q.id !== quizId));

    updateSyncState({ isSyncing: false, lastSyncedAt: new Date(), error: null });
  } catch (err) {
    updateSyncState({ isSyncing: false, error: err instanceof Error ? err.message : String(err) });
    handleFirestoreError(err, OperationType.DELETE, `${collectionPath}/${quizId}`);
  }
}

/**
 * Save a Student Submission to Firestore in real-time.
 */
export async function saveSubmissionToFirebase(submission: StudentSubmission): Promise<void> {
  const collectionPath = 'submissions';
  try {
    updateSyncState({ isSyncing: true });
    const docRef = doc(db, collectionPath, submission.id);
    await setDoc(docRef, sanitizeForFirestore(submission));

    // Update local cache
    const current = loadStoredSubmissions();
    const idx = current.findIndex((s) => s.id === submission.id);
    const updated = idx >= 0
      ? current.map((s) => (s.id === submission.id ? submission : s))
      : [submission, ...current];
    saveStoredSubmissions(updated);

    updateSyncState({ isSyncing: false, lastSyncedAt: new Date(), error: null });
  } catch (err) {
    updateSyncState({ isSyncing: false, error: err instanceof Error ? err.message : String(err) });
    handleFirestoreError(err, OperationType.CREATE, `${collectionPath}/${submission.id}`);
  }
}
