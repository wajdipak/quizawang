import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateQuizScore,
  generateQuizCode,
  formatTimeRemaining,
  validateQuizData,
  checkShortAnswer,
  normalizeText
} from './quizLogic.ts';
import type { Question } from '../types/quiz.js';

test('checkShortAnswer normalizes text, handles case and punctuation', () => {
  const accepted = ['Awang Long', 'Pangeran Awang Long'];
  assert.equal(checkShortAnswer('awang long', accepted), true);
  assert.equal(checkShortAnswer('  AWANG LONG!  ', accepted), true);
  assert.equal(checkShortAnswer('pangeran awang long', accepted), true);
  assert.equal(checkShortAnswer('Gajah Mada', accepted), false);
  assert.equal(checkShortAnswer('', accepted), false);
});

test('calculateQuizScore grades multiple choice accurately', () => {
  const questions: Question[] = [
    {
      id: 'q1',
      type: 'multiple_choice',
      text: 'Siapakah Awang Long?',
      category: 'Sejarah',
      points: 10,
      options: ['Panglima Kutai', 'Pedagang'],
      correctOption: 0
    }
  ];

  const resCorrect = calculateQuizScore({ q1: 0 }, questions, 70);
  assert.equal(resCorrect.score, 100);
  assert.equal(resCorrect.isPassed, true);
  assert.equal(resCorrect.categoryBreakdown['Sejarah'].percentage, 100);

  const resWrong = calculateQuizScore({ q1: 1 }, questions, 70);
  assert.equal(resWrong.score, 0);
  assert.equal(resWrong.isPassed, false);
});

test('calculateQuizScore grades short answer and matching correctly', () => {
  const questions: Question[] = [
    {
      id: 'q1',
      type: 'short_answer',
      text: 'Sebutkan mamalia endemik Sungai Mahakam!',
      category: 'Biologi',
      points: 10,
      acceptedAnswers: ['Pesut Mahakam', 'Pesut']
    },
    {
      id: 'q2',
      type: 'matching',
      text: 'Jodohkan tokoh dan perannya:',
      category: 'Sejarah',
      points: 20,
      matchingPairs: [
        { id: 'p1', left: 'Awang Long', right: 'Senapati Sakti' },
        { id: 'p2', left: 'Kapten Bruijn', right: 'Komandan Belanda' }
      ]
    }
  ];

  // 1 correct short answer + 1 fully matched pair question = 30 / 30 points (100%)
  const answers = {
    q1: 'pesut mahakam',
    q2: {
      'Awang Long': 'Senapati Sakti',
      'Kapten Bruijn': 'Komandan Belanda'
    }
  };

  const res = calculateQuizScore(answers, questions, 75);
  assert.equal(res.score, 100);
  assert.equal(res.earnedPoints, 30);
  assert.equal(res.totalPoints, 30);
  assert.equal(res.correctCount, 2);
  assert.equal(res.isPassed, true);
  assert.equal(res.categoryBreakdown['Biologi'].percentage, 100);
  assert.equal(res.categoryBreakdown['Sejarah'].percentage, 100);
});

test('calculateQuizScore awards partial points for partial matching', () => {
  const questions: Question[] = [
    {
      id: 'q1',
      type: 'matching',
      text: 'Jodohkan istilah berikut:',
      category: 'Sejarah',
      points: 10,
      matchingPairs: [
        { id: 'p1', left: 'A', right: '1' },
        { id: 'p2', left: 'B', right: '2' }
      ]
    }
  ];

  // 1 out of 2 pairs matched = 50% earned points
  const answers = {
    q1: {
      A: '1',
      B: 'WRONG'
    }
  };

  const res = calculateQuizScore(answers, questions, 70);
  assert.equal(res.score, 50);
  assert.equal(res.earnedPoints, 5);
  assert.equal(res.breakdown[0].isPartial, true);
  assert.equal(res.breakdown[0].isCorrect, false);
});

test('validateQuizData validates short_answer and matching rules', () => {
  // Missing acceptedAnswers
  const invalidShortAnswer: Question[] = [
    {
      id: 'q1',
      type: 'short_answer',
      text: 'Apa ibu kota Kaltim?',
      category: 'Geografi',
      points: 10,
      acceptedAnswers: []
    }
  ];
  assert.equal(validateQuizData('Kuis', invalidShortAnswer).isValid, false);

  // Incomplete matching pairs
  const invalidMatching: Question[] = [
    {
      id: 'q2',
      type: 'matching',
      text: 'Jodohkan',
      category: 'Umum',
      points: 10,
      matchingPairs: [{ id: 'p1', left: 'Kiri', right: '' }]
    }
  ];
  assert.equal(validateQuizData('Kuis', invalidMatching).isValid, false);
});
