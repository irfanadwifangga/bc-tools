# ADR-002: Stack dan struktur repositori

- **Status:** Proposed (draft oleh Claude; Codex diminta me-review di Fase 0)
- **Tanggal:** 2026-11-24
- **Pemilik keputusan:** Irfan

## Konteks
Satu developer, MVP lokal, jangka panjang ingin reusable. Kebutuhan: maintainability, mudah dites, bisa tumbuh.

## Opsi

### 1. Gaya arsitektur
- **Modular monolith** (usulan): sederhana, mudah debug. Kontra: batas modul dijaga disiplin manual.
- Microservice per modul: overhead deploy/observability tidak sepadan.

### 2. Struktur repo
Monorepo dengan tiga unit: `backend/`, `packages/bc_sdk/` (mandiri, bisa di-install terpisah), `frontend/`.
Alasan: SDK bisa dites tanpa FastAPI dan dipakai ulang oleh tool lain. Folder modul future tidak dibuat dulu.

### 3. Backend
Target Python 3.12 sesuai keputusan pemilik. Deklarasikan `requires-python = ">=3.12"` dan jalankan CI pada 3.12.
FastAPI, Pydantic, httpx, dan MSAL tetap menjadi stack usulan. Tambahkan dependency runtime saat dipakai.

### 4. Python tooling
- **`uv` workspace** (usulan, diuji di Fase 0): satu lockfile dan instalasi untuk backend dan SDK. Kekurangannya, environment bersama dapat menyembunyikan dependency yang lupa dideklarasikan oleh SDK.
- **Dua project `uv` terpisah**: isolasi dependency dan pengujian SDK lebih baik. Setup dan lockfile bertambah.
- **pip + venv**: tooling dasar Python mudah dikenali. Resolusi reproducible dan instalasi beberapa unit perlu proses tambahan.
- **Poetry**: menyediakan lockfile dan packaging. Perlu mendefinisikan alur instalasi untuk beberapa unit.

### 5. Database
- **Usulan: tidak ada database sampai fitur membutuhkannya** (MVP read-only, tanpa login). Menunda mengurangi komplikasi.
- Saat dibutuhkan: **SQLAlchemy 2.0 + Alembic** (SQLite dulu, PostgreSQL nanti), migrasi sejak migrasi pertama.
- SQLModel: lebih ringkas untuk CRUD sederhana, tetapi menambah satu lapisan di atas SQLAlchemy dan perkembangannya relatif lambat.
  Pro-nya cepat dibuat; kontra-nya risiko saat migrasi/fitur lanjut. Pemilik boleh memilih SQLModel jika menilai kesederhanaan lebih penting.

### 6. Frontend
- **React + Vite + TypeScript + Ant Design 5** (usulan), package manager **Bun**, TanStack Query, client API di-generate dari OpenAPI FastAPI.
- Next.js: tidak perlu (tanpa SEO/SSR). HTMX/Jinja: satu bahasa, tetapi kurang cocok untuk JSON viewer dan tabel kaya Ant Design.

### 7. Deployment
Lokal saja di MVP. Docker/Compose ditunda sampai ada pengguna kedua atau kebutuhan hosting.

## Keputusan

Pemilik menyetujui `uv` workspace dengan satu `uv.lock` serta API publik dan transport async untuk `bc_sdk`.

## Konsekuensi
Commit satu `uv.lock` dan gunakan `uv sync --locked --all-packages` di lokal dan CI. Uji build SDK mandiri sebelum rilis terpisah. Status ADR ditetapkan oleh pemilik setelah review.

## Kondisi tinjau ulang
Pengguna kedua; kebutuhan menyimpan data; kebutuhan hosting; perubahan dukungan Python 3.12 atau kompatibilitas dependency.

## Pertanyaan terbuka
1. Pilih SQLAlchemy 2.0 atau SQLModel saat DB dibutuhkan? — Irfan, sebelum fitur pertama yang menyimpan data.
