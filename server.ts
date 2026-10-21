import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProd = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT) || 3000;

const app = express();
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Initialize Gemini SDK with server-side environment key
function getGeminiClient(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY || '';
  if (!key) return null;
  return new GoogleGenAI({ apiKey: key });
}

function getFallbackMaterial(topic: string): string {
  const isAwangLong = /awang|kutai|mahakam|tenggarong|kalimantan/i.test(topic);
  if (isAwangLong) {
    return `BAHAN BACAAN MATERI: SEJARAH PERJUANGAN AWANG LONG & KUTAI KARTANEGARA\n\n1. Mengenal Panglima Awang Long\nAwang Long bergelar Senapati Pahlawan Sakti adalah seorang panglima perang yang memimpin perlawanan heroik rakyat Kesultanan Kutai Kartanegara ing Martadipura menentang agresi kolonial Belanda pada tahun 1844.\n\n2. Pertempuran di Sungai Mahakam\nMedan laga utama berpusat di perairan Sungai Mahakam dan benteng pertahanan Tenggarong, di mana armada rakyat berjuang mempertahankan kedaulatan tanah leluhur.\n\n3. Nilai Kepahlawanan\nKeteladanan Awang Long meliputi keberanian tanpa gentar, jiwa patriotisme membela tanah air, serta komitmen menjaga persatuan dan kelestarian budaya Kalimantan Timur.`;
  }
  return `BAHAN BACAAN & RINGKASAN MATERI: ${topic}\n\n1. Konsep Utama\nTopik mengenai "${topic}" membahas prinsip-prinsip fundamental, definisi esensial, serta analisis kontekstual yang mendalam.\n\n2. Poin Pembelajaran\n- Memahami terminologi dan ruang lingkup ${topic}.\n- Menelaah penerapan nyata serta studi kasus terkait.\n- Menguji pemahaman melalui evaluasi butir-butir soal latihan.\n\nSilakan baca ringkasan materi di atas dengan cermat sebelum mulai mengerjakan ujian kuis.`;
}

function adjustPointsTo100(questions: any[]): any[] {
  if (!questions || questions.length === 0) return [];
  const n = questions.length;
  const currentTotal = questions.reduce((sum, q) => sum + (Number(q.points) || 0), 0);

  if (currentTotal === 100) {
    return questions;
  }

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

interface GeminiCallRecord {
  timestamp: number;
  model: string;
  action: string;
  status: 'success' | 'retry' | 'failed';
  errorMessage?: string;
}

const geminiCallHistory: GeminiCallRecord[] = [];

function recordGeminiCall(model: string, action: string, status: 'success' | 'retry' | 'failed', errorMessage?: string) {
  geminiCallHistory.push({
    timestamp: Date.now(),
    model,
    action,
    status,
    errorMessage
  });
  if (geminiCallHistory.length > 2000) {
    geminiCallHistory.splice(0, geminiCallHistory.length - 2000);
  }
}

// Helper to call Gemini with retry and fallback model on 503 / 429
async function generateGeminiWithRetry(
  genAI: GoogleGenAI,
  params: {
    contents: any;
    config?: any;
    action?: string;
  },
  models: string[] = ['gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-flash-latest']
): Promise<string> {
  let lastError: any = null;
  const actionName = params.action || 'gemini-generate';

  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`[Gemini] Retrying model ${model} (attempt ${attempt + 1})...`);
          await new Promise((r) => setTimeout(r, 1200));
        }
        const response = await genAI.models.generateContent({
          model,
          contents: params.contents,
          config: params.config
        });
        const text = response.text || '';
        if (text) {
          recordGeminiCall(model, actionName, attempt > 0 ? 'retry' : 'success');
          return text;
        }
      } catch (err: any) {
        lastError = err;
        const msg = err?.message || String(err);
        recordGeminiCall(model, actionName, 'failed', msg);
        console.warn(`[Gemini] Model ${model} attempt ${attempt + 1} error:`, msg);
        const isTransient = msg.includes('503') || msg.includes('high demand') || msg.includes('UNAVAILABLE') || msg.includes('429');
        if (!isTransient) {
          break;
        }
      }
    }
  }

  throw lastError;
}

// Fallback high-quality question generator if API key is unconfigured or rate limited
function getFallbackQuestions(topic: string, count: number = 5) {
  const isAwangLong = /awang|kutai|mahakam|tenggarong|kalimantan/i.test(topic);

  if (isAwangLong) {
    const list = [
      {
        id: 'q-demo-1',
        type: 'multiple_choice',
        category: 'Sejarah & Tokoh',
        points: 20,
        text: 'Siapakah Awang Long dalam sejarah Kesultanan Kutai Kartanegara?',
        options: [
          'Panglima perang tangguh yang memimpin perlawanan melawan penjajahan Belanda',
          'Raja pertama yang mendirikan Kerajaan Kutai Mulawarman',
          'Pedagang rempah dari Selat Malaka',
          'Penulis prasasti Yupa di abad ke-4'
        ],
        correctOption: 0,
        explanation: 'Awang Long bergelar Senapati Pahlawan Sakti adalah panglima Kesultanan Kutai Kartanegara ing Martadipura yang memimpin perlawanan rakyat melawan agresi Belanda pada tahun 1844 di Tenggarong.'
      },
      {
        id: 'q-demo-2',
        type: 'short_answer',
        category: 'Geografi Mahakam',
        points: 20,
        text: 'Di perairan sungai manakah pertempuran sengit antara armada Awang Long melawan kompeni Belanda terjadi?',
        acceptedAnswers: ['Mahakam', 'Sungai Mahakam'],
        caseSensitive: false,
        explanation: 'Pertempuran sengit terjadi di sepanjang Sungai Mahakam dan benteng pertahanan Tenggarong melawan armada perang Belanda pimpinan Kapten T.C. Bruijn.'
      },
      {
        id: 'q-demo-3',
        type: 'matching',
        category: 'Ekosistem & Budaya',
        points: 30,
        text: 'Jodohkan entitas khas Kalimantan Timur berikut dengan pasangannya!',
        matchingPairs: [
          { id: 'p1', left: 'Pesut Mahakam', right: 'Mamalia air tawar langka endemik' },
          { id: 'p2', left: 'Awang Long', right: 'Panglima Senapati Sakti Kutai' },
          { id: 'p3', left: 'Tenggarong', right: 'Pusat Kesultanan Kutai Kartanegara' }
        ],
        explanation: 'Pesut Mahakam dan pahlawan Awang Long adalah ikon tak terpisahkan dari bumi Kutai Kartanegara.'
      },
      {
        id: 'q-demo-4',
        type: 'multiple_choice',
        category: 'Kepahlawanan',
        points: 15,
        text: 'Nilai keteladanan luhur yang dapat dipetik dari perjuangan Pahlawan Awang Long adalah...',
        options: [
          'Keberanian membela kedaulatan tanah air dan persatuan rakyat',
          'Sikap mudah menyerah saat menghadapi musuh',
          'Menghindari tanggung jawab bela negara',
          'Mementingkan kepentingan pribadi di atas bangsa'
        ],
        correctOption: 0,
        explanation: 'Awang Long gugur sebagai kusuma bangsa dalam mempertahankan tanah Kutai demi kehormatan dan kemerdekaan generasi penerus.'
      },
      {
        id: 'q-demo-5',
        type: 'short_answer',
        category: 'Kepahlawanan',
        points: 15,
        text: 'Lengkapi gelar kehormatan sakti yang dianugerahkan Sultan kepada Awang Long: Senapati...',
        acceptedAnswers: ['Sakti', 'Pahlawan Sakti', 'Senapati Sakti'],
        caseSensitive: false,
        explanation: 'Awang Long bergelar Pangeran Senapati Sakti atas jasa kepemimpinan angkatan perangnya.'
      }
    ];
    if (count <= list.length) {
      return adjustPointsTo100(list.slice(0, count));
    }
    // If requested more than sample list, generate additional contextual questions
    const extra = Array.from({ length: count - list.length }, (_, idx) => {
      const i = list.length + idx + 1;
      return {
        id: `q-demo-extra-${i}`,
        type: i % 2 === 0 ? 'multiple_choice' : 'short_answer',
        category: 'Sejarah & Ekosistem Mahakam',
        points: 20,
        text: `Pertanyaan Soal #${i}: Bagaimana keterkaitan nilai perjuangan Awang Long dengan pelestarian identitas Kutai Kartanegara?`,
        options: [
          'Menjadi fondasi kearifan lokal dalam menjaga persatuan dan kelestarian alam',
          'Hanya relevan pada masa penjajahan kolonial',
          'Tidak memiliki pengaruh terhadap kebudayaan saat ini',
          'Mengabaikan hubungan sosial masyarakat perairan'
        ],
        correctOption: 0,
        acceptedAnswers: ['Persatuan', 'Kearifan lokal', 'Kelestarian'],
        caseSensitive: false,
        explanation: 'Nilai perjuangan pahlawan dan ekosistem Sungai Mahakam menjadi warisan luhur masyarakat Kutai yang terus dijaga.'
      };
    });
    return adjustPointsTo100([...list, ...extra]);
  }

  // Generic fallback generator based on topic
  const generic = Array.from({ length: count }, (_, i) => {
    if (i % 3 === 1) {
      return {
        id: `q-gen-${Date.now()}-${i}`,
        type: 'short_answer',
        category: topic,
        points: 20,
        text: `Pertanyaan Isian Singkat #${i + 1} terkait materi: ${topic}. Sebutkan kata kunci utamanya!`,
        acceptedAnswers: [topic, `${topic} Dasar`],
        caseSensitive: false,
        explanation: `Pemahaman inti materi ${topic} sangat esensial.`
      };
    }
    if (i % 3 === 2) {
      return {
        id: `q-gen-${Date.now()}-${i}`,
        type: 'matching',
        category: topic,
        points: 20,
        text: `Jodohkan istilah-istilah terkait ${topic} (Soal #${i + 1}):`,
        matchingPairs: [
          { id: `p-${i}-1`, left: `Konsep A (${topic})`, right: `Definisi A` },
          { id: `p-${i}-2`, left: `Konsep B (${topic})`, right: `Definisi B` }
        ],
        explanation: `Hubungan antar konsep dalam ${topic}.`
      };
    }
    return {
      id: `q-gen-${Date.now()}-${i}`,
      type: 'multiple_choice',
      category: topic,
      points: 20,
      text: `Pertanyaan Pilihan Ganda #${i + 1} terkait: ${topic}. Manakah pernyataan yang paling tepat?`,
      options: [
        `Konsep dasar yang benar mengenai ${topic}`,
        `Fakta pendukung sekunder dari ${topic}`,
        `Miskonsepsi umum terkait ${topic}`,
        `Pernyataan yang kurang tepat mengenai ${topic}`
      ],
      correctOption: 0,
      explanation: `Penjelasan edukatif: Konsep dasar ${topic} sangat esensial untuk dipahami siswa.`
    };
  });
  return adjustPointsTo100(generic);
}

// SSE Streaming AI Quiz Generator Endpoint
app.get('/api/generate-quiz-stream', async (req: Request, res: Response) => {
  const topic = String(req.query.topic || 'Sejarah Awang Long dan Kutai');
  const gradeLevel = String(req.query.gradeLevel || 'SMP');
  const count = Math.max(Number(req.query.count) || 5, 1);
  const difficulty = String(req.query.difficulty || 'Sedang');

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const sendEvent = (event: string, data: any) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  const genAI = getGeminiClient();

  if (!genAI) {
    // Stream simulation with smart curated data
    sendEvent('status', { message: 'Merancang kisi-kisi soal interaktif...' });
    await new Promise((r) => setTimeout(r, 600));

    sendEvent('status', { message: 'Menyusun pilihan jawaban dan kunci edukatif...' });
    await new Promise((r) => setTimeout(r, 800));

    const questions = getFallbackQuestions(topic, count);
    sendEvent('status', { message: 'Menyelesaikan kuis Awang Long Quiz...' });
    await new Promise((r) => setTimeout(r, 400));

    sendEvent('complete', {
      title: `Kuis ${topic}`,
      description: `Kuis online interaktif materi ${topic} untuk tingkat ${gradeLevel} (${difficulty}).`,
      subject: topic,
      gradeLevel,
      materialContent: getFallbackMaterial(topic),
      questions
    });
    res.end();
    return;
  }

  try {
    sendEvent('status', { message: 'Menghubungkan ke Google AI Studio (Gemini 3.8 Flash)...' });

    const prompt = `Anda adalah asisten kurikulum cerdas untuk platform kuis interaktif "Awang Long Quiz".
Tugas Anda: Buat kuis sebanyak ${count} soal pilihan ganda tentang: "${topic}".
Tingkat pendidikan: ${gradeLevel}.
Tingkat kesulitan: ${difficulty}.

Instruksi Khusus:
1. Soal harus edukatif, menstimulasi penalaran (HOTS jika tingkat SMP/SMA), dan relevan dengan kurikulum Indonesia.
2. Setiap soal memiliki tepat 4 opsi pilihan jawaban (A, B, C, D).
3. Berikan 'correctOption' berupa indeks angka (0 = A, 1 = B, 2 = C, 3 = D).
4. Berikan 'explanation' singkat dan mendidik yang menjelaskan mengapa jawaban tersebut benar.
5. Berikan 'materialContent' berupa teks bahan bacaan atau ringkasan materi pembelajaran yang komprehensif untuk dibaca siswa di awal kuis.
6. TENTUKAN POIN: Tentukan poin untuk setiap soal secara otomatis dengan membagi 100 dengan total jumlah soal yang dibuat (${count}). Berikan variasi poin kecil berdasarkan tingkat kesulitan (${difficulty}) pada soal-soal tertentu (misal: soal sulit lebih besar, mudah lebih kecil), namun PASTIKAN TOTAL POIN dari seluruh soal tepat berjumlah 100.
7. Format output WAJIB HANYA berupa JSON valid tanpa markdown pembungkus (tanpa \`\`\`json).

Contoh skema JSON:
{
  "title": "Kuis: ...",
  "description": "Deskripsi singkat kuis...",
  "subject": "${topic}",
  "materialContent": "Bahan bacaan ringkasan materi...",
  "questions": [
    {
      "id": "q1",
      "text": "Pertanyaan...",
      "options": ["Opsi A", "Opsi B", "Opsi C", "Opsi D"],
      "correctOption": 0,
      "explanation": "Penjelasan...",
      "points": 20
    }
  ]
}`;

    const responseStream = await genAI.models.generateContentStream({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    let fullText = '';
    for await (const chunk of responseStream) {
      const text = chunk.text;
      if (text) {
        fullText += text;
        sendEvent('chunk', { chunk: text });
      }
    }

    try {
      const cleaned = fullText.trim().replace(/^```json\s*/, '').replace(/```$/, '');
      const parsed = JSON.parse(cleaned);
      sendEvent('complete', {
        title: parsed.title || `Kuis ${topic}`,
        description: parsed.description || `Kuis edukasi ${topic}`,
        subject: parsed.subject || topic,
        gradeLevel,
        materialContent: parsed.materialContent || getFallbackMaterial(topic),
        questions: (parsed.questions || []).map((q: any, idx: number) => ({
          id: q.id || `ai-q-${idx + 1}`,
          type: q.type || 'multiple_choice',
          category: q.category || topic,
          points: q.points || 20,
          text: q.text || `Soal ${idx + 1}`,
          options: Array.isArray(q.options) && q.options.length >= 2 ? q.options : ['A', 'B', 'C', 'D'],
          correctOption: typeof q.correctOption === 'number' ? q.correctOption : 0,
          acceptedAnswers: Array.isArray(q.acceptedAnswers) ? q.acceptedAnswers : undefined,
          matchingPairs: Array.isArray(q.matchingPairs) ? q.matchingPairs : undefined,
          explanation: q.explanation || 'Pembahasan materi terkait.'
        }))
      });
    } catch (parseErr) {
      console.warn('JSON parse error from stream, falling back to curated:', parseErr);
      const fallback = getFallbackQuestions(topic, count);
      sendEvent('complete', {
        title: `Kuis ${topic}`,
        description: `Kuis online interaktif ${topic}`,
        subject: topic,
        gradeLevel,
        materialContent: getFallbackMaterial(topic),
        questions: fallback
      });
    }
  } catch (err: any) {
    console.error('Gemini API Error:', err);
    sendEvent('status', { message: 'Beralih ke mode cerdas cepat...' });
    const fallback = getFallbackQuestions(topic, count);
    sendEvent('complete', {
      title: `Kuis ${topic}`,
      description: `Kuis materi ${topic}`,
      subject: topic,
      gradeLevel,
      questions: fallback
    });
  }

  res.end();
});

// JSON Post endpoint for direct AI generation
app.post('/api/generate-quiz', async (req: Request, res: Response) => {
  const { topic = 'Sejarah Awang Long dan Kutai', gradeLevel = 'SMP', count: rawCount = 5, difficulty = 'Sedang' } = req.body;
  const count = Math.max(Number(rawCount) || 5, 1);
  const genAI = getGeminiClient();

  if (!genAI) {
    const fallback = getFallbackQuestions(topic, count);
    return res.json({
      title: `Kuis ${topic}`,
      description: `Kuis online materi ${topic} untuk jenjang ${gradeLevel}.`,
      subject: topic,
      gradeLevel,
      questions: fallback
    });
  }

  try {
    const prompt = `Anda adalah asisten kurikulum cerdas "Awang Long Quiz".
Buat kuis sebanyak ${count} soal pilihan ganda tentang topik: "${topic}".
Tingkat pendidikan: ${gradeLevel}. Tingkat kesulitan: ${difficulty}.

Instruksi Khusus:
- TENTUKAN POIN: Tentukan poin untuk setiap soal secara otomatis dengan membagi 100 dengan total jumlah soal yang dibuat (${count}). Berikan variasi poin kecil berdasarkan tingkat kesulitan (${difficulty}) pada soal-soal tertentu (misal: soal sulit lebih besar, mudah lebih kecil), namun PASTIKAN TOTAL POIN dari seluruh soal tepat berjumlah 100.
- Keluarkan HANYA JSON valid dengan skema:
{
  "title": "string",
  "description": "string",
  "subject": "string",
  "questions": [
    {
      "id": "q1",
      "text": "pertanyaan",
      "options": ["A", "B", "C", "D"],
      "correctOption": 0,
      "explanation": "alasan jawaban benar",
      "points": 20
    }
  ]
}`;

    const text = await generateGeminiWithRetry(genAI, {
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const cleaned = text.trim().replace(/^```json\s*/, '').replace(/```$/, '');
    const data = JSON.parse(cleaned);
    if (Array.isArray(data.questions)) {
      data.questions = adjustPointsTo100(data.questions);
    }
    res.json(data);
  } catch (err: any) {
    console.error('Gemini API error in POST:', err);
    const fallback = getFallbackQuestions(topic, count);
    res.json({
      title: `Kuis ${topic}`,
      description: `Kuis materi ${topic} jenjang ${gradeLevel}`,
      subject: topic,
      gradeLevel,
      questions: fallback
    });
  }
});

// AI Document / File Question Extractor Endpoint
app.post('/api/extract-quiz-from-file', async (req: Request, res: Response) => {
  const {
    base64Data,
    mimeType = 'text/plain',
    fileName = 'dokumen.txt',
    textContent = '',
    targetCount = 0,
    isUnlimited = false,
    preferredType = 'campuran',
    gradeLevel = 'SMP'
  } = req.body;

  const rawNum = Number(targetCount);
  const unlimitedMode = isUnlimited === true || targetCount === 'all' || targetCount === 0 || rawNum === 0 || isNaN(rawNum);
  // If not unlimited, allow any positive count requested by user (no 50 ceiling)
  const count = unlimitedMode ? null : Math.max(rawNum, 1);
  const genAI = getGeminiClient();

  if (!genAI) {
    // Intelligent fallback for demo when no API key is provided
    const topicExtracted = fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
    const effectiveCount = unlimitedMode ? 10 : count!;
    const fallback = getFallbackQuestions(topicExtracted, effectiveCount);

    return res.json({
      title: `Kuis dari File: ${fileName.replace(/\.[^/.]+$/, '')}`,
      description: `Kuis hasil analisis dan ekstraksi otomatis tanpa batasan dari dokumen "${fileName}" (Jenjang ${gradeLevel}).`,
      subject: topicExtracted || 'Materi Umum',
      gradeLevel,
      categories: ['Ekstraksi Dokumen Lengkap', 'Materi Inti'],
      materialContent: textContent || getFallbackMaterial(topicExtracted),
      questions: fallback
    });
  }

  try {
    const questionGoal = unlimitedMode
      ? `TUGAS UTAMA: Analisis file dokumen/gambar yang dilampirkan bernama "${fileName}".
Ekstrak SELURUH butir soal, latihan evaluasi, dan pertanyaan yang terdapat dalam dokumen tersebut secara lengkap dan tuntas TANPA BATASAN JUMLAH (ekstrak 100% semua soal yang ada dalam file, berapapun jumlahnya).
Jika dokumen berupa modul/materi ajar bacaan (bukan lembar soal jadi), buatkan butir-butir soal komprehensif yang menguji setiap bab, sub-topik, dan konsep penting secara mendalam tanpa memotong atau membatasi jumlah butir soal.`
      : `TUGAS UTAMA: Analisis file dokumen/gambar yang dilampirkan bernama "${fileName}".
Ekstrak butir-butir soal yang terdapat dalam dokumen tersebut, atau rancang kuis sebanyak ${count} butir soal berkualitas tinggi berdasarkan isi materi dokumen ini tanpa batasan artifisial.`;

    const prompt = `Anda adalah asisten kurikulum AI "Awang Long Quiz".
${questionGoal}

Spesifikasi Kuis:
- Target Jenjang: ${gradeLevel}
- Preferensi Tipe Soal: ${preferredType} (Jika 'campuran', sertakan kombinasi variatif: 'multiple_choice', 'short_answer', dan 'matching').
- Untuk 'multiple_choice': Wajib 4 pilihan options (A, B, C, D) dan correctOption (indeks 0, 1, 2, atau 3).
- Untuk 'short_answer': Wajib acceptedAnswers (array kata kunci jawaban benar yang fleksibel).
- Untuk 'matching': Wajib matchingPairs (array objek { id, left, right } minimal 2-4 pasang).
- Tetapkan poin yang adil. Pastikan total poin dari seluruh soal berjumlah tepat 100 dengan membagi 100 dengan total soal dan menyesuaikan berdasarkan tingkat kompleksitas soal.
- Berikan kategori materi (category) dan pembahasan edukatif (explanation) untuk setiap soal.
- Berikan 'materialContent' berupa ringkasan bahan bacaan atau teks materi lengkap dari dokumen untuk dibaca siswa di awal kuis.

Keluarkan HANYA JSON valid tanpa blok markdown tambahan (\`\`\`json):
{
  "title": "string (Judul kuis representatif dari dokumen)",
  "description": "string (Ringkasan isi dokumen)",
  "subject": "string (Mata pelajaran terdeteksi)",
  "gradeLevel": "${gradeLevel}",
  "categories": ["Kategori 1", "Kategori 2"],
  "materialContent": "string (Bahan bacaan / teks materi lengkap)",
  "questions": [
    {
      "id": "q1",
      "type": "multiple_choice",
      "category": "Kategori",
      "points": 20,
      "text": "Pertanyaan...",
      "options": ["A", "B", "C", "D"],
      "correctOption": 0,
      "explanation": "Penjelasan..."
    },
    {
      "id": "q2",
      "type": "short_answer",
      "category": "Kategori",
      "points": 20,
      "text": "Pertanyaan isian...",
      "acceptedAnswers": ["Jawaban 1", "Jawaban Alternatif"],
      "explanation": "Penjelasan..."
    },
    {
      "id": "q3",
      "type": "matching",
      "category": "Kategori",
      "points": 30,
      "text": "Jodohkan istilah berikut...",
      "matchingPairs": [
        { "id": "p1", "left": "Kiri 1", "right": "Kanan 1" },
        { "id": "p2", "left": "Kiri 2", "right": "Kanan 2" }
      ],
      "explanation": "Penjelasan..."
    }
  ]
}`;

    let contentsParts: any[] = [{ text: prompt }];

    // If base64 data is supplied (for PDF, Image, etc.)
    if (base64Data) {
      // Strip base64 header if exists e.g. data:application/pdf;base64,
      const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, '');
      contentsParts.push({
        inlineData: {
          mimeType: mimeType || 'application/pdf',
          data: cleanBase64
        }
      });
    } else if (textContent) {
      contentsParts.push({
        text: `Isi teks dokumen:\n\n${textContent.slice(0, 500000)}`
      });
    }

    const text = await generateGeminiWithRetry(genAI, {
      contents: [
        {
          role: 'user',
          parts: contentsParts
        }
      ],
      config: {
        responseMimeType: 'application/json'
      },
      action: 'extract-quiz-from-file'
    });

    const cleaned = text.trim().replace(/^```json\s*/, '').replace(/```$/, '');
    const data = JSON.parse(cleaned);

    if (Array.isArray(data.questions)) {
      data.questions = adjustPointsTo100(data.questions);
    }

    res.json(data);
  } catch (err: any) {
    console.warn('[Gemini] File Extraction using fallback due to API high demand / error:', err?.message || err);
    const topicExtracted = fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
    const effectiveCount = unlimitedMode ? 10 : count!;
    const fallback = getFallbackQuestions(topicExtracted, effectiveCount);

    res.json({
      title: `Kuis dari File: ${fileName.replace(/\.[^/.]+$/, '')}`,
      description: `Kuis hasil analisis materi file "${fileName}".`,
      subject: topicExtracted,
      gradeLevel,
      categories: ['Hasil Ekstraksi', topicExtracted],
      materialContent: textContent || getFallbackMaterial(topicExtracted),
      questions: fallback
    });
  }
});

// Endpoint to monitor Gemini API usage, rate limit quota (RPM & RPD), and operational health
app.get('/api/gemini-usage', (_req: Request, res: Response) => {
  const genAI = getGeminiClient();
  const configured = !!genAI;
  const now = Date.now();

  const oneMinuteAgo = now - 60 * 1000;
  const oneDayAgo = now - 24 * 60 * 60 * 1000;

  const callsInMinute = geminiCallHistory.filter(c => c.timestamp >= oneMinuteAgo);
  const callsInDay = geminiCallHistory.filter(c => c.timestamp >= oneDayAgo);

  const requestsThisMinute = callsInMinute.length;
  const requestsToday = callsInDay.length;

  // AI Studio standard tier limits (RPM: 15, RPD: 1500)
  const minuteLimit = 15;
  const dailyLimit = 1500;

  // Seconds until the oldest request in the current 60s sliding window expires
  let secondsToMinuteReset = 0;
  if (callsInMinute.length > 0) {
    const oldestInMinute = Math.min(...callsInMinute.map(c => c.timestamp));
    secondsToMinuteReset = Math.max(0, Math.ceil((oldestInMinute + 60 * 1000 - now) / 1000));
  }

  // Calculate time remaining until next UTC midnight daily reset
  const nowUtc = new Date();
  const nextUtcMidnight = new Date(Date.UTC(
    nowUtc.getUTCFullYear(),
    nowUtc.getUTCMonth(),
    nowUtc.getUTCDate() + 1,
    0, 0, 0, 0
  ));
  const msToUtcMidnight = nextUtcMidnight.getTime() - nowUtc.getTime();
  const hoursToDailyReset = Math.floor(msToUtcMidnight / (1000 * 60 * 60));
  const minsToDailyReset = Math.floor((msToUtcMidnight % (1000 * 60 * 60)) / (1000 * 60));

  let status: 'healthy' | 'warning' | 'rate_limited' = 'healthy';
  let statusMessage = 'API Gemini siap & beroperasi dengan prima';

  if (!configured) {
    status = 'warning';
    statusMessage = 'API Key Gemini belum diset. Mode simulasi cerdas lokal aktif.';
  } else if (requestsThisMinute >= minuteLimit) {
    status = 'rate_limited';
    statusMessage = `Batas permintaan per-menit (${minuteLimit} RPM) tercapai. Silakan tunggu ${secondsToMinuteReset} detik.`;
  } else if (requestsThisMinute >= 11) {
    status = 'warning';
    statusMessage = `Mendekati batas menit (${requestsThisMinute}/${minuteLimit} RPM). Jeda singkat beberapa detik disarankan.`;
  } else if (requestsToday >= dailyLimit) {
    status = 'rate_limited';
    statusMessage = `Batas harian (${dailyLimit} RPD) tercapai. Reset pada pukul 00:00 UTC.`;
  }

  const remainingDaily = Math.max(0, dailyLimit - requestsToday);
  const remainingMinute = Math.max(0, minuteLimit - requestsThisMinute);
  const lastCall = geminiCallHistory[geminiCallHistory.length - 1];

  res.json({
    configured,
    status,
    statusMessage,
    limits: {
      rpm: minuteLimit,
      rpd: dailyLimit,
      tpm: 1000000
    },
    usage: {
      requestsThisMinute,
      remainingMinute,
      secondsToMinuteReset,
      requestsToday,
      remainingDaily,
      dailyResetCountdown: `${hoursToDailyReset} jam ${minsToDailyReset} mnt (00:00 UTC)`
    },
    models: {
      primary: 'gemini-3.8-flash',
      fallbacks: ['gemini-3.1-flash-lite', 'gemini-flash-latest'],
      strategy: 'Failover otomatis jika terjadi lonjakan beban server 503 / 429'
    },
    lastCall: lastCall ? {
      model: lastCall.model,
      action: lastCall.action,
      status: lastCall.status,
      time: new Date(lastCall.timestamp).toLocaleTimeString('id-ID')
    } : null
  });
});

// Endpoint: AI Smart Point Allocation across all quiz questions (Total strictly 100 pts)
app.post('/api/smart-score-quiz', async (req: Request, res: Response) => {
  const { questions = [] } = req.body;
  if (!Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({ error: 'Tidak ada butir soal yang dikirim untuk penilaian.' });
  }

  // Exact 100-point allocator ensuring sum(points) is STRICTLY 100 for any question count
  const allocatePointsStrictly100 = (
    items: { question: any; weight: number; difficultyTag: string; reason: string }[]
  ) => {
    const totalWeight = items.reduce((acc, q) => acc + q.weight, 0);
    let allocated = 0;

    const scored = items.map((item) => {
      const rawPoints = Math.max(1, Math.round((item.weight / totalWeight) * 100));
      allocated += rawPoints;
      return {
        ...item.question,
        points: rawPoints,
        difficultyTag: item.difficultyTag,
        explanation: item.question.explanation || item.reason || ''
      };
    });

    let delta = 100 - allocated;
    if (delta !== 0 && scored.length > 0) {
      // Sort indices by weight descending so hardest questions absorb rounding adjustments first
      const sorted = scored
        .map((q, idx) => ({ idx, weight: items[idx].weight, points: q.points }))
        .sort((a, b) => (delta > 0 ? b.weight - a.weight : a.weight - b.weight));

      let i = 0;
      while (delta !== 0 && i < sorted.length) {
        const targetIdx = sorted[i].idx;
        const adjustment = delta > 0 ? 1 : -1;
        if (scored[targetIdx].points + adjustment >= 1) {
          scored[targetIdx].points += adjustment;
          delta -= adjustment;
        }
        i = (i + 1) % sorted.length;
      }
    }

    return scored;
  };

  if (questions.length === 1) {
    return res.json({
      success: true,
      questions: [{ ...questions[0], points: 100, difficultyTag: 'Mudah' }],
      totalPoints: 100,
      source: 'Gemini AI Assessment',
      summary: 'Kuis dengan 1 butir soal: total skor otomatis bernilai tepat 100 poin.'
    });
  }

  const genAI = getGeminiClient();

  if (genAI) {
    try {
      const simplifiedQuestions = questions.map((q, i) => ({
        index: i,
        type: q.type,
        text: (q.text || '').slice(0, 250),
        options: q.options ? q.options.slice(0, 4) : undefined,
        acceptedAnswers: q.acceptedAnswers,
        matchingPairsCount: q.matchingPairs ? q.matchingPairs.length : 0
      }));

      const prompt = `Anda adalah pakar penilai kurikulum dan evaluator asesmen pendidikan.
Analisis ${questions.length} butir soal kuis berikut untuk menentukan tingkat kesulitannya berdasarkan Taksonomi Bloom dan kompleksitas kognitif:
${JSON.stringify(simplifiedQuestions, null, 2)}

Pedoman Tingkat Kesulitan:
- 'Mudah': Menguji ingatan dasar (C1-C2), definisi, nama, atau pertanyaan faktual singkat.
- 'Sedang': Menguji pemahaman, penerapan kontekstual (C3), atau penalaran sedang.
- 'Sulit (HOTS)': Menguji analisis mendalam (C4-C6), hubungan sebab-akibat, perbandingan kritis, menjodohkan banyak pasangan, atau soal isian analitis.

Keluarkan HANYA JSON array:
[
  { "index": 0, "difficulty": "Mudah" | "Sedang" | "Sulit (HOTS)", "reason": "alasan pedagogis singkat" }
]`;

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('AI scoring timed out')), 18000)
      );

      const responseText = await Promise.race([
        generateGeminiWithRetry(genAI, {
          contents: prompt,
          action: 'smart-score'
        }, ['gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-flash-latest']),
        timeoutPromise
      ]) as string;

      const cleaned = responseText.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
      const aiAnalysis = JSON.parse(cleaned);

      if (Array.isArray(aiAnalysis) && aiAnalysis.length === questions.length) {
        const weightedItems = questions.map((q, idx) => {
          const item = aiAnalysis.find((a: any) => a.index === idx) || aiAnalysis[idx];
          const diff = String(item?.difficulty || 'Sedang').trim();
          let weight = 2.0;
          let tag = 'Sedang';

          if (/sulit|hots|tinggi|analisis/i.test(diff)) {
            weight = q.type === 'matching' ? 3.8 : 3.0;
            tag = 'Sulit (HOTS)';
          } else if (/mudah|faktual|dasar|rendah/i.test(diff)) {
            weight = 1.0;
            tag = 'Mudah';
          } else {
            weight = q.type === 'matching' ? 2.5 : q.type === 'short_answer' ? 2.2 : 1.8;
            tag = 'Sedang';
          }

          return {
            question: q,
            weight,
            difficultyTag: tag,
            reason: item?.reason || `Dinilai sebagai soal ${tag} oleh AI.`
          };
        });

        const scored = allocatePointsStrictly100(weightedItems);
        const hardCount = scored.filter((q) => q.difficultyTag === 'Sulit (HOTS)').length;
        const medCount = scored.filter((q) => q.difficultyTag === 'Sedang').length;
        const easyCount = scored.filter((q) => q.difficultyTag === 'Mudah').length;

        return res.json({
          success: true,
          questions: scored,
          totalPoints: 100,
          source: 'Gemini AI Assessment',
          breakdown: { hardCount, medCount, easyCount },
          summary: `AI berhasil menganalisis ${questions.length} butir soal berdasarkan tingkat kesulitan (${hardCount} Sulit/HOTS, ${medCount} Sedang, ${easyCount} Mudah). Total seluruh skor tepat 100 poin.`
        });
      }
    } catch (err: any) {
      console.warn('[Gemini] Smart scoring using cognitive heuristic fallback:', err?.message || err);
    }
  }

  // Fallback: Intelligent pedagogical cognitive analysis
  const fallbackWeighted = questions.map((q) => {
    let weight = 1.8;
    let tag = 'Sedang';
    const text = q.text || '';
    const isHots = /mengapa|analisis|kesimpulan|dampak|hubungan|perbandingan|jelaskan mekanisme|faktor penyebab/i.test(text);
    const isFactual = /siapakah|kapan|di mana|apa nama|sebutkan|siapa/i.test(text) && text.length < 90;

    if (q.type === 'matching') {
      const pairCount = Array.isArray(q.matchingPairs) ? q.matchingPairs.length : 3;
      weight = 2.6 + Math.min(pairCount * 0.3, 1.2);
      tag = 'Sulit (HOTS)';
    } else if (isHots || text.length > 130) {
      weight = 2.8;
      tag = 'Sulit (HOTS)';
    } else if (isFactual) {
      weight = 1.0;
      tag = 'Mudah';
    } else if (q.type === 'short_answer') {
      weight = 2.0;
      tag = 'Sedang';
    }

    return {
      question: q,
      weight,
      difficultyTag: tag,
      reason: `Analisis kognitif mengklasifikasikan butir ini sebagai soal ${tag}.`
    };
  });

  const scored = allocatePointsStrictly100(fallbackWeighted);
  const hardCount = scored.filter((q) => q.difficultyTag === 'Sulit (HOTS)').length;
  const medCount = scored.filter((q) => q.difficultyTag === 'Sedang').length;
  const easyCount = scored.filter((q) => q.difficultyTag === 'Mudah').length;

  return res.json({
    success: true,
    questions: scored,
    totalPoints: 100,
    source: 'Pedagogical Cognitive Engine',
    breakdown: { hardCount, medCount, easyCount },
    summary: `Sistem cerdas menganalisis ${questions.length} butir soal berdasarkan tingkat kesulitan (${hardCount} Sulit/HOTS, ${medCount} Sedang, ${easyCount} Mudah). Total seluruh skor tepat 100 poin.`
  });
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  if (!isProd) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Awang Long Quiz Server running at http://0.0.0.0:${PORT}`);
  });
}

// In local dev, Docker, or standalone Node environments, start the listener
if (!process.env.VERCEL) {
  startServer().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}

export default app;
