# BC Tools Platform

Platform internal untuk automation dan integration Microsoft Dynamics 365 Business Central.
Dibangun modular, reusable, dan terdokumentasi. **AI adalah capability tambahan di atas fondasi, bukan titik awal.**

## Status

**`v0.3.0`** — MVP (Fase 0–2) dan **Permission Analyzer** (`B-11`) selesai serta terverifikasi di Sandbox `DEMO COMPANY`. Lihat [`docs/status/STATUS.md`](docs/status/STATUS.md).

## Mode Operasi

Lokal (`127.0.0.1`), single-user, read-only (GET-only terhadap BC Sandbox demo company), tanpa login portal.

## Modul Tersedia

| Modul | Status | Ringkasan | Spesifikasi |
|---|---|---|---|
| `bc_sdk` | Selesai (`v0.3.0`) | Client async GET-only (MSAL, `v2.0`, custom `$metadata`, `automation/v2.0`) | [bc-sdk.md](docs/modules/bc-sdk.md) |
| Ringkasan | Selesai (`v0.2.0`) | Status backend lokal, jumlah endpoint Standar/Custom, Customer & Item | [STATUS.md](docs/status/STATUS.md) |
| API Explorer | Selesai (`v0.2.0`) | Katalog `$metadata` standar & custom, preview Tabel/JSON, contoh kode Python/C# | [api-explorer.md](docs/modules/api-explorer.md) |
| Permission Analyzer | Selesai (`v0.3.0`) | Audit user & aplikasi Entra, cari akses objek, dan diff user/permission set | [permission-analyzer.md](docs/modules/permission-analyzer.md) |
| Change Analyzer | Implementasi (`B-12`) | Snapshot & diff kontrak `$metadata` API untuk deteksi *breaking change* | [change-analyzer.md](docs/modules/change-analyzer.md) |

## Struktur

```
bc-tools/
├── AGENTS.md              # instruksi AI agent & aturan kerja
├── backend/               # FastAPI (modular monolith)
├── packages/bc_sdk/       # SDK BC mandiri (auth, client, resources, automation, errors)
├── frontend/              # React + Vite + TS + Ant Design
├── infra/                 # script bantu
├── scripts/               # launcher/utility lokal
├── docs/                  # dokumentasi (lihat docs/README.md)
└── data/                  # data lokal (di-gitignore)
```

## Menjalankan Lokal

Prasyarat: Windows/PowerShell, Python 3.12 (`uv`), dan `bun`.

1. Salin `.env.example` ke `.env` lalu isi kredensial Sandbox (`BC_TENANT_ID`, `BC_CLIENT_ID`, `BC_CLIENT_SECRET`, `BC_ENVIRONMENT=Sandbox`, `BC_COMPANY_ID`, opsional `BC_CUSTOM_API_ROUTE`).
2. Install dependensi dari root repo dan `frontend/`:
   ```powershell
   uv sync --locked --all-packages
   cd frontend; bun install
   ```
3. Jalankan backend (dari root repo):
   ```powershell
   uv run --locked --all-packages --env-file .env uvicorn backend.app.main:app --host 127.0.0.1
   ```
4. Jalankan frontend (terminal terpisah, dari `frontend/`):
   ```powershell
   bun run dev
   ```
5. Jalankan pemeriksaan & unit test (tanpa akses BC; lihat [runbook](docs/runbook.md) untuk integration test):
   ```powershell
   uv run --locked --all-packages ruff check .
   uv run --locked --all-packages ruff format --check .
   uv run --locked --all-packages mypy
   uv run --locked --all-packages pytest -q
   cd frontend; bun test; bun run typecheck; bun run build
   ```
