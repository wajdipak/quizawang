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
import { PesutMahakamMascot } from './PesutMahakamMascot.js';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onQuizExtracted: (quiz: Quiz) => void;
  existingCodes: string[];
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

BAB II: SATWA ENDEMIK & EKOSISTEM SUNGAI MAHAKAM
Sungai Mahakam adalah habitat alami bagi Pesut Mahakam (Orcaella brevirostris), salah satu mamalia air tawar langka di dunia.
Sebagai mamalia akuatik, Pesut Mahakam bernapas dengan paru-paru sehingga harus secara berkala muncul ke permukaan air untuk bernapas.
Keberadaan pesut menjadi indikator penting kelestarian dan kebersihan ekosistem perairan sungai dari polusi limbah plastik dan zat kimia.

LATIHAN SOAL EVALUASI:
1. Siapakah pemimpin pasukan rakyat Kutai dalam pertempuran di Sungai Mahakam tahun 1844? (Panglima Awang Long)
2. Organ pernapasan yang digunakan oleh Pesut Mahakam untuk mengambil oksigen adalah? (Paru-paru)
3. Apa gelar kehormatan sakti yang disandang oleh Awang Long? (Senapati Sakti)
4. Kapal kompeni Belanda yang memimpin agresi di perairan Tenggarong dipimpin oleh perwira bernama? (Kapten T.C. Bruijn)
5. Apa peran ekologis lumba-lumba air tawar Pesut Mahakam bagi perairan sungai? (Indikator kebersihan ekosistem)
6. Nama kerajaan Kesultanan bersejarah di wilayah Sungai Mahakam tempat Awang Long berjuang adalah? (Kesultanan Kutai Kartanegara ing Martadipura)
7. Apa ancaman utama terhadap kelestarian Pesut Mahakam di era modern? (Pencemaran limbah dan jaring tangkap)
8. Nilai luhur apa yang dapat diteladani generasi muda dari perjuangan Panglima Awang Long? (Patriotisme dan pengorbanan membela tanah air)`;

    const blob = new Blob([sampleText], { type: 'text/plain' });
    const sampleFile = new File([blob], 'Modul_Ajar_Sejarah_Awang_Long_dan_Mahakam.txt', { type: 'text/plain' });
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
        throw new Error(`Server returned status: ${response.status}`);
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
        questions: (data.questions || []).map((q: any, idx: number) => ({
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
      };

      setExtractedQuiz(quiz);
      setStatusStep('Ekstraksi berhasil!');
    } catch (err: any) {
      console.error('Extraction error:', err);
      setErrorMessage('Terjadi kendala saat mengekstrak soal dari file. Silakan periksa format file.');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-2 sm:p-4 md:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl sm:rounded-3xl max-w-2xl w-full max-h-[94vh] flex flex-col shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 my-auto">
        
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-cyan-400 to-teal-500 text-white flex items-center justify-center font-bold text-base sm:text-lg shadow-sm shrink-0">
              📄
            </div>
            <div>
              <h2 className="font-bold text-base sm:text-lg text-slate-800 flex items-center gap-1.5 leading-snug">
                <span>Ekstrak Soal dari File (AI Gemini)</span>
                <span className="text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 font-bold shrink-0">
                  Dokumen ➔ Kuis
                </span>
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500">
                Unggah file dokumen soal, modul ajar, atau foto lembar ujian (PDF, TXT, Gambar).
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
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
                    className="border-2 border-dashed border-teal-300 hover:border-teal-500 bg-teal-50/30 hover:bg-teal-50/60 rounded-3xl p-8 text-center cursor-pointer transition-all space-y-3"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-white shadow-xs text-teal-600 flex items-center justify-center mx-auto text-2xl border border-teal-100">
                      <Upload className="w-7 h-7" />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-slate-800">
                        Klik untuk Memilih File atau Tarik File ke Sini
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Mendukung dokumen <strong>PDF</strong>, teks <strong>TXT</strong>, serta foto lembar soal <strong>PNG/JPG</strong>
                      </p>
                    </div>
                    <span className="inline-block text-[11px] text-teal-700 font-semibold px-3 py-1 rounded-full bg-white border border-teal-200 shadow-xs">
                      Maksimal 25MB
                    </span>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white text-teal-700 flex items-center justify-center border border-teal-200 font-bold">
                        <FileCheck className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div className="space-y-0.5">
                        <span className="font-bold text-xs text-slate-800 block truncate max-w-xs sm:max-w-md">
                          {selectedFile.name}
                        </span>
                        <span className="text-[11px] text-slate-500 block">
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
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-white"
                      title="Ganti file"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Quick Sample File Button */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-slate-400">Belum punya file contoh?</span>
                  <button
                    type="button"
                    onClick={handleLoadSampleDocument}
                    className="text-teal-700 hover:text-teal-900 font-bold flex items-center gap-1 hover:underline"
                  >
                    <span>💡 Gunakan Contoh Modul Awang Long (.txt)</span>
                  </button>
                </div>
              </div>

              {/* Extraction Parameters */}
              <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200/80 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                    Mode & Pengaturan Ekstraksi AI:
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">
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
                        ? 'bg-white border-teal-500 ring-2 ring-teal-400/30 text-teal-950 shadow-xs'
                        : 'bg-white/60 border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 font-bold text-base ${
                      extractionMode === 'unlimited' ? 'bg-teal-600 text-white shadow-xs' : 'bg-slate-100 text-slate-500'
                    }`}>
                      ∞
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-slate-900">Semua Soal dalam File</span>
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-emerald-100 text-emerald-800">
                          Bebas Limit
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-snug mt-0.5">
                        Ekstrak 100% seluruh butir soal yang ada di lembar/dokumen secara lengkap tanpa batasan.
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setExtractionMode('custom')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                      extractionMode === 'custom'
                        ? 'bg-white border-teal-500 ring-2 ring-teal-400/30 text-teal-950 shadow-xs'
                        : 'bg-white/60 border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 font-bold text-base ${
                      extractionMode === 'custom' ? 'bg-teal-600 text-white shadow-xs' : 'bg-slate-100 text-slate-500'
                    }`}>
                      #
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-slate-900">Tentukan Jumlah Bebas</span>
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-teal-100 text-teal-800">
                          Ketik Angka
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-snug mt-0.5">
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
                        <label htmlFor="file-target-count-input" className="font-semibold text-slate-700">
                          Target Soal:
                        </label>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-teal-100 text-teal-800">
                          {targetCount} Soal
                        </span>
                      </div>

                      {/* Stepper + Direct Typing Input (No 50 cap) */}
                      <div className="flex items-center border border-teal-300 focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-200 rounded-xl bg-white overflow-hidden shadow-xs">
                        <button
                          type="button"
                          onClick={() => handleTargetStep(-1)}
                          disabled={targetCount <= 1}
                          className="px-2.5 py-1.5 text-slate-500 hover:text-teal-700 hover:bg-teal-50 disabled:opacity-40 font-bold border-r border-slate-200 cursor-pointer"
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
                          className="w-full text-center py-1.5 px-1 font-bold text-slate-800 outline-none text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => handleTargetStep(1)}
                          className="px-2.5 py-1.5 text-slate-500 hover:text-teal-700 hover:bg-teal-50 font-bold border-l border-slate-200 cursor-pointer"
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
                                ? 'bg-teal-600 text-white border-teal-600'
                                : 'bg-white text-slate-600 border-slate-200 hover:border-teal-300'
                            }`}
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-teal-50/80 border border-teal-200 text-teal-900 flex flex-col justify-center gap-1">
                      <span className="font-bold text-[11px] flex items-center gap-1">
                        <span>✨ Mode Otomatis</span>
                      </span>
                      <p className="text-[10px] text-teal-800 leading-snug">
                        AI akan memindai dan mengekstrak semua soal yang ditemukan dalam dokumen tanpa batasan maksimal.
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="font-semibold text-slate-600 block mb-1">
                      Preferensi Tipe Soal:
                    </label>
                    <select
                      value={preferredType}
                      onChange={(e) => setPreferredType(e.target.value)}
                      className="w-full p-2 rounded-xl border border-slate-300 bg-white"
                    >
                      <option value="campuran">Campuran (PG, Isian, Jodoh)</option>
                      <option value="multiple_choice">Pilihan Ganda Saja</option>
                      <option value="short_answer">Isian Singkat Saja</option>
                      <option value="matching">Menjodohkan Saja</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-600 block mb-1">
                      Target Jenjang:
                    </label>
                    <select
                      value={gradeLevel}
                      onChange={(e) => setGradeLevel(e.target.value)}
                      className="w-full p-2 rounded-xl border border-slate-300 bg-white"
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
                <div className="p-6 rounded-2xl bg-teal-50 border border-teal-200 text-center space-y-3">
                  <PesutMahakamMascot className="w-20 h-20 mx-auto" isProcessing={true} />
                  <div className="space-y-1">
                    <span className="font-bold text-sm text-teal-900 block">
                      AI Sedang Memproses Dokumen Anda...
                    </span>
                    <p className="text-xs text-teal-700">{statusStep}</p>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Result Preview of Extracted Quiz */
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-200 text-teal-800">
                    Ekstraksi Berhasil ✨
                  </span>
                  <span className="font-mono text-xs font-bold text-slate-700 bg-white px-2 py-0.5 rounded-md border border-teal-200">
                    PIN: {extractedQuiz.code}
                  </span>
                </div>

                <h3 className="font-bold text-base text-slate-900">{extractedQuiz.title}</h3>
                <p className="text-xs text-slate-600">{extractedQuiz.description}</p>

                <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-500">
                  <span className="bg-white px-2 py-0.5 rounded-md border border-teal-200 font-semibold text-teal-800">
                    📝 {extractedQuiz.questions.length} Soal
                  </span>
                  {extractedQuiz.categories?.map((cat) => (
                    <span key={cat} className="bg-white px-2 py-0.5 rounded-md border border-slate-200">
                      🏷️ {cat}
                    </span>
                  ))}
                </div>
              </div>

              {/* List of extracted questions */}
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  Daftar Soal yang Terdeteksi:
                </span>

                {extractedQuiz.questions.map((q, qIdx) => (
                  <div key={q.id || qIdx} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-md bg-teal-100 text-teal-800 font-bold text-[10px] flex items-center justify-center shrink-0">
                          {qIdx + 1}
                        </span>
                        <span className="font-bold text-slate-800 leading-snug">{q.text}</span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600 shrink-0">
                        {q.type === 'multiple_choice' ? 'Pilihan Ganda' : q.type === 'short_answer' ? 'Isian Singkat' : 'Menjodohkan'}
                      </span>
                    </div>

                    {q.type === 'multiple_choice' && (
                      <div className="grid grid-cols-2 gap-1 pl-7 text-[11px]">
                        {(q.options || []).map((opt, oIdx) => (
                          <div
                            key={oIdx}
                            className={`p-1.5 rounded-lg truncate ${
                              oIdx === q.correctOption ? 'bg-emerald-100 text-emerald-900 font-bold' : 'bg-white text-slate-600 border'
                            }`}
                          >
                            {String.fromCharCode(65 + oIdx)}. {opt}
                          </div>
                        ))}
                      </div>
                    )}

                    {q.type === 'short_answer' && (
                      <div className="pl-7 text-[11px] text-slate-600">
                        Kunci: <strong className="text-emerald-800">{(q.acceptedAnswers || []).join(' / ')}</strong>
                      </div>
                    )}

                    {q.type === 'matching' && (
                      <div className="pl-7 space-y-0.5 text-[11px]">
                        {(q.matchingPairs || []).map((p, pIdx) => (
                          <div key={pIdx} className="flex items-center gap-1.5 text-slate-700">
                            <span>{p.left}</span>
                            <span className="text-slate-400">➔</span>
                            <strong className="text-indigo-800">{p.right}</strong>
                          </div>
                        ))}
                      </div>
                    )}

                    {q.explanation && (
                      <p className="pl-7 text-[11px] text-slate-500 italic">
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
        <div className="p-6 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-50"
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
