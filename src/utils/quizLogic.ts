import type {
  Question,
  QuestionType,
  Quiz,
  QuizAsset,
  QuizResultCalculation,
  QuestionBreakdown,
  StudentAnswerValue
} from '../types/quiz.js';

/**
 * Data URL gambar sebuah soal. Gambar bisa milik soal itu sendiri (imageUrl) atau
 * gambar bersama yang dipakai beberapa soal lewat Question.imageId -> Quiz.images.
 */
export function resolveQuestionImage(
  quiz: Pick<Quiz, 'images'> | null | undefined,
  question: Question | null | undefined
): string | undefined {
  if (!question) return undefined;
  if (question.imageId) {
    const shared = quiz?.images?.find((img) => img.id === question.imageId);
    if (shared?.imageUrl) return shared.imageUrl;
  }
  return question.imageUrl || undefined;
}

/** URL embed YouTube dari berbagai bentuk link (watch, youtu.be, shorts, embed). */
export function youtubeEmbedUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const match = url.match(/^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|shorts\/|watch\?v=|&v=)([^#&?]*).*/);
  return match && match[2].length === 11 ? `https://www.youtube.com/embed/${match[2]}` : null;
}

/**
 * Aset bilah aset yang ditempel ke sebuah soal. Aset hanya disimpan sekali di Quiz.assets,
 * jadi beberapa soal yang memakai aset yang sama membaca data URL yang sama.
 * Gambar format lama (Quiz.images via imageId, atau Question.imageUrl) tetap ditampilkan.
 */
export function resolveQuestionAssets(
  quiz: Pick<Quiz, 'assets' | 'images'> | null | undefined,
  question: Question | null | undefined
): QuizAsset[] {
  if (!question) return [];
  const assets: QuizAsset[] = [];
  (question.assetIds || []).forEach((assetId) => {
    const asset = quiz?.assets?.find((a) => a.id === assetId);
    if (asset && !assets.some((a) => a.id === asset.id)) assets.push(asset);
  });

  const legacyImage = resolveQuestionImage(quiz, question);
  if (legacyImage && !assets.some((a) => a.type === 'image' && a.dataUrl === legacyImage)) {
    assets.push({
      id: `legacy-image-${question.id}`,
      type: 'image',
      title: 'Gambar soal',
      dataUrl: legacyImage
    });
  }
  return assets;
}

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
 * Formats a student's raw answer into readable text for the answer-review screens.
 */
export function formatStudentAnswer(
  question: Question | undefined,
  answer: StudentAnswerValue | null | undefined
): string {
  if (!question || answer === null || answer === undefined) return '(Tidak dijawab)';

  if (question.type === 'multiple_choice') {
    const idx = typeof answer === 'number' ? answer : null;
    const optionText = idx !== null ? (question.options || [])[idx] : undefined;
    if (idx === null || optionText === undefined) return '(Tidak dijawab)';
    return `${String.fromCharCode(65 + idx)}. ${optionText}`;
  }

  if (question.type === 'short_answer') {
    const text = typeof answer === 'string' ? answer.trim() : '';
    return text || '(Tidak dijawab)';
  }

  const answerMap =
    typeof answer === 'object' && !Array.isArray(answer) ? (answer as Record<string, string>) : {};
  const matched = (question.matchingPairs || [])
    .map((pair) => (answerMap[pair.left] ? `${pair.left} → ${answerMap[pair.left]}` : null))
    .filter((line): line is string => line !== null);

  return matched.length > 0 ? matched.join('; ') : '(Tidak dijawab)';
}

/**
 * Calculate quiz score and comprehensive breakdown for all question types.
 */
export function calculateQuizScore(
  userAnswers: Record<string, StudentAnswerValue>,
  questions: Question[],
  passingGrade: number = 70,
  shortAnswerVerdicts: Record<string, { isCorrect: boolean; reason?: string }> = {}
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
    let aiReason: string | undefined;
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
      const verdict = shortAnswerVerdicts[q.id];
      if (verdict) {
        // Penilaian AI berdasarkan makna jawaban, bukan kecocokan karakter.
        isCorrect = verdict.isCorrect;
        aiReason = verdict.reason;
      } else {
        isCorrect = checkShortAnswer(studentText, q.acceptedAnswers || [], q.caseSensitive);
      }
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
      aiReason,
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
