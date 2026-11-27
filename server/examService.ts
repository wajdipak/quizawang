import { getAdminDb } from './firebaseAdmin.js';
import { calculateQuizScore, checkShortAnswer } from '../src/utils/quizLogic.js';
import type { ShortAnswerGradingItem, ShortAnswerQuizMeta } from './shortAnswerAi.js';
import type {
  Question,
  QuestionType,
  Quiz,
  QuizAsset,
  QuizGameMode,
  QuizImage,
  StudentAnswerValue,
  StudentSubmission
} from '../src/types/quiz.js';

const QUIZZES_COLLECTION = 'quizzes';
const SUBMISSIONS_COLLECTION = 'submissions';
const SESSIONS_COLLECTION = 'quiz_sessions';

const GAME_MODES: QuizGameMode[] = ['CLASSIC', 'MASTERY', 'PLAYGROUND', 'TEST', 'TEAM'];

/** Error dengan status HTTP agar endpoint bisa membalas apa adanya. */
export class ExamApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ExamApiError';
    this.status = status;
  }
}

export interface PublicExamQuestion {
  id: string;
  type: QuestionType;
  text: string;
  points: number;
  category: string;
  difficultyTag?: string;
  options?: string[];
  assetIds?: string[];
  needsImage?: boolean;
  imageUrl?: string;
  imageId?: string;
  /** Soal menjodohkan: item kiri sesuai urutan, opsi kanan sudah diacak tanpa pasangannya. */
  leftItems?: string[];
  rightOptions?: string[];
}

export interface StudentExamPayload {
  code: string;
  title: string;
  description: string;
  subject: string;
  gradeLevel: string;
  durationMinutes: number;
  passingGrade: number;
  categories: string[];
  materialContent: string;
  materials: Quiz['materials'];
  images: QuizImage[];
  assets: QuizAsset[];
  session: {
    id: string;
    code: string;
    gameMode: QuizGameMode;
    isExamStarted: boolean;
    scheduledStartTime?: string | null;
  } | null;
  questions: PublicExamQuestion[];
}

export interface ExamAnswerCheck {
  questionId: string;
  powerUp?: string;
  eliminatedOptions?: number[];
  isCorrect?: boolean;
  earnedPoints?: number;
  maxPoints?: number;
  isPartial?: boolean;
  explanation?: string;
}

export interface ExamSubmissionResult {
  submissionId: string;
  quizId: string;
  quizCode: string;
  score: number;
  earnedPoints: number;
  totalPoints: number;
  correctCount: number;
  totalQuestions: number;
  isPassed: boolean;
  breakdown: ReturnType<typeof calculateQuizScore>['breakdown'];
  categoryScores: Record<string, { earned: number; total: number; percentage: number }>;
}

export interface ExamSubmitInput {
  student?: { name?: string; nis?: string; class?: string; note?: string };
  answers?: Record<string, unknown>;
  gameMode?: string;
  violationsCount?: number;
  isDisqualified?: boolean;
  timeSpentSeconds?: number;
}

export interface ExamServiceOptions {
  /**
   * Penilai AI untuk jawaban isian singkat yang tidak persis sama dengan kunci.
   * Bila tidak diisi atau gagal, penilaian memakai pencocokan teks seperti sebelumnya.
   */
  gradeShortAnswers?: (
    items: ShortAnswerGradingItem[],
    meta: ShortAnswerQuizMeta
  ) => Promise<Record<string, { isCorrect: boolean; reason?: string }>>;
}

function hashString(text: string): number {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** Acak stabil per soal, agar urutan opsi kanan tidak berubah tiap permintaan. */
function seededShuffle<T>(items: T[], seed: number): T[] {
  const result = [...items];
  let state = seed || 1;
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };

  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const temp = result[i];
    result[i] = result[j];
    result[j] = temp;
  }

  return result;
}

function toPublicQuestion(question: Question): PublicExamQuestion {
  const base: PublicExamQuestion = {
    id: question.id,
    type: question.type,
    text: question.text,
    points: question.points,
    category: question.category
  };

  if (question.difficultyTag) base.difficultyTag = question.difficultyTag;
  if (question.assetIds?.length) base.assetIds = question.assetIds;
  if (question.needsImage) base.needsImage = question.needsImage;
  if (question.imageUrl) base.imageUrl = question.imageUrl;
  if (question.imageId) base.imageId = question.imageId;

  if (question.type === 'multiple_choice') {
    base.options = question.options || [];
  } else if (question.type === 'matching') {
    const pairs = question.matchingPairs || [];
    base.leftItems = pairs.map((pair) => pair.left);
    const uniqueRights = Array.from(new Set(pairs.map((pair) => pair.right)));
    base.rightOptions = seededShuffle(uniqueRights, hashString(question.id || question.text || ''));
  }

  return base;
}

async function findQuizByCode(rawCode: string): Promise<Quiz> {
  const code = String(rawCode || '').trim().toUpperCase();
  if (!code) throw new ExamApiError(400, 'Kode kuis wajib diisi.');
  if (code.length > 32) throw new ExamApiError(400, 'Kode kuis tidak valid.');

  const snapshot = await getAdminDb()
    .collection(QUIZZES_COLLECTION)
    .where('code', '==', code)
    .limit(1)
    .get();

  if (snapshot.empty) {
    throw new ExamApiError(404, `Kuis dengan kode ${code} tidak ditemukan.`);
  }

  const quiz = snapshot.docs[0].data() as Quiz;
  if (quiz.isActive === false) {
    throw new ExamApiError(410, 'Kuis ini sedang tidak aktif.');
  }
  if (!Array.isArray(quiz.questions) || quiz.questions.length === 0) {
    throw new ExamApiError(422, 'Kuis ini belum memiliki butir soal.');
  }
  return quiz;
}

async function findSessionForQuiz(quiz: Quiz): Promise<StudentExamPayload['session']> {
  try {
    const snapshot = await getAdminDb()
      .collection(SESSIONS_COLLECTION)
      .where('quizId', '==', quiz.id)
      .get();

    if (snapshot.empty) return null;

    const sessions = snapshot.docs
      .map((doc) => doc.data() as any)
      .sort((a, b) => new Date(b?.createdAt || 0).getTime() - new Date(a?.createdAt || 0).getTime());

    const chosen = sessions.find((session) => session?.isExamStarted) || sessions[0];
    if (!chosen) return null;

    return {
      id: String(chosen.id || ''),
      code: String(chosen.code || ''),
      gameMode: (GAME_MODES.includes(chosen.gameMode) ? chosen.gameMode : 'CLASSIC') as QuizGameMode,
      isExamStarted: Boolean(chosen.isExamStarted),
      scheduledStartTime: chosen.scheduledStartTime || null
    };
  } catch (error) {
    console.warn('[exam] gagal membaca sesi kuis, soal tetap disajikan:', error);
    return null;
  }
}

/** Soal untuk siswa: tanpa kunci jawaban dan tanpa pembahasan. */
export async function loadExamByCode(rawCode: string): Promise<StudentExamPayload> {
  const quiz = await findQuizByCode(rawCode);
  const session = await findSessionForQuiz(quiz);

  return {
    code: quiz.code,
    title: quiz.title,
    description: quiz.description || '',
    subject: quiz.subject,
    gradeLevel: quiz.gradeLevel || '',
    durationMinutes: Number(quiz.durationMinutes) || 0,
    passingGrade: Number(quiz.passingGrade) || 70,
    categories: quiz.categories || [],
    materialContent: quiz.materialContent || '',
    materials: quiz.materials || [],
    images: quiz.images || [],
    assets: quiz.assets || [],
    session,
    questions: quiz.questions.map(toPublicQuestion)
  };
}

function powerUpResult(question: Question, powerUp: string): ExamAnswerCheck {
  if (question.type !== 'multiple_choice' || !question.options?.length) {
    throw new ExamApiError(400, 'Bantuan ini hanya tersedia untuk soal pilihan ganda.');
  }

  const correctIndex = typeof question.correctOption === 'number' ? question.correctOption : 0;
  const wrongIndices = question.options.map((_, index) => index).filter((index) => index !== correctIndex);
  const shuffled = seededShuffle(wrongIndices, hashString(question.id || question.text || ''));

  if (powerUp === 'FIFTY_FIFTY') {
    return { questionId: question.id, powerUp, eliminatedOptions: shuffled.slice(0, 2) };
  }
  if (powerUp === 'ERASER') {
    return { questionId: question.id, powerUp, eliminatedOptions: shuffled.slice(0, 1) };
  }
  throw new ExamApiError(400, `Bantuan "${powerUp}" tidak dikenal.`);
}

/** Menilai satu jawaban untuk umpan balik langsung (tanpa membocorkan kunci). */
export async function checkExamAnswer(
  rawCode: string,
  body: { questionId?: unknown; answer?: unknown; powerUp?: unknown }
): Promise<ExamAnswerCheck> {
  const quiz = await findQuizByCode(rawCode);

  const questionId = String(body?.questionId || '').trim();
  if (!questionId) throw new ExamApiError(400, 'questionId wajib diisi.');

  const question = quiz.questions.find((item) => item.id === questionId);
  if (!question) throw new ExamApiError(404, 'Soal tidak ditemukan pada kuis ini.');

  const powerUp = String(body?.powerUp || '').trim().toUpperCase();
  if (powerUp) return powerUpResult(question, powerUp);

  if (!body || !('answer' in body)) throw new ExamApiError(400, 'answer wajib diisi.');

  const answer = normalizeAnswer(body.answer);
  const calculation = calculateQuizScore(
    answer === undefined ? {} : { [question.id]: answer },
    [question],
    quiz.passingGrade
  );
  const item = calculation.breakdown[0];

  return {
    questionId: question.id,
    isCorrect: item.isCorrect,
    earnedPoints: item.earnedPoints,
    maxPoints: item.points,
    isPartial: item.isPartial,
    explanation: question.explanation || undefined
  };
}

function normalizeAnswer(value: unknown): StudentAnswerValue | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') return value.slice(0, 2000);
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const map: Record<string, string> = {};
    Object.entries(value as Record<string, unknown>).forEach(([key, item]) => {
      if (typeof item === 'string') map[String(key).slice(0, 200)] = item.slice(0, 200);
    });
    return Object.keys(map).length > 0 ? map : undefined;
  }
  return undefined;
}

function normalizeAnswers(rawAnswers: unknown, quiz: Quiz): Record<string, StudentAnswerValue> {
  const source = rawAnswers && typeof rawAnswers === 'object' && !Array.isArray(rawAnswers)
    ? (rawAnswers as Record<string, unknown>)
    : {};
  const answers: Record<string, StudentAnswerValue> = {};

  quiz.questions.forEach((question) => {
    const normalized = normalizeAnswer(source[question.id]);
    if (normalized !== undefined) answers[question.id] = normalized;
  });

  return answers;
}

async function collectShortAnswerVerdicts(
  quiz: Quiz,
  answers: Record<string, StudentAnswerValue>,
  options: ExamServiceOptions
): Promise<Record<string, { isCorrect: boolean; reason?: string }>> {
  const grade = options.gradeShortAnswers;
  if (!grade) return {};

  const items: ShortAnswerGradingItem[] = quiz.questions
    .filter((question) => question.type === 'short_answer')
    .map((question) => {
      const raw = answers[question.id];
      const studentAnswer = typeof raw === 'string' ? raw.trim() : '';
      return { question, studentAnswer };
    })
    .filter(
      ({ question, studentAnswer }) =>
        studentAnswer.length > 0 &&
        !checkShortAnswer(studentAnswer, question.acceptedAnswers || [], question.caseSensitive)
    )
    .map(({ question, studentAnswer }) => ({
      questionId: question.id,
      question: question.text,
      acceptedAnswers: question.acceptedAnswers || [],
      studentAnswer,
      explanation: question.explanation || ''
    }));

  if (items.length === 0) return {};

  try {
    return await grade(items, {
      subject: quiz.subject,
      gradeLevel: quiz.gradeLevel,
      quizTitle: quiz.title
    });
  } catch (error) {
    console.warn('[exam] penilaian AI isian singkat gagal, memakai pencocokan teks:', error);
    return {};
  }
}

async function findExistingSubmission(quiz: Quiz, studentName: string, studentClass: string) {
  try {
    const snapshot = await getAdminDb()
      .collection(SUBMISSIONS_COLLECTION)
      .where('quizId', '==', quiz.id)
      .where('studentName', '==', studentName)
      .where('studentClass', '==', studentClass)
      .limit(1)
      .get();
    return snapshot.empty ? null : snapshot.docs[0];
  } catch (error) {
    console.warn('[exam] gagal memeriksa kiriman sebelumnya:', error);
    return null;
  }
}

function buildSubmissionId(quiz: Quiz): string {
  const random = Math.random().toString(36).slice(2, 8);
  return `sub-${quiz.id}-${Date.now().toString(36)}-${random}`.slice(0, 128);
}

/**
 * Menilai seluruh jawaban di server, menulis hasil ke `submissions`, dan
 * mengembalikan rincian nilai untuk halaman hasil siswa.
 */
export async function submitExamAnswers(
  rawCode: string,
  body: ExamSubmitInput,
  options: ExamServiceOptions = {}
): Promise<ExamSubmissionResult> {
  const quiz = await findQuizByCode(rawCode);

  const studentName = String(body?.student?.name || '').trim();
  const studentClass = String(body?.student?.class || '').trim();
  const studentNis = String(body?.student?.nis || '').trim();
  const studentNote = String(body?.student?.note || '').trim();

  if (!studentName) throw new ExamApiError(400, 'Nama siswa wajib diisi.');
  if (studentName.length > 128) throw new ExamApiError(400, 'Nama siswa terlalu panjang.');
  if (!studentClass) throw new ExamApiError(400, 'Kelas siswa wajib diisi.');
  if (studentClass.length > 128) throw new ExamApiError(400, 'Kelas siswa terlalu panjang.');

  const answers = normalizeAnswers(body?.answers, quiz);
  const aiVerdicts = await collectShortAnswerVerdicts(quiz, answers, options);
  const calculation = calculateQuizScore(answers, quiz.questions, quiz.passingGrade, aiVerdicts);

  const categoryScores: Record<string, { earned: number; total: number; percentage: number }> = {};
  Object.entries(calculation.categoryBreakdown).forEach(([category, value]) => {
    categoryScores[category] = {
      earned: value.earned,
      total: value.total,
      percentage: value.percentage
    };
  });

  const gameMode = GAME_MODES.includes(String(body?.gameMode).toUpperCase() as QuizGameMode)
    ? (String(body?.gameMode).toUpperCase() as QuizGameMode)
    : undefined;

  const submittedAt = new Date().toISOString();
  const existing = await findExistingSubmission(quiz, studentName, studentClass);
  const submissionId = existing ? existing.id : buildSubmissionId(quiz);

  const submission: StudentSubmission & { gradedBy: 'server' } = {
    id: submissionId,
    quizId: quiz.id,
    quizCode: quiz.code,
    studentName,
    studentClass,
    answers,
    score: calculation.score,
    earnedPoints: calculation.earnedPoints,
    totalPoints: calculation.totalPoints,
    correctCount: calculation.correctCount,
    totalQuestions: calculation.totalQuestions,
    isPassed: calculation.isPassed,
    timeSpentSeconds: Math.max(0, Math.min(Math.round(Number(body?.timeSpentSeconds) || 0), 24 * 3600)),
    submittedAt,
    categoryScores,
    gradedBy: 'server'
  };

  if (studentNis) submission.studentNis = studentNis.slice(0, 64);
  if (studentNote) submission.studentNote = studentNote.slice(0, 500);
  if (gameMode) submission.gameMode = gameMode;
  if (typeof body?.violationsCount === 'number') {
    submission.violationsCount = Math.max(0, Math.round(body.violationsCount));
  }
  if (typeof body?.isDisqualified === 'boolean') {
    submission.isDisqualified = body.isDisqualified;
  }

  await getAdminDb().collection(SUBMISSIONS_COLLECTION).doc(submissionId).set(submission);

  return {
    submissionId,
    quizId: quiz.id,
    quizCode: quiz.code,
    score: calculation.score,
    earnedPoints: calculation.earnedPoints,
    totalPoints: calculation.totalPoints,
    correctCount: calculation.correctCount,
    totalQuestions: calculation.totalQuestions,
    isPassed: calculation.isPassed,
    breakdown: calculation.breakdown,
    categoryScores
  };
}
