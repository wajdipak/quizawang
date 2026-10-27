# Product Requirement Document (PRD)

## Fitur Tambahan: Engine Multi-Mode Kuis Berbasis Firebase & Serverless Architecture

---

## 1. Ringkasan Eksekutif & Tujuan Arsitektur

Dokumen ini mendefinisikan spesifikasi fungsional dan teknis untuk mengimplementasikan 5 mode pengerjaan kuis interaktif (*Classic*, *Mastery*, *Playground*, *Test*, dan *Team*) menggunakan **Firebase** sebagai penopang *backend real-time*, yang di-deploy di **Vercel (Hobby/Free Tier)**.

### Strategi Arsitektur Firebase + Vercel:
* **Host / Frontend:** Vercel (Next.js / React / Vite).
* **Real-time Synchronization & Leaderboard:** Firebase Realtime Database (RTDB) & Cloud Firestore.
* **Authentication:** Firebase Authentication (Anonymous & Email/Google Auth).
* **Backend Logic & Validasi Skor:** Firebase Cloud Functions (opsional/serverless REST API) atau Firestore Rules.

---

## 2. Struktur Data Firebase (Database Schema & NoSQL Model)

Untuk mengoptimalkan biaya dan performa *real-time* di Firebase, data dipisah menjadi 2 bagian:
1. **Cloud Firestore:** Menyimpan data dokumen statis/semi-statis (Kuis, Bank Soal, Log Hasil Akhir, Riwayat Ujian).
2. **Firebase Realtime Database (RTDB):** Menyimpan data *live session* yang sering berubah (Posisi Leaderboard, Status Player, Timer Global, Action Items).

### 2.1 Schema Cloud Firestore (Statis & Analitik)

```json
// Collection: quizzes/{quizId}
{
  "title": "Kuis Fisika Dasar",
  "creatorId": "USER_ID_GURU",
  "createdAt": "TIMESTAMP",
  "questions": [
    {
      "questionId": "q1",
      "text": "Berapakah kecepatan cahaya?",
      "options": [
        { "id": "opt_a", "text": "3x10^8 m/s", "isCorrect": true },
        { "id": "opt_b", "text": "1500 m/s", "isCorrect": false }
      ],
      "timeLimitSeconds": 30,
      "points": 1000
    }
  ]
}

// Collection: quiz_results/{resultId} (Disimpan setelah game selesai)
{
  "sessionId": "ROOM_CODE_123456",
  "quizId": "QUIZ_ID",
  "gameMode": "CLASSIC",
  "endedAt": "TIMESTAMP",
  "playerSummary": [
    {
      "uid": "PLAYER_UID",
      "nickname": "Budi",
      "finalScore": 4500,
      "accuracy": 85.5,
      "rank": 1
    }
  ]
}
```

### 2.2 Schema Firebase Realtime Database (RTDB) (Live Game State)

```json
{
  "sessions": {
    "ROOM_CODE_123456": {
      "metadata": {
        "quizId": "QUIZ_ID_001",
        "hostUid": "HOST_USER_ID",
        "gameMode": "CLASSIC", // CLASSIC | MASTERY | PLAYGROUND | TEST | TEAM
        "status": "ACTIVE", // WAITING | ACTIVE | ENDED
        "currentQuestionIndex": 0,
        "startedAt": 1700000000000
      },
      "players": {
        "PLAYER_UID_1": {
          "nickname": "Budi",
          "avatar": "bear_icon",
          "score": 1850,
          "streak": 3,
          "teamId": "TEAM_RED",
          "masteryProgress": 0.45,
          "arcadeCoins": 150,
          "isDisqualified": false,
          "violationsCount": 0,
          "lastAnsweredQuestion": "q1"
        }
      },
      "teams": {
        "TEAM_RED": { "name": "Tim Merah", "totalScore": 4200, "color": "#FF0000" },
        "TEAM_BLUE": { "name": "Tim Biru", "totalScore": 3800, "color": "#0000FF" }
      },
      "playgroundActions": {
        "ACTION_ID_01": {
          "senderUid": "PLAYER_UID_1",
          "targetUid": "PLAYER_UID_2",
          "type": "FREEZE_SCREEN",
          "durationMs": 5000,
          "timestamp": 1700000050000
        }
      }
    }
  }
}
```

---

## 3. Spesifikasi Teknis Per Mode Pengerjaan Berbasis Firebase

---

### MODE 1: KLASIK (CLASSIC MODE)

#### A. Konsep Pengerjaan
Mode individual mandiri (*student-paced*). Poin dihitung langsung di *client-side* atau Cloud Function berdasarkan kecepatan dan ketepatan, lalu disinkronkan ke RTDB.

#### B. Logika Hitung Skor & Firebase Listener
* **Rumus Skor Client-side:**
  $$\text{Points} = \text{BasePoints} \times \left(0.5 + \left(0.5 \times \frac{t_{\text{sisa}}}{t_{\text{total}}}\right)\right) \times \text{StreakMultiplier}$$

* **Alur Perubahan Data di Firebase RTDB:**
  1. Siswa memilih jawaban di aplikasi React/Next.js.
  2. Aplikasi mengevaluasi apakah jawaban benar.
  3. Menggunakan transaksi atomic Firebase RTDB (`runTransaction`) untuk mencegah *race condition* pada skor dan *streak*:

```javascript
// Contoh Logika JavaScript Client-Side (React)
import { ref, runTransaction } from "firebase/database";
import { rtdb } from "./firebaseConfig";

function submitAnswerClassic(roomCode, playerUid, pointsEarned, isCorrect) {
  const playerRef = ref(rtdb, `sessions/${roomCode}/players/${playerUid}`);
  
  runTransaction(playerRef, (player) => {
    if (player) {
      if (isCorrect) {
        player.score = (player.score || 0) + pointsEarned;
        player.streak = (player.streak || 0) + 1;
      } else {
        player.streak = 0;
      }
    }
    return player;
  });
}
```

* **Leaderboard Proyektor:** Layar Guru cukup mendengarkan *event* RTDB:
  ```javascript
  onValue(ref(rtdb, `sessions/${roomCode}/players`), (snapshot) => {
    const players = snapshot.val();
    // Sort player berdasarkan player.score secara langsung di Frontend Guru
  });
  ```

---

### MODE 2: PENGUASAAN (MASTERY PEAK MODE)

#### A. Konsep Pengerjaan
Mode adaptif pendakian gunung. Setiap siswa berusaha mencapai puncak (100% *mastery*). Soal yang dijawab salah dimasukkan kembali ke antrean lokal (*re-queue array*) untuk diulang nanti.

#### B. Algoritma Adaptif Lokal (State Machine Frontend)
* **Koleksi Soal Lokal Siswa:**
  Sistem mengunduh seluruh soal dari Firestore saat kuis dimulai dan menyimpannya di *State* lokal (e.g., React `useState`).

```javascript
// Antrean Soal Adaptif (Lokal State Siswa)
let questionQueue = [...initialQuestions];
let masteredQuestions = new Set();

function handleAnswerMastery(questionId, isCorrect) {
  if (isCorrect) {
    masteredQuestions.add(questionId);
    // Hapus dari antrean
    questionQueue = questionQueue.filter(q => q.id !== questionId);
  } else {
    // Pindahkan soal ke posisi belakang antrean (Spaced Repetition)
    const currentQ = questionQueue.shift();
    questionQueue.push(currentQ); 
  }

  // Hitung persentase mastery
  const progressRatio = masteredQuestions.size / totalQuestions;
  
  // Sinkronkan progress ke Firebase RTDB
  update(ref(rtdb, `sessions/${roomCode}/players/${playerUid}`), {
    masteryProgress: progressRatio
  });
}
```

#### C. Tampilan Layar Utama (Proyektor Guru)
Dasbor guru mendengarkan field `masteryProgress` dari semua pemain dan menggambar posisi avatar di komponen SVG/Canvas Puncak Gunung.

---

### MODE 3: TEMPAT BERMAIN (PLAYGROUND / MINI-GAMES MODE)

#### A. Konsep Pengerjaan
Siswa mengumpulkan `arcadeCoins` setiap kali menjawab benar, kemudian dapat menggunakan koin tersebut untuk melancarkan serangan (*sabotage action*) ke pemain lain atau memainkan *mini-game*.

#### B. Mekanisme Fitur Sabotase (Realtime Inter-Player Action)

1. **Mengirim Serangan:** Siswa A memilih untuk membekukan layar Siswa B (biaya 100 koin).
2. **Kirim Event ke Firebase RTDB:**
   ```javascript
   function launchSabotage(roomCode, senderUid, targetUid, actionType) {
     const actionRef = ref(rtdb, `sessions/${roomCode}/playgroundActions/${Date.now()}`);
     set(actionRef, {
       senderUid,
       targetUid,
       type: actionType, // "FREEZE_SCREEN" | "STEAL_COINS"
       status: "PENDING"
     });
   }
   ```
3. **Mendengarkan Serangan di Layar Siswa B (Target):**
   ```javascript
   // Di dalam komponen React Siswa B
   useEffect(() => {
     const actionsRef = ref(rtdb, `sessions/${roomCode}/playgroundActions`);
     const unsubscribe = onChildAdded(actionsRef, (snapshot) => {
       const action = snapshot.val();
       if (action.targetUid === playerUid && action.status === "PENDING") {
         // Trigger Efek Visual Es / Freeze Screen di UI Siswa B
         triggerFreezeUI(action.type);
       }
     });
     return () => unsubscribe();
   }, []);
   ```

---

### MODE 4: UJIAN (PROCTORED TEST MODE)

#### A. Konsep Pengerjaan
Mode formal tanpa gamifikasi. Memiliki sistem pencatatan kecurangan jika siswa meninggalkan *browser/tab*.

#### B. Algoritma Anti-Cheat & Visibility API

```javascript
// Hook React untuk memantau integritas pengerjaan
useEffect(() => {
  const handleVisibilityChange = () => {
    if (document.hidden) {
      // Siswa berpindah tab / keluar dari aplikasi
      logViolationToFirebase();
    }
  };

  window.addEventListener("visibilitychange", handleVisibilityChange);
  return () => window.removeEventListener("visibilitychange", handleVisibilityChange);
}, []);

function logViolationToFirebase() {
  const playerRef = ref(rtdb, `sessions/${roomCode}/players/${playerUid}`);
  runTransaction(playerRef, (player) => {
    if (player) {
      player.violationsCount = (player.violationsCount || 0) + 1;
      // Jika melebihi 3 kali pelanggaran, diskualifikasi otomatis
      if (player.violationsCount >= 3) {
        player.isDisqualified = true;
      }
    }
    return player;
  });
}
```

#### C. Pembatasan UI Ujian
* Menggunakan Firestore/RTDB `metadata.status` untuk mengunci kuis jika waktu habis.
* Fitur *Navigation Grid* memungkinkan siswa berpindah antar-nomor soal dengan bebas secara lokal sebelum menekan tombol *Submit Final*.

---

### MODE 5: TIM (COLLABORATIVE TEAM MODE)

#### A. Konsep Pengerjaan
Pemain dibagi ke dalam beberapa kelompok. Poin individual otomatis terakumulasi ke dalam total skor tim.

#### B. Logika Agregasi Skor Tim (Firebase RTDB Transaction)

Saat Siswa A dari Tim Merah mendapatkan poin, dua lokasi data diperbarui secara simultan:

```javascript
function submitTeamAnswer(roomCode, playerUid, teamId, pointsEarned) {
  // Update poin perorangan
  const playerRef = ref(rtdb, `sessions/${roomCode}/players/${playerUid}/score`);
  runTransaction(playerRef, (score) => (score || 0) + pointsEarned);

  // Update total poin tim
  const teamRef = ref(rtdb, `sessions/${roomCode}/teams/${teamId}/totalScore`);
  runTransaction(teamRef, (totalScore) => (totalScore || 0) + pointsEarned);
}
```

#### C. Penyeimbang Skor (Skor Rata-Rata Terbobot)
Jika *Tim Merah* memilik 3 anggota dan *Tim Biru* memiliki 5 anggota, tampilan *Real-Time Leaderboard* tim di layar proyektor dapat dihitung berdasarkan skor rata-rata:

$$\text{TeamAverage} = \frac{\text{teams}[teamId].totalScore}{\text{Jumlah Anggota Aktif}}$$

---

## 4. Keamanan & Aturan Akses (Firebase Security Rules)

Untuk mencegah kecurangan manipulasi skor dari *browser developer console*, tambahkan aturan keamanan pada **Firebase Realtime Database Rules**:

```json
{
  "rules": {
    "sessions": {
      "$roomCode": {
        ".read": "auth != null",
        ".write": "auth != null",
        "players": {
          "$playerUid": {
            // Pemain hanya boleh mengubah data miliknya sendiri
            ".write": "auth != null && auth.uid === $playerUid"
          }
        },
        "metadata": {
          // Hanya Guru (Host) yang boleh mengubah status kuis
          ".write": "auth != null && data.child('hostUid').val() === auth.uid"
        }
      }
    }
  }
}
```

---

## 5. Ringkasan Integrasi Vercel & Firebase

1. **Deploy Frontend ke Vercel:** Hubungkan repositori GitHub aplikasi React/Next.js Anda ke Vercel. 
2. **Environment Variables:** Masukkan kredensial Firebase ke bagian **Environment Variables** di dasbor Vercel:
   * `NEXT_PUBLIC_FIREBASE_API_KEY`
   * `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   * `NEXT_PUBLIC_FIREBASE_DATABASE_URL`
3. **Tanpa Biaya Server 24/7:** Seluruh logika *real-time* berjalan di atas infrastruktur gratis Firebase RTDB (hingga 100 koneksi simultan bersamaan pada paket *Free Spark*), sementara frontend dilayani oleh Vercel CDN secara efisien.