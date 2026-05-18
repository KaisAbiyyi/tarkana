# PRD Ranked Logic Challenge App

## Product Overview

### Nama Produk

Belum final.

Kandidat nama: Tarkana, Tarka, Wiweka, Manasa, Nalarasa.

Untuk dokumen ini, nama sementara yang digunakan adalah **Tarkana**.

### Tagline

Arena nalar untuk pikiran tajam.

### Deskripsi Singkat

Tarkana adalah aplikasi ranked logic challenge untuk pengguna umum yang ingin mengukur dan melatih kemampuan penalaran melalui puzzle singkat berbasis waktu. Skor pengguna dihitung berdasarkan akurasi, waktu pengerjaan, dan tingkat kesulitan soal.

Tarkana tidak menggunakan input manual untuk menaikkan rank. Rank hanya naik melalui performa aktual saat pengguna menyelesaikan challenge di dalam aplikasi.

### Positioning

Tarkana bukan tes IQ resmi. Tarkana adalah gamified reasoning benchmark berbasis challenge logika.

### Target Platform

| Platform | Fokus |
|---|---|
| Web | Full feature version dengan SvelteKit |
| Android Java | Player app dengan fitur challenge, dashboard, history, leaderboard, dan profile |

Web dan Android memiliki fitur yang sama secara fungsional. Perbedaan hanya pada layout, interaksi, dan penyesuaian UI sesuai platform.

---

## Problem Statement

Banyak aplikasi self-improvement dan learning tracker masih bergantung pada input manual pengguna, sehingga progres dan ranking mudah dimanipulasi.

Di sisi lain, banyak orang tertarik menguji kemampuan logika, fokus, dan penalaran, tetapi tidak semua pengguna ingin mengikuti tes formal yang panjang, terlalu akademik, atau terlalu teknis.

Tarkana menyelesaikan masalah tersebut dengan menyediakan challenge logika singkat yang dikerjakan langsung di dalam aplikasi. Skor dihitung dari jawaban, waktu, dan tingkat kesulitan, bukan dari klaim pengguna.

---

## Product Goals

### User Goals

Pengguna dapat menguji kemampuan logika melalui challenge singkat.

Pengguna dapat melihat rating dan rank berdasarkan performa aktual.

Pengguna dapat mengetahui kekuatan dan kelemahan pada beberapa kategori reasoning.

Pengguna dapat membandingkan performa dengan pengguna lain melalui leaderboard.

Pengguna dapat mengerjakan challenge melalui Web maupun Android dengan data yang sama.

Pengguna dapat login menggunakan email atau Google.

Pengguna dapat berlatih tanpa memberikan data pribadi sensitif.

### Product Goals

Membangun aplikasi logic challenge yang dapat digunakan oleh pengguna umum tanpa latar belakang teknis.

Menyediakan sistem ranking berbasis performa aktual, bukan input manual.

Menyediakan pengalaman challenge yang singkat, kompetitif, replayable, dan privacy-safe.

Membangun procedural question generation untuk menghasilkan variasi soal sebanyak mungkin selama masih valid secara rule.

Menyediakan pengalaman lintas platform antara Web dan Android dengan backend yang sama.

### Technical Goals

Membangun Web app menggunakan SvelteKit.

Membangun Android app menggunakan Java.

Menggunakan Supabase sebagai database dan authentication provider.

Menggunakan Drizzle ORM untuk pengelolaan schema dan query database.

Menggunakan Supabase Auth dengan dukungan login Google.

Deploy Web app ke Vercel.

Membangun challenge engine yang dapat menghasilkan soal secara otomatis.

Membangun scoring system berbasis akurasi, waktu, dan difficulty.

Membangun rank dan rating system sederhana.

Menyimpan user, session, answer, score, dan leaderboard secara terstruktur.

Menyediakan admin panel untuk mengelola kategori dan rule soal.

---

## Target Users

### Primary Users

Pengguna umum yang ingin menguji kemampuan logika.

Pelajar dan mahasiswa dari semua jurusan.

Pekerja muda yang suka challenge ringan untuk melatih fokus dan problem solving.

Puzzle enthusiast.

Pengguna self-improvement yang ingin melihat perkembangan reasoning skill.

### Secondary Users

Komunitas belajar.

Guru atau pengajar yang ingin memberi latihan logika ringan.

Admin yang mengelola kategori, rule soal, dan monitoring leaderboard.

---

## Core Value Proposition

| Value | Penjelasan |
|---|---|
| Objective Measurement | Skor berasal dari performa aktual saat mengerjakan challenge |
| Hard to Fake | User tidak bisa menaikkan skor lewat input manual |
| Privacy-Safe | Tidak membutuhkan data personal sensitif |
| General-Purpose | Dapat digunakan siapa pun tanpa skill teknis |
| Competitive | Sistem rank dan leaderboard mendorong motivasi |
| Replayable | Soal dapat digenerate otomatis melalui procedural generation |
| Cross-Platform | Web dan Android menggunakan data dan fitur yang sama |

---

## MVP Scope

### In Scope

Supabase authentication.

Google login.

User profile.

Dashboard pengguna.

Challenge session berbasis generated questions.

Empat mode awal: number sequence, symbol pattern, mini deduction, dan memory pattern.

Procedural question generation.

Jumlah soal fleksibel berdasarkan konfigurasi challenge.

Timer per soal.

Scoring otomatis.

Rank dan rating system.

Session result.

Question review.

User history.

Global leaderboard.

Admin panel.

Question rule management.

Cross-platform data sync antara Web dan Android.

### Out of Scope

Genetic Algorithm.

AI question generation.

Tes IQ resmi.

Challenge berbasis coding/programming.

Multiplayer real-time.

Payment system.

Advanced anti-cheat.

Offline-first mode.

---

## Platform Scope

## Web App

Web app dibangun menggunakan SvelteKit dan di-deploy ke Vercel.

Web app memiliki seluruh fitur utama aplikasi:

Landing page.

Authentication.

Dashboard.

Challenge session.

Result page.

History.

Leaderboard.

Profile.

Admin panel.

Question rule management.

## Android App

Android app dibangun menggunakan Java.

Android app memiliki fitur player yang sama dengan Web app:

Authentication.

Google login.

Dashboard.

Challenge session.

Result page.

History.

Leaderboard.

Profile.

Android app tidak memiliki admin panel. Admin panel dan rule management hanya tersedia di Web.

Android app tidak bersifat offline-first. Android app menggunakan Supabase sebagai backend yang sama dengan Web.

Perbedaan Android hanya pada tampilan dan pola interaksi yang disesuaikan dengan perangkat mobile.

---

## Core User Flow

User membuka aplikasi melalui Web atau Android.

User register, login email, atau login Google.

User masuk ke dashboard.

User memilih mode challenge atau mulai mixed challenge.

Sistem menghasilkan soal berdasarkan mode, difficulty, dan konfigurasi challenge.

User mengerjakan soal satu per satu dengan timer.

Sistem menyimpan jawaban, waktu, dan skor per soal.

Setelah selesai, sistem menampilkan result page.

Rating dan rank user diperbarui.

User dapat melihat history dan leaderboard.

---

## Main Features

## Authentication

### Requirements

User dapat register menggunakan email dan password.

User dapat login menggunakan email dan password.

User dapat login menggunakan Google melalui Supabase Auth.

User dapat logout.

Dashboard, challenge, history, result, profile, dan leaderboard hanya dapat diakses oleh user yang sudah login.

Admin panel hanya dapat diakses oleh user dengan role admin.

### Authentication Provider

Supabase Auth.

Supported providers untuk MVP:

Email and password.

Google OAuth.

---

## Dashboard

### Data yang Ditampilkan

Current rank.

Logic rating.

Total challenge completed.

Best score.

Average accuracy.

Average solve time.

Strongest category.

Weakest category.

Recent sessions.

Start Challenge button.

Mode selection.

### Acceptance Criteria

Dashboard menampilkan data default jika user belum pernah mengerjakan challenge.

Data dashboard diperbarui setelah challenge selesai.

Dashboard menampilkan data yang sama di Web dan Android.

---

## Challenge Session

### Rules

Jumlah soal tidak dipatok permanen.

Jumlah soal ditentukan oleh konfigurasi challenge.

Default MVP menggunakan 10 soal per session.

Admin dapat mengubah jumlah soal per session.

Setiap soal memiliki timer.

User hanya dapat memilih satu jawaban.

User tidak dapat kembali ke soal sebelumnya dalam ranked mode.

Jika waktu habis, jawaban dianggap salah.

Correct answer tidak boleh dikirim ke client sebelum user menjawab.

Validasi jawaban dilakukan melalui server-side logic.

### Challenge Types

| Type | Deskripsi |
|---|---|
| Mixed Challenge | Soal campuran dari semua mode aktif |
| Mode Challenge | Soal dari satu mode tertentu |
| Daily Challenge | Challenge harian dengan konfigurasi tertentu |

Daily Challenge termasuk roadmap jika waktu MVP tidak cukup.

### Question Count Configuration

Jumlah soal dapat dikonfigurasi berdasarkan:

Challenge type.

Mode.

Difficulty.

Admin setting.

Default recommendation:

| Challenge Type | Default Jumlah Soal |
|---|---:|
| Quick Challenge | 5 |
| Standard Challenge | 10 |
| Long Challenge | 20 |
| Daily Challenge | 10 |

### Mode Distribution

Untuk Mixed Challenge, sistem dapat mengambil soal dari semua mode aktif.

Distribusi soal tidak harus fixed seperti 3-3-2-2. Distribusi ditentukan oleh ChallengeBuilder berdasarkan:

Mode aktif.

Difficulty target.

Rule availability.

User rating.

Admin configuration.

---

## Question Types

## Number Sequence

User menentukan angka berikutnya dari suatu pola.

### Pattern Awal

Arithmetic sequence.

Geometric sequence.

Square number.

Fibonacci-like sequence.

Alternating sequence.

Mixed simple operation.

Increasing difference.

Decreasing difference.

Multiply then add pattern.

Add then multiply pattern.

### Contoh

Pertanyaan:

Find the next number: 3, 6, 12, 24, ?

Pilihan:

36, 42, 48, 54

Jawaban benar:

48

---

## Symbol Pattern

User menentukan simbol berikutnya dari pola visual sederhana.

### Pattern Awal

Symbol rotation.

Shape order.

Alternating symbol.

Growing count.

Mirrored sequence.

Repeating cycle.

Position shifting.

Color cycle.

Shape transformation.

### Contoh

Pertanyaan:

Find the next symbol: ▲, ▶, ▼, ◀, ?

Pilihan:

▲, ▶, ▼, ◀

Jawaban benar:

▲

---

## Mini Deduction

User menyelesaikan puzzle deduksi berbasis clue sederhana.

### Pattern Awal

Comparison chain.

Object ordering.

True or false clue.

Simple elimination.

Tallest, shortest, fastest, highest, or lowest reasoning.

Position reasoning.

Category matching.

Relationship inference.

### Contoh

Pertanyaan:

A is taller than B.  
B is taller than C.  
Who is the tallest?

Pilihan:

A, B, C, Cannot be determined

Jawaban benar:

A

---

## Memory Pattern

User melihat pola selama beberapa detik, lalu menjawab setelah pola disembunyikan.

### Pattern Awal

Symbol recall.

Position recall.

Color recall.

Sequence recall.

Missing element recall.

Reverse sequence recall.

Count recall.

Pair recall.

### Contoh

Memorize:

● ▲ ■ ▲ ●

Pertanyaan setelah pola disembunyikan:

What was the third symbol?

Jawaban benar:

■

### Catatan

Memory Pattern hanya disebut sebagai memory challenge. Aplikasi tidak boleh membuat klaim medis atau klinis.

---

## Procedural Question Generation

### Tujuan

Procedural question generation digunakan untuk menghasilkan variasi soal secara otomatis berdasarkan rule yang sudah ditentukan.

### Prinsip

Generator menggunakan template dan rule yang valid.

Setiap soal harus memiliki satu jawaban benar.

Setiap soal harus memiliki pilihan jawaban yang masuk akal.

Setiap soal harus memiliki explanation.

Setiap soal harus memiliki difficulty score.

Generator harus dapat membuat sebanyak mungkin variasi selama rule masih valid.

### Generator Modules

| Module | Fungsi |
|---|---|
| NumberSequenceGenerator | Membuat soal sequence angka |
| SymbolPatternGenerator | Membuat soal pattern simbol |
| DeductionGenerator | Membuat soal deduksi sederhana |
| MemoryPatternGenerator | Membuat soal memory pattern |
| ChoiceGenerator | Membuat pilihan jawaban dan distractor |
| ChallengeBuilder | Menyusun soal untuk satu session |
| DifficultyResolver | Menentukan difficulty berdasarkan rating user |
| RuleValidator | Memastikan generated question valid |

### Generated Question Output

Setiap soal hasil generator harus memiliki:

Question type.

Prompt.

Choices.

Correct answer.

Explanation.

Difficulty score.

Time limit.

Metadata rule.

Generated seed.

### Generated Seed

Setiap soal harus menyimpan generated seed agar soal dapat direkonstruksi, diaudit, dan diuji ulang jika terjadi bug.

---

## Adaptive Difficulty

### Tujuan

Adaptive difficulty menjaga agar challenge tidak terlalu mudah atau terlalu sulit.

### Difficulty Distribution

| User Rating | Easy | Medium | Hard |
|---:|---:|---:|---:|
| 0–499 | 60% | 40% | 0% |
| 500–999 | 40% | 50% | 10% |
| 1000–1499 | 20% | 60% | 20% |
| 1500–1999 | 10% | 50% | 40% |
| 2000+ | 0% | 40% | 60% |

Karena jumlah soal fleksibel, distribusi difficulty menggunakan persentase, bukan jumlah fixed.

### Future Improvement

Difficulty dapat disesuaikan berdasarkan performa kategori, bukan hanya rating global.

---

## Scoring System

### Question Score

Question Score = Difficulty Score × Accuracy Multiplier × Time Multiplier

### Accuracy Multiplier

| Kondisi | Multiplier |
|---|---:|
| Jawaban benar | 1.0 |
| Jawaban salah | 0 |

### Time Multiplier

| Sisa Waktu | Multiplier |
|---|---:|
| 75–100% | 1.5 |
| 50–74% | 1.3 |
| 25–49% | 1.1 |
| 1–24% | 1.0 |
| Waktu habis | 0 |

### Session Score

Session Score = Total Question Score + Accuracy Bonus + Streak Bonus

### Accuracy Bonus

| Accuracy | Bonus |
|---|---:|
| 100% | 150 |
| 90–99% | 100 |
| 80–89% | 60 |
| 70–79% | 30 |
| Di bawah 70% | 0 |

### Streak Bonus

| Correct Streak | Bonus |
|---|---:|
| 3 benar berturut-turut | 20 |
| 5 benar berturut-turut | 50 |
| 10 benar berturut-turut | 120 |

---

## Rating and Rank System

### Logic Rating

Logic rating adalah angka performa utama user. Rating berubah setelah user menyelesaikan challenge.

### Rating Update MVP

| Session Accuracy | Rating Change |
|---|---:|
| 90–100% | +40 |
| 80–89% | +25 |
| 70–79% | +10 |
| 50–69% | 0 |
| Di bawah 50% | -10 |

Rating change dapat diberi tambahan kecil berdasarkan rata-rata difficulty session.

### Rank Table

| Rank | Rating Range |
|---|---:|
| Unranked | Belum menyelesaikan challenge |
| Bronze Mind | 0–499 |
| Silver Solver | 500–999 |
| Gold Analyst | 1000–1499 |
| Platinum Strategist | 1500–1999 |
| Diamond Reasoner | 2000–2499 |
| Mastermind | 2500+ |

### Rank Promotion

Jika rating user melewati batas rank baru, result page harus menampilkan rank promotion.

---

## Leaderboard

### MVP Leaderboard

Leaderboard menampilkan ranking user berdasarkan logic rating.

### Data yang Ditampilkan

Position.

Display name.

Rank.

Logic rating.

Average accuracy.

Total challenge completed.

### Rules

Leaderboard tidak boleh menampilkan email.

Session suspicious tidak dihitung ke leaderboard.

Leaderboard default menggunakan display name.

Leaderboard harus tersedia di Web dan Android.

### Future Leaderboard

Weekly leaderboard.

Category leaderboard.

Rank-tier leaderboard.

Friend leaderboard.

---

## Session Result

### Data yang Ditampilkan

Final score.

Correct answers.

Wrong answers.

Accuracy.

Average solve time.

Rating change.

Current rank.

Rank progress.

Strongest category.

Weakest category.

Question review.

### Question Review

User dapat melihat:

Question prompt.

User answer.

Correct answer.

Explanation.

Time spent.

Score earned.

---

## History

### Data History

Tanggal sesi.

Challenge type.

Total questions.

Total score.

Accuracy.

Average time.

Rating change.

Challenge difficulty.

Rank setelah sesi.

### Rules

User hanya dapat melihat history miliknya sendiri.

History diurutkan dari sesi terbaru.

User dapat membuka detail result dari sesi sebelumnya.

History harus tersedia di Web dan Android.

---

## Admin Panel

### Admin Features MVP

Melihat daftar user.

Melihat daftar session.

Mengelola kategori soal.

Mengelola rule template soal.

Mengatur difficulty configuration.

Mengatur jumlah soal per challenge type.

Mengatur mode aktif dan nonaktif.

Mengatur time limit per kategori.

Melihat statistik sederhana per kategori.

### Admin Rules

Admin tidak harus membuat semua soal manual.

Admin mengelola rule dan konfigurasi generator.

Admin route hanya dapat diakses oleh role admin.

Admin fitur hanya tersedia di Web.

Android difokuskan sebagai player app dan tidak menyediakan admin panel, admin overview, maupun rule editing.

---

## Anti-Cheat Requirements

### MVP Anti-Cheat

Skor tidak dapat dimasukkan manual oleh user.

Soal digenerate secara acak untuk setiap session.

Urutan pilihan jawaban diacak.

Correct answer tidak dikirim ke client sebelum user menjawab.

Timer divalidasi server.

User tidak dapat kembali ke soal sebelumnya dalam ranked mode.

User tidak dapat mengubah jawaban setelah submit.

Session suspicious tidak masuk leaderboard.

### Suspicious Session Criteria

User terlalu sering berpindah tab di Web.

Waktu pengerjaan tidak valid.

Response time terlalu tidak wajar.

Terjadi manipulasi request.

---

## Privacy Requirements

### Data yang Dikumpulkan

Nama atau display name.

Email.

Auth provider identifier dari Supabase.

Challenge score.

Session history.

Rank dan rating.

### Data yang Tidak Dikumpulkan

Lokasi.

Kontak.

Kamera.

Audio.

File pribadi.

Data kesehatan.

Data akademik formal.

### Privacy Rules

Leaderboard menggunakan display name.

Email tidak tampil di leaderboard.

Aplikasi tidak mengklaim hasil sebagai tes IQ resmi.

Aplikasi tidak memberikan diagnosis kemampuan kognitif.

---

## Non-Functional Requirements

### Performance

Dashboard dimuat dalam waktu maksimal 3 detik pada koneksi normal.

Perpindahan antar soal maksimal 1 detik.

Challenge page harus responsif di desktop dan mobile browser.

Android app harus tetap ringan saat menjalankan challenge session.

### Security

Authentication menggunakan Supabase Auth.

Route private harus dilindungi session validation.

Admin route harus dilindungi role admin.

Validasi jawaban dilakukan di server-side logic.

Correct answer tidak boleh diekspos sebelum user submit.

Database access harus mengikuti Row Level Security Supabase.

### Reliability

Session yang sudah selesai harus tersimpan lengkap.

Score harus konsisten antara Web dan Android.

Generated question harus selalu memiliki satu jawaban benar.

Generated seed harus disimpan untuk audit.

### Usability

Interface harus sederhana.

Timer harus terlihat jelas.

Pilihan jawaban harus mudah diklik atau ditap.

Result page harus menjelaskan skor secara transparan.

### Accessibility

Kontras warna harus cukup jelas.

Ukuran teks soal harus nyaman dibaca.

Interaksi tidak boleh hanya bergantung pada warna.

---

## Tech Stack

### Web

| Layer | Teknologi |
|---|---|
| Framework | SvelteKit |
| Styling | Tailwind CSS |
| UI Style | Neo brutalism |
| UI Components | shadcn-svelte atau komponen native Svelte yang dikustom agar sesuai neo brutalism |
| Database | Supabase PostgreSQL |
| ORM | Drizzle ORM |
| Auth | Supabase Auth |
| OAuth | Google Provider |
| Deployment | Vercel |
| Chart | LayerChart, Chart.js, atau library Svelte-compatible |

### Android

| Layer | Teknologi |
|---|---|
| Language | Java |
| Backend | Supabase |
| Auth | Supabase Auth |
| OAuth | Google Sign-In |
| Database | Supabase PostgreSQL |
| Local Storage | Minimal cache/session storage |
| UI | Native Android XML |
| Timer | CountDownTimer |
| Networking | Supabase client atau HTTP client |

### Shared Backend

Web dan Android menggunakan backend yang sama:

Supabase Auth.

Supabase PostgreSQL.

Database schema yang sama.

Challenge session data yang sama.

Leaderboard data yang sama.

User profile yang sama.

---

## Data Model

## users_profile

| Field | Type | Keterangan |
|---|---|---|
| id | uuid | Primary key, referensi ke auth.users |
| name | varchar | Nama user |
| display_name | varchar | Nama untuk leaderboard |
| role | enum | user atau admin |
| rating | integer | Logic rating |
| rank | varchar | Current rank |
| created_at | timestamp | Waktu dibuat |
| updated_at | timestamp | Waktu diperbarui |

## categories

| Field | Type | Keterangan |
|---|---|---|
| id | uuid | Primary key |
| name | varchar | Nama kategori |
| slug | varchar | Slug kategori |
| description | text | Deskripsi kategori |
| is_active | boolean | Status aktif |

## question_rules

| Field | Type | Keterangan |
|---|---|---|
| id | uuid | Primary key |
| category_id | uuid | Relasi ke categories |
| rule_type | varchar | Jenis rule |
| difficulty_min | integer | Difficulty minimum |
| difficulty_max | integer | Difficulty maksimum |
| time_limit | integer | Batas waktu |
| config | jsonb | Konfigurasi rule |
| is_active | boolean | Status aktif |

## challenge_configs

| Field | Type | Keterangan |
|---|---|---|
| id | uuid | Primary key |
| name | varchar | Nama konfigurasi |
| challenge_type | varchar | quick, standard, long, daily, custom |
| question_count | integer | Jumlah soal |
| mode_distribution | jsonb | Distribusi mode |
| difficulty_distribution | jsonb | Distribusi difficulty |
| is_active | boolean | Status aktif |

## challenge_sessions

| Field | Type | Keterangan |
|---|---|---|
| id | uuid | Primary key |
| user_id | uuid | Relasi ke users_profile |
| challenge_type | varchar | Jenis challenge |
| total_questions | integer | Jumlah soal |
| total_score | integer | Skor akhir |
| accuracy | decimal | Persentase akurasi |
| total_time | integer | Total waktu |
| average_time | decimal | Rata-rata waktu |
| rating_before | integer | Rating sebelum sesi |
| rating_after | integer | Rating setelah sesi |
| rating_delta | integer | Perubahan rating |
| rank_before | varchar | Rank sebelum sesi |
| rank_after | varchar | Rank setelah sesi |
| is_suspicious | boolean | Status suspicious |
| created_at | timestamp | Waktu dibuat |

## session_questions

| Field | Type | Keterangan |
|---|---|---|
| id | uuid | Primary key |
| session_id | uuid | Relasi ke challenge_sessions |
| question_type | varchar | Jenis soal |
| category_id | uuid | Relasi kategori |
| prompt | text | Pertanyaan |
| choices | jsonb | Pilihan jawaban |
| correct_answer | text | Jawaban benar |
| explanation | text | Penjelasan |
| difficulty_score | integer | Skor difficulty |
| time_limit | integer | Batas waktu |
| metadata | jsonb | Metadata generator |
| generated_seed | varchar | Seed generator |
| order_index | integer | Urutan soal |

## session_answers

| Field | Type | Keterangan |
|---|---|---|
| id | uuid | Primary key |
| session_question_id | uuid | Relasi ke session_questions |
| user_id | uuid | Relasi ke users_profile |
| selected_answer | text | Jawaban user |
| is_correct | boolean | Status benar |
| time_spent | integer | Waktu pengerjaan |
| score_earned | integer | Skor diperoleh |
| created_at | timestamp | Waktu dibuat |

---

## API Requirements

## Auth

Authentication menggunakan Supabase Auth.

Web menggunakan Supabase Auth helper untuk SvelteKit.

Android menggunakan Supabase Auth atau Google Sign-In yang terhubung ke Supabase.

### Supported Auth Flow

Email register.

Email login.

Google login.

Logout.

Session refresh.

Profile creation setelah first login.

---

## Challenge API / Server Logic

### Start Challenge

Membuat challenge session baru.

Membaca challenge config.

Menghasilkan soal berdasarkan rule aktif.

Menyimpan soal ke database.

Mengembalikan soal tanpa correct answer.

### Submit Answer

Menerima jawaban user.

Memvalidasi jawaban di server.

Menghitung skor per soal.

Menyimpan jawaban.

Mengunci jawaban setelah submit.

### Finish Challenge

Menghitung total score.

Menghitung accuracy.

Menghitung rating update.

Memperbarui rank user.

Mengembalikan session result.

---

## User Data

### Dashboard Data

Mengambil statistik dashboard user.

### History Data

Mengambil riwayat challenge user.

### Profile Data

Mengambil dan mengubah display name user.

---

## Leaderboard Data

Mengambil daftar user berdasarkan rating tertinggi.

Filter future:

global.

weekly.

category.

rank tier.

---

## Admin Data

Admin dapat mengelola:

Categories.

Question rules.

Challenge configs.

Mode availability.

Difficulty configuration.

Session monitoring.

---

## Page Requirements

## Landing Page

Menampilkan nama produk, tagline, deskripsi singkat, fitur utama, CTA register/login, dan disclaimer bahwa aplikasi bukan tes IQ resmi.

## Dashboard Page

Menampilkan current rank, rating, statistik performa, recent sessions, progress chart, mode selection, dan Start Challenge button.

## Challenge Page

Menampilkan nomor soal, prompt, pilihan jawaban, timer, progress indicator, dan submit answer button.

## Result Page

Menampilkan final score, accuracy, rating change, rank update, strongest category, weakest category, question review, retry button, dan leaderboard button.

## Leaderboard Page

Menampilkan ranking user, display name, rank, rating, accuracy, dan total sessions.

## History Page

Menampilkan daftar challenge session user dan detail result.

## Profile Page

Menampilkan profile, display name setting, auth provider, rank, rating, dan basic account settings.

## Admin Page

Menampilkan category management, question rule management, challenge config management, session overview, dan user overview.

---

## UX Direction

### Visual Style

UI menggunakan gaya neo brutalism.

Karakter visual utama:

Background terang atau off-white.

Kontras warna tinggi.

Border tebal.

Shadow keras tanpa blur.

Card besar dan tegas.

Typography bold dan jelas.

Layout grid yang sederhana.

Button besar dengan state yang eksplisit.

Rank badge visual dengan bentuk tegas.

Progress bar untuk rating dengan warna kontras.

Result screen dibuat dramatis tetapi tetap clean.

Tampilan Android menyesuaikan layar kecil dengan navigasi bottom bar atau drawer.

Dark mode dapat menjadi fitur tambahan, tetapi bukan prioritas visual MVP.

### Product Tone

Kompetitif, singkat, dan jelas.

Gunakan istilah:

Logic Rating.

Reasoning Score.

Rank Progress.

Challenge Accuracy.

Category Mastery.

Hindari istilah:

Real IQ.

Diagnosis.

Clinical score.

Official intelligence test.

---

## Success Metrics

### Product Metrics

| Metric | Target MVP |
|---|---:|
| Challenge completion rate | Minimal 60% |
| Average session per active user | Minimal 3 sesi |
| Repeat usage | Minimal 30% user kembali |
| Leaderboard participation | Minimal 40% user punya skor |
| Average accuracy per category | Tercatat untuk evaluasi difficulty |
| Cross-platform consistency | Data user sama di Web dan Android |

### Technical Metrics

| Metric | Target |
|---|---:|
| Challenge generation success | 99% |
| Score calculation accuracy | 100% sesuai rule |
| Dashboard load time | Maksimal 3 detik |
| Question transition | Maksimal 1 detik |
| Session data completeness | 100% untuk session selesai |
| Auth success consistency | Web dan Android menggunakan akun yang sama |

---

## Risks and Mitigations

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Dikira tes IQ resmi | Masalah kredibilitas | Gunakan disclaimer dan hindari klaim IQ |
| Soal repetitif | User bosan | Gunakan procedural generation dan banyak rule |
| Generator menghasilkan soal salah | Trust turun | RuleValidator dan unit test generator |
| User cheating dengan bantuan luar | Leaderboard kurang fair | Timer, randomization, suspicious flag |
| Difficulty tidak seimbang | User frustrasi | Adaptive difficulty sederhana |
| Web dan Android tidak sinkron | UX buruk | Gunakan Supabase sebagai single source of truth |
| Admin panel Android tidak tersedia | Scope lebih terkontrol | Admin panel hanya dibuat di Web |

---

## MVP Milestones

## Alpha

Supabase project setup.

Drizzle schema setup.

SvelteKit setup.

Supabase Auth email login.

Supabase Auth Google login.

Dashboard basic.

Number sequence generator.

Challenge session.

Timer.

Basic scoring.

Result page.

## Beta

Symbol pattern generator.

Mini deduction generator.

Memory pattern generator.

Rank system.

Leaderboard.

History page.

Question review.

Android authentication.

Android dashboard.

Android challenge flow.

## Release Candidate

Admin panel Web.

Question rule management.

Challenge config management.

Suspicious session flag.

Dashboard statistics.

Android leaderboard.

Android history.

Android profile.

UI polish.

Bug fixing.

## Final

Landing page.

Full Web user flow.

Full Android user flow.

Seed rules.

Demo account.

Documentation.

Vercel deployment.

Final testing.

---

## Acceptance Criteria

User dapat register, login email, login Google, dan logout.

User dapat menggunakan akun yang sama di Web dan Android.

User tidak dapat mengakses dashboard tanpa login.

User dapat memulai challenge.

Sistem menghasilkan soal berdasarkan konfigurasi challenge.

Jumlah soal tidak hardcoded permanen.

Setiap soal memiliki timer.

User dapat menjawab setiap soal.

Jawaban benar dan salah dihitung dengan tepat.

Score dihitung berdasarkan difficulty, akurasi, dan waktu.

Rating dan rank diperbarui setelah challenge selesai.

Result page menampilkan detail performa.

History hanya menampilkan data milik user terkait.

Leaderboard tidak menampilkan email.

Admin dapat mengelola kategori, rule soal, dan challenge config.

User biasa tidak dapat mengakses admin panel.

Web app berhasil di-deploy ke Vercel.

Android app menggunakan data dari Supabase yang sama.

Android app tidak menyediakan admin panel.

---

## Future Roadmap

Daily challenge.

Weekly leaderboard.

Rank-tier leaderboard.

Category leaderboard.

Visual matrix challenge.

Spatial reasoning challenge.

Word logic challenge.

Reaction reasoning mode.

Friend leaderboard.

Shareable logic profile card.

Adaptive difficulty per category.

Tournament mode.

Seasonal rank reset.

Achievement system.

---

## Final Summary

Tarkana adalah aplikasi ranked logic challenge untuk pengguna umum. Produk ini mengukur reasoning skill berdasarkan performa aktual user saat mengerjakan puzzle di dalam aplikasi, bukan berdasarkan input manual.

MVP Tarkana berfokus pada empat mode: number sequence, symbol pattern, mini deduction, dan memory pattern. Soal dibuat menggunakan procedural generation agar variasi tetap banyak tanpa memperbesar scope secara berlebihan.

Jumlah soal tidak dipatok permanen per mode. Jumlah soal dan distribusi mode dikendalikan oleh challenge configuration.

Web app dibangun menggunakan SvelteKit, Tailwind CSS, Supabase, Drizzle ORM, Supabase Auth dengan Google login, dan di-deploy ke Vercel. Android app dibangun menggunakan Java dan memiliki fitur player yang sama dengan Web app, menggunakan Supabase sebagai backend yang sama. Admin panel hanya tersedia di Web.

MVP tidak menggunakan Genetic Algorithm, AI generation, atau challenge berbasis programming. Fokus utama MVP adalah challenge engine, procedural generation, scoring system, rank progression, leaderboard, history, admin rule management, dan cross-platform consistency.

