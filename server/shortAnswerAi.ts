/**
 * Penilaian isian singkat berdasarkan makna, dipakai dua jalur:
 * - endpoint POST /api/grade-short-answers (dipanggil klien saat ini), dan
 * - POST /api/exam/:code/submit (penilaian di server).
 *
 * Prompt dan pembacaan balasan ada di satu tempat agar kedua jalur menilai dengan
 * aturan yang sama. Pemanggilan model dioper sebagai `generate` supaya modul ini
 * tidak terikat ke Gemini/Ollama dan bisa diuji tanpa jaringan.
 */

export interface ShortAnswerGradingItem {
  questionId: string;
  question: string;
  acceptedAnswers: string[];
  studentAnswer: string;
  explanation?: string;
}

export interface ShortAnswerQuizMeta {
  subject?: string;
  gradeLevel?: string;
  quizTitle?: string;
}

export interface ShortAnswerAiVerdict {
  questionId: string;
  isCorrect: boolean;
  confidence: 'tinggi' | 'sedang' | 'rendah';
  reason: string;
}

interface ShortAnswerPromptPayload {
  index: number;
  question: string;
  acceptedAnswers: string[];
  studentAnswer: string;
  explanation: string;
}

function buildPromptPayload(items: ShortAnswerGradingItem[]): ShortAnswerPromptPayload[] {
  return items.map((item, index) => ({
    index,
    question: String(item?.question || '').slice(0, 400),
    acceptedAnswers: (Array.isArray(item?.acceptedAnswers) ? item.acceptedAnswers : [])
      .map((answer) => String(answer || '').trim())
      .filter((answer) => answer.length > 0)
      .slice(0, 8),
    studentAnswer: String(item?.studentAnswer || '').slice(0, 400),
    explanation: String(item?.explanation || '').slice(0, 300)
  }));
}

export function buildShortAnswerPrompt(items: ShortAnswerGradingItem[], meta: ShortAnswerQuizMeta = {}): string {
  const payload = buildPromptPayload(items);
  const subject = meta.subject || 'umum';
  const gradeLevel = meta.gradeLevel || 'umum';
  const quizTitle = meta.quizTitle ? ` pada kuis "${meta.quizTitle}"` : '';

  return `Anda adalah guru penilai asesmen pendidikan yang adil dan teliti.
Nilai jawaban ISIAN SINGKAT siswa untuk bidang "${subject}" jenjang ${gradeLevel}${quizTitle}.

DATA JAWABAN:
${JSON.stringify(payload, null, 2)}

ATURAN PENILAIAN (WAJIB):
- Nilai berdasarkan MAKNA jawaban, BUKAN kecocokan karakter teks. Jangan membandingkan huruf per huruf.
- ANGGAP BENAR bila makna jawaban siswa setara dengan kunci, termasuk: sinonim, istilah lain yang semakna, singkatan umum, salah ketik kecil, perbedaan imbuhan/ejaan, urutan kata berbeda, penulisan angka vs huruf, atau jawaban lebih panjang yang tetap benar dan tidak bertentangan dengan kunci.
- ANGGAP SALAH bila konsep/nama/angka berbeda, jawaban menyebut beberapa kemungkinan sekaligus tanpa memilih yang benar, jawaban terlalu umum sehingga tidak menjawab pertanyaan, atau jawaban kosong.
- Gunakan kunci jawaban (acceptedAnswers) sebagai acuan utama; bila kunci tampak kurang lengkap, nilai menurut kebenaran faktual materi.
- reason = alasan singkat dalam bahasa Indonesia, maksimal 2 kalimat, menjelaskan mengapa jawaban dinilai benar/salah.

Keluarkan HANYA JSON array valid (tanpa markdown) berisi satu objek per jawaban, urut sesuai index:
[
  { "index": 0, "isCorrect": true, "confidence": "tinggi" | "sedang" | "rendah", "reason": "alasan singkat" }
]`;
}

export function parseShortAnswerVerdicts(
  responseText: string,
  items: ShortAnswerGradingItem[]
): ShortAnswerAiVerdict[] {
  const cleaned = String(responseText || '')
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();

  const parsed = JSON.parse(cleaned);
  const rawResults: any[] = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.results) ? parsed.results : [];

  const verdicts: ShortAnswerAiVerdict[] = [];

  for (const raw of rawResults) {
    const index = Number(raw?.index);
    if (!Number.isInteger(index) || index < 0 || index >= items.length) continue;

    const isCorrect = raw?.isCorrect === true || String(raw?.isCorrect).toLowerCase() === 'true';
    const confidence = ['tinggi', 'sedang', 'rendah'].includes(raw?.confidence) ? raw.confidence : 'sedang';

    verdicts.push({
      questionId: String(items[index]?.questionId || ''),
      isCorrect,
      confidence,
      reason:
        String(raw?.reason || '').trim().slice(0, 300) ||
        (isCorrect ? 'Makna jawaban setara dengan kunci.' : 'Jawaban belum sesuai dengan kunci.')
    });
  }

  return verdicts;
}

/**
 * Minta model menilai daftar jawaban. `generate` bertanggung jawab memilih model,
 * percobaan ulang, dan batas waktu; lempar error bila AI tidak tersedia.
 */
export async function gradeShortAnswersWithAi(
  items: ShortAnswerGradingItem[],
  meta: ShortAnswerQuizMeta,
  generate: (prompt: string) => Promise<string>
): Promise<ShortAnswerAiVerdict[]> {
  if (items.length === 0) return [];
  const responseText = await generate(buildShortAnswerPrompt(items, meta));
  return parseShortAnswerVerdicts(responseText, items);
}
