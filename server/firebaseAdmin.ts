import { applicationDefault, cert, getApp, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

/**
 * Koneksi Firebase Admin untuk sisi server.
 *
 * Kredensial dibaca dari environment, tidak pernah dari file yang di-commit:
 * - FIREBASE_PROJECT_ID
 * - FIREBASE_CLIENT_EMAIL
 * - FIREBASE_PRIVATE_KEY  (isi private_key dengan "\n" ditulis sebagai \n)
 * - FIREBASE_DATABASE_ID  (opsional; proyek ini memakai named database, bukan "(default)")
 *
 * Saat FIRESTORE_EMULATOR_HOST diisi (uji lokal), emulator tidak memeriksa kredensial
 * sehingga cukup project id. Tanpa kredensial dan tanpa emulator, getAdminDb() melempar
 * error yang jelas; server tetap bisa jalan untuk fitur lain.
 */
let cachedDb: Firestore | null = null;

function usingEmulator(): boolean {
  return Boolean(process.env.FIRESTORE_EMULATOR_HOST);
}

export function isFirebaseAdminConfigured(): boolean {
  if (usingEmulator()) return true;
  return Boolean(process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY);
}

function resolveProjectId(): string {
  return (
    process.env.FIREBASE_PROJECT_ID ||
    process.env.GCLOUD_PROJECT ||
    process.env.GCP_PROJECT ||
    (usingEmulator() ? 'demo-exam' : '')
  );
}

function createAdminApp(): App {
  if (getApps().length > 0) return getApp();

  const projectId = resolveProjectId();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (clientEmail && privateKey) {
    return initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
      projectId: projectId || undefined
    });
  }

  if (usingEmulator()) {
    // Kredensial tidak dipakai emulator, cukup project id sebagai namespace data.
    return initializeApp({ projectId: projectId || 'demo-exam' });
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return initializeApp({
      credential: applicationDefault(),
      projectId: projectId || undefined
    });
  }

  throw new Error(
    'Kredensial Firebase Admin belum diatur. Isi FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, dan FIREBASE_PRIVATE_KEY (atau jalankan dengan FIRESTORE_EMULATOR_HOST untuk uji lokal).'
  );
}

/** Firestore Admin (melewati security rules) untuk membaca kuis dan menulis hasil siswa. */
export function getAdminDb(): Firestore {
  if (cachedDb) return cachedDb;
  const app = createAdminApp();
  const databaseId = process.env.FIREBASE_DATABASE_ID?.trim();
  cachedDb = databaseId ? getFirestore(app, databaseId) : getFirestore(app);
  return cachedDb;
}

/** Dipakai uji agar koneksi dibuat ulang setelah environment berubah. */
export function resetAdminDbForTests(): void {
  cachedDb = null;
}
