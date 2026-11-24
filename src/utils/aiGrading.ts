import type { Quiz, StudentAnswerValue } from '../types/quiz.js';
import { checkShortAnswer } from './quizLogic.js';

export interface ShortAnswerVerdict {
  isCorrect: boolean;
  reason?: string;
}

/** Batas waktu bawaan agar mode game tidak macet menunggu AI. */
export const DEFAULT_GRADING_TIMEOUT_MS = 12000;

/**
 * Meminta AI menilai jawaban isian singkat berdasarkan makna, bukan kecocokan karakter.
 * Jawaban yang sudah persis cocok dengan kunci tidak dikirim (dianggap benar tanpa AI).
 * Lempar error bila AI tidak tersedia atau melewati batas waktu, agar pemanggil
 * bisa memakai pencocokan teks biasa tanpa membuat siswa menunggu.
 */
export async function gradeShortAnswersWithAI(
  quiz: Quiz,
  answers: Record<string, StudentAnswerValue>,
  options: { timeoutMs?: number } = {}
): Promise<Record<string, ShortAnswerVerdict>> {
  const items = quiz.questions
    .filter((q) => q.type === 'short_answer')
    .map((q) => {
      const raw = answers[q.id];
      const studentAnswer = typeof raw === 'string' ? raw.trim() : '';
      return { q, studentAnswer };
    })
    .filter(
      ({ q, studentAnswer }) =>
        studentAnswer.length > 0 &&
        !checkShortAnswer(studentAnswer, q.acceptedAnswers || [], q.caseSensitive)
    )
    .map(({ q, studentAnswer }) => ({
      questionId: q.id,
      question: q.text,
      acceptedAnswers: q.acceptedAnswers || [],
      studentAnswer,
      explanation: q.explanation || ''
    }));

  if (items.length === 0) return {};

  const timeoutMs = options.timeoutMs ?? DEFAULT_GRADING_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch('/api/grade-short-answers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        items,
        subject: quiz.subject,
        gradeLevel: quiz.gradeLevel,
        quizTitle: quiz.title
      })
    });
  } catch (err) {
    if (controller.signal.aborted) {
      throw new Error(`Penilaian AI melebihi batas waktu ${timeoutMs} ms`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    throw new Error(`Penilaian AI gagal [${res.status}]`);
  }

  const data = await res.json();
  const verdicts: Record<string, ShortAnswerVerdict> = {};

  for (const raw of Array.isArray(data?.verdicts) ? data.verdicts : []) {
    const questionId = typeof raw?.questionId === 'string' ? raw.questionId : '';
    if (!questionId) continue;
    verdicts[questionId] = {
      isCorrect: Boolean(raw.isCorrect),
      reason: typeof raw.reason === 'string' && raw.reason.trim() ? raw.reason.trim() : undefined
    };
  }

  return verdicts;
}
