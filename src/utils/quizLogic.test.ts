import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateQuizScore,
  generateQuizCode,
  formatTimeRemaining,
  validateQuizData,
  checkShortAnswer,
  normalizeText,
  resolveQuestionImage,
  resolveQuestionAssets,
  youtubeEmbedUrl
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
      text: 'Sebutkan gelar sakti Panglima Awang Long!',
      category: 'Sejarah',
      points: 10,
      acceptedAnswers: ['Senapati Sakti', 'Sakti']
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
    q1: 'senapati sakti',
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

test('resolveQuestionImage follows imageId to shared images and falls back to imageUrl', () => {
  const quiz = {
    images: [
      { id: 'img-1', imageUrl: 'data:image/png;base64,AAA' },
      { id: 'img-2', imageUrl: 'data:image/png;base64,BBB' }
    ]
  };
  const base: Question = { id: 'q1', type: 'multiple_choice', text: 'Soal', category: 'Umum', points: 10 };

  // Dua soal merujuk gambar yang sama -> data URL yang sama, tanpa duplikasi.
  assert.equal(resolveQuestionImage(quiz, { ...base, imageId: 'img-1' }), 'data:image/png;base64,AAA');
  assert.equal(resolveQuestionImage(quiz, { ...base, id: 'q2', imageId: 'img-1' }), 'data:image/png;base64,AAA');

  // Kuis lama yang belum punya pool gambar tetap tampil lewat imageUrl soal.
  assert.equal(resolveQuestionImage({}, { ...base, imageUrl: 'data:image/png;base64,CCC' }), 'data:image/png;base64,CCC');

  // Rujukan gambar yang sudah tidak ada jatuh ke imageUrl soal, dan soal tanpa gambar -> undefined.
  assert.equal(resolveQuestionImage(quiz, { ...base, imageId: 'img-hilang' }), undefined);
  assert.equal(resolveQuestionImage(quiz, { ...base, imageId: 'img-hilang', imageUrl: 'data:image/png;base64,DDD' }), 'data:image/png;base64,DDD');
  assert.equal(resolveQuestionImage(null, null), undefined);
});

test('resolveQuestionAssets reads shared assets once and keeps legacy images', () => {
  const quiz = {
    images: [{ id: 'img-1', imageUrl: 'data:image/png;base64,AAA' }],
    assets: [
      { id: 'a-1', type: 'image' as const, title: 'Peta', dataUrl: 'data:image/png;base64,AAA' },
      { id: 'a-2', type: 'audio' as const, title: 'Narasi', dataUrl: 'data:audio/mp3;base64,BBB' },
      { id: 'a-3', type: 'text' as const, title: 'Kutipan', content: 'Teks' },
      { id: 'a-4', type: 'youtube' as const, title: 'Video', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }
    ]
  };
  const base: Question = { id: 'q1', type: 'multiple_choice', text: 'Soal', category: 'Umum', points: 10 };

  // Aset yang sama dirujuk lebih dari sekali tidak ditampilkan dua kali.
  assert.deepEqual(
    resolveQuestionAssets(quiz, { ...base, assetIds: ['a-2', 'a-4', 'a-2'] }).map((a) => a.id),
    ['a-2', 'a-4']
  );

  // Dua soal memakai aset yang sama -> objek/data URL yang sama, bukan salinan.
  assert.equal(resolveQuestionAssets(quiz, { ...base, id: 'q2', assetIds: ['a-1'] })[0], quiz.assets[0]);

  // Rujukan aset yang sudah dihapus diabaikan.
  assert.deepEqual(resolveQuestionAssets(quiz, { ...base, assetIds: ['a-hilang'] }), []);
  assert.deepEqual(resolveQuestionAssets(null, { ...base, assetIds: ['a-1'] }), []);

  // Gambar format lama (imageId / imageUrl) tetap tampil sebagai aset gambar.
  const legacy = resolveQuestionAssets(quiz, { ...base, imageId: 'img-1' });
  assert.equal(legacy.length, 1);
  assert.equal(legacy[0].type, 'image');
  assert.equal(legacy[0].dataUrl, 'data:image/png;base64,AAA');
  assert.equal(
    resolveQuestionAssets({}, { ...base, imageUrl: 'data:image/png;base64,DDD' })[0].dataUrl,
    'data:image/png;base64,DDD'
  );

  // Gambar lama yang isinya sama dengan aset yang sudah terpasang tidak diduplikasi.
  const dedup = resolveQuestionAssets(quiz, { ...base, assetIds: ['a-1'], imageUrl: 'data:image/png;base64,AAA' });
  assert.equal(dedup.length, 1);
  assert.equal(dedup[0].id, 'a-1');
});

test('youtubeEmbedUrl accepts common YouTube links and rejects others', () => {
  assert.equal(
    youtubeEmbedUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ'),
    'https://www.youtube.com/embed/dQw4w9WgXcQ'
  );
  assert.equal(youtubeEmbedUrl('https://youtu.be/dQw4w9WgXcQ?t=10'), 'https://www.youtube.com/embed/dQw4w9WgXcQ');
  assert.equal(
    youtubeEmbedUrl('https://www.youtube.com/shorts/dQw4w9WgXcQ'),
    'https://www.youtube.com/embed/dQw4w9WgXcQ'
  );
  assert.equal(youtubeEmbedUrl('https://example.com/video'), null);
  assert.equal(youtubeEmbedUrl(''), null);
  assert.equal(youtubeEmbedUrl(undefined), null);
});
