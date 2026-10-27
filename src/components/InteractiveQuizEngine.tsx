import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  Zap,
  Mountain,
  Gamepad2,
  ShieldAlert,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  RotateCcw,
  Award,
  ArrowRight,
  ArrowLeft,
  Volume2,
  VolumeX,
  Sparkles,
  Send,
  Flag,
  AlertTriangle,
  Flame,
  Shield,
  Coins,
  Lock,
  Unlock,
  Eye,
  Trophy,
  RefreshCw,
  Home,
  Sliders,
  ExternalLink
} from 'lucide-react';
import {
  Quiz,
  Question,
  StudentSubmission,
  QuizSessionSettings,
  QuizGameMode,
  PowerUpType,
  StudentAnswerValue
} from '../types/quiz.js';
import { calculateQuizScore, checkShortAnswer, formatTimeRemaining } from '../utils/quizLogic.js';
import { playSelectSound, playSuccessSound, playTickSound } from '../utils/audio.js';

interface Props {
  quiz: Quiz;
  settings: QuizSessionSettings;
  onExit: () => void;
  onSubmissionSaved?: (submission: StudentSubmission) => void;
}

interface SimulatedPlayer {
  id: string;
  name: string;
  score: number;
  avatar: string;
  team?: 'Tim Garuda' | 'Tim Rajawali';
}

export const InteractiveQuizEngine: React.FC<Props> = ({
  quiz,
  settings,
  onExit,
  onSubmissionSaved
}) => {
  const mode = settings.gameMode;
  const isTeacherTesting = settings.isTeacherTesting ?? true;

  // Sound toggle
  const [soundEnabled, setSoundEnabled] = useState(mode !== 'TEST');

  // Answers map
  const [answers, setAnswers] = useState<Record<string, StudentAnswerValue>>({});
  const [flagged, setFlagged] = useState<Record<string, boolean>>({});

  // Question Queue (for adaptive mastery mode)
  // Each item has question, attempts, consecutiveCorrect, isMastered
  interface MasteryItem {
    question: Question;
    consecutiveCorrect: number;
    hasFailed: boolean;
    isMastered: boolean;
  }
  const [masteryQueue, setMasteryQueue] = useState<MasteryItem[]>(() =>
    quiz.questions.map((q) => ({
      question: q,
      consecutiveCorrect: 0,
      hasFailed: false,
      isMastered: false
    }))
  );
  const [masteryCurrentQueueIndex, setMasteryCurrentQueueIndex] = useState(0);

  // Normal index for sequential/grid modes
  const [currentIndex, setCurrentIndex] = useState(0);

  // Time & Timer states
  const totalSeconds =
    mode === 'PLAYGROUND'
      ? settings.arcadeDurationSeconds || 420
      : quiz.durationMinutes > 0
      ? quiz.durationMinutes * 60
      : 300;
  const [secondsRemaining, setSecondsRemaining] = useState<number>(totalSeconds);
  const startTimeRef = useRef<number>(Date.now());
  const questionStartTimeRef = useRef<number>(Date.now());

  // CLASSIC MODE states
  const [totalScore, setTotalScore] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [activePowerUp, setActivePowerUp] = useState<PowerUpType | null>(null);
  const [availablePowerUps, setAvailablePowerUps] = useState<Record<PowerUpType, number>>({
    DOUBLE_POINTS: 1,
    FIFTY_FIFTY: 1,
    ERASER: 1,
    IMMUNITY: 1
  });
  const [eliminatedOptions, setEliminatedOptions] = useState<number[]>([]);
  const [leaderboard, setLeaderboard] = useState<SimulatedPlayer[]>([
    { id: 'p1', name: 'Siti Rahma', score: 3250, avatar: '🦊' },
    { id: 'p2', name: 'Budi Santoso', score: 2900, avatar: '🐯' },
    { id: 'p3', name: 'Rian Pratama', score: 2600, avatar: '🦁' },
    { id: 'p4', name: 'Aisyah Putri', score: 2200, avatar: '🐼' }
  ]);

  // PLAYGROUND ARCADE MODE states
  const [arcadeCoins, setArcadeCoins] = useState(100);
  const [arcadeEnergy, setArcadeEnergy] = useState(2);
  const [showVaultHeistModal, setShowVaultHeistModal] = useState(false);
  const [vaultReward, setVaultReward] = useState<number | null>(null);
  const [isFrozenScreen, setIsFrozenScreen] = useState(false);
  const [freezeTapsRemaining, setFreezeTapsRemaining] = useState(0);

  // PROCTORED TEST MODE states
  const [violationsCount, setViolationsCount] = useState(0);
  const [showViolationWarningModal, setShowViolationWarningModal] = useState(false);
  const [violationNotice, setViolationNotice] = useState<string>('');
  const [isDisqualified, setIsDisqualified] = useState(false);
  const maxViolations = settings.maxTabViolations || 3;

  // TEAM MODE states
  const myTeam = settings.teamName || 'Tim Garuda';
  const otherTeam = myTeam === 'Tim Garuda' ? 'Tim Rajawali' : 'Tim Garuda';
  const [teamGarudaScore, setTeamGarudaScore] = useState(4800);
  const [teamRajawaliScore, setTeamRajawaliScore] = useState(4400);

  // Immediate question feedback state (for Classic, Mastery, Playground, Team)
  const [showImmediateFeedback, setShowImmediateFeedback] = useState<boolean>(false);
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState<boolean | null>(null);
  const [lastPointsEarned, setLastPointsEarned] = useState<number>(0);

  // Final summary completion
  const [isFinished, setIsFinished] = useState(false);

  // Active question based on mode
  const currentQuestion: Question | undefined =
    mode === 'MASTERY'
      ? masteryQueue[masteryCurrentQueueIndex]?.question
      : quiz.questions[currentIndex];

  // Countdown timer effect
  useEffect(() => {
    if (isFinished || isDisqualified) return;
    if (mode === 'MASTERY') return; // Mastery has no countdown timer pressure

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleFinishSession('Waktu Sesi Habis');
          return 0;
        }
        if (prev <= 10 && soundEnabled && mode !== 'TEST') {
          playTickSound();
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isFinished, isDisqualified, mode, soundEnabled]);

  // PROCTORED TEST: Window blur & Visibility change anti-cheat detection
  useEffect(() => {
    if (mode !== 'TEST' || isFinished || isDisqualified) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleTriggerViolation('Perpindahan Tab / Aplikasi Terdeteksi (Visibility Change)');
      }
    };

    const handleWindowBlur = () => {
      handleTriggerViolation('Jendela Browser Kehilangan Fokus (Window Blur)');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [mode, isFinished, isDisqualified, violationsCount]);

  const handleTriggerViolation = (reason: string) => {
    setViolationsCount((prev) => {
      const nextCount = prev + 1;
      setViolationNotice(
        `Peringatan Pelanggaran #${nextCount} dari ${maxViolations}: ${reason}. Mohon tetap berada di tab halaman ujian!`
      );
      setShowViolationWarningModal(true);

      if (nextCount >= maxViolations) {
        setIsDisqualified(true);
        setTimeout(() => {
          handleFinishSession('Kuis otomatis dikunci karena melampaui batas pelanggaran anti-cheat.');
        }, 1500);
      }
      return nextCount;
    });
  };

  // Sound play helper
  const triggerAudio = (type: 'select' | 'success' | 'tick') => {
    if (!soundEnabled || mode === 'TEST') return;
    if (type === 'select') playSelectSound();
    if (type === 'success') playSuccessSound();
    if (type === 'tick') playTickSound();
  };

  // POWER-UPS in Classic Mode
  const handleUsePowerUp = (type: PowerUpType) => {
    if (availablePowerUps[type] <= 0 || !currentQuestion) return;

    setAvailablePowerUps((prev) => ({
      ...prev,
      [type]: Math.max(0, prev[type] - 1)
    }));
    setActivePowerUp(type);
    triggerAudio('select');

    if (type === 'FIFTY_FIFTY' && currentQuestion.type === 'multiple_choice' && currentQuestion.options) {
      const correctIdx = currentQuestion.correctOption ?? 0;
      const wrongIndices = currentQuestion.options
        .map((_, idx) => idx)
        .filter((idx) => idx !== correctIdx);
      // Pick up to 2 wrong indices to hide
      const shuffled = [...wrongIndices].sort(() => 0.5 - Math.random());
      setEliminatedOptions(shuffled.slice(0, 2));
    }

    if (type === 'ERASER' && currentQuestion.type === 'multiple_choice' && currentQuestion.options) {
      const correctIdx = currentQuestion.correctOption ?? 0;
      const wrongIndices = currentQuestion.options
        .map((_, idx) => idx)
        .filter((idx) => idx !== correctIdx);
      if (wrongIndices.length > 0) {
        setEliminatedOptions([wrongIndices[0]]);
      }
    }
  };

  // CHECK ANSWER ACCURACY
  const evaluateAnswer = (q: Question, answerValue: StudentAnswerValue): boolean => {
    if (q.type === 'multiple_choice') {
      return typeof answerValue === 'number' && answerValue === q.correctOption;
    }
    if (q.type === 'short_answer') {
      const text = typeof answerValue === 'string' ? answerValue : '';
      return checkShortAnswer(text, q.acceptedAnswers || [], q.caseSensitive);
    }
    if (q.type === 'matching') {
      const map = (answerValue as Record<string, string>) || {};
      const pairs = q.matchingPairs || [];
      if (pairs.length === 0) return true;
      return pairs.every((p) => map[p.left] === p.right);
    }
    return false;
  };

  // HANDLE USER ANSWER SELECTION
  const handleAnswerQuestion = (answerValue: StudentAnswerValue) => {
    if (!currentQuestion) return;
    triggerAudio('select');

    // Store in answers map
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: answerValue
    }));

    // If PROCTORED TEST MODE: Don't reveal immediate right/wrong, simply save answer
    if (mode === 'TEST') {
      return;
    }

    // Evaluate correctness for live feedback & gamification scoring
    const isCorrect = evaluateAnswer(currentQuestion, answerValue);
    setLastAnswerCorrect(isCorrect);

    // Calculate time taken for Classic Formula
    const timeTakenMs = Date.now() - questionStartTimeRef.current;
    const basePoints = 1000;
    const qAllocatedSeconds = 30;
    const remainingFraction = Math.max(0, (qAllocatedSeconds * 1000 - timeTakenMs) / (qAllocatedSeconds * 1000));

    // Multiplier calculation (1.0x - 1.5x)
    let newStreak = isCorrect ? currentStreak + 1 : 0;
    if (!isCorrect && activePowerUp === 'IMMUNITY') {
      // Immunity saves streak!
      newStreak = currentStreak;
      setActivePowerUp(null);
    }
    setCurrentStreak(newStreak);
    setMaxStreak((m) => Math.max(m, newStreak));

    let multiplier = 1.0;
    if (newStreak >= 5) multiplier = 1.5;
    else if (newStreak === 4) multiplier = 1.2;
    else if (newStreak === 3) multiplier = 1.1;

    let pointsAwarded = 0;
    if (isCorrect) {
      pointsAwarded = Math.round(basePoints * (0.5 + 0.5 * remainingFraction) * multiplier);
      if (activePowerUp === 'DOUBLE_POINTS') {
        pointsAwarded *= 2;
        setActivePowerUp(null);
      }
      setTotalScore((prev) => prev + pointsAwarded);
      triggerAudio('success');

      // Randomly grant power-up on 3 streak
      if (newStreak === 3 && mode === 'CLASSIC') {
        const types: PowerUpType[] = ['DOUBLE_POINTS', 'FIFTY_FIFTY', 'ERASER', 'IMMUNITY'];
        const randomType = types[Math.floor(Math.random() * types.length)];
        setAvailablePowerUps((prev) => ({ ...prev, [randomType]: prev[randomType] + 1 }));
      }

      // ARCADE MODE bonus
      if (mode === 'PLAYGROUND') {
        setArcadeCoins((c) => c + 50);
        setArcadeEnergy((e) => Math.min(5, e + 1));
      }

      // TEAM MODE bonus
      if (mode === 'TEAM') {
        if (myTeam === 'Tim Garuda') {
          setTeamGarudaScore((s) => s + pointsAwarded);
        } else {
          setTeamRajawaliScore((s) => s + pointsAwarded);
        }
        // Simulated rival team minor increase
        setTimeout(() => {
          if (myTeam === 'Tim Garuda') {
            setTeamRajawaliScore((s) => s + Math.round(pointsAwarded * 0.9));
          } else {
            setTeamGarudaScore((s) => s + Math.round(pointsAwarded * 0.9));
          }
        }, 1200);
      }
    } else {
      pointsAwarded = 0;
    }

    setLastPointsEarned(pointsAwarded);
    setShowImmediateFeedback(true);

    // ADAPTIVE MASTERY MODE LOGIC
    if (mode === 'MASTERY') {
      const currentMasteryItem = masteryQueue[masteryCurrentQueueIndex];
      const threshold = settings.masteryThreshold || 2;
      const nextConsecutive = isCorrect ? currentMasteryItem.consecutiveCorrect + 1 : 0;
      const isNowMastered = nextConsecutive >= threshold || (isCorrect && !currentMasteryItem.hasFailed && threshold === 1);

      setMasteryQueue((prevQueue) => {
        const copy = [...prevQueue];
        const updatedItem: MasteryItem = {
          ...currentMasteryItem,
          consecutiveCorrect: nextConsecutive,
          hasFailed: currentMasteryItem.hasFailed || !isCorrect,
          isMastered: isNowMastered
        };
        copy[masteryCurrentQueueIndex] = updatedItem;

        // If wrong or not mastered yet, push to back of queue!
        if (!isNowMastered) {
          copy.push({
            question: currentMasteryItem.question,
            consecutiveCorrect: nextConsecutive,
            hasFailed: true,
            isMastered: false
          });
        }
        return copy;
      });
    }

    // Trigger confetti on 3 streak or big points
    if (isCorrect && newStreak >= 3) {
      try {
        confetti({ particleCount: 35, spread: 60, origin: { y: 0.6 } });
      } catch (e) {
        // ignore
      }
    }
  };

  // PROCEED TO NEXT QUESTION AFTER FEEDBACK
  const handleProceedNext = () => {
    setShowImmediateFeedback(false);
    setEliminatedOptions([]);
    setActivePowerUp(null);
    questionStartTimeRef.current = Date.now();

    if (mode === 'MASTERY') {
      const nextIdx = masteryCurrentQueueIndex + 1;
      // Check if all unique questions are mastered
      const allUniqueMastered = quiz.questions.every((q) => {
        const matched = masteryQueue.find((m) => m.question.id === q.id && m.isMastered);
        return Boolean(matched);
      });

      if (allUniqueMastered || nextIdx >= masteryQueue.length) {
        handleFinishSession('Selamat! Anda telah menguasai seluruh butir soal hingga puncak gunung!');
      } else {
        setMasteryCurrentQueueIndex(nextIdx);
      }
    } else {
      if (currentIndex + 1 < quiz.questions.length) {
        setCurrentIndex((i) => i + 1);
      } else {
        handleFinishSession('Seluruh soal telah selesai dijawab!');
      }
    }
  };

  // FINISH & SUBMISSION SUMMARY
  const handleFinishSession = (reason?: string) => {
    setIsFinished(true);
    const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
    const calculation = calculateQuizScore(answers, quiz.questions, quiz.passingGrade);

    try {
      confetti({ particleCount: 90, spread: 80, origin: { y: 0.5 } });
    } catch (e) {
      // ignore
    }

    if (onSubmissionSaved) {
      const submission: StudentSubmission = {
        id: `sub-engine-${Date.now()}`,
        quizId: quiz.id,
        quizCode: quiz.code,
        studentName: isTeacherTesting ? 'Guru (Simulasi Uji Soal)' : 'Siswa Interaktif',
        studentClass: 'Uji Coba Multi-Mode',
        studentNis: 'SIM-001',
        studentNote: `Pengerjaan via Mode ${mode}. ${reason || ''}`,
        answers,
        score: calculation.score,
        earnedPoints: calculation.earnedPoints,
        totalPoints: calculation.totalPoints,
        correctCount: calculation.correctCount,
        totalQuestions: calculation.totalQuestions,
        isPassed: calculation.isPassed,
        timeSpentSeconds: duration,
        submittedAt: new Date().toISOString(),
        gameMode: mode,
        violationsCount,
        isDisqualified
      };
      onSubmissionSaved(submission);
    }
  };

  // MINI-GAME: Vault Heist trigger
  const handleOpenVault = (vaultIdx: number) => {
    const rewards = [150, 300, 500];
    const won = rewards[Math.floor(Math.random() * rewards.length)];
    setVaultReward(won);
    setArcadeCoins((c) => c + won);
    setTotalScore((s) => s + won);
    triggerAudio('success');
    try {
      confetti({ particleCount: 60, spread: 70 });
    } catch (e) {}
  };

  // MINI-GAME: Screen Freeze Sabotage trigger (Simulation)
  const handleTriggerScreenFreeze = () => {
    if (arcadeEnergy < 1) return;
    setArcadeEnergy((e) => Math.max(0, e - 1));
    setIsFrozenScreen(true);
    setFreezeTapsRemaining(10);
  };

  const handleTapMeltIce = () => {
    triggerAudio('tick');
    setFreezeTapsRemaining((prev) => {
      if (prev <= 1) {
        setIsFrozenScreen(false);
        triggerAudio('success');
        return 0;
      }
      return prev - 1;
    });
  };

  // Mastery percentage calculation
  const masteredCount = quiz.questions.filter((q) =>
    masteryQueue.some((m) => m.question.id === q.id && m.isMastered)
  ).length;
  const masteryPercentage = Math.round((masteredCount / quiz.questions.length) * 100);

  // If session finished, show celebratory results breakdown
  if (isFinished) {
    const finalCalc = calculateQuizScore(answers, quiz.questions, quiz.passingGrade);

    return (
      <div className="max-w-4xl mx-auto space-y-5 p-4 sm:p-6 animate-in fade-in duration-300 text-slate-800 dark:text-slate-100">
        
        {/* Top Celebration Banner */}
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-700 text-white shadow-xl text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-white/20 backdrop-blur-md flex items-center justify-center mx-auto text-3xl shadow-inner font-black">
            {isDisqualified ? '⚠️' : finalCalc.isPassed ? '🏆' : '🎯'}
          </div>

          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-white/20 border border-white/20">
              Hasil Sesi Uji Soal: Mode {mode}
            </span>
            <h1 className="text-2xl sm:text-3xl font-black">
              {isDisqualified
                ? 'Sesi Ujian Didiskualifikasi'
                : finalCalc.isPassed
                ? 'Luar Biasa! Target Kuis Tercapai'
                : 'Sesi Uji Soal Selesai'}
            </h1>
            <p className="text-xs sm:text-sm text-teal-100 max-w-md mx-auto">
              {isDisqualified
                ? `Kuis dikunci karena perpindahan tab melebihi batas toleransi (${violationsCount}/${maxViolations} pelanggaran).`
                : mode === 'MASTERY'
                ? `Tingkat Ketuntasan Puncak Gunung: ${masteryPercentage}% (${masteredCount}/${quiz.questions.length} Butir Soal Dikuasai).`
                : `Nilai Akhir: ${finalCalc.score} / 100 (KKM: ${quiz.passingGrade}).`}
            </p>
          </div>

          {/* Key Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto pt-2">
            <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15">
              <span className="text-[10px] text-teal-100 font-semibold uppercase block">Skor Akhir</span>
              <span className="text-xl sm:text-2xl font-black">{finalCalc.score}</span>
            </div>
            <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15">
              <span className="text-[10px] text-teal-100 font-semibold uppercase block">Benar / Total</span>
              <span className="text-xl sm:text-2xl font-black">
                {finalCalc.correctCount} / {finalCalc.totalQuestions}
              </span>
            </div>
            {mode === 'CLASSIC' && (
              <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15">
                <span className="text-[10px] text-teal-100 font-semibold uppercase block">Streak Max</span>
                <span className="text-xl sm:text-2xl font-black">🔥 {maxStreak}x</span>
              </div>
            )}
            {mode === 'PLAYGROUND' && (
              <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15">
                <span className="text-[10px] text-teal-100 font-semibold uppercase block">Koin Arcade</span>
                <span className="text-xl sm:text-2xl font-black">🪙 {arcadeCoins}</span>
              </div>
            )}
            {mode === 'MASTERY' && (
              <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15">
                <span className="text-[10px] text-teal-100 font-semibold uppercase block">Ketuntasan</span>
                <span className="text-xl sm:text-2xl font-black">🏔️ {masteryPercentage}%</span>
              </div>
            )}
            {mode === 'TEST' && (
              <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15">
                <span className="text-[10px] text-teal-100 font-semibold uppercase block">Pelanggaran Tab</span>
                <span className="text-xl sm:text-2xl font-black">🛡️ {violationsCount}x</span>
              </div>
            )}
            {mode === 'TEAM' && (
              <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15">
                <span className="text-[10px] text-teal-100 font-semibold uppercase block">Regu Anda</span>
                <span className="text-xl sm:text-2xl font-black">
                  {myTeam === 'Tim Garuda' ? '🦅 Garuda' : '🦅 Rajawali'}
                </span>
              </div>
            )}
            <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15">
              <span className="text-[10px] text-teal-100 font-semibold uppercase block">Durasi</span>
              <span className="text-xl sm:text-2xl font-black">
                {Math.round((Date.now() - startTimeRef.current) / 1000)}s
              </span>
            </div>
          </div>
        </div>

        {/* Detailed Question Review List */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center justify-between">
            <span>Evaluasi Butir Soal</span>
            <span className="text-xs font-semibold text-slate-500">
              {finalCalc.correctCount} dari {finalCalc.totalQuestions} Soal Terjawab Benar
            </span>
          </h3>

          <div className="space-y-3">
            {finalCalc.breakdown.map((b, idx) => (
              <div
                key={b.questionId}
                className={`p-3.5 rounded-2xl border text-xs space-y-1.5 transition-colors ${
                  b.isCorrect
                    ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800'
                    : 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    No. {idx + 1} ({b.category})
                  </span>
                  <span
                    className={`font-bold px-2 py-0.5 rounded-md text-[10px] ${
                      b.isCorrect
                        ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200'
                        : 'bg-rose-100 dark:bg-rose-900 text-rose-800 dark:text-rose-200'
                    }`}
                  >
                    {b.isCorrect ? '✓ Benar' : '✗ Salah'}
                  </span>
                </div>

                <p className="font-medium text-slate-800 dark:text-slate-200 leading-snug">
                  {b.questionText}
                </p>

                <div className="text-[11px] text-slate-600 dark:text-slate-400">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Kunci Jawaban: </span>
                  <span>{b.correctAnswerSummary}</span>
                </div>

                {b.explanation && (
                  <div className="p-2 rounded-xl bg-white/70 dark:bg-slate-800/70 border border-slate-200/50 dark:border-slate-700/50 text-[11px] text-slate-600 dark:text-slate-400">
                    <span className="font-semibold text-teal-700 dark:text-teal-300">Penjelasan: </span>
                    {b.explanation}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Action Button to Return */}
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={onExit}
            className="px-6 py-3 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md shadow-teal-600/20 flex items-center gap-2 cursor-pointer transition-colors"
          >
            <Home className="w-4 h-4" />
            <span>Kembali ke Manajemen Kuis Guru</span>
          </button>
        </div>

      </div>
    );
  }

  // ACTIVE GAME PLAY UI
  return (
    <div className="max-w-4xl mx-auto space-y-4 p-3 sm:p-5 relative">
      
      {/* FROZEN SCREEN SABOTAGE OVERLAY (Playground Mode) */}
      {isFrozenScreen && (
        <div className="fixed inset-0 z-50 bg-sky-950/80 backdrop-blur-md flex flex-col items-center justify-center p-4 text-center select-none animate-in fade-in">
          <div className="max-w-md w-full p-6 rounded-3xl bg-sky-900/90 border-2 border-cyan-400 text-white shadow-2xl space-y-4">
            <div className="text-5xl animate-bounce">❄️</div>
            <h2 className="text-xl font-black text-cyan-200">
              Layar Anda Dibekukan! (Screen Freeze)
            </h2>
            <p className="text-xs text-sky-200">
              Efek sabotase es aktif! Ketuk atau klik tombol di bawah 10 kali secepat mungkin untuk memecahkan es dan melanjutkan kuis!
            </p>

            <button
              type="button"
              onClick={handleTapMeltIce}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 active:scale-95 text-slate-900 font-black text-base shadow-lg transition-transform cursor-pointer"
            >
              🔨 Ketuk Memecah Es ({freezeTapsRemaining} Kali Tersisa!)
            </button>
          </div>
        </div>
      )}

      {/* PROCTOR VIOLATION WARNING MODAL (Test Mode) */}
      {showViolationWarningModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="max-w-md w-full p-6 rounded-3xl bg-white dark:bg-slate-900 border-2 border-rose-500 text-slate-900 dark:text-slate-100 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto text-2xl font-black">
              ⚠️
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-lg font-black text-rose-600 dark:text-rose-400">
                Peringatan Integritas Anti-Cheat!
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {violationNotice}
              </p>
              <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-[11px] font-bold text-rose-700 dark:text-rose-300">
                Pelanggaran Saat Ini: {violationsCount} dari Batas Maksimal {maxViolations}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowViolationWarningModal(false)}
              className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors cursor-pointer"
            >
              Saya Mengerti & Kembali ke Ujian
            </button>
          </div>
        </div>
      )}

      {/* VAULT HEIST MINI-GAME MODAL (Playground Mode) */}
      {showVaultHeistModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="max-w-md w-full p-6 rounded-3xl bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 border-2 border-amber-400 text-white shadow-2xl space-y-4 text-center">
            <div className="text-4xl">🏦</div>
            <h3 className="text-lg font-black text-amber-300">
              Aksi Vault Heist (Bobol Brankas)
            </h3>
            <p className="text-xs text-slate-300">
              Pilih salah satu dari 3 brankas rahasia di bawah untuk memenangkan jackpot koin kuis!
            </p>

            <div className="grid grid-cols-3 gap-3 py-2">
              {[0, 1, 2].map((idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleOpenVault(idx)}
                  className="p-4 rounded-2xl bg-white/10 hover:bg-amber-400/20 border border-white/20 hover:border-amber-400 text-center transition-all cursor-pointer group"
                >
                  <div className="text-3xl mb-1 group-hover:scale-110 transition-transform">🎁</div>
                  <span className="text-[10px] font-bold text-amber-200">Brankas {idx + 1}</span>
                </button>
              ))}
            </div>

            {vaultReward !== null && (
              <div className="p-3 rounded-2xl bg-amber-400/20 border border-amber-400 text-amber-200 text-xs font-black animate-in zoom-in">
                🎉 Anda Membobol +{vaultReward} Koin Arcade!
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setShowVaultHeistModal(false);
                setVaultReward(null);
              }}
              className="w-full py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs cursor-pointer transition-colors"
            >
              Tutup & Lanjutkan Kuis
            </button>
          </div>
        </div>
      )}

      {/* TOP HEADER STATUS BAR */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-3">
        
        {/* Upper row: Mode Title, PIN, Sound & Exit */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300">
              {mode === 'CLASSIC' && <Zap className="w-4 h-4 text-amber-500" />}
              {mode === 'MASTERY' && <Mountain className="w-4 h-4 text-emerald-500" />}
              {mode === 'PLAYGROUND' && <Gamepad2 className="w-4 h-4 text-indigo-500" />}
              {mode === 'TEST' && <ShieldAlert className="w-4 h-4 text-sky-600" />}
              {mode === 'TEAM' && <Users className="w-4 h-4 text-rose-500" />}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  Mode: {mode}
                </span>
                {isTeacherTesting && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200">
                    Simulasi Guru
                  </span>
                )}
              </div>
              <h2 className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-100 line-clamp-1">
                {quiz.title} (PIN: {quiz.code})
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {mode !== 'TEST' && (
              <button
                type="button"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer transition-colors"
                title={soundEnabled ? 'Matikan Suara' : 'Aktifkan Suara'}
              >
                {soundEnabled ? <Volume2 className="w-4 h-4 text-teal-600" /> : <VolumeX className="w-4 h-4" />}
              </button>
            )}

            <button
              type="button"
              onClick={onExit}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer transition-colors"
            >
              Keluar
            </button>
          </div>
        </div>

        {/* MODE-SPECIFIC DYNAMIC HUD */}

        {/* 1. CLASSIC MODE HUD: Streak multiplier, Power-Ups Drawer, Points */}
        {mode === 'CLASSIC' && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 font-black text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-3 py-1.5 rounded-xl border border-amber-200 dark:border-amber-800">
                <Flame className="w-4 h-4 fill-amber-500 text-amber-500 animate-pulse" />
                <span>Streak: {currentStreak}x</span>
                {currentStreak >= 3 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-500 text-white">
                    {currentStreak >= 5 ? '1.5x' : currentStreak === 4 ? '1.2x' : '1.1x'} Poin
                  </span>
                )}
              </div>

              <div className="font-black text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 px-3 py-1.5 rounded-xl border border-teal-200 dark:border-teal-800">
                🏆 {totalScore.toLocaleString()} Poin
              </div>
            </div>

            {/* Power-up buttons */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                Power-Ups:
              </span>
              <button
                type="button"
                onClick={() => handleUsePowerUp('DOUBLE_POINTS')}
                disabled={availablePowerUps.DOUBLE_POINTS <= 0}
                className={`px-2 py-1 rounded-lg font-bold text-[11px] flex items-center gap-1 transition-all ${
                  availablePowerUps.DOUBLE_POINTS > 0
                    ? 'bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 hover:scale-105 cursor-pointer'
                    : 'opacity-40 bg-slate-100 dark:bg-slate-800 text-slate-400'
                }`}
                title="2x Skor Soal Ini"
              >
                <span>⚡ 2x</span>
                <span className="text-[9px]">({availablePowerUps.DOUBLE_POINTS})</span>
              </button>

              <button
                type="button"
                onClick={() => handleUsePowerUp('FIFTY_FIFTY')}
                disabled={availablePowerUps.FIFTY_FIFTY <= 0}
                className={`px-2 py-1 rounded-lg font-bold text-[11px] flex items-center gap-1 transition-all ${
                  availablePowerUps.FIFTY_FIFTY > 0
                    ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 hover:scale-105 cursor-pointer'
                    : 'opacity-40 bg-slate-100 dark:bg-slate-800 text-slate-400'
                }`}
                title="Hapus 2 Pilihan Salah"
              >
                <span>🌓 50/50</span>
                <span className="text-[9px]">({availablePowerUps.FIFTY_FIFTY})</span>
              </button>

              <button
                type="button"
                onClick={() => handleUsePowerUp('ERASER')}
                disabled={availablePowerUps.ERASER <= 0}
                className={`px-2 py-1 rounded-lg font-bold text-[11px] flex items-center gap-1 transition-all ${
                  availablePowerUps.ERASER > 0
                    ? 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 hover:scale-105 cursor-pointer'
                    : 'opacity-40 bg-slate-100 dark:bg-slate-800 text-slate-400'
                }`}
                title="Hapus 1 Pilihan Salah"
              >
                <span>🧹 Eraser</span>
                <span className="text-[9px]">({availablePowerUps.ERASER})</span>
              </button>

              <button
                type="button"
                onClick={() => handleUsePowerUp('IMMUNITY')}
                disabled={availablePowerUps.IMMUNITY <= 0}
                className={`px-2 py-1 rounded-lg font-bold text-[11px] flex items-center gap-1 transition-all ${
                  availablePowerUps.IMMUNITY > 0
                    ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 hover:scale-105 cursor-pointer'
                    : 'opacity-40 bg-slate-100 dark:bg-slate-800 text-slate-400'
                }`}
                title="Cegah Penurunan Streak Jika Salah"
              >
                <span>🛡️ Imun</span>
                <span className="text-[9px]">({availablePowerUps.IMMUNITY})</span>
              </button>
            </div>
          </div>
        )}

        {/* 2. MASTERY PEAK MODE HUD: Mountain Climbing Visualizer */}
        {mode === 'MASTERY' && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mountain className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="font-black text-slate-800 dark:text-slate-200">
                  Jalur Pendakian Puncak: {masteryPercentage}% Dikuasai
                </span>
                <span className="text-[10px] text-slate-400">
                  ({masteredCount} dari {quiz.questions.length} Butir Tuntas)
                </span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200">
                Tanpa Batas Waktu
              </span>
            </div>

            {/* Climbing Progress Bar */}
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden relative">
              <div
                className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 transition-all duration-500 rounded-full"
                style={{ width: `${masteryPercentage}%` }}
              />
            </div>
          </div>
        )}

        {/* 3. PLAYGROUND ARCADE HUD: Coins, Energy, Vault Heist & Freeze Sabotage Trigger */}
        {mode === 'PLAYGROUND' && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-3">
              <div className="font-black text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-3 py-1 rounded-xl border border-amber-200 dark:border-amber-800 flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-amber-500" />
                <span>🪙 {arcadeCoins} Koin</span>
              </div>

              <div className="font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-3 py-1 rounded-xl border border-indigo-200 dark:border-indigo-800 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-indigo-500" />
                <span>⚡ Energi: {arcadeEnergy}/5</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowVaultHeistModal(true)}
                className="px-3 py-1 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs flex items-center gap-1 shadow-xs cursor-pointer transition-all"
              >
                <span>🏦 Bobol Brankas</span>
              </button>

              <button
                type="button"
                onClick={handleTriggerScreenFreeze}
                disabled={arcadeEnergy < 1}
                className="px-3 py-1 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 disabled:opacity-40 text-white font-bold text-xs flex items-center gap-1 shadow-xs cursor-pointer transition-all"
                title="Tes Efek Screen Freeze Sabotase"
              >
                <span>❄️ Uji Freeze</span>
              </button>
            </div>
          </div>
        )}

        {/* 4. PROCTORED TEST HUD: Strict Anti-Cheat Indicators */}
        {mode === 'TEST' && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-sky-600" />
              <span className="font-bold text-slate-700 dark:text-slate-300">
                Pengawasan Anti-Cheat Aktif:
              </span>
              <span
                className={`font-mono font-bold px-2 py-0.5 rounded-md ${
                  violationsCount > 0
                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200'
                    : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
                }`}
              >
                {violationsCount} / {maxViolations} Pelanggaran
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500">
                Sisa Waktu: <strong>{formatTimeRemaining(secondsRemaining)}</strong>
              </span>
              {isTeacherTesting && (
                <button
                  type="button"
                  onClick={() => handleTriggerViolation('Simulasi Pelanggaran Guru')}
                  className="text-[10px] font-bold px-2 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900/60 cursor-pointer"
                >
                  Tes Deteksi Tab
                </button>
              )}
            </div>
          </div>
        )}

        {/* 5. TEAM MODE HUD: Race Board with mascot progress */}
        {mode === 'TEAM' && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs">
            <div className="flex items-center justify-between text-xs font-bold">
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                <span>🦅 Tim Garuda (Merah): {teamGarudaScore} Poin</span>
                {myTeam === 'Tim Garuda' && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-rose-100 dark:bg-rose-950">
                    Regu Anda
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                <span>🦅 Tim Rajawali (Biru): {teamRajawaliScore} Poin</span>
                {myTeam === 'Tim Rajawali' && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-blue-100 dark:bg-blue-950">
                    Regu Anda
                  </span>
                )}
              </div>
            </div>

            {/* Duel Race Track */}
            <div className="space-y-1.5">
              <div className="w-full bg-rose-100 dark:bg-rose-950/60 h-2.5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-rose-500 transition-all duration-500 rounded-full"
                  style={{ width: `${Math.min(100, (teamGarudaScore / 10000) * 100)}%` }}
                />
              </div>
              <div className="w-full bg-blue-100 dark:bg-blue-950/60 h-2.5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-500 rounded-full"
                  style={{ width: `${Math.min(100, (teamRajawaliScore / 10000) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        )}

      </div>

      {/* QUESTION GRID NAVIGATION (for PROCTORED TEST MODE) */}
      {mode === 'TEST' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-3 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between gap-2 overflow-x-auto">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">
              Navigasi Soal:
            </span>
            {quiz.questions.map((q, qIdx) => {
              const isAnswered = answers[q.id] !== undefined;
              const isFlagged = flagged[q.id];
              const isCurrent = qIdx === currentIndex;
              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => {
                    setCurrentIndex(qIdx);
                    setShowImmediateFeedback(false);
                  }}
                  className={`w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                    isCurrent
                      ? 'ring-2 ring-sky-500 bg-sky-600 text-white'
                      : isFlagged
                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                      : isAnswered
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {qIdx + 1}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (currentQuestion) {
                  setFlagged((prev) => ({
                    ...prev,
                    [currentQuestion.id]: !prev[currentQuestion.id]
                  }));
                }
              }}
              className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-200 font-bold text-xs border border-amber-200 dark:border-amber-800 flex items-center gap-1 cursor-pointer"
            >
              <Flag className="w-3 h-3" />
              <span>Ragu-ragu</span>
            </button>
          </div>
        </div>
      )}

      {/* QUESTION CARD */}
      {currentQuestion && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-md space-y-5 animate-in fade-in duration-200">
          
          {/* Question Subheader */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold px-2.5 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-200">
                Soal #{mode === 'MASTERY' ? masteryCurrentQueueIndex + 1 : currentIndex + 1}
              </span>
              <span className="text-slate-400">|</span>
              <span className="font-semibold text-slate-500 dark:text-slate-400">
                {currentQuestion.category || 'Umum'}
              </span>
              {currentQuestion.difficultyTag && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {currentQuestion.difficultyTag}
                </span>
              )}
            </div>

            {mode !== 'MASTERY' && (
              <span className="font-bold text-slate-500">
                Total {quiz.questions.length} Soal
              </span>
            )}
          </div>

          {/* Question Text */}
          <h3 className="text-base sm:text-lg font-black text-slate-800 dark:text-slate-100 leading-snug">
            {currentQuestion.text}
          </h3>

          {/* MULTIPLE CHOICE OPTIONS */}
          {currentQuestion.type === 'multiple_choice' && currentQuestion.options && (
            <div className="grid grid-cols-1 gap-2.5 pt-1">
              {currentQuestion.options.map((optText, optIdx) => {
                const isEliminated = eliminatedOptions.includes(optIdx);
                const isSelected = answers[currentQuestion.id] === optIdx;
                const letter = String.fromCharCode(65 + optIdx);

                if (isEliminated) {
                  return (
                    <div
                      key={optIdx}
                      className="p-3.5 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-slate-400 text-xs flex items-center justify-between opacity-50"
                    >
                      <span className="font-mono">{letter}. Pilihan Dieliminasi (50/50)</span>
                    </div>
                  );
                }

                return (
                  <button
                    key={optIdx}
                    type="button"
                    disabled={showImmediateFeedback}
                    onClick={() => handleAnswerQuestion(optIdx)}
                    className={`p-3.5 sm:p-4 rounded-2xl border-2 text-left text-xs sm:text-sm font-semibold transition-all flex items-center gap-3 cursor-pointer disabled:cursor-not-allowed ${
                      isSelected
                        ? 'border-teal-500 bg-teal-50 dark:bg-teal-950/60 text-teal-950 dark:text-teal-100 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 hover:border-teal-300 dark:hover:border-teal-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <span
                      className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                        isSelected
                          ? 'bg-teal-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {letter}
                    </span>
                    <span className="flex-1 leading-snug">{optText}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* SHORT ANSWER INPUT */}
          {currentQuestion.type === 'short_answer' && (
            <div className="pt-2 space-y-3">
              <input
                type="text"
                disabled={showImmediateFeedback}
                placeholder="Ketikkan jawaban singkat Anda di sini..."
                value={(answers[currentQuestion.id] as string) || ''}
                onChange={(e) =>
                  setAnswers((prev) => ({
                    ...prev,
                    [currentQuestion.id]: e.target.value
                  }))
                }
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !showImmediateFeedback) {
                    handleAnswerQuestion((answers[currentQuestion.id] as string) || '');
                  }
                }}
                className="w-full p-3.5 rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm font-medium focus:ring-2 focus:ring-teal-500 outline-none disabled:opacity-60 disabled:cursor-not-allowed"
              />

              <button
                type="button"
                disabled={showImmediateFeedback}
                onClick={() => handleAnswerQuestion((answers[currentQuestion.id] as string) || '')}
                className="px-5 py-2 rounded-2xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold text-xs cursor-pointer disabled:cursor-not-allowed transition-colors"
              >
                Kirim Jawaban Singkat
              </button>
            </div>
          )}

          {/* MATCHING PAIRS */}
          {currentQuestion.type === 'matching' && currentQuestion.matchingPairs && (
            <div className="pt-2 space-y-2">
              <span className="text-xs font-bold text-slate-500">Pasangkan Jawaban yang Tepat:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {currentQuestion.matchingPairs.map((pair, pIdx) => (
                  <div
                    key={pIdx}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1.5"
                  >
                    <span className="font-bold text-slate-800 dark:text-slate-200 block">
                      {pair.left}
                    </span>
                    <select
                      disabled={showImmediateFeedback}
                      value={((answers[currentQuestion.id] as Record<string, string>) || {})[pair.left] || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        const currMap = ((answers[currentQuestion.id] as Record<string, string>) || {}) as Record<string, string>;
                        const updated = { ...currMap, [pair.left]: val };
                        setAnswers((prev) => ({ ...prev, [currentQuestion.id]: updated }));
                      }}
                      className="w-full p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <option value="">-- Pilih Pasangan --</option>
                      {currentQuestion.matchingPairs?.map((item, idx) => (
                        <option key={idx} value={item.right}>
                          {item.right}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  disabled={showImmediateFeedback}
                  onClick={() => handleAnswerQuestion(answers[currentQuestion.id] || {})}
                  className="px-5 py-2 rounded-2xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold text-xs cursor-pointer disabled:cursor-not-allowed transition-colors"
                >
                  Konfirmasi Jawaban Pasangan
                </button>
              </div>
            </div>
          )}

          {/* IMMEDIATE FEEDBACK DRAWER (Classic, Mastery, Playground, Team) */}
          {showImmediateFeedback && mode !== 'TEST' && (
            <div
              className={`p-4 rounded-2xl border text-xs space-y-2 animate-in fade-in zoom-in-95 ${
                lastAnswerCorrect
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200'
                  : 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-700 text-rose-900 dark:text-rose-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-black text-sm">
                  {lastAnswerCorrect ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 fill-emerald-100" />
                      <span>Luar Biasa, Jawaban Anda Benar!</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-5 h-5 text-rose-600 fill-rose-100" />
                      <span>Jawaban Kurang Tepat!</span>
                    </>
                  )}
                </div>

                {lastPointsEarned > 0 && (
                  <span className="font-black px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-xs">
                    +{lastPointsEarned} Poin
                  </span>
                )}
              </div>

              {/* Show explanation so student learns */}
              {currentQuestion.explanation && (
                <p className="text-[11px] leading-relaxed opacity-90">
                  <strong>Pembahasan:</strong> {currentQuestion.explanation}
                </p>
              )}

              {mode === 'MASTERY' && !lastAnswerCorrect && (
                <div className="p-2 rounded-xl bg-white/60 dark:bg-slate-900/60 text-[10px] font-semibold text-slate-700 dark:text-slate-300">
                  🏔️ <em>Soal ini dimasukkan ke antrean perulangan (*re-queue*) dan akan muncul kembali nanti agar Anda menguasainya!</em>
                </div>
              )}

              <div className="pt-1 flex justify-end">
                <button
                  type="button"
                  onClick={handleProceedNext}
                  className="px-5 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 text-white dark:text-slate-900 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
                >
                  <span>Lanjut ke Soal Berikutnya</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* BOTTOM CONTROLS FOR PROCTORED TEST MODE */}
          {mode === 'TEST' && (
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                disabled={currentIndex === 0}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Sebelumnya</span>
              </button>

              {currentIndex + 1 < quiz.questions.length ? (
                <button
                  type="button"
                  onClick={() => setCurrentIndex((i) => i + 1)}
                  className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <span>Selanjutnya</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleFinishSession('Ujian Selesai Dikirim')}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Selesai & Kirim Ujian</span>
                </button>
              )}
            </div>
          )}

        </div>
      )}

      {/* BOTTOM LEADERBOARD SNIPPET (Classic Mode) */}
      {mode === 'CLASSIC' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            <span className="font-bold text-slate-800 dark:text-slate-200">
              Peringkat Sementara Kelas:
            </span>
          </div>

          <div className="flex items-center gap-3 overflow-x-auto">
            {leaderboard.map((p, idx) => (
              <div
                key={p.id}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700"
              >
                <span className="text-[11px]">{p.avatar}</span>
                <span className="font-bold text-slate-700 dark:text-slate-300 text-[11px]">
                  #{idx + 1} {p.name}
                </span>
                <span className="text-[10px] text-teal-600 font-bold">{p.score}</span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
