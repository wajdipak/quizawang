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

export const INITIAL_QUIZZES: Quiz[] = [];

export const INITIAL_SUBMISSIONS: StudentSubmission[] = [];

export function loadStoredQuizzes(): Quiz[] {
  try {
    const raw = localStorage.getItem(QUIZZES_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
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
      return [];
    }
    const parsed = JSON.parse(raw);
    const subs = Array.isArray(parsed) ? parsed : [];
    const cleaned = subs.filter((s: StudentSubmission) => {
      const name = (s.studentName || '').toLowerCase();
      return !name.includes('ahmad faiz') && !name.includes('siti nurhaliza');
    });
    if (cleaned.length !== subs.length) {
      saveStoredSubmissions(cleaned);
    }
    return cleaned;
  } catch {
    return [];
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
