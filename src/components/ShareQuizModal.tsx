import React, { useState } from 'react';
import { X, Copy, Check, Share2, Play, ExternalLink, QrCode, Sparkles, Send } from 'lucide-react';
import { Quiz } from '../types/quiz.js';

interface Props {
  quiz: Quiz;
  onClose: () => void;
  onPlay: (quiz: Quiz) => void;
}

export const ShareQuizModal: React.FC<Props> = ({ quiz, onClose, onPlay }) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedWhatsapp, setCopiedWhatsapp] = useState(false);

  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}?exam=${quiz.code}`
    : `https://awanglongquiz.app?exam=${quiz.code}`;

  const shareText = `Halo siswa! Silakan kerjakan tugas kuis online "${quiz.title}".\n\n📌 Alur Ujian Siswa:\n1. Sesi 1: Masukkan data diri (Nama Lengkap, Kelas, Nomor Absen/NIS)\n2. Sesi 2: Pengerjaan soal interaktif (1 soal per halaman dengan navigasi nomor soal & tombol submit)\n\n🔗 Link Tugas Siswa: ${shareUrl}\natau masukkan Kode PIN Kuis: ${quiz.code}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(quiz.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyWhatsapp = () => {
    navigator.clipboard.writeText(shareText);
    setCopiedWhatsapp(true);
    setTimeout(() => setCopiedWhatsapp(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full p-4 sm:p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 space-y-4 sm:space-y-6 my-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-teal-500 to-cyan-500 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
              <Share2 className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-sm sm:text-base text-slate-800 leading-snug">
                Link & Halaman Ujian Siswa
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500">
                Otomatis disiapkan untuk Sesi 1 (Data Diri) & Sesi 2 (Pengerjaan Soal)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 sm:p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Big PIN Code Box (Classroom Display) */}
        <div className="p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-teal-50 via-cyan-50 to-emerald-50 border-2 border-teal-200 text-center space-y-2.5 sm:space-y-3 shadow-inner">
          <div className="flex items-center justify-center gap-1.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-teal-800">
            <Sparkles className="w-3.5 h-3.5 text-teal-600" />
            <span>Kode PIN Ujian Siswa</span>
          </div>
          <div className="text-3xl sm:text-5xl font-black font-mono tracking-widest text-teal-900 bg-white/90 py-2 sm:py-3 px-4 sm:px-6 rounded-xl sm:rounded-2xl inline-block shadow-sm border border-teal-200">
            {quiz.code}
          </div>
          <div className="flex items-center justify-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleCopyCode}
              className="px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copiedCode ? 'PIN Disalin!' : 'Salin Kode PIN'}</span>
            </button>
          </div>
        </div>

        {/* Quiz Info Brief */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-800 text-sm truncate">{quiz.title}</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-teal-100 text-teal-800">
              {quiz.subject}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-slate-500 text-[11px]">
            <span>📝 {quiz.questions.length} Butir Soal</span>
            <span>•</span>
            <span>⏱️ {quiz.durationMinutes > 0 ? `${quiz.durationMinutes} Menit` : 'Tanpa Batas Waktu'}</span>
            <span>•</span>
            <span>🎯 KKM Kelulusan: {quiz.passingGrade}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-teal-50/70 border border-teal-100 text-[11px] text-teal-800 space-y-1">
            <div className="font-bold flex items-center gap-1">
              <span>✨ Alur Pengerjaan Siswa:</span>
            </div>
            <p className="text-teal-900/90 leading-relaxed">
              • <strong>Sesi 1:</strong> Siswa mengisi Nama, No. Absen/NIS, dan Kelas.<br />
              • <strong>Sesi 2:</strong> Hanya menampilkan <strong>1 soal per halaman</strong> dengan nomor soal klikable & tombol submit di akhir saat siswa merasa yakin.
            </p>
          </div>
        </div>

        {/* Share Direct Link */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
            <span>Tautan Langsung Pengerjaan Siswa:</span>
            <span className="text-[11px] font-normal text-teal-600">Otomatis langsung ke Sesi 1</span>
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="flex-1 text-xs p-3 rounded-xl border border-slate-300 bg-slate-50 text-slate-700 font-mono select-all focus:outline-none"
            />
            <button
              type="button"
              onClick={handleCopyLink}
              className="px-4 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs shrink-0"
              title="Salin Tautan Langsung"
            >
              {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copiedLink ? 'Tersalin!' : 'Salin Link'}</span>
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row items-center gap-2.5">
          <button
            type="button"
            onClick={handleCopyWhatsapp}
            className="w-full sm:flex-1 py-3 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs border border-emerald-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {copiedWhatsapp ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
            <span>{copiedWhatsapp ? 'Format Pesan Disalin!' : 'Salin Pesan WhatsApp Kelas'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onPlay(quiz);
            }}
            className="w-full sm:flex-1 py-3 rounded-2xl bg-gradient-to-r from-teal-500 via-cyan-500 to-sky-500 hover:from-teal-600 hover:to-sky-600 text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Play className="w-4 h-4" />
            <span>Buka Halaman Siswa Sekarang</span>
          </button>
        </div>

      </div>
    </div>
  );
};
