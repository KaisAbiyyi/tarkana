# Tarkana — Instruksi Agent

> Isi file ini identik di `AGENTS.md` dan `CLAUDE.md`. Kalau mengubah satu, ubah keduanya dalam commit yang sama.
> Jangan pernah menambahkan trailer `Co-Authored-By` (atau atribusi sejenis) di commit maupun PR.
>
> **Reviewer independen (keputusan owner, 26 November 2026):** Claude Sonnet 5.5 (effort High), menggantikan Antigravity · Gemini 4 Hydrogen (xhigh). Review dilakukan remote dan read-only terhadap kode; reviewer boleh merge sesuai aturan merge di bawah. Sumber: halaman Notion "Projects".
>
> **Merge (keputusan owner, 28 November 2026, semua project):** siapa pun yang diberi wewenang review oleh owner (reviewer independen tetap, atau sesi yang owner tunjuk sebagai reviewer untuk PR tertentu) punya otorisasi tetap dari owner untuk merge PR yang ia review, tanpa menunggu persetujuan per PR, asalkan: verdict ditulis di PR untuk **exact head SHA** tanpa temuan blocking; semua required check hijau di SHA itu, termasuk gate native atau owner yang memang disyaratkan sebelum merge (job yang skipped bukan PASS); review independen sudah ada bila disyaratkan; dan owner tidak menahan PR. Merge dipin ke SHA yang direview (`gh pr merge --match-head-commit <sha>`), lalu SHA merge dicatat di PR dan Notion; commit baru berarti review ulang. **Implementor tidak pernah merge:** sesi yang menulis atau mengubah commit apa pun di sebuah PR tidak boleh me-review atau merge PR itu, langsung maupun lewat sesi lain yang ia kendalikan. Ini menggantikan semua aturan lama di file ini yang membolehkan implementor merge atau yang menyisakan merge hanya untuk owner. Owner tetap bisa merge, veto, atau mencabut otorisasi ini. Auto-merge, merge queue, merge broker dan bypass actor tetap tidak diizinkan. Sumber: halaman Notion "Projects".

Tarkana adalah platform tantangan logika berwaktu (ranked, category mastery, daily challenge, duel async) di web SvelteKit dan Android native. Identitasnya tantangan logika ranked, **bukan tes IQ**. Stack: SvelteKit + Svelte + TypeScript, Supabase/PostgreSQL, Drizzle (schema kanonik), Vercel. Klien Android ada di repo `tarkana-android` dan memakai kontrak backend yang sama.

## Baca dulu

1. `docs/agent-operating-rules.md`: aturan kerja agent lengkap.
2. `docs/prd.md`: kebutuhan produk.
3. `docs/productization/MASTER-ROADMAP.md` dan `docs/productization/DECISION-LOG.md`: arah dan ADR.
4. `docs/quality-security-standards.md` dan `docs/productization/` untuk gate kualitas.
5. `CONTRIBUTING.md`: branch, commit, dan checklist PR.

## Prioritas utama (wajib untuk agent yang claim dan reviewer)

Empat hal ini di atas kecepatan menyelesaikan task. Task yang gagal di salah satunya tidak boleh masuk Review. Reviewer memeriksa keempatnya di setiap review, bukan hanya fungsionalitas.

1. **Integritas skor & keamanan:** jawaban benar, rumus skor, rating, streak, dan kredensial service-role tetap di server. Jangan percaya user ID, skor, waktu, rank, atau kepemilikan dari klien. Otorisasi di server; RLS hanya lapis kedua. Endpoint rawan abuse diberi rate limit. Tidak ada rahasia di klien atau log.
2. **Verifikasi nyata:** setiap perubahan non-trivial punya test happy path dan kasus gagal, lalu `npm run check`, `npm run lint`, Vitest, Playwright untuk alur kritis, dan build lulus. Jangan klaim selesai atau PASS tanpa bukti yang benar-benar dijalankan.
3. **Kompatibilitas web–Android:** perubahan kontrak API harus additive atau punya catatan kompatibilitas Android. Setiap perubahan schema punya migrasi; migrasi destruktif punya rencana rollback.
4. **UI/UX yang lengkap:** state memuat, kosong, error, sukses, dan retry; viewport HP; fokus keyboard; label aksesibilitas. Tidak ada klaim IQ, klinis, atau diagnostik.

## Aturan kerja

- Satu branch per task (`feat/`, `fix/`, `chore/`, `docs/`, `test/`, `infra/`, `security/`, `perf/`). Conventional Commits. Tidak pernah push langsung ke `main`; selalu lewat PR berisi bukti validasi.
- Implementor wajib self-review atas diff dan test sebelum Review. Jangan menyebut self-review sebagai review independen.
- Task yang terlihat pengguna baru Done setelah pemilik menjalankan "Cek di aplikasi" dan mengisi Cek Pemilik = OK. Gate HP fisik dan Play Console dikerjakan pemilik.
- Perubahan besar (runtime/service baru, arsitektur auth, semantik ranking/skor, kepemilikan logika skor) wajib ADR di `docs/productization/DECISION-LOG.md` dulu.
- AI tidak pernah menentukan skor, kebenaran jawaban, atau state challenge resmi.
- Jangan menandai operasi live PASS tanpa bukti; Vercel READY tidak membuktikan gameplay end-to-end.
- Sinkronkan status ke Notion (database `Tarkana · Execution Tasks`) pada sesi yang sama, lalu baca ulang untuk verifikasi.

## Perintah

| Tujuan | Perintah |
|---|---|
| Server dev | `npm run dev` |
| Typecheck | `npm run check` |
| Lint + format cek | `npm run lint` (perbaiki format: `npm run format`) |
| Unit test (Vitest) | `npm run test:unit` |
| E2E (Playwright) | `npm run test:e2e` |
| Build produksi | `npm run build` |
| Migrasi / seed | `npm run db:migrate` / `npm run db:seed` |
