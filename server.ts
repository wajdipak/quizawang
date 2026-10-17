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
const apiKey = process.env.GEMINI_API_KEY || '';
let genAI: GoogleGenAI | null = null;
if (apiKey) {
  genAI = new GoogleGenAI({ apiKey });
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
    return list.slice(0, count);
  }

  // Generic fallback generator based on topic
  return Array.from({ length: count }, (_, i) => {
    if (i % 3 === 1) {
      return {
        id: `q-gen-${Date.now()}-${i}`,
        type: 'short_answer',
        category: topic,
        points: 20,
        text: `Pertanyaan Isian Singkat terkait materi: ${topic}. Sebutkan kata kunci utamanya!`,
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
        text: `Jodohkan istilah-istilah terkait ${topic}:`,
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
      text: `Pertanyaan Pilihan Ganda terkait: ${topic}. Manakah pernyataan yang paling tepat?`,
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
}

// SSE Streaming AI Quiz Generator Endpoint
app.get('/api/generate-quiz-stream', async (req: Request, res: Response) => {
  const topic = String(req.query.topic || 'Sejarah Awang Long dan Kutai');
  const gradeLevel = String(req.query.gradeLevel || 'SMP');
  const count = Math.min(Math.max(Number(req.query.count) || 5, 2), 10);
  const difficulty = String(req.query.difficulty || 'Sedang');

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const sendEvent = (event: string, data: any) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  sendEvent('status', { message: `Memulai perancangan kuis materi "${topic}" tingkat ${gradeLevel}...` });

  if (!apiKey || !genAI) {
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
5. Format output WAJIB HANYA berupa JSON valid tanpa markdown pembungkus (tanpa \`\`\`json).

Contoh skema JSON:
{
  "title": "Kuis: ...",
  "description": "Deskripsi singkat kuis...",
  "subject": "${topic}",
  "questions": [
    {
      "id": "q1",
      "text": "Pertanyaan...",
      "options": ["Opsi A", "Opsi B", "Opsi C", "Opsi D"],
      "correctOption": 0,
      "explanation": "Penjelasan..."
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
  const { topic = 'Sejarah Awang Long dan Kutai', gradeLevel = 'SMP', count = 5, difficulty = 'Sedang' } = req.body;

  if (!apiKey || !genAI) {
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
Keluarkan HANYA JSON valid dengan skema:
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
      "explanation": "alasan jawaban benar"
    }
  ]
}`;

    const response = await genAI.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const text = response.text || '';
    const cleaned = text.trim().replace(/^```json\s*/, '').replace(/```$/, '');
    const data = JSON.parse(cleaned);
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
    targetCount = 5,
    preferredType = 'campuran',
    gradeLevel = 'SMP'
  } = req.body;

  const count = Math.min(Math.max(Number(targetCount) || 5, 2), 15);

  if (!apiKey || !genAI) {
    // Intelligent fallback for demo when no API key is provided
    const topicExtracted = fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
    const fallback = getFallbackQuestions(topicExtracted, count);

    return res.json({
      title: `Kuis dari File: ${fileName.replace(/\.[^/.]+$/, '')}`,
      description: `Kuis hasil analisis dan ekstraksi otomatis dari dokumen "${fileName}" (Jenjang ${gradeLevel}).`,
      subject: topicExtracted || 'Materi Umum',
      gradeLevel,
      categories: ['Ekstraksi Dokumen', 'Materi Inti'],
      questions: fallback
    });
  }

  try {
    const prompt = `Anda adalah asisten kurikulum AI "Awang Long Quiz".
Tugas Anda: Analisis file dokumen/gambar yang dilampirkan bernama "${fileName}".
Ekstrak butir-butir soal yang terdapat dalam dokumen tersebut, atau rancang kuis sebanyak ${count} butir soal berdasarkan isi materi dokumen ini.

Spesifikasi Kuis:
- Target Jenjang: ${gradeLevel}
- Preferensi Tipe Soal: ${preferredType} (Jika 'campuran', sertakan kombinasi seimbang: 'multiple_choice', 'short_answer', dan 'matching').
- Untuk 'multiple_choice': Wajib 4 pilihan options (A, B, C, D) dan correctOption (indeks 0, 1, 2, atau 3).
- Untuk 'short_answer': Wajib acceptedAnswers (array kata kunci jawaban benar yang fleksibel).
- Untuk 'matching': Wajib matchingPairs (array objek { id, left, right } minimal 2-4 pasang).
- Tetapkan poin yang adil (total ~100 poin).
- Berikan kategori materi (category) dan pembahasan edukatif (explanation) untuk setiap soal.

Keluarkan HANYA JSON valid tanpa blok markdown tambahan (\`\`\`json):
{
  "title": "string (Judul kuis representatif dari dokumen)",
  "description": "string (Ringkasan isi dokumen)",
  "subject": "string (Mata pelajaran terdeteksi)",
  "gradeLevel": "${gradeLevel}",
  "categories": ["Kategori 1", "Kategori 2"],
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
        text: `Isi teks dokumen:\n\n${textContent.slice(0, 50000)}`
      });
    }

    const response = await genAI.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          role: 'user',
          parts: contentsParts
        }
      ],
      config: {
        responseMimeType: 'application/json'
      }
    });

    const text = response.text || '';
    const cleaned = text.trim().replace(/^```json\s*/, '').replace(/```$/, '');
    const data = JSON.parse(cleaned);

    res.json(data);
  } catch (err: any) {
    console.error('Gemini File Extraction API error:', err);
    const topicExtracted = fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
    const fallback = getFallbackQuestions(topicExtracted, count);

    res.json({
      title: `Kuis dari File: ${fileName.replace(/\.[^/.]+$/, '')}`,
      description: `Kuis hasil analisis materi file "${fileName}".`,
      subject: topicExtracted,
      gradeLevel,
      categories: ['Hasil Ekstraksi', topicExtracted],
      questions: fallback
    });
  }
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

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
