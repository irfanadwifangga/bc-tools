# Review kritis Fase 0

Tanggal review: 2026-11-24 · Branch: `chore/phase-0`

## Temuan T0 berdasarkan dampak

1. **Tinggi — Hak efektif aplikasi belum terbukti.** ADR-001 mencampur izin aplikasi Entra dengan akses objek di BC. Irfan melaporkan permission set read-only sudah dibuat. [PERLU VERIFIKASI: Irfan memeriksa status aplikasi, assignment dan izin efektif atas perusahaan demo, lalu mencoba GET secara manual sebelum integration test Fase 1.] Keuntungannya jika pemeriksaan dilakukan lebih awal adalah salah konfigurasi terdeteksi sebelum SDK dipakai. Biayanya satu pemeriksaan manual. Pertahankan pembatasan GET di SDK untuk pertahanan tambahan. [Dokumentasi S2S Microsoft](https://learn.microsoft.com/en-us/dynamics365/business-central/dev-itpro/administration/automation-apis-using-s2s-authentication).
2. **Tinggi — Batas sandbox belum didefinisikan untuk pagination dan redirect.** Spesifikasi meminta mengikuti `@odata.nextLink`, tetapi belum menentukan verifikasi tujuan sebelum request lanjutan membawa autentikasi. Mengikuti tautan apa adanya menyederhanakan paging. Validasi tujuan menambah test, tetapi menjaga tujuan request tetap di endpoint yang diizinkan. Di Fase 1, rekomendasinya validasi skema, origin, dan batas environment sebelum mengirim request lanjutan, dengan HTTP di-mock untuk test.
3. **Sedang — Kontrak async bertentangan dengan tahap pengambilan keputusan.** Standar mengharuskan transport async, spesifikasi SDK menunda keputusan publik, dan README SDK menunjukkan pemanggilan sync. Async selaras dengan backend dan menghindari wrapper sync. Sync lebih mudah untuk pemakai CLI mandiri, tetapi pilihan itu memengaruhi desain transport dan pemanggilan kode async. Sesuai arahan pemilik, async menjadi usulan yang konsisten, dengan keputusan final di Fase 1.
4. **Sedang — `TokenProvider` saja belum cukup untuk alur delegated atau on-behalf-of.** Batas ini memudahkan test resource dan penggantian perolehan token. Identitas pemanggil, pemisahan cache token, dan alur consent tetap butuh desain tersendiri. Rekomendasi untuk MVP adalah client credentials di sandbox. Evaluasi identitas pengguna saat akan dibagikan.
5. **Sedang — Deteksi custom API belum punya mekanisme yang disepakati.** Spesifikasi Explorer mengharapkan API standar dan custom yang terdeteksi, sementara referensi arsitektur memisahkan jalur metadata standar dan jalur custom per publisher/group/version. Konfigurasi eksplisit lebih mudah dipagari dan dites, tetapi tidak memiliki discovery otomatis. Rekomendasikan konfigurasi eksplisit sebagai opsi awal untuk dibahas dengan Irfan sebelum Fase 2. [PERLU VERIFIKASI: Irfan mengonfirmasi sumber daftar custom API yang boleh diakses sebelum acceptance criteria Fase 2 ditetapkan.]
6. **Sedang — Workspace bisa menutupi dependency SDK yang belum dideklarasikan.** Satu lockfile memudahkan setup. Environment bersama mengurangi isolasi. Rekomendasi: uji workspace untuk Fase 0 dan verifikasi wheel SDK di environment terpisah sebelum distribusi. [Dokumentasi workspace uv](https://docs.astral.sh/uv/concepts/projects/workspaces/).
7. **Rendah — README mengarahkan setup Fase 0 ke BC dan menampilkan folder `integrations/` yang tidak ada.** Arahkan setup ke tooling lokal dan catat langkah BC di runbook untuk pemilik pada Fase 1. Status Documentation Generator mengikuti keputusan ADR-003.

## Catatan perbaikan T1

- Target Python berpindah dari 3.13 ke 3.12 atas keputusan Irfan. ADR-002, standar coding, runbook, metadata ketiga project, pin interpreter, konfigurasi Ruff/mypy, dan CI mengikuti target 3.12. Batas metadata adalah `requires-python = ">=3.12"`.
- README merujuk setup lokal dan mencerminkan direktori yang ada. Contoh SDK konsisten dengan usulan async. STATUS, ADR-001, dan daftar risiko membedakan konfirmasi pemilik dari verifikasi akses efektif.

## Catatan T2

ADR-001 dan ADR-002 tetap **Proposed**. Irfan meninjau autentikasi app-only dan tooling sebelum Fase 1. Pilihan database dibahas saat fitur pertama yang perlu menyimpan data didefinisikan. ADR-003 tetap **Accepted**.

## Catatan verifikasi T3–T4

- Windows, PowerShell, CPython 3.12.7: sinkronisasi dari lockfile, lint dan format Ruff, mypy, dua test pytest, dan empat hook pre-commit lulus. Smoke test mengirim GET ke aplikasi FastAPI dalam proses dan memeriksa status 200 serta body `{"status":"ok"}`.
- Cache `uv` dialihkan ke workspace untuk sesi Codex. Akses PyPI dan test yang menggunakan event loop Windows dijalankan di luar pembatas sandbox Codex. Pytest melaporkan satu deprecation warning dari adapter TestClient HTTPX milik Starlette.
- [PERLU VERIFIKASI: Irfan memeriksa run GitHub Actions pada branch Fase 0 sebelum merge.] Tidak ada integration test atau panggilan ke BC.
