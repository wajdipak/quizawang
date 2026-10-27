# Product Requirements Document (PRD) v2.0
# Awang Long Quiz - Platform Kuis & Asesmen Multi-Mode Berbasis Firebase Native & Serverless Architecture

---

## 1. Executive Summary & Latar Belakang

**Awang Long Quiz** adalah platform kuis daring dan asesmen pembelajaran interaktif yang dirancang untuk pengajar (guru/dosen) dan peserta didik di Indonesia, dengan identitas kepahlawanan lokal Kalimantan Timur (Panglima Awang Long, Kutai Kartanegara). 

Aplikasi ini mengintegrasikan:
1. **Pembuatan Kuis Otomatis Berbasis AI (Gemini Flash)** dengan kustomisasi jenjang (SD, SMP, SMA, SMK, Kuliah) dan level kesulitan HOTS.
2. **Pustaka Bahan Bacaan Multi-Materi** (Teks, Dokumen PDF ganda dengan *Document Viewer in-app*, dan Video YouTube ganda).
3. **Arsitektur Dual Progressive Web App (PWA)** dengan manifest terpisah untuk Guru (`/`) dan Siswa (`/siswa`).
4. **Engine Multi-Mode Kuis Interaktif (Multi-Mode Quiz Engine)** yang mendukung 5 format pengerjaan berbeda:
   - **Mode Klasik (*Classic Mode*)**
   - **Mode Penguasaan (*Mastery Peak Mode*)**
   - **Mode Tempat Bermain (*Playground Arcade Mode*)**
   - **Mode Ujian (*Proctored Test Mode*)**
   - **Mode Tim (*Collaborative Team Mode*)**
5. **Arsitektur Firebase-Native & Serverless Vercel**: Menggantikan arsitektur server tradisional (seperti WebSocket murni atau Redis) dengan infrastruktur cloud serverless berbiaya nol (*Free Spark / Hobby Tier*).

---

## 2. Sasaran Pengguna & Peran Akses (User Roles & Access Control)

| Peran Pengguna | Deskripsi & Hak Akses | Metode Autentikasi |
| :--- | :--- | :--- |
| **Guru / Host Pengajar** | Membuat, mengedit, menghapus kuis, mengunggah bahan ajar, mengelola bank kategori, memilih format mode pengerjaan kuis (*Uji Soal* / *Live Session*), memproyeksikan leaderboard real-time, serta memantau dan mengunduh rekapitulasi nilai siswa (CSV). | Firebase Authentication (Google Sign-In) dengan proteksi Admin UID (`yQNuogQOmVOrLv6YPkUwaAWIfAn1`). |
| **Siswa / Peserta Didik** | Mengikuti kuis menggunakan Kode PIN atau tautan langsung (`?exam=KODE`), membaca materi in-app, mengerjakan soal interaktif sesuai mode, menerima umpan balik instan, atau menginstal Portal Siswa PWA. | Akses Tanpa Registrasi (PIN/Direct Link) atau Firebase Anonymous Authentication. |

---

## 3. Arsitektur Teknis Sistem (Firebase Native + Vercel Serverless)

### 3.1 Diagram Topologi Arsitektur

```
[ Siswa App (PWA/Web) ] <========> [ Firebase Realtime Database (RTDB) ] <========> [ Layar Proyektor Guru ]
           ^                                (Live State, Leaderboard,                       ^
           |                                Actions, Mastery, Teams)                        |
           v                                                                                v
[ Hosting Vercel CDN ] <-----------------> [ Cloud Firestore ] <-----------------> [ Dasbor Guru Admin ]
   (React 19 + Vite)                    (Quizzes, Soal, Rekap Nilai,                      (Auth RBAC)
                                         Analisis Per Kategori)
```

### 3.2 Strategi Efisiensi Serverless (Biaya Nol / Free Tier)
* **Frontend Web & PWA:** Di-deploy di Vercel (Hobby Tier) yang menyajikan static assets, edge caching, dan routing responsif.
* **Database Statis & Riwayat:** Google Cloud Firestore untuk menyimpan dokumen kuis, butir soal, bahan bacaan, dan riwayat pengiriman (*submissions*).
* **Sinkronisasi Real-Time:** Firebase Realtime Database (RTDB) atau Firestore Snapshot Listeners (`onSnapshot`) untuk sinkronisasi state latensi rendah tanpa perlu mengelola server WebSocket atau Redis 24/7.
* **Autentikasi & Keamanan:** Firebase Auth SDK terintegrasi dengan Firestore Security Rules & RTDB Security Rules.

---

## 4. Struktur Data & Model Basis Data (NoSQL Schema)

### 4.1 Skema Dokumen Cloud Firestore (Statis & Analitik)

#### A. Koleksi `quizzes/{quizId}`
```json
{
  "id": "quiz-uuid-001",
  "code": "AWG101",
  "title": "Perjuangan Panglima Awang Long",
  "description": "Sejarah pertempuran mempertahankan Kutai Kartanegara",
  "subject": "Sejarah",
  "gradeLevel": "SD",
  "durationMinutes": 10,
  "passingGrade": 75,
  "categories": ["Tokoh Sejarah", "Perang Kutai"],
  "materials": [
    {
      "id": "mat-1",
      "type": "pdf",
      "title": "Dokumen Sejarah Awang Long",
      "fileUrl": "data:application/pdf;base64,..."
    },
    {
      "id": "mat-2",
      "type": "youtube",
      "title": "Dokumenter Perang Awang Long",
      "youtubeUrl": "https://www.youtube.com/watch?v=..."
    }
  ],
  "questions": [
    {
      "id": "q1",
      "type": "multiple_choice",
      "text": "Di mana benteng pertahanan Panglima Awang Long berada?",
      "category": "Tokoh Sejarah",
      "points": 10,
      "options": ["Kutai Lama", "Samarinda Seberang", "Tenggarong", "Balikpapan"],
      "correctOption": 0,
      "explanation": "Panglima Awang Long memimpin pasukan mempertahankan benteng Kutai Lama."
    }
  ],
  "isActive": true,
  "createdBy": "USER_ADMIN_UID",
  "createdAt": "2026-10-27T08:00:00.000Z",
  "updatedAt": "2026-10-27T08:00:00.000Z"
}
```

#### B. Koleksi `submissions/{submissionId}`
```json
{
  "id": "sub-1700000000000",
  "quizId": "quiz-uuid-001",
  "quizCode": "AWG101",
  "studentName": "Ahmad Fauzi",
  "studentClass": "IV-A",
  "studentNis": "10492",
  "studentNote": "Pengerjaan selesai dengan baik",
  "answers": {
    "q1": 0,
    "q2": "Awang Long"
  },
  "score": 90,
  "earnedPoints": 90,
  "totalPoints": 100,
  "correctCount": 9,
  "totalQuestions": 10,
  "isPassed": true,
  "gameMode": "CLASSIC",
  "violationsCount": 0,
  "isDisqualified": false,
  "timeSpentSeconds": 145,
  "submittedAt": "2026-10-27T08:15:00.000Z",
  "categoryScores": {
    "Tokoh Sejarah": { "earned": 50, "total": 50, "percentage": 100 },
    "Perang Kutai": { "earned": 40, "total": 50, "percentage": 80 }
  }
}
```

### 4.2 Skema Live State (Firebase Realtime Database / Live Room Collection)

```json
{
  "sessions": {
    "AWG101": {
      "metadata": {
        "quizId": "quiz-uuid-001",
        "hostUid": "yQNuogQOmVOrLv6YPkUwaAWIfAn1",
        "gameMode": "CLASSIC",
        "status": "ACTIVE",
        "startedAt": 1700000000000
      },
      "players": {
        "PLAYER_UID_01": {
          "nickname": "Ahmad Fauzi",
          "avatar": "🦅",
          "score": 2450,
          "streak": 4,
          "teamId": "TEAM_GARUDA",
          "masteryProgress": 0.80,
          "arcadeCoins": 200,
          "isDisqualified": false,
          "violationsCount": 0,
          "lastUpdated": 1700000120000
        }
      },
      "teams": {
        "TEAM_GARUDA": { "name": "Tim Garuda", "totalScore": 7500, "memberCount": 3 },
        "TEAM_RAJAWALI": { "name": "Tim Rajawali", "totalScore": 7200, "memberCount": 3 }
      },
      "playgroundActions": {
        "ACTION_1700000130000": {
          "senderUid": "PLAYER_UID_01",
          "targetUid": "PLAYER_UID_02",
          "type": "FREEZE_SCREEN",
          "status": "PENDING",
          "timestamp": 1700000130000
        }
      }
    }
  }
}
```

---

## 5. Spesifikasi Teknis 5 Mode Pengerjaan Kuis

### 5.1 MODE 1: KLASIK (CLASSIC MODE)
* **Konsep:** Pengerjaan mandiri siswa (*student-paced*) yang mengedepankan kecepatan dan ketepatan jawaban dengan elemen gamifikasi penuh.
* **Formula Poin Kecepatan:**
  $$\text{Points} = \text{BasePoints} \times \left(0.5 + \left(0.5 \times \frac{t_{\text{sisa}}}{t_{\text{total}}}\right)\right) \times \text{StreakMultiplier}$$
  * $\text{BasePoints} = 1000$ per butir soal.
  * $\text{StreakMultiplier}$:
    * 1-2 jawaban benar berturut-turut: $1.0\times$
    * 3 berturut-turut: $1.1\times$
    * 4 berturut-turut: $1.2\times$
    * $5+$ berturut-turut: $1.5\times$ (Maksimum)
* **Power-Up Drawer (Item Bantuan):**
  1. **2x Points:** Mengalikan skor yang didapat pada butir soal berikutnya sebesar 2 kali lipat.
  2. **50/50:** Menghilangkan 2 pilihan salah pada soal pilihan ganda.
  3. **Eraser:** Menghilangkan 1 pilihan salah.
  4. **Immunity (Perisai Imunitas):** Mencegah reset streak jika salah menjawab 1 kali.
* **Papan Peringkat Real-Time (Live Leaderboard):** Skor diperbarui secara otomatis menggunakan transaksi Firebase atomic dan diproyeksikan di layar proyektor kelas.

---

### 5.2 MODE 2: PENGUASAAN (MASTERY PEAK MODE)
* **Konsep:** Asesmen formatif adaptif berkonsep "Mendaki Puncak Gunung". Bertujuan memastikan setiap siswa menuntaskan pemahaman konsep tanpa tekanan batas waktu.
* **Algoritma Adaptive Spaced Re-Queue (State Machine Frontend):**
  * Soal yang dijawab benar ditandai sebagai pos ketuntasan.
  * Soal yang dijawab salah **tidak langsung dieliminasi**, melainkan otomatis dimasukkan kembali ke antrean akhir (*re-queue bucket*) untuk diulang setelah jeda soal lain.
  * **Target Ketuntasan:** Setiap soal harus dijawab **2x berturut-turut benar** atau **1x benar bersih tanpa bantuan**.
* **Visualisasi Jalur Pendakian (Climbing Path):**
  * Menampilkan persentase ketuntasan:
    $$\text{MasteryProgress} = \frac{\text{Jumlah Soal Tuntas}}{\text{Total Soal}} \times 100\%$$
  * Layar proyektor menampilkan avatar siswa mendaki gunung menuju puncak 100%.

---

### 5.3 MODE 3: TEMPAT BERMAIN (PLAYGROUND ARCADE MODE)
* **Konsep:** *Gated-arcade system* di mana pencapaian akademik siswa menjadi energi untuk melancarkan aksi permainan kompetitif.
* **Mekanisme Arcade Coins & Sabotase:**
  * Menjawab benar memberikan **+50 Koin Arcade** dan **+1 Energi Mini-Game**.
  * **Vault Heist (Bobol Brankas):** Kesempatan membuka salah satu dari 3 brankas terenkripsi untuk mendapatkan bonus koin jackpot (+150 hingga +500 koin).
  * **Screen Freeze (Sabotase Visual Interaktif):** Mengirimkan perintah beku es ke layar siswa lawan. Layar target tertutup efek visual es beku dan harus diketuk 10 kali secara cepat untuk mencairkannya.
* **Time-Boxed Session:** Sesi dibatasi durasi waktu terkoordinasi (misal 5, 7, atau 10 menit) lalu permainan dikunci otomatis.

---

### 5.4 MODE 4: UJIAN (PROCTORED TEST MODE)
* **Konsep:** Mode asesmen formal dan steril untuk Penilaian Harian (PH), Asesmen Sumatif, UTS, maupun UAS.
* **Karakteristik Antarmuka Steril:**
  * Seluruh gamifikasi dimatikan (tidak ada musik, efek suara, meme, power-up, maupun bocoran kunci jawaban instan).
  * **Grid Navigasi Soal (*Question Grid*):** Siswa dapat melompat bebas antar-nomor soal, menandai soal ragu-ragu, serta meninjau kembali seluruh jawaban sebelum menekan *Submit Final*.
* **Sistem Anti-Cheat Proctoring:**
  * Mendengarkan event DOM `visibilitychange` dan `window.onblur`.
  * Saat siswa berpindah tab browser atau meminimalkan jendela, sistem mencatat `violationsCount` secara otomatis.
  * **Peringatan 1 - 2:** Muncul dialog peringatan integritas di layar siswa.
  * **Peringatan 3:** Ujian langsung dikunci secara otomatis (*Auto-Submit*) dan ditandai `DISQUALIFIED` pada rekap nilai guru.

---

### 5.5 MODE 5: TIM (COLLABORATIVE TEAM MODE)
* **Konsep:** Membangun kolaborasi dan kerja tim melalui kompetisi kelompok (**Tim Garuda / Merah** vs **Tim Rajawali / Biru**).
* **Agregasi Skor Kolektif:**
  * Setiap poin yang didapatkan anggota tim otomatis menambah skor total regu mereka di Firebase.
* **Penyeimbang Jumlah Anggota (Weighted Average Balancing):**
  * Jika jumlah anggota tim tidak seimbang (misal Tim Garuda 3 siswa, Tim Rajawali 4 siswa), skor dinormalisasi dengan formula rata-rata tertimbang:
    $$\text{TeamScore}_{\text{Normalized}} = \frac{\sum \text{Skor Anggota}}{\text{Jumlah Anggota Aktif}} \times \text{Faktor Pengali}$$
* **Live Race Board:** Lintasan animasi balap regu di layar proyektor yang meluncur dinamis menuju garis akhir finish.

---

## 6. Matriks Perbandingan Fitur 5 Mode

| Parameter / Fitur | Klasik (Classic) | Penguasaan (Mastery) | Tempat Bermain (Playground) | Ujian (Proctored Test) | Tim (Collaborative) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Kecepatan Mempengaruhi Poin** | Ya (Formula Kecepatan) | Tidak (Fokus Akurasi) | Ya | Tidak (Skor Baku) | Ya |
| **Batas Waktu Soal** | Aktif per Soal | Dinonaktifkan | Waktu Global Sesi | Waktu Global Kuis | Waktu Global Kuis |
| **Perulangan Soal Salah** | Tidak | **Ya (Wajib Re-Queue)** | Tidak | Tidak | Tidak |
| **Power-Ups & Bantuan** | 4 Jenis Power-Up | Dinonaktifkan | Koin & Mini-Game | Dinonaktifkan | Opsional |
| **Sistem Anti-Cheat Ketat** | Standar | Standar | Standar | **Ketat (Tab Blur + Lock)** | Standar |
| **Navigasi Butir Soal** | Sekuensial | Adaptif | Sekuensial | **Bebas (Grid Navigasi)** | Sekuensial |
| **Umpan Balik Jawaban Instan** | Ya | Ya + Penjelasan | Ya | Tidak (Tuntas di Akhir) | Ya |
| **Tampilan Leaderboard** | Perorangan Real-Time | Jalur Puncak Gunung | Skor + Koin Terbanyak | Dinonaktifkan | Balapan Regu (Race Board) |

---

## 7. Keamanan & Aturan Akses (Firebase Security Rules)

### 7.1 Cloud Firestore Security Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper validasi
    function isAdmin() {
      return request.auth != null && request.auth.uid == 'yQNuogQOmVOrLv6YPkUwaAWIfAn1';
    }
    
    // Koleksi Kuis
    match /quizzes/{quizId} {
      allow read: if true; // Siswa dapat membaca kuis via PIN/Link
      allow write: if isAdmin(); // Hanya guru admin yang boleh membuat/mengubah kuis
    }
    
    // Koleksi Pengiriman Jawaban Siswa (Submissions)
    match /submissions/{subId} {
      allow create: if true; // Siswa dapat mengirimkan hasil pengerjaan kuis
      allow read, delete: if isAdmin(); // Hanya guru yang dapat melihat rekap dan menghapus
    }
  }
}
```

### 7.2 Firebase Realtime Database Security Rules
```json
{
  "rules": {
    "sessions": {
      "$roomCode": {
        ".read": "true",
        ".write": "auth != null",
        "players": {
          "$playerUid": {
            ".write": "true"
          }
        },
        "playgroundActions": {
          ".write": "true"
        }
      }
    }
  }
}
```

---

## 8. Panduan Integrasi Vercel Deployment

1. **Pengaturan Repositori Git:** Sambungkan branch utama repositori ke Vercel.
2. **Environment Variables di Vercel Dashboard:**
   * `VITE_FIREBASE_API_KEY`: Kunci API project Firebase.
   * `VITE_FIREBASE_AUTH_DOMAIN`: Domain autentikasi Firebase.
   * `VITE_FIREBASE_PROJECT_ID`: ID project cloud Firebase.
   * `VITE_FIREBASE_DATABASE_URL`: URL Firebase Realtime Database.
   * `VITE_GEMINI_API_KEY`: Kunci API Google AI Studio / Gemini API (dijaga pada proxy serverless `/api/*`).
3. **Optimasi Caching PWA:** File service worker `dist/sw.js` dikonfigurasi dengan header `Cache-Control: no-cache` agar pembaruan rilis langsung diterima oleh perangkat guru dan siswa.

---

## 9. Kesimpulan & Roadmap Ke Depan

Pembaruan PRD v2.0 ini menyelaraskan seluruh fitur kuis yang telah dibangun di aplikasi **Awang Long Quiz** dengan arsitektur **Firebase-Native**. Dengan memadukan Vercel dan Firebase, platform mencapai kinerja *real-time* yang tangguh, hemat biaya operasional (*serverless zero-tier*), aman dari manipulasi, serta siap digunakan untuk pembelajaran harian maupun ujian berskala besar.
