// Mendeteksi butir soal yang teksnya merujuk pada gambar/diagram pada dokumen asli.
// Gambar tidak ikut diekstrak (hanya teksnya), jadi soal seperti ini perlu
// ditandai agar guru menambahkan gambarnya secara manual di editor kuis.

const IMAGE_NOUN = '(gambar|diagram|grafik|foto|ilustrasi|bagan|peta|lukisan)';

const IMAGE_REFERENCE_PATTERNS = [
  // "gambar berikut", "gambar di bawah", "gambar tersebut", "gambar 2"
  new RegExp(
    `\\b${IMAGE_NOUN}\\s+(berikut|di\\s*(atas|bawah|samping|sebelah)|tersebut|ini|no\\.?\\s*\\d+|\\d+)`,
    'i'
  ),
  // "perhatikan gambar", "amatilah diagram", "cermati grafik di atas"
  new RegExp(`\\b(perhatikan|perhatikanlah|amatilah|amatilah|cermatilah|lihatlah)\\b[^.!?]{0,60}\\b${IMAGE_NOUN}\\b`, 'i'),
  // "berdasarkan gambar", "pada gambar", "seperti pada foto"
  new RegExp(`\\b(berdasarkan|pada|sesuai|seperti|dari|dalam|menurut)\\s+${IMAGE_NOUN}\\b`, 'i'),
  // "(gambar)", "(lihat diagram)"
  new RegExp(`\\(\\s*${IMAGE_NOUN}[^)]*\\)`, 'i')
];

export function questionRefersToImage(text?: string | null): boolean {
  if (!text) return false;
  return IMAGE_REFERENCE_PATTERNS.some((pattern) => pattern.test(text));
}
