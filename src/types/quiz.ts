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
  difficultyTag?: string; // e.g. 'Mudah', 'Sedang', 'Sulit (HOTS)'

  // For multiple_choice
  options?: string[];
  correctOption?: number; // 0-indexed

  // For short_answer
  acceptedAnswers?: string[]; // array of acceptable variations e.g. ["Awang Long", "Pangeran Awang Long"]
  caseSensitive?: boolean;

  // For matching
  matchingPairs?: MatchingPair[]; // left items matched to right items
}

export interface QuizMaterial {
  id: string;
  type: 'text' | 'pdf' | 'ppt' | 'youtube';
  title: string;
  content?: string; // for text
  fileUrl?: string; // for pdf/ppt data url
  fileName?: string; // for pdf/ppt filename
  youtubeUrl?: string; // for youtube video url
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
  materials?: QuizMaterial[]; // Multiple learning materials (text, pdfs, videos)
  materialContent?: string; // Legacy fallback
  materialType?: 'text' | 'pdf' | 'ppt' | 'youtube';
  materialFileUrl?: string;
  materialFileName?: string;
  materialYoutubeUrl?: string;
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
  gameMode?: QuizGameMode;
  violationsCount?: number;
  isDisqualified?: boolean;
  categoryScores?: Record<string, { earned: number; total: number; percentage: number }>;
}

export type QuizGameMode = 'CLASSIC' | 'MASTERY' | 'PLAYGROUND' | 'TEST' | 'TEAM';

export type PowerUpType = 'DOUBLE_POINTS' | 'FIFTY_FIFTY' | 'ERASER' | 'IMMUNITY';

export interface QuizSessionSettings {
  gameMode: QuizGameMode;
  enablePowerUps?: boolean;
  streakBonusEnabled?: boolean;
  masteryThreshold?: number; // 1 or 2 correct needed
  maxTabViolations?: number; // default 3
  teamName?: string; // 'Tim Garuda' | 'Tim Rajawali'
  arcadeDurationSeconds?: number;
  isTeacherTesting?: boolean;
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

