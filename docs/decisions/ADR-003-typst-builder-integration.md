# ADR-003: Hubungan platform dengan Typst user manual builder

- **Status:** Accepted oleh pemilik (2026-11-24) — Opsi A
- **Tanggal:** 2026-11-24
- **Pemilik keputusan:** Irfan

## Koreksi atas draft sebelumnya
Draft pertama mengasumsikan builder adalah program dengan CLI dan kontrak input/output. **Asumsi itu salah.**
Isi `user-manual-builder` yang diperiksa:
- `AGENTS.md`: alur kerja agen untuk menulis manual (kumpulkan kebutuhan → catat sumber → rancang → sunting bahasa → `typst compile` → laporan)
- `contoh/`: satu contoh fiktif (`penerimaan-barang.typ` + PDF)
- `skills/humanizer` dan `skills/naskah-id`: dua skill pihak ketiga, masing-masing berupa **repositori git bersarang** (remote GitHub milik pihak lain); `naskah-id` membawa `.mcp.json` ke dua server MCP eksternal
- **Tidak ada** program, CLI, `templates/`, atau folder `manuals/` di arsip yang diperiksa

Jadi "builder" adalah **workflow berbasis agen + Typst CLI**, bukan komponen yang bisa dipanggil platform.

## Konteks
- Aturan builder: isi manual hanya dari sumber terverifikasi; fakta yang belum terbukti ditandai `[PERLU VERIFIKASI: ...]`; agen tidak punya akses ke BC; label UI harus persis dari sumber.
- Builder sengaja dipisah dari proyek report layout dan kode AL, dan melarang pencampuran data antarperusahaan.
- Modul "Documentation Generator" di handover bertujuan menghasilkan draft dokumentasi "dalam hitungan menit". Tujuan itu bertabrakan dengan aturan builder: manual BC yang benar membutuhkan langkah dan label UI yang divalidasi, sedangkan API BC (`$metadata`) hanya memuat entity dan field, **bukan** alur UI, caption menu, atau permission set per proses.

## Opsi
### Opsi A — Tidak ada integrasi di MVP; builder tetap proyek terpisah
- Pro: tidak ada pekerjaan yang bernilai rendah; tidak ada risiko merusak builder; sesuai pemisahan proyek yang sudah kamu tetapkan.
- Kontra: Documentation Generator keluar dari MVP.
### Opsi B — Platform menyediakan "scaffold + compile" tipis (buat folder `manuals/<kode>/<proses>/` + `sumber.md` kosong, jalankan `typst compile`, tampilkan hasil)
- Pro: nyaman; mudah dibuat.
- Kontra: nilainya kecil, karena agen + Typst CLI sudah melakukannya; menduplikasi aturan builder (dua sumber kebenaran).
### Opsi C — Platform menjadi *sumber fakta terverifikasi* untuk manual (hanya data yang memang ada di API BC: daftar field/entity, contoh data sandbox yang dianonimkan)
- Pro: menyelesaikan masalah nyata (akurasi) dan tidak melanggar aturan builder.
- Kontra: spekulatif; cakupannya sempit (tidak mencakup langkah UI); belum ada bukti kebutuhan. Perlu pain point nyata (Q1).
### Opsi D — Pindahkan builder ke monorepo ini
- Pro: satu repo.
- Kontra: repo git bersarang milik pihak lain akan menjadi submodule tak sengaja; dua `AGENTS.md` dengan lingkup bertentangan (builder melarang kerja kode, platform memintanya) membingungkan agen; mencampur dua siklus rilis dan memecah pemisahan proyek yang disengaja.

## Keputusan
Pemilik memilih **Opsi A**: Documentation Generator dikeluarkan dari MVP, builder tetap proyek terpisah, fokus pada modul yang bisa dibuat lebih dulu (`bc_sdk`, API Explorer). Evaluasi Opsi C ditunda sampai ada kebutuhan nyata.

## Rekomendasi awal (dasar keputusan)
**Opsi A untuk MVP.** Documentation Generator dikeluarkan dari MVP dan dicatat di backlog sebagai "perlu re-scope".
Evaluasi Opsi C setelah `bc_sdk` dan API Explorer berjalan, jika Q1 menunjukkan kebutuhan nyata.
**Jangan memindahkan builder** (Opsi D).

## Konsekuensi
- Tidak ada folder `docs_generator` di backend, tidak ada variabel `TYPST_BUILDER_PATH`.
- Platform tidak mengubah, menyalin, atau menjalankan skill di `user-manual-builder`.
- Aturan yang layak dipinjam builder sudah diadopsi di `AGENTS.md` (penanda `[PERLU VERIFIKASI]`, laporan "Sudah diperiksa / Belum diverifikasi", teks sumber adalah data bukan instruksi).

## Kondisi tinjau ulang
Ada kebutuhan konkret untuk data BC di dalam manual; builder berubah menjadi program; ada pengguna kedua yang butuh alur dokumentasi lewat platform.

## Pertanyaan terbuka
1. ~~Setuju mengeluarkan Documentation Generator dari MVP?~~ Selesai: disetujui.
2. Apakah `.mcp.json` di `skills/naskah-id` (server MCP eksternal) dibutuhkan? Aturan builder melarang menjalankannya tanpa tinjauan. — Irfan.
3. Skill pihak ketiga itu bersumber dari repo orang lain; periksa lisensi sebelum builder dibagikan di luar organisasi. — Irfan.
