import type {
  Question,
  QuestionType,
  QuizResultCalculation,
  QuestionBreakdown,
  StudentAnswerValue
} from '../types/quiz.js';

/**
 * Normalizes text for lenient short-answer comparison.
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, ' ') // remove punctuation
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Checks if student's short answer matches any accepted variations.
 */
export function checkShortAnswer(
  studentInput: string,
  acceptedAnswers: string[] = [],
  caseSensitive = false
): boolean {
  if (!studentInput || !studentInput.trim()) return false;
  if (!acceptedAnswers || acceptedAnswers.length === 0) return false;

  if (caseSensitive) {
    const rawTrimmed = studentInput.trim();
    return acceptedAnswers.some((ans) => ans.trim() === rawTrimmed);
  }

  const normalizedInput = normalizeText(studentInput);
  return acceptedAnswers.some((ans) => normalizeText(ans) === normalizedInput);
}

/**
 * Calculate quiz score and comprehensive breakdown for all question types.
 */
export function calculateQuizScore(
  userAnswers: Record<string, StudentAnswerValue>,
  questions: Question[],
  passingGrade: number = 70
): QuizResultCalculation {
  if (!questions || questions.length === 0) {
    return {
      score: 0,
      earnedPoints: 0,
      totalPoints: 0,
      correctCount: 0,
      totalQuestions: 0,
      isPassed: false,
      breakdown: [],
      categoryBreakdown: {}
    };
  }

  let totalMaxPoints = 0;
  let totalEarnedPoints = 0;
  let fullyCorrectCount = 0;

  const categoryMap: Record<
    string,
    { earned: number; total: number; percentage: number; questionCount: number }
  > = {};

  const breakdown: QuestionBreakdown[] = questions.map((q) => {
    const qPoints = q.points && q.points > 0 ? q.points : 10;
    totalMaxPoints += qPoints;

    const cat = q.category || 'Umum';
    if (!categoryMap[cat]) {
      categoryMap[cat] = { earned: 0, total: 0, percentage: 0, questionCount: 0 };
    }
    categoryMap[cat].total += qPoints;
    categoryMap[cat].questionCount += 1;

    const rawAns = userAnswers[q.id];
    let isCorrect = false;
    let isPartial = false;
    let earned = 0;
    let correctAnswerSummary = '';
    let matchingDetails: QuestionBreakdown['matchingDetails'];

    if (q.type === 'multiple_choice') {
      const selectedIndex = typeof rawAns === 'number' ? rawAns : null;
      isCorrect = selectedIndex !== null && selectedIndex === q.correctOption;
      earned = isCorrect ? qPoints : 0;
      const opts = q.options || [];
      const correctText = opts[q.correctOption ?? 0] || 'Opsi benar';
      const letter = String.fromCharCode(65 + (q.correctOption ?? 0));
      correctAnswerSummary = `${letter}. ${correctText}`;
    } else if (q.type === 'short_answer') {
      const studentText = typeof rawAns === 'string' ? rawAns : '';
      isCorrect = checkShortAnswer(studentText, q.acceptedAnswers || [], q.caseSensitive);
      earned = isCorrect ? qPoints : 0;
      correctAnswerSummary = (q.acceptedAnswers || []).join(' / ');
    } else if (q.type === 'matching') {
      const studentMap = (typeof rawAns === 'object' && rawAns !== null && !Array.isArray(rawAns)
        ? rawAns
        : {}) as Record<string, string>;

      const pairs = q.matchingPairs || [];
      let matchedCount = 0;

      matchingDetails = pairs.map((pair) => {
        const studentRight = studentMap[pair.left] || null;
        const pairMatched = studentRight !== null && studentRight === pair.right;
        if (pairMatched) matchedCount++;
        return {
          left: pair.left,
          studentRight,
          correctRight: pair.right,
          isMatched: pairMatched
        };
      });

      if (pairs.length > 0) {
        const ratio = matchedCount / pairs.length;
        earned = Math.round(ratio * qPoints * 10) / 10;
        isCorrect = matchedCount === pairs.length;
        isPartial = matchedCount > 0 && matchedCount < pairs.length;
      }
      correctAnswerSummary = pairs.map((p) => `${p.left} ➔ ${p.right}`).join('; ');
    }

    if (isCorrect) {
      fullyCorrectCount++;
    }
    totalEarnedPoints += earned;
    categoryMap[cat].earned += earned;

    return {
      questionId: q.id,
      type: q.type,
      questionText: q.text,
      category: cat,
      points: qPoints,
      earnedPoints: earned,
      isCorrect,
      isPartial,
      studentAnswer: rawAns !== undefined ? rawAns : null,
      correctAnswerSummary,
      explanation: q.explanation || '',
      matchingDetails
    };
  });

  // Calculate percentage scores
  const rawScore = totalMaxPoints > 0 ? (totalEarnedPoints / totalMaxPoints) * 100 : 0;
  const score = Math.round(rawScore * 10) / 10;
  const isPassed = score >= passingGrade;

  Object.keys(categoryMap).forEach((cat) => {
    const data = categoryMap[cat];
    data.percentage = data.total > 0 ? Math.round((data.earned / data.total) * 100) : 0;
  });

  return {
    score,
    earnedPoints: Math.round(totalEarnedPoints * 10) / 10,
    totalPoints: totalMaxPoints,
    correctCount: fullyCorrectCount,
    totalQuestions: questions.length,
    isPassed,
    breakdown,
    categoryBreakdown: categoryMap
  };
}

/**
 * Generate a random 6-character unique uppercase code for a quiz (e.g. AWG892).
 */
export function generateQuizCode(existingCodes: string[] = []): string {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const numbers = '23456789';
  const existingSet = new Set(existingCodes.map((c) => c.toUpperCase()));

  for (let attempt = 0; attempt < 100; attempt++) {
    let code = 'AWG';
    for (let i = 0; i < 3; i++) {
      code += numbers.charAt(Math.floor(Math.random() * numbers.length));
    }
    if (!existingSet.has(code)) {
      return code;
    }
  }

  let fallback = '';
  const allChars = letters + numbers;
  for (let i = 0; i < 6; i++) {
    fallback += allChars.charAt(Math.floor(Math.random() * allChars.length));
  }
  return fallback;
}

/**
 * Format seconds to MM:SS string
 */
export function formatTimeRemaining(seconds: number): string {
  if (seconds < 0) seconds = 0;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Validate Quiz payload before saving, ensuring correct data for each question type.
 */
export function validateQuizData(
  title: string,
  questions: Question[]
): { isValid: boolean; error?: string } {
  if (!title || !title.trim()) {
    return { isValid: false, error: 'Judul kuis tidak boleh kosong.' };
  }

  if (!questions || questions.length === 0) {
    return { isValid: false, error: 'Kuis harus memiliki minimal 1 soal.' };
  }

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const num = i + 1;

    if (!q.text || !q.text.trim()) {
      return { isValid: false, error: `Soal #${num} belum memiliki teks pertanyaan.` };
    }

    if (q.type === 'multiple_choice') {
      if (!q.options || q.options.length < 2) {
        return { isValid: false, error: `Soal #${num} (Pilihan Ganda) harus memiliki minimal 2 opsi.` };
      }
      for (let j = 0; j < q.options.length; j++) {
        if (!q.options[j] || !q.options[j].trim()) {
          return {
            isValid: false,
            error: `Opsi ${String.fromCharCode(65 + j)} pada Soal #${num} masih kosong.`
          };
        }
      }
      if (q.correctOption === undefined || q.correctOption < 0 || q.correctOption >= q.options.length) {
        return { isValid: false, error: `Kunci jawaban untuk Soal #${num} belum dipilih.` };
      }
    } else if (q.type === 'short_answer') {
      if (!q.acceptedAnswers || q.acceptedAnswers.length === 0) {
        return { isValid: false, error: `Soal #${num} (Isian Singkat) harus memiliki minimal 1 kunci jawaban.` };
      }
      const hasValid = q.acceptedAnswers.some((a) => a && a.trim().length > 0);
      if (!hasValid) {
        return { isValid: false, error: `Kunci jawaban untuk Soal #${num} (Isian Singkat) masih kosong.` };
      }
    } else if (q.type === 'matching') {
      if (!q.matchingPairs || q.matchingPairs.length < 2) {
        return { isValid: false, error: `Soal #${num} (Menjodohkan) harus memiliki minimal 2 pasang item.` };
      }
      for (let pIdx = 0; pIdx < q.matchingPairs.length; pIdx++) {
        const pair = q.matchingPairs[pIdx];
        if (!pair.left || !pair.left.trim() || !pair.right || !pair.right.trim()) {
          return {
            isValid: false,
            error: `Pasangan #${pIdx + 1} pada Soal #${num} (Menjodohkan) belum lengkap (kiri & kanan wajib diisi).`
          };
        }
      }
    }
  }

  return { isValid: true };
}
