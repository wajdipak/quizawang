import React, { useState, useRef } from 'react';
import {
  Upload,
  FileText,
  FileCheck,
  X,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  FileType,
  ArrowRight,
  Sliders,
  Check
} from 'lucide-react';
import { Quiz, Question, QuestionType } from '../types/quiz.js';
import { generateQuizCode } from '../utils/quizLogic.js';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onQuizExtracted: (quiz: Quiz) => void;
  existingCodes: string[];
}

function adjustPointsTo100(questions: Question[]): Question[] {
  if (!questions || questions.length === 0) return [];
  const n = questions.length;
  const currentTotal = questions.reduce((sum, q) => sum + (Number(q.points) || 0), 0);

  if (currentTotal === 100) return questions;

  if (currentTotal > 0) {
    let allocated = 0;
    const result = questions.map((q) => {
      const orig = Number(q.points) || 1;
      const pts = Math.max(1, Math.round((orig / currentTotal) * 100));
      allocated += pts;
      return { ...q, points: pts };
    });

    const diff = 100 - allocated;
    if (diff !== 0 && result.length > 0) {
      result[result.length - 1].points = Math.max(1, result[result.length - 1].points + diff);
    }
    return result;
  }

  const basePoint = Math.floor(100 / n);
  const remainder = 100 - basePoint * n;
  return questions.map((q, idx) => ({
    ...q,
    points: basePoint + (idx < remainder ? 1 : 0)
  }));
}

export const FileUploadExtractorModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onQuizExtracted,
  existingCodes
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string>('');
  const [textContent, setTextContent] = useState<string>('');
  const [extractionMode, setExtractionMode] = useState<'unlimited' | 'custom'>('unlimited');
  const [targetCount, setTargetCount] = useState(10);
  const [targetCountInput, setTargetCountInput] = useState('10');

  const handleTargetCountChange = (val: string) => {
    setTargetCountInput(val);
    const num = parseInt(val, 10);
    if (!isNaN(num) && num > 0) {
      setTargetCount(num);
    }
  };

  const handleTargetPreset = (preset: number) => {
    setTargetCount(preset);
    setTargetCountInput(preset.toString());
  };

  const handleTargetStep = (delta: number) => {
    const next = Math.max((targetCount || 1) + delta, 1);
    setTargetCount(next);
    setTargetCountInput(next.toString());
  };
  const [preferredType, setPreferredType] = useState('campuran');
  const [gradeLevel, setGradeLevel] = useState('SMP');
  const [additionalNote, setAdditionalNote] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [statusStep, setStatusStep] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [extractedQuiz, setExtractedQuiz] = useState<Quiz | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    processFile(file);
  };

  const processFile = (file: File) => {
    setSelectedFile(file);
    setErrorMessage(null);
    setExtractedQuiz(null);

    const reader = new FileReader();

    if (file.type === 'text/plain') {
      reader.onload = () => {
        setTextContent(reader.result as string);
        setFileBase64('');
      };
      reader.readAsText(file);
    } else {
      // For PDF, images, etc.
      reader.onload = () => {
        setFileBase64(reader.result as string);
        setTextContent('');
      };
      reader.readAsDataURL(file);
    }
  };

  // Provide a realistic sample file for quick demonstration
  const handleLoadSampleDocument = () => {
    const sampleText = `MODUL AJAR SEJARAH & BIOLOGI KUTAI KARTANEGARA
Mata Pelajaran: Ilmu Pengetahuan Sosial & Sains
Tingkat: SMP Kelas VIII

BAB I: PERJUANGAN PANGLIMA AWANG LONG (1844)
Awang Long adalah seorang panglima perang yang gagah berani bergelar Senapati Sakti dari Kesultanan Kutai Kartanegara ing Martadipura.
Pada pertengahan abad ke-19, armada kompeni Belanda yang dipimpin oleh Kapten T.C. Bruijn berusaha menduduki wilayah Tenggarong melalui perairan Sungai Mahakam.
Panglima Awang Long bersama ribuan laskar rakyat Kutai membangun benteng pertahanan kuat di tepi Sungai Mahakam dan bertempur habis-habisan demi mempertahankan kehormatan tanah air.
Beliau gugur sebagai pahlawan bangsa dalam peristiwa bersejarah tahun 1844.

BAB II: STRATEGI PERTAHANAN & KEARIFAN LOKAL
Masyarakat Kutai memanfaatkan perahu dayung lincah dan benteng rakit bambu berduri untuk menghalau kapal-kapal meriam kompeni di perairan dangkal Sungai Mahakam.
Semangat pantang menyerah rakyat Kutai menjadi bukti nyata bahwa persatuan dan cinta tanah air mampu menghadang persenjataan modern penjajah.

LATIHAN SOAL EVALUASI:
1. Siapakah pemimpin pasukan rakyat Kutai dalam pertempuran di Sungai Mahakam tahun 1844? (Panglima Awang Long)
2. Apa gelar kehormatan sakti yang disandang oleh Awang Long atas ketangkasannya? (Senapati Sakti)
3. Kapal kompeni Belanda yang memimpin agresi di perairan Tenggarong dipimpin oleh perwira bernama? (Kapten T.C. Bruijn)
4. Nama kerajaan Kesultanan bersejarah tempat Panglima Awang Long berjuang mengabdi adalah? (Kesultanan Kutai Kartanegara ing Martadipura)
5. Strategi apa yang digunakan laskar rakyat untuk menghalau kapal meriam di muara sungai? (Rakit bambu berduri dan perangkap perairan dangkal)
6. Nilai luhur apa yang dapat diteladani generasi penerus dari perjuangan Panglima Awang Long? (Patriotisme, ketabahan, dan cinta tanah air)
7. Di kota manakah pusat Kesultanan Kutai Kartanegara berada pada masa perlawanan Awang Long? (Tenggarong)
8. Mengapa semangat persatuan menjadi kunci utama pertahanan rakyat Nusantara? (Karena persatuan melipatgandakan kekuatan melawan penjajah)`;

    const blob = new Blob([sampleText], { type: 'text/plain' });
    const sampleFile = new File([blob], 'Modul_Ajar_Sejarah_Pahlawan_Awang_Long.txt', { type: 'text/plain' });
    processFile(sampleFile);
  };

  const handleExtract = async () => {
    if (!selectedFile) {
      setErrorMessage('Silakan pilih atau unggah file dokumen/gambar terlebih dahulu.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setStatusStep(
      extractionMode === 'unlimited'
        ? 'Mengekstrak seluruh soal dalam file tanpa batasan dengan Gemini 3.8 Flash...'
        : `Mengekstrak ${targetCount} butir soal dari dokumen dengan Gemini 3.8 Flash...`
    );

    try {
      const response = await fetch('/api/extract-quiz-from-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base64Data: fileBase64,
          textContent,
          mimeType: selectedFile.type || 'text/plain',
          fileName: selectedFile.name,
          targetCount: extractionMode === 'unlimited' ? 0 : targetCount,
          isUnlimited: extractionMode === 'unlimited',
          preferredType,
          gradeLevel,
          additionalNote
        })
      });

      if (!response.ok) {
        let errMessage = `Server returned status: ${response.status}`;
        try {
          const errData = await response.json();
          if (errData?.error || errData?.message) {
            errMessage = errData.error || errData.message;
          }
        } catch {
          // ignore json parse error
        }
        throw new Error(errMessage);
      }

      setStatusStep('Menyusun format kuis multi-tipe dan kategori...');
      const data = await response.json();

      const newCode = generateQuizCode(existingCodes);
      const quiz: Quiz = {
        id: `quiz-extracted-${Date.now()}`,
        code: newCode,
        title: data.title || `Kuis dari File ${selectedFile.name.replace(/\.[^/.]+$/, '')}`,
        description: data.description || `Kuis hasil ekstraksi cerdas AI dari file ${selectedFile.name}.`,
        subject: data.subject || 'Materi Dokumen',
        gradeLevel,
        durationMinutes: 10,
        passingGrade: 75,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'Guru (AI Document Extractor)',
        isActive: true,
        categories: data.categories && data.categories.length > 0 ? data.categories : ['Hasil Ekstraksi'],
        materialContent: data.materialContent || textContent || `Bahan bacaan dan materi ringkasan dari dokumen ${selectedFile.name}.`,
        questions: adjustPointsTo100(
          (data.questions || []).map((q: any, idx: number) => ({
            id: q.id || `q-ext-${idx + 1}`,
            type: q.type || (idx % 3 === 0 ? 'multiple_choice' : idx % 3 === 1 ? 'short_answer' : 'matching'),
            category: q.category || 'Materi Dokumen',
            points: q.points || 20,
            text: q.text,
            options: q.options || (q.type === 'multiple_choice' ? ['A', 'B', 'C', 'D'] : undefined),
            correctOption: typeof q.correctOption === 'number' ? q.correctOption : 0,
            acceptedAnswers: q.acceptedAnswers,
            matchingPairs: q.matchingPairs,
            explanation: q.explanation || 'Pembahasan materi dari dokumen.'
          }))
        )
      };

      setExtractedQuiz(quiz);
      setStatusStep('Ekstraksi berhasil!');
    } catch (err: any) {
      console.error('Extraction error:', err);
      setErrorMessage(
        err?.message?.includes('503') || err?.message?.includes('high demand')
          ? 'Server model AI sedang mengalami lonjakan trafik (503). Sistem telah mencoba kembali, silakan coba klik Ekstrak sekali lagi.'
          : 'Terjadi kendala saat mengekstrak soal dari file. Silakan periksa ukuran file dan coba kembali.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyQuiz = () => {
    if (!extractedQuiz) return;
    onQuizExtracted(extractedQuiz);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 md:p-6 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl max-w-2xl w-full max-h-[94vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 my-auto transition-colors">
        
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-cyan-400 to-teal-500 text-white flex items-center justify-center font-bold text-base sm:text-lg shadow-sm shrink-0">
              📄
            </div>
            <div>
              <h2 className="font-bold text-base sm:text-lg text-slate-800 dark:text-slate-100 flex items-center gap-1.5 leading-snug">
                <span>Ekstrak Soal dari File (AI Gemini)</span>
                <span className="text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300 font-bold shrink-0">
                  Dokumen ➔ Kuis
                </span>
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
                Unggah file dokumen soal, modul ajar, atau foto lembar ujian (PDF, TXT, Gambar).
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-3.5 sm:p-6 space-y-4 sm:space-y-6 flex-1">
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {!extractedQuiz ? (
            <>
              {/* File Upload Zone */}
              <div className="space-y-3">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".pdf,.txt,.png,.jpg,.jpeg,.webp,.doc,.docx"
                  className="hidden"
                />

                {!selectedFile ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-teal-300 dark:border-teal-700/80 hover:border-teal-500 dark:hover:border-teal-500 bg-teal-50/30 dark:bg-slate-800/50 hover:bg-teal-50/60 dark:hover:bg-slate-800/80 rounded-3xl p-8 text-center cursor-pointer transition-all space-y-3"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-900 shadow-xs text-teal-600 dark:text-teal-400 flex items-center justify-center mx-auto text-2xl border border-teal-100 dark:border-teal-800">
                      <Upload className="w-7 h-7" />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-slate-800 dark:text-slate-100">
                        Klik untuk Memilih File atau Tarik File ke Sini
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Mendukung dokumen <strong>PDF</strong>, teks <strong>TXT</strong>, serta foto lembar soal <strong>PNG/JPG</strong>
                      </p>
                    </div>
                    <span className="inline-block text-[11px] text-teal-700 dark:text-teal-300 font-semibold px-3 py-1 rounded-full bg-white dark:bg-slate-900 border border-teal-200 dark:border-teal-800 shadow-xs">
                      Maksimal 25MB
                    </span>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-teal-50 dark:bg-slate-800/70 border border-teal-200 dark:border-slate-700 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 flex items-center justify-center border border-teal-200 dark:border-teal-800 font-bold">
                        <FileCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div className="space-y-0.5">
                        <span className="font-bold text-xs text-slate-800 dark:text-slate-100 block truncate max-w-xs sm:max-w-md">
                          {selectedFile.name}
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                          {(selectedFile.size / 1024).toFixed(1)} KB • {selectedFile.type || 'Dokumen'}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFile(null);
                        setFileBase64('');
                        setTextContent('');
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-white dark:hover:bg-slate-800 transition-colors"
                      title="Ganti file"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Quick Sample File Button */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-slate-400 dark:text-slate-500">Belum punya file contoh?</span>
                  <button
                    type="button"
                    onClick={handleLoadSampleDocument}
                    className="text-teal-700 dark:text-teal-400 hover:text-teal-900 dark:hover:text-teal-300 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <span>💡 Gunakan Contoh Modul Awang Long (.txt)</span>
                  </button>
                </div>
              </div>

              {/* Extraction Parameters */}
              <div className="bg-slate-50 dark:bg-slate-800/70 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 space-y-4 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
                    Mode & Pengaturan Ekstraksi AI:
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                    {extractionMode === 'unlimited' ? '✨ Mode Tanpa Batasan Aktif' : `🎯 Target: ${targetCount} Soal`}
                  </span>
                </div>

                {/* Mode Selector: Unlimited vs Custom */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setExtractionMode('unlimited')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                      extractionMode === 'unlimited'
                        ? 'bg-white dark:bg-slate-900 border-teal-500 dark:border-teal-400 ring-2 ring-teal-400/30 text-teal-950 dark:text-teal-100 shadow-xs'
                        : 'bg-white/60 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 font-bold text-base ${
                      extractionMode === 'unlimited' ? 'bg-teal-600 text-white shadow-xs' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                    }`}>
                      ∞
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-slate-900 dark:text-slate-100">Semua Soal dalam File</span>
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          Bebas Limit
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug mt-0.5">
                        Ekstrak 100% seluruh butir soal yang ada di lembar/dokumen secara lengkap tanpa batasan.
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setExtractionMode('custom')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                      extractionMode === 'custom'
                        ? 'bg-white dark:bg-slate-900 border-teal-500 dark:border-teal-400 ring-2 ring-teal-400/30 text-teal-950 dark:text-teal-100 shadow-xs'
                        : 'bg-white/60 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 font-bold text-base ${
                      extractionMode === 'custom' ? 'bg-teal-600 text-white shadow-xs' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                    }`}>
                      #
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-slate-900 dark:text-slate-100">Tentukan Jumlah Bebas</span>
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                          Ketik Angka
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug mt-0.5">
                        Tentukan target jumlah (bisa 10, 25, 50, 100+ butir soal) sesuai kebutuhan materi.
                      </p>
                    </div>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                  {/* Question count input if custom mode */}
                  {extractionMode === 'custom' ? (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label htmlFor="file-target-count-input" className="font-semibold text-slate-700 dark:text-slate-300">
                          Target Soal:
                        </label>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                          {targetCount} Soal
                        </span>
                      </div>

                      {/* Stepper + Direct Typing Input (No 50 cap) */}
                      <div className="flex items-center border border-teal-300 dark:border-teal-700 focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-200 rounded-xl bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
                        <button
                          type="button"
                          onClick={() => handleTargetStep(-1)}
                          disabled={targetCount <= 1}
                          className="px-2.5 py-1.5 text-slate-500 dark:text-slate-400 hover:text-teal-700 dark:hover:text-teal-300 hover:bg-teal-50 dark:hover:bg-slate-800 disabled:opacity-40 font-bold border-r border-slate-200 dark:border-slate-700 cursor-pointer"
                          title="Kurangi 1"
                        >
                          -
                        </button>
                        <input
                          id="file-target-count-input"
                          type="number"
                          min={1}
                          value={targetCountInput}
                          onChange={(e) => handleTargetCountChange(e.target.value)}
                          onBlur={() => {
                            if (!targetCountInput || isNaN(Number(targetCountInput)) || Number(targetCountInput) < 1) {
                              setTargetCountInput('10');
                              setTargetCount(10);
                            } else {
                              const val = Math.max(Number(targetCountInput), 1);
                              setTargetCountInput(val.toString());
                              setTargetCount(val);
                            }
                          }}
                          placeholder="Ketik angka..."
                          className="w-full text-center py-1.5 px-1 font-bold text-slate-800 dark:text-slate-100 bg-transparent outline-none text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => handleTargetStep(1)}
                          className="px-2.5 py-1.5 text-slate-500 dark:text-slate-400 hover:text-teal-700 dark:hover:text-teal-300 hover:bg-teal-50 dark:hover:bg-slate-800 font-bold border-l border-slate-200 dark:border-slate-700 cursor-pointer"
                          title="Tambah 1"
                        >
                          +
                        </button>
                      </div>

                      {/* Quick Presets */}
                      <div className="flex items-center flex-wrap gap-1 pt-0.5">
                        {[5, 10, 15, 20, 30, 50, 100].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => handleTargetPreset(preset)}
                            className={`text-[10px] px-1.5 py-0.5 rounded-md border font-semibold cursor-pointer transition-all ${
                              targetCount === preset
                                ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-teal-300'
                            }`}
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-teal-50/80 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-teal-900 dark:text-teal-200 flex flex-col justify-center gap-1">
                      <span className="font-bold text-[11px] flex items-center gap-1">
                        <span>✨ Mode Otomatis</span>
                      </span>
                      <p className="text-[10px] text-teal-800 dark:text-teal-300 leading-snug">
                        AI akan memindai dan mengekstrak semua soal yang ditemukan dalam dokumen tanpa batasan maksimal.
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                      Preferensi Tipe Soal:
                    </label>
                    <select
                      value={preferredType}
                      onChange={(e) => setPreferredType(e.target.value)}
                      className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none"
                    >
                      <option value="campuran">Campuran (PG, Isian, Jodoh)</option>
                      <option value="multiple_choice">Pilihan Ganda Saja</option>
                      <option value="short_answer">Isian Singkat Saja</option>
                      <option value="matching">Menjodohkan Saja</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                      Target Jenjang:
                    </label>
                    <select
                      value={gradeLevel}
                      onChange={(e) => setGradeLevel(e.target.value)}
                      className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none"
                    >
                      <option value="SD">SD / MI</option>
                      <option value="SMP">SMP / MTs</option>
                      <option value="SMA">SMA / SMK</option>
                      <option value="Umum">Umum</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Loading State during AI processing */}
              {isLoading && (
                <div className="p-6 rounded-2xl bg-teal-50 dark:bg-slate-800/80 border border-teal-200 dark:border-slate-700 text-center space-y-3">
                  <div className="relative flex items-center justify-center w-20 h-20 mx-auto">
                    <div className="absolute inset-0 rounded-2xl bg-teal-500/20 dark:bg-teal-400/10 animate-ping" />
                    <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-tr from-teal-600 via-cyan-500 to-indigo-600 p-[2px] shadow-lg">
                      <div className="w-full h-full rounded-[14px] bg-white dark:bg-slate-900 flex items-center justify-center text-teal-600 dark:text-teal-400">
                        <Sparkles className="w-8 h-8 animate-spin-slow text-teal-500" />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="font-bold text-sm text-teal-900 dark:text-teal-200 block">
                      AI Sedang Memproses Dokumen Anda...
                    </span>
                    <p className="text-xs text-teal-700 dark:text-teal-300">{statusStep}</p>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Result Preview of Extracted Quiz */
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-950/70 dark:to-emerald-950/60 border border-teal-200 dark:border-teal-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-200 dark:bg-teal-900 text-teal-800 dark:text-teal-200">
                    Ekstraksi Berhasil ✨
                  </span>
                  <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 px-2 py-0.5 rounded-md border border-teal-200 dark:border-teal-800">
                    PIN: {extractedQuiz.code}
                  </span>
                </div>

                <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">{extractedQuiz.title}</h3>
                <p className="text-xs text-slate-600 dark:text-slate-300">{extractedQuiz.description}</p>

                <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="bg-white dark:bg-slate-900 px-2 py-0.5 rounded-md border border-teal-200 dark:border-teal-800 font-semibold text-teal-800 dark:text-teal-200">
                    📝 {extractedQuiz.questions.length} Soal
                  </span>
                  {extractedQuiz.categories?.map((cat) => (
                    <span key={cat} className="bg-white dark:bg-slate-900 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                      🏷️ {cat}
                    </span>
                  ))}
                </div>
              </div>

              {/* List of extracted questions */}
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  Daftar Soal yang Terdeteksi:
                </span>

                {extractedQuiz.questions.map((q, qIdx) => (
                  <div key={q.id || qIdx} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-xs space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-md bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 font-bold text-[10px] flex items-center justify-center shrink-0">
                          {qIdx + 1}
                        </span>
                        <span className="font-bold text-slate-800 dark:text-slate-100 leading-snug">{q.text}</span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 shrink-0">
                        {q.type === 'multiple_choice' ? 'Pilihan Ganda' : q.type === 'short_answer' ? 'Isian Singkat' : 'Menjodohkan'}
                      </span>
                    </div>

                    {q.type === 'multiple_choice' && (
                      <div className="grid grid-cols-2 gap-1 pl-7 text-[11px]">
                        {(q.options || []).map((opt, oIdx) => (
                          <div
                            key={oIdx}
                            className={`p-1.5 rounded-lg truncate ${
                              oIdx === q.correctOption ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-200 font-bold border border-emerald-200 dark:border-emerald-700' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            {String.fromCharCode(65 + oIdx)}. {opt}
                          </div>
                        ))}
                      </div>
                    )}

                    {q.type === 'short_answer' && (
                      <div className="pl-7 text-[11px] text-slate-600 dark:text-slate-300">
                        Kunci: <strong className="text-emerald-800 dark:text-emerald-300">{(q.acceptedAnswers || []).join(' / ')}</strong>
                      </div>
                    )}

                    {q.type === 'matching' && (
                      <div className="pl-7 space-y-0.5 text-[11px]">
                        {(q.matchingPairs || []).map((p, pIdx) => (
                          <div key={pIdx} className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                            <span>{p.left}</span>
                            <span className="text-slate-400">➔</span>
                            <strong className="text-indigo-800 dark:text-indigo-300">{p.right}</strong>
                          </div>
                        ))}
                      </div>
                    )}

                    {q.explanation && (
                      <p className="pl-7 text-[11px] text-slate-500 dark:text-slate-400 italic">
                        💡 {q.explanation}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3 transition-colors">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Batal
          </button>

          {!extractedQuiz ? (
            <button
              type="button"
              onClick={handleExtract}
              disabled={isLoading || !selectedFile}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Mengekstrak Soal...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Ekstrak Soal dengan AI</span>
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleApplyQuiz}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Simpan ke Kuis Saya</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
