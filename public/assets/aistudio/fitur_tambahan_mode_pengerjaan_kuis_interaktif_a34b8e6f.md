# Product Requirement Document (PRD)

## Fitur Tambahan: Engine Mode Pengerjaan Multi-Format (Multi-Mode Quiz Engine)

## 1. Ringkasan Eksekutif & Tujuan Sistem

Dokumen ini menetapkan spesifikasi teknis dan fungsional untuk membangun modul **Multi-Mode Quiz Engine** pada platform kuis/asesmen. Sistem ini mendukung 5 mode pengerjaan langsung (*live session*):

1. **Mode Klasik (*Classic Mode*)**
2. **Mode Penguasaan (*Mastery Peak Mode*)**
3. **Mode Tempat Bermain (*Playground Arcade Mode*)**
4. **Mode Ujian (*Proctored Test Mode*)**
5. **Mode Tim (*Collaborative Team Mode*)**

Tujuan utama sistem ini adalah menyediakan fleksibilitas pedagogis (dari asesmen formal, formatif adaptif, hingga gamifikasi kompetitif) dengan memisahkan *Core Question Engine* dari *Game Rules & Presentation Layer*.

---

## 2. Arsitektur Teknis Sistem (System Architecture)

### 2.1 Arsitektur Real-Time (WebSocket & Event-Driven)

* **Protocol:** WebSockets (Socket.io / Native WebSockets) untuk *state synchronization* berketerlambatan rendah (<100ms).
* **In-Memory Store:** Redis Key-Value Store & Sorted Sets (ZSET) untuk menyimpan *live session state*, *real-time leaderboards*, dan *event queues*.
* **Database Persistent:** PostgreSQL / MongoDB untuk penyimpanan permanen *quiz content*, *player responses*, dan *historical analytics*.

```
[Siswa App] <---> [WebSocket Gateway / Socket Server] <---> [Redis In-Memory State]
                       |                                            |
                [Event Processor]                          [Leaderboard Worker]
                       |                                            |
                       +------------------> [Primary Database] <-----+
```

### 2.2 Model Data & Skema Basis Data (Database Schema)

```sql
-- Session Master Table
CREATE TABLE quiz_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID NOT NULL,
    host_id UUID NOT NULL,
    room_code VARCHAR(8) UNIQUE NOT NULL,
    game_mode VARCHAR(20) NOT NULL CHECK (game_mode IN ('CLASSIC', 'MASTERY', 'PLAYGROUND', 'TEST', 'TEAM')),
    settings JSONB NOT NULL DEFAULT '{}', -- Custom mode config
    status VARCHAR(15) NOT NULL DEFAULT 'WAITING' CHECK (status IN ('WAITING', 'ACTIVE', 'PAUSED', 'ENDED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP WITH TIME ZONE
);

-- Player Progress & State
CREATE TABLE session_players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES quiz_sessions(id) ON DELETE CASCADE,
    user_id UUID,
    nickname VARCHAR(50) NOT NULL,
    team_id VARCHAR(50), -- Used if game_mode = 'TEAM'
    total_score INT DEFAULT 0,
    accuracy_rate FLOAT DEFAULT 0.0,
    streak_count INT DEFAULT 0,
    mastery_level FLOAT DEFAULT 0.0, -- Used if game_mode = 'MASTERY'
    arcade_coins INT DEFAULT 0, -- Used if game_mode = 'PLAYGROUND'
    is_disqualified BOOLEAN DEFAULT FALSE, -- Used in TEST mode
    violations_count INT DEFAULT 0,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Player Responses Log
CREATE TABLE player_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES quiz_sessions(id),
    player_id UUID REFERENCES session_players(id),
    question_id UUID NOT NULL,
    selected_option_ids JSONB NOT NULL,
    is_correct BOOLEAN NOT NULL,
    time_taken_ms INT NOT NULL,
    points_awarded INT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

## 3. Spesifikasi Teknis Per Mode Pengerjaan

### MODE 1: KLASIK (CLASSIC MODE)

#### A. Konsep & Alur Pengerjaan
Mode individual di mana siswa menjawab soal secara *student-paced* (kecepatan masing-masing) dengan elemen gamifikasi lengkap (*power-ups*, *streak bonuses*, dan *leaderboard* dinamis).

#### B. Logika Skor & Algoritma
Skor dihitung berdasarkan kombinasi **Ketepatan Jawaban**, **Sisa Waktu**, dan **Streak Multiplier**.

$$\text{Points} = \text{BasePoints} \times \left(0.5 + \left(0.5 \times \frac{t_{\text{remaining}}}{t_{\text{total}}}\right)\right) \times \text{StreakMultiplier}$$

* **BasePoints:** 1000 poin per soal.
* **StreakMultiplier:**
  * 1-2 berturut-turut: $1.0\times$
  * 3 berturut-turut: $1.1\times$
  * 4 berturut-turut: $1.2\times$
  * $5+$ berturut-turut: $1.5\times$ (Maksimum)

#### C. Redis Leaderboard Engine
Menggunakan Redis **Sorted Sets (ZSET)**:
* `ZADD leaderboard:<session_id> <score> <player_id>`
* Pembaharuan posisi otomatis dipancarkan via WebSocket `LEADERBOARD_UPDATE` ke proyektor guru.

#### D. Fitur Power-Ups (Item Khusus)
Diberikan acak setiap kali menjawab 3 soal benar berturut-turut:
1. **2x Points:** Mengalikan skor soal berikutnya sebesar $2\times$.
2. **50/50:** Menghilangkan 2 pilihan jawaban salah di layar player.
3. **Eraser:** Menghapus 1 pilihan jawaban salah untuk seluruh kelas (opsional).
4. **Immunity:** Mencegah penurunan streak jika salah menjawab 1 kali.

---

### MODE 2: PENGUASAAN (MASTERY PEAK MODE)

#### A. Konsep & Alur Pengerjaan
Mode adaptif di mana siswa bersaing "mendaki puncak gunung". Menyoroti ketepatan jawaban di atas kecepatan. Soal yang dijawab salah akan diulang (*spaced repetition*) hingga dikuasai.

#### B. Algoritma Adaptive Repetition & State Machine

```
               [Mulai Soal Baru]
                      |
              [Player Menjawab]
                      |
        +-------------+-------------+
        |                           |
   (Jawaban BENAR)             (Jawaban SALAH)
        |                           |
   +1 Mastery Node              0 Mastery Node
   Progres Mendaki Naikan       Soal dimasukkan ke
                                "Re-queue Bucket"
                                            |
                                 [Diputar Kembali setelah
                                  N-soal berikutnya]
```

* **Target Ketuntasan (*Mastery Goal*):** Setiap soal harus dijawab **Benar 2x Berturut-turut** atau **1x Benar tanpa bantuan**.
* **Kalkulasi Progres (*Mastery Percentage*):**
  $$\text{Progress} = \frac{\sum_{i=1}^{N} \text{MasteryStatus}(Q_i)}{N} \times 100\%$$
  di mana $\text{MasteryStatus}(Q_i) = 1$ jika tuntas, $0.5$ jika pernah salah tetapi kemudian benar, $0$ jika belum dijawab/masih salah.

#### C. Visualisasi Frontend (Mastery Peak)
* **Visual Proyektor:** Menampilkan peta jalur pendakian gunung (*Climbing Path*). Setiap *player* direpresentasikan oleh *avatar node* pada ketinggian sesuai persentase *Mastery*.
* **Tanpa Timer Soal:** Menghilangkan perhitungan bonus waktu agar siswa tidak terburu-buru.

---

### MODE 3: TEMPAT BERMAIN (PLAYGROUND / MINI-GAMES MODE)

#### A. Konsep & Alur Pengerjaan
Gated-arcade system: Siswa menjawab soal untuk mendapatkan koin/energi, kemudian menggunakan energi tersebut untuk memainkan *mini-game* singkat atau menyerang *player* lain.

#### B. Loop Mekanika Permainan (Game Loop Engine)

```
[Jawab Soal Kuis] ---> (Benar) ---> [+50 Arcade Coins / +1 Energy]
                                         |
                                         v
                            [Buka Akses Mini-Game / Action]
                                         |
                       +-----------------+-----------------+
                       |                                   |
            [Mainkan Mini-Game Standalone]       [Gunakan Action pada Player Lain]
            (cth: Vault Hack / Tower Build)      (cth: Curi Koin, Freeze Screen)
```

#### C. Spesifikasi Mini-Game Action Modules
1. **Vault Heist (Pencurian Brankas):**
   * Membuka pilihan 3 brankas acak milik lawan.
   * Mengambil 10-30% koin milik lawan terpilih secara *real-time*.
2. **Screen Freeze (Sabotase Visual):**
   * Mengirimkan *payload* WebSocket `ACTION_FREEZE` ke *player* tertentu.
   * Layar target tertutup efek es/kabut selama 5 detik dan harus ditetap/diklik 10x untuk menghancurkannya.

#### D. Time-Boxed Sync
* Durasi total sesi ditentukan oleh guru (misal: 7 menit).
* Ketika *timer* global berakhir, server mengirim perintah `FORCE_STOP_GAME` dan mengunci seluruh *state* permainan.

---

### MODE 4: UJIAN (PROCTORED TEST MODE)

#### A. Konsep & Alur Pengerjaan
Asesmen formal tanpa atribut gamifikasi. Fokus pada pengawasan integritas (*anti-cheat proctoring*), keheningan, dan stabilitas pengerjaan.

#### B. Fitur Anti-Cheat & Proctoring Engine

1. **Blur / Visibility State Detection:**
   * Frontend mendengarkan event DOM `visibilitychange` dan `window.onblur`.
   * Jika siswa berpindah *tab* atau meminimalkan *browser*, *timer violation* mencatat kejadian tersebut.
   * Payload dikirim ke WebSocket Server:
     ```json
     {
       "event": "PROCTOR_VIOLATION",
       "session_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
       "player_id": "a1b2c3d4",
       "type": "TAB_SWITCH",
       "timestamp": 1700000000000
     }
     ```
2. **Auto-Submit & Threshold disqualification:**
   * **Peringatan 1-2:** Peringatan modal pada layar siswa.
   * **Peringatan 3 (Aturan Konfigurasi):** Kuis dikunci secara otomatis (*Auto-submitted*) dan ditandai `DISQUALIFIED` pada dasbor pengawas.

#### C. UI/UX Interface Constraints
* **Disabled Features:** Musik, suara efek, *power-ups*, *memes*, *leaderboard* publik, dan indikator jawaban benar/salah setelah menjawab.
* **Navigation Control:** Siswa diberikan daftar nomor (*Question Grid*) untuk dapat melompati, meninjau kembali, atau mengubah jawaban sebelum *submit* akhir.

---

### MODE 5: TIM (COLLABORATIVE TEAM MODE)

#### A. Konsep & Alur Pengerjaan
Siswa dikelompokkan ke dalam beberapa tim. Poin individual dikontribusikan secara kolektif untuk menggerakkan skor tim pada *leaderboard* utama.

#### B. Algoritma Pembagian Tim (Team Matchmaking)

```
[Daftar Siswa di Lobby] ---> [Trigger Start Game]
                                   |
             +---------------------+---------------------+
             |                                           |
    [Auto-Balance Assignment]                   [Manual Assignment]
    (Berdasarkan urutan join                    (Ditentukan oleh Guru
     atau skor historis)                         di Dasbor Admin)
```

#### C. Agregasi Skor Real-Time (Redis Implementation)
* Setiap tim memiliki baris data ZSET tersendiri: `leaderboard_teams:<session_id>`.
* Saat *Player A* di *Tim Merah* mendapat 800 poin:
  ```redis
  ZINCRBY leaderboard_teams:<session_id> 800 "TEAM_RED"
  ```
* Broadcast WebSocket dikirim ke layar proyektor untuk memperbarui posisi animasi avatar balapan tim (*Race Board*).

#### D. Mekanisme Balancing (Penyeimbang Jumlah Anggota)
Jika *Tim A* berisi 4 orang dan *Tim B* berisi 5 orang, skor dihitung dengan formula koreksi rata-rata terbobot (*Weighted Average Score*) agar tim dengan anggota lebih sedikit tidak dirugikan:

$$\text{TeamScore}_{\text{Normalized}} = \frac{\sum \text{IndividualScores}}{\text{TotalMembers}} \times \text{BaseFactor}$$

---

## 4. Matriks Perbandingan Fitur Mode (Feature Matrix)

| Fitur / Parameter | Klasik | Penguasaan | Tempat Bermain | Ujian | Tim |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Kecepatan Mempengaruhi Poin** | Ya | Tidak | Ya | Tidak | Ya |
| **Leaderboard Publik** | Perorangan | Jalur Puncak | Perorangan | Dinonaktifkan | Per Tim |
| **Power-Ups & Items** | Ya | Tidak | Mini-game Items | Dinonaktifkan | Tergantung opsi |
| **Pengulangan Soal Salah** | Tidak | Ya (Wajib) | Tidak | Tidak | Tidak |
| **Sistem Anti-Cheat Log** | Basic | Basic | Basic | **Ketat (Strict)** | Basic |
| **Navigasi Soal** | Sekuensial | Adaptif | Sekuensial | Bebas (Grid) | Sekuensial |
| **Umpan Balik Jawaban Instan**| Ya | Ya | Ya | Tidak | Ya |

---

## 5. Alur Event WebSocket (WebSocket Event Contracts)

Berikut adalah kontrak pesan dasar yang wajib diimplementasikan pada WebSocket Gateway server Anda:

### 1. Event: Submit Answer (Client -> Server)
```json
{
  "event": "SUBMIT_ANSWER",
  "payload": {
    "session_id": "STRING",
    "player_id": "STRING",
    "question_id": "STRING",
    "selected_options": ["OPT_A"],
    "time_taken_ms": 4500
  }
}
```

### 2. Event: Score & State Update (Server -> Client)
```json
{
  "event": "PLAYER_STATE_UPDATE",
  "payload": {
    "player_id": "STRING",
    "current_score": 2400,
    "streak": 3,
    "is_correct": true,
    "points_added": 850,
    "unlocked_powerup": "DOUBLE_POINTS",
    "mastery_progress": 0.65
  }
}
```

### 3. Event: Leaderboard Sync (Server -> Projector Client)
```json
{
  "event": "LEADERBOARD_SYNC",
  "payload": {
    "session_id": "STRING",
    "top_players": [
      { "rank": 1, "nickname": "Budi", "score": 4500, "avatar": "bear" },
      { "rank": 2, "nickname": "Siti", "score": 4100, "avatar": "fox" }
    ]
  }
}
```

---

## 6. Skenario Penanganan Kegagalan (Edge Cases & Resilience)

1. **Siswa Terputus Koneksi (Disconnection Handling):**
   * *State* pengerjaan disimpan di Redis selama 15 menit.
   * Ketika *reconnect*, *client* mengirimkan `REJOIN_SESSION` dengan `player_id`. Server mengembalikan *state* nomor soal terakhir beserta sisa waktu global.
2. **Lonjakan Trafik (*Traffic Spike*):**
   * *Write requests* untuk pencatatan respons jawaban diproses secara asinkron menggunakan *message queue* (RabbitMQ / BullMQ) sebelum ditulis secara *bulk/batch* ke basis data utama.