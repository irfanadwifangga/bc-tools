# Modul: Documentation Generator

- **Status:** **Dikeluarkan dari MVP (keputusan pemilik, ADR-003 Accepted)** — perlu re-scope jika dihidupkan lagi
- **Lokasi (jika nanti dibuat):** `backend/app/modules/docs_generator/`

## Mengapa ditunda
Versi awal modul ini mengasumsikan Typst builder adalah program yang bisa dipanggil. Ternyata builder adalah workflow
berbasis agen (`AGENTS.md` + Typst CLI) dengan aturan ketat: isi hanya dari sumber terverifikasi, label UI persis dari sumber,
fakta belum terbukti ditandai `[PERLU VERIFIKASI]`. Data API BC tidak memuat alur UI, sehingga **generator otomatis tidak bisa
menghasilkan user manual yang benar**, dan "draft dalam hitungan menit" bertentangan dengan aturan builder.

## Yang masih mungkin (kandidat re-scope, butuh pain point nyata)
- Menyediakan fakta terverifikasi dari API BC untuk dipakai penulis manual (daftar entity/field, contoh data sandbox yang dianonimkan)
- Scaffold + compile tipis (nilai rendah; lihat ADR-003 Opsi B)

## Evaluasi BC Ladder
Belum dilakukan sampai kebutuhan didefinisikan ulang. Pembuatan manual sudah ditangani workflow builder yang ada.

## Syarat sebelum dikerjakan
1. Pain point nyata terdokumentasi (Q1 di `docs/status/STATUS.md`)
2. ADR baru yang men-supersede ADR-003
3. Spesifikasi baru dengan acceptance criteria yang menggantikan dokumen ini

## Non-goals
Menulis ulang, menyalin, atau memindahkan builder; export DOCX (Typst tidak native; lihat backlog B-07).
