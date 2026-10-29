import React, { useState, useEffect } from 'react';
import {
  Play,
  Share2,
  Copy,
  Check,
  Users,
  Clock,
  Shield,
  Zap,
  Sparkles,
  X,
  AlertCircle,
  Calendar,
  Radio,
  CheckCircle2
} from 'lucide-react';
import { Quiz, QuizSession, QuizSessionSettings, StudentSubmission } from '../types/quiz.js';
import { saveQuizSessionToFirebase } from '../services/firebaseSync.js';

interface Props {
  quiz: Quiz;
  session: QuizSession;
  submissions: StudentSubmission[];
  isOpen: boolean;
  onClose: () => void;
  onStartTeacherEngine: (quiz: Quiz, settings: QuizSessionSettings) => void;
}

export const TeacherLiveSessionModal: React.FC<Props> = ({
  quiz,
  session,
  submissions,
  isOpen,
  onClose,
  onStartTeacherEngine
}) => {
  const [currentSession, setCurrentSession] = useState<QuizSession>(session);
  const [copiedPin, setCopiedPin] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [scheduledTime, setScheduledTime] = useState<string>(
    session.scheduledStartTime ? session.scheduledStartTime.slice(0, 16) : ''
  );
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    setCurrentSession(session);
  }, [session]);

  if (!isOpen) return null;

  const handleCopyPin = () => {
    navigator.clipboard.writeText(currentSession.code);
    setCopiedPin(true);
    setTimeout(() => setCopiedPin(false), 2000);
  };

  const handleCopyLink = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://awanglongquiz.app';
    const link = `${origin}/?exam=${currentSession.code}&mode=${currentSession.gameMode.toLowerCase()}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleToggleExamStarted = async (started: boolean) => {
    setIsUpdating(true);
    const updated: QuizSession = {
      ...currentSession,
      isExamStarted: started
    };
    setCurrentSession(updated);
    await saveQuizSessionToFirebase(updated);
    setIsUpdating(false);
  };

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    const updated: QuizSession = {
      ...currentSession,
      scheduledStartTime: scheduledTime ? new Date(scheduledTime).toISOString() : null
    };
    setCurrentSession(updated);
    await saveQuizSessionToFirebase(updated);
    setIsUpdating(false);
    alert('Jadwal mulai kuis berhasil disimpan!');
  };

  // Filter submissions for this specific session or quiz code
  const sessionSubmissions = submissions.filter(
    (s) => s.quizId === quiz.id || s.quizCode.toUpperCase() === currentSession.code.toUpperCase()
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-3xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col my-auto max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 sm:p-6 bg-gradient-to-r from-teal-600 via-cyan-600 to-indigo-700 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-xl shadow-inner font-black">
              🎯
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/20 text-white border border-white/20">
                  {currentSession.gameMode} Session Control
                </span>
                <span className="text-[10px] sm:text-xs font-mono font-black px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-900 animate-pulse">
                  PIN BARU: {currentSession.code}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black tracking-tight leading-snug mt-0.5">
                Ruang Kontrol Guru: {quiz.title}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            title="Tutup Ruang Kontrol"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-slate-800 dark:text-slate-100">
          
          {/* PIN & Direct Link Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-teal-50 via-cyan-50 to-sky-50 dark:from-teal-950/60 dark:via-cyan-950/40 dark:to-slate-900 border border-teal-200 dark:border-teal-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="space-y-1 text-center sm:text-left">
              <span className="text-xs font-bold text-teal-900 dark:text-teal-200 block">
                PIN Kuis & Link Pengerjaan Siswa (Dibuat Ulang Otomatis)
              </span>
              <p className="text-[11px] text-slate-600 dark:text-slate-300">
                Siswa memasukkan PIN <strong>{currentSession.code}</strong> atau klik link untuk bergabung ke ruang ujian secara real-time.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleCopyPin}
                className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 font-mono font-bold text-xs border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <span>PIN: {currentSession.code}</span>
                {copiedPin ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              </button>

              <button
                type="button"
                onClick={handleCopyLink}
                className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <span>{copiedLink ? 'Link Disalin!' : 'Salin Link Siswa'}</span>
                <Share2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Real-time Exam Start Status & Teacher Gate */}
          <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${
            currentSession.isExamStarted
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700'
              : 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700'
          }`}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-white text-base shadow-sm ${
                  currentSession.isExamStarted ? 'bg-emerald-600' : 'bg-amber-500'
                }`}>
                  {currentSession.isExamStarted ? '🟢' : '⏳'}
                </div>
                <div>
                  <h4 className="font-black text-sm sm:text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <span>Status Sesi Ujian:</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      currentSession.isExamStarted ? 'bg-emerald-200 text-emerald-900' : 'bg-amber-200 text-amber-900'
                    }`}>
                      {currentSession.isExamStarted ? 'Ujian Telah Dimulai (Live)' : 'Menunggu / Belum Dimulai'}
                    </span>
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                    {currentSession.isExamStarted
                      ? 'Siswa di ruang tunggu dapat langsung mengerjakan soal saat ini.'
                      : 'Siswa yang memasukkan PIN saat ini berada di ruang tunggu (Waiting Room) secara real-time.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                {currentSession.isExamStarted ? (
                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={() => handleToggleExamStarted(false)}
                    className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
                  >
                    Tunda / Hentikan Ujian
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={() => handleToggleExamStarted(true)}
                    className="flex-1 sm:flex-none px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-xs shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer animate-bounce"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Mulai Ujian Sekarang (Real-Time)</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Schedule Start Time Form */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-3">
            <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-teal-600" />
              <span>Atur Jadwal Mulai Otomatis (Opsional):</span>
            </h5>
            <form onSubmit={handleSaveSchedule} className="flex flex-col sm:flex-row items-center gap-2.5">
              <input
                type="datetime-local"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="flex-1 w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none"
              />
              <button
                type="submit"
                disabled={isUpdating}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition-colors cursor-pointer"
              >
                Simpan Jadwal
              </button>
            </form>
          </div>

          {/* Real-time Connected Students / Waiting Room Info */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-teal-600" />
                <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  Daftar Siswa Masuk ({currentSession.connectedStudents?.length || 0})
                </h5>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">Real-Time Sync Active</span>
            </div>

            {!currentSession.connectedStudents || currentSession.connectedStudents.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                Belum ada siswa yang masuk ke sesi PIN {currentSession.code}.
              </div>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                {currentSession.connectedStudents.map((student, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{student.name}</span>
                      <span className="text-[10px] text-slate-500 ml-2">({student.class} • No. {student.nis})</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  Daftar Siswa Mengumpulkan ({sessionSubmissions.length})
                </h5>
              </div>
            </div>

            {sessionSubmissions.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                Belum ada siswa yang mengirimkan jawaban.
              </div>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                {sessionSubmissions.map((sub) => (
                  <div key={sub.id} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{sub.studentName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                        sub.isPassed ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        Skor: {sub.score}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={() => onStartTeacherEngine(quiz, currentSession.settings)}
            className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Radio className="w-3.5 h-3.5 text-teal-600" />
            <span>Uji Coba Engine sebagai Guru</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            Selesai / Tutup Ruang Kontrol
          </button>
        </div>

      </div>
    </div>
  );
};
