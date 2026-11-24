# ADR-002: Stack dan struktur repositori

- **Status:** Proposed (draft oleh Claude; Codex diminta me-review di Fase 0)
- **Tanggal:** 2026-11-24
- **Pemilik keputusan:** Irfan

## Konteks
Satu developer, MVP lokal, jangka panjang ingin reusable. Kebutuhan: maintainability, mudah dites, bisa tumbuh.

## Keputusan-keputusan di dalam ADR ini

### 1. Gaya arsitektur
- **Modular monolith** (usulan): sederhana, mudah debug. Kontra: batas modul dijaga disiplin manual.
- Microservice per modul: overhead deploy/observability tidak sepadan.

### 2. Struktur repo
Monorepo dengan tiga unit: `backend/`, `packages/bc_sdk/` (mandiri, bisa di-install terpisah), `frontend/`.
Alasan: SDK bisa dites tanpa FastAPI dan dipakai ulang oleh tool lain. Folder modul future tidak dibuat dulu.

### 3. Backend
Python 3.13, FastAPI, Pydantic, httpx, MSAL. Kontra Python 3.13: periksa kompatibilitas library saat setup
(fallback 3.12 jika ada masalah — catat bila terjadi).

### 4. Python tooling
- **`uv`** (usulan): cepat, satu perintah untuk env + lockfile + workspace. Kontra: relatif baru bagi tim; pemilik perlu terbiasa.
- pip + venv / Poetry: lebih dikenal, lebih lambat dan/atau lebih berat.

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
(Kosong — Proposed.)

## Konsekuensi
Lihat tiap sub-keputusan. Perubahan ke Accepted dilakukan pemilik setelah review.

## Kondisi tinjau ulang
Pengguna kedua; kebutuhan menyimpan data; kebutuhan hosting; masalah kompatibilitas Python 3.13.

## Pertanyaan terbuka
1. Bersedia memakai `uv`, atau lebih suka pip/Poetry? — Irfan.
2. Pilih SQLAlchemy 2.0 atau SQLModel saat DB dibutuhkan? — Irfan, sebelum fitur pertama yang menyimpan data.
