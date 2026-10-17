import { Quiz, StudentSubmission } from '../types/quiz.js';

const QUIZZES_STORAGE_KEY = 'awang_long_quizzes_v2';
const SUBMISSIONS_STORAGE_KEY = 'awang_long_submissions_v2';
const CATEGORIES_STORAGE_KEY = 'awang_long_categories_v2';

export const DEFAULT_GLOBAL_CATEGORIES: string[] = [
  'Sejarah & Tokoh',
  'Biologi & Satwa',
  'Geografi & Budaya',
  'Konservasi Lingkungan',
  'Matematika & Logika',
  'Bahasa & Sastra',
  'Umum'
];

export const INITIAL_QUIZZES: Quiz[] = [
  {
    id: 'quiz-awang-long-1',
    code: 'AWG101',
    title: 'Sejarah Perjuangan Pahlawan Awang Long & Kutai',
    description: 'Kuis interaktif multi-tipe (Pilihan Ganda, Isian Singkat, dan Menjodohkan) menguji wawasan kepahlawanan Awang Long.',
    subject: 'Sejarah Indonesia',
    gradeLevel: 'SMP',
    durationMinutes: 10,
    passingGrade: 75,
    createdAt: '2026-10-10T08:00:00.000Z',
    updatedAt: '2026-10-10T08:00:00.000Z',
    createdBy: 'Guru Sejarah (Pak Wajdi)',
    isActive: true,
    categories: ['Sejarah & Tokoh', 'Geografi & Budaya', 'Kepahlawanan'],
    questions: [
      {
        id: 'q1-1',
        type: 'multiple_choice',
        category: 'Sejarah & Tokoh',
        points: 20,
        text: 'Siapakah sosok Awang Long dalam catatan sejarah Kesultanan Kutai Kartanegara?',
        options: [
          'Panglima perang berani bergelar Senapati Sakti yang memimpin perlawanan terhadap agresi militer Belanda',
          'Raja pertama Kutai yang menuliskan prasasti Yupa di Muara Kaman',
          'Utusan perdagangan dari Kerajaan Majapahit di abad ke-14',
          'Gubernur Jenderal Belanda yang bertugas di Kalimantan Timur'
        ],
        correctOption: 0,
        explanation: 'Awang Long adalah Senapati Perang Kesultanan Kutai Kartanegara ing Martadipura yang memimpin rakyat Kutai bertempur melawan serbuan pasukan Belanda di perairan Mahakam tahun 1844.'
      },
      {
        id: 'q1-2',
        type: 'short_answer',
        category: 'Geografi & Budaya',
        points: 20,
        text: 'Di sungai manakah pertempuran heroik armada Awang Long melawan kapal perang kompeni Belanda berkobar?',
        acceptedAnswers: ['Mahakam', 'Sungai Mahakam'],
        caseSensitive: false,
        explanation: 'Pertempuran sengit berkobar di sepanjang alur Sungai Mahakam di sekitar Tenggarong melawan armada kompeni pimpinan Kapten T.C. Bruijn.'
      },
      {
        id: 'q1-3',
        type: 'matching',
        category: 'Sejarah & Tokoh',
        points: 30,
        text: 'Jodohkan entitas sejarah berikut dengan peran atau keterangannya yang tepat!',
        matchingPairs: [
          { id: 'p1', left: 'Awang Long', right: 'Senapati Sakti Kutai Kartanegara' },
          { id: 'p2', left: 'Pesut Mahakam', right: 'Mamalia air tawar langka endemik' },
          { id: 'p3', left: 'Tenggarong', right: 'Pusat pemerintahan Kesultanan Kutai' },
          { id: 'p4', left: 'Tahun 1844', right: 'Waktu berkobarnya pertempuran Mahakam' }
        ],
        explanation: 'Setiap elemen sejarah memiliki kaitan erat dengan perjuangan pertahanan kedaulatan tanah Kutai di Kalimantan Timur.'
      },
      {
        id: 'q1-4',
        type: 'multiple_choice',
        category: 'Kepahlawanan',
        points: 15,
        text: 'Nilai karakter utama yang patut kita teladani dari perjuangan Pahlawan Awang Long adalah...',
        options: [
          'Cinta tanah air, pantang menyerah, dan berani berkorban demi keadilan',
          'Pasrah dan tunduk pada tekanan pihak luar',
          'Mencari keuntungan pribadi dalam perselisihan',
          'Menghindari tanggung jawab sosial kemasyarakatan'
        ],
        correctOption: 0,
        explanation: 'Awang Long gugur dengan gagah berani di medan laga demi membela kedaulatan rakyat dan tanah airnya dari penjajahan asing.'
      },
      {
        id: 'q1-5',
        type: 'short_answer',
        category: 'Kepahlawanan',
        points: 15,
        text: 'Lengkapi gelar kehormatan sakti yang disandang oleh Awang Long dari Sultan Kutai: Senapati...',
        acceptedAnswers: ['Sakti', 'Pahlawan Sakti', 'Senapati Sakti'],
        caseSensitive: false,
        explanation: 'Awang Long dianugerahi gelar kehormatan Senapati Sakti atas kesetiaan dan keberaniannya memimpin laskar pertahanan.'
      }
    ]
  },
  {
    id: 'quiz-sains-mahakam-2',
    code: 'AWG102',
    title: 'Keajaiban Ekosistem & Flora Fauna Mahakam',
    description: 'Eksplorasi ilmu pengetahuan alam seputar keanekaragaman hayati perairan tropis Kalimantan.',
    subject: 'IPA / Sains Lingkungan',
    gradeLevel: 'SD / SMP',
    durationMinutes: 8,
    passingGrade: 70,
    createdAt: '2026-10-12T09:00:00.000Z',
    updatedAt: '2026-10-12T09:00:00.000Z',
    createdBy: 'Ibu Rahma, S.Pd',
    isActive: true,
    categories: ['Biologi & Satwa', 'Konservasi Lingkungan'],
    questions: [
      {
        id: 'q2-1',
        type: 'multiple_choice',
        category: 'Biologi & Satwa',
        points: 25,
        text: 'Pesut Mahakam termasuk kelompok hewan mamalia, sehingga bernapas menggunakan organ apa?',
        options: [
          'Paru-paru (sehingga perlu berkala muncul ke permukaan air)',
          'Insang seperti kebanyakan ikan bersisik',
          'Kulit basah seperti katak amfibi',
          'Trakea seperti serangga capung'
        ],
        correctOption: 0,
        explanation: 'Pesut Mahakam adalah mamalia akuatik (ordo Cetacea), bernapas menggunakan paru-paru dan melahirkan anak.'
      },
      {
        id: 'q2-2',
        type: 'short_answer',
        category: 'Biologi & Satwa',
        points: 25,
        text: 'Sebutkan organ tubuh yang digunakan Pesut Mahakam untuk bernapas di permukaan air:',
        acceptedAnswers: ['Paru-paru', 'Paru paru', 'Paru'],
        caseSensitive: false,
        explanation: 'Pesut Mahakam menyembul ke permukaan Sungai Mahakam untuk menghirup udara menggunakan paru-parunya.'
      },
      {
        id: 'q2-3',
        type: 'matching',
        category: 'Konservasi Lingkungan',
        points: 50,
        text: 'Jodohkan komponen ekosistem sungai dengan fungsi utamanya!',
        matchingPairs: [
          { id: 'p2-1', left: 'Hutan Bakau / Mangrove', right: 'Mencegah erosi & tempat pembibitan ikan' },
          { id: 'p2-2', left: 'Pesut Mahakam', right: 'Indikator hayati kesehatan air tawar' },
          { id: 'p2-3', left: 'Limbah Plastik', right: 'Ancaman polutan mematikan bagi biota' }
        ],
        explanation: 'Keseimbangan ekosistem Mahakam sangat bergantung pada kebersihan air dan keutuhan vegetasi tepian sungai.'
      }
    ]
  }
];

export const INITIAL_SUBMISSIONS: StudentSubmission[] = [
  {
    id: 'sub-1',
    quizId: 'quiz-awang-long-1',
    quizCode: 'AWG101',
    studentName: 'Ahmad Faiz',
    studentClass: '8-A SMP Awang Long',
    answers: {
      'q1-1': 0,
      'q1-2': 'Sungai Mahakam',
      'q1-3': {
        'Awang Long': 'Senapati Sakti Kutai Kartanegara',
        'Pesut Mahakam': 'Mamalia air tawar langka endemik',
        'Tenggarong': 'Pusat pemerintahan Kesultanan Kutai',
        'Tahun 1844': 'Waktu berkobarnya pertempuran Mahakam'
      },
      'q1-4': 0,
      'q1-5': 'Sakti'
    },
    score: 100,
    earnedPoints: 100,
    totalPoints: 100,
    correctCount: 5,
    totalQuestions: 5,
    isPassed: true,
    timeSpentSeconds: 145,
    submittedAt: '2026-10-15T14:22:00.000Z',
    categoryScores: {
      'Sejarah & Tokoh': { earned: 50, total: 50, percentage: 100 },
      'Geografi & Budaya': { earned: 20, total: 20, percentage: 100 },
      'Kepahlawanan': { earned: 30, total: 30, percentage: 100 }
    }
  },
  {
    id: 'sub-2',
    quizId: 'quiz-awang-long-1',
    quizCode: 'AWG101',
    studentName: 'Siti Nurhaliza',
    studentClass: '8-B SMP Awang Long',
    answers: {
      'q1-1': 0,
      'q1-2': 'Mahakam',
      'q1-3': {
        'Awang Long': 'Senapati Sakti Kutai Kartanegara',
        'Pesut Mahakam': 'Mamalia air tawar langka endemik',
        'Tenggarong': 'Pusat pemerintahan Kesultanan Kutai',
        'Tahun 1844': 'Waktu berkobarnya pertempuran Mahakam'
      },
      'q1-4': 0,
      'q1-5': 'Ksatria' // wrong short answer
    },
    score: 85,
    earnedPoints: 85,
    totalPoints: 100,
    correctCount: 4,
    totalQuestions: 5,
    isPassed: true,
    timeSpentSeconds: 198,
    submittedAt: '2026-10-15T14:35:00.000Z',
    categoryScores: {
      'Sejarah & Tokoh': { earned: 50, total: 50, percentage: 100 },
      'Geografi & Budaya': { earned: 20, total: 20, percentage: 100 },
      'Kepahlawanan': { earned: 15, total: 30, percentage: 50 }
    }
  }
];

export function loadStoredQuizzes(): Quiz[] {
  try {
    const raw = localStorage.getItem(QUIZZES_STORAGE_KEY);
    if (!raw) {
      saveStoredQuizzes(INITIAL_QUIZZES);
      return INITIAL_QUIZZES;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_QUIZZES;
  } catch {
    return INITIAL_QUIZZES;
  }
}

export function saveStoredQuizzes(quizzes: Quiz[]): void {
  try {
    localStorage.setItem(QUIZZES_STORAGE_KEY, JSON.stringify(quizzes));
  } catch (e) {
    console.error('Failed to save quizzes to localStorage', e);
  }
}

export function loadStoredSubmissions(): StudentSubmission[] {
  try {
    const raw = localStorage.getItem(SUBMISSIONS_STORAGE_KEY);
    if (!raw) {
      saveStoredSubmissions(INITIAL_SUBMISSIONS);
      return INITIAL_SUBMISSIONS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : INITIAL_SUBMISSIONS;
  } catch {
    return INITIAL_SUBMISSIONS;
  }
}

export function saveStoredSubmissions(submissions: StudentSubmission[]): void {
  try {
    localStorage.setItem(SUBMISSIONS_STORAGE_KEY, JSON.stringify(submissions));
  } catch (e) {
    console.error('Failed to save submissions to localStorage', e);
  }
}

export function loadStoredCategories(): string[] {
  try {
    const raw = localStorage.getItem(CATEGORIES_STORAGE_KEY);
    if (!raw) {
      saveStoredCategories(DEFAULT_GLOBAL_CATEGORIES);
      return DEFAULT_GLOBAL_CATEGORIES;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_GLOBAL_CATEGORIES;
  } catch {
    return DEFAULT_GLOBAL_CATEGORIES;
  }
}

export function saveStoredCategories(categories: string[]): void {
  try {
    localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(categories));
  } catch (e) {
    console.error('Failed to save categories to localStorage', e);
  }
}
