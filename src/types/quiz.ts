export type QuestionType = 'multiple_choice' | 'short_answer' | 'matching';

export interface MatchingPair {
  id: string;
  left: string;
  right: string;
}

export interface Question {
  id: string;
  type: QuestionType;
  text: string;
  category: string;
  points: number; // default e.g. 10
  explanation?: string;

  // For multiple_choice
  options?: string[];
  correctOption?: number; // 0-indexed

  // For short_answer
  acceptedAnswers?: string[]; // array of acceptable variations e.g. ["Awang Long", "Pangeran Awang Long"]
  caseSensitive?: boolean;

  // For matching
  matchingPairs?: MatchingPair[]; // left items matched to right items
}

export interface Quiz {
  id: string;
  code: string; // 6-digit PIN code (e.g. "AWG101")
  title: string;
  description: string;
  subject: string;
  gradeLevel: string;
  durationMinutes: number; // 0 for unlimited
  passingGrade: number; // e.g. 70
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  isActive: boolean;
  categories: string[];
  questions: Question[];
}

export type StudentAnswerValue = number | string | Record<string, string>;

export interface StudentSubmission {
  id: string;
  quizId: string;
  quizCode: string;
  studentName: string;
  studentClass: string;
  studentNis?: string;
  studentNote?: string;
  answers: Record<string, StudentAnswerValue>; // questionId -> answer
  score: number; // 0 - 100
  earnedPoints: number;
  totalPoints: number;
  correctCount: number;
  totalQuestions: number;
  isPassed: boolean;
  timeSpentSeconds: number;
  submittedAt: string;
  categoryScores?: Record<string, { earned: number; total: number; percentage: number }>;
}

export interface QuestionBreakdown {
  questionId: string;
  type: QuestionType;
  questionText: string;
  category: string;
  points: number;
  earnedPoints: number;
  isCorrect: boolean;
  isPartial: boolean;
  studentAnswer: StudentAnswerValue | null;
  correctAnswerSummary: string;
  explanation?: string;
  matchingDetails?: Array<{
    left: string;
    studentRight: string | null;
    correctRight: string;
    isMatched: boolean;
  }>;
}

export interface QuizResultCalculation {
  score: number; // 0 - 100
  earnedPoints: number;
  totalPoints: number;
  correctCount: number;
  totalQuestions: number;
  isPassed: boolean;
  breakdown: QuestionBreakdown[];
  categoryBreakdown: Record<string, { earned: number; total: number; percentage: number; questionCount: number }>;
}
