/**
 * Uji aturan Firestore untuk koleksi quizzes, submissions, dan quiz_sessions.
 *
 * Jalankan: npm run test:rules
 * Skrip itu menyalakan emulator Firestore sendiri, menjalankan berkas ini, lalu
 * mematikan emulatornya. Prasyarat: `npm install` sudah dijalankan dan Java 21+
 * tersedia (emulator Firestore berjalan di JVM).
 *
 * Yang dijaga:
 * - akun guru boleh menyimpan/menghapus kuis dan membaca/mengubah hasil siswa;
 * - siswa tanpa login boleh membaca kuis dan mengirim lembar jawabannya;
 * - siswa tidak boleh mengubah/menghapus kuis, hasil siswa, atau sesi ujian;
 * - siswa tidak boleh membaca hasil siswa lain.
 */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { after, before, describe, test } from 'node:test';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore';

const RULES_PATH = fileURLToPath(new URL('../firestore.rules', import.meta.url));

// Sama dengan ADMIN_UID di src/App.tsx.
const TEACHER_UID = 'yQNuogQOmVOrLv6YPkUwaAWIfAn1';

const [emulatorHost, emulatorPort] = (process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080').split(':');

const QUIZ = {
  id: 'quiz-1',
  code: 'AWG123',
  title: 'Kuis Uji',
  subject: 'Sejarah',
  questions: [
    {
      id: 'q1',
      type: 'multiple_choice',
      text: 'Soal uji?',
      options: ['Pilihan A', 'Pilihan B'],
      correctOption: 0,
      points: 100
    }
  ],
  isActive: true
};

const SUBMISSION = {
  id: 'sub-1',
  quizId: 'quiz-1',
  quizCode: 'AWG123',
  studentName: 'Siti Nurhaliza',
  studentClass: '8A',
  answers: { q1: 0 },
  score: 100
};

const SESSION = {
  id: 'sess-1',
  quizId: 'quiz-1',
  quizTitle: 'Kuis Uji',
  code: 'CLS123',
  gameMode: 'CLASSIC',
  isExamStarted: false,
  createdAt: '2026-01-01T00:00:00.000Z'
};

let env;
let teacherDb;
let studentDb;

before(async () => {
  env = await initializeTestEnvironment({
    projectId: process.env.GCLOUD_PROJECT || 'demo-rules',
    firestore: {
      rules: await readFile(RULES_PATH, 'utf8'),
      host: emulatorHost,
      port: Number(emulatorPort)
    }
  });

  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'quizzes/quiz-1'), QUIZ);
    await setDoc(doc(db, 'submissions/sub-1'), SUBMISSION);
    await setDoc(doc(db, 'quiz_sessions/sess-1'), SESSION);
  });

  teacherDb = env.authenticatedContext(TEACHER_UID).firestore();
  studentDb = env.unauthenticatedContext().firestore();
});

after(async () => {
  await env?.cleanup();
});

describe('akun guru', () => {
  test('boleh mengubah kuis', async () => {
    await assertSucceeds(setDoc(doc(teacherDb, 'quizzes/quiz-1'), { ...QUIZ, title: 'Kuis Uji v2' }));
  });

  test('boleh membuat kuis baru', async () => {
    await assertSucceeds(setDoc(doc(teacherDb, 'quizzes/quiz-guru'), { ...QUIZ, id: 'quiz-guru', code: 'AWG999' }));
  });

  test('boleh membaca satu hasil siswa', async () => {
    await assertSucceeds(getDoc(doc(teacherDb, 'submissions/sub-1')));
  });

  test('boleh melihat daftar hasil siswa', async () => {
    await assertSucceeds(getDocs(collection(teacherDb, 'submissions')));
  });

  test('boleh mengubah nilai hasil siswa', async () => {
    await assertSucceeds(updateDoc(doc(teacherDb, 'submissions/sub-1'), { score: 90 }));
  });

  test('boleh menghapus kuis', async () => {
    await assertSucceeds(deleteDoc(doc(teacherDb, 'quizzes/quiz-guru')));
  });
});

describe('siswa tanpa login', () => {
  test('boleh membaca kuis untuk ujian', async () => {
    await assertSucceeds(getDoc(doc(studentDb, 'quizzes/quiz-1')));
  });

  test('boleh melihat daftar kuis', async () => {
    await assertSucceeds(getDocs(collection(studentDb, 'quizzes')));
  });

  test('boleh mengirim lembar jawaban', async () => {
    await assertSucceeds(
      setDoc(doc(studentDb, 'submissions/sub-siswa'), {
        ...SUBMISSION,
        id: 'sub-siswa',
        studentName: 'Siswa Uji'
      })
    );
  });

  test('tidak boleh mengubah kuis', async () => {
    await assertFails(updateDoc(doc(studentDb, 'quizzes/quiz-1'), { title: 'Diubah siswa' }));
  });

  test('tidak boleh membuat kuis baru', async () => {
    await assertFails(setDoc(doc(studentDb, 'quizzes/quiz-siswa'), { ...QUIZ, id: 'quiz-siswa' }));
  });

  test('tidak boleh menghapus kuis', async () => {
    await assertFails(deleteDoc(doc(studentDb, 'quizzes/quiz-1')));
  });

  test('tidak boleh membaca satu hasil siswa', async () => {
    await assertFails(getDoc(doc(studentDb, 'submissions/sub-1')));
  });

  test('tidak boleh melihat daftar hasil siswa', async () => {
    await assertFails(getDocs(collection(studentDb, 'submissions')));
  });

  test('tidak boleh mengubah hasil siswa', async () => {
    await assertFails(updateDoc(doc(studentDb, 'submissions/sub-1'), { score: 100 }));
  });

  test('tidak boleh menghapus hasil siswa', async () => {
    await assertFails(deleteDoc(doc(studentDb, 'submissions/sub-1')));
  });

  test('boleh mendaftar ke sesi ujian', async () => {
    await assertSucceeds(
      updateDoc(doc(studentDb, 'quiz_sessions/sess-1'), {
        connectedStudents: [{ name: 'Siswa Uji', class: '8A', nis: '' }]
      })
    );
  });

  test('tidak boleh menghapus sesi ujian', async () => {
    await assertFails(deleteDoc(doc(studentDb, 'quiz_sessions/sess-1')));
  });
});
