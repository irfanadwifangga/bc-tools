# BC Tools Platform

Platform internal untuk automation dan integration Microsoft Dynamics 365 Business Central.
Dibangun modular, reusable, dan terdokumentasi. **AI adalah capability tambahan di atas fondasi, bukan titik awal.**

## Status

Fase 0 (fondasi dan keputusan). Lihat [`docs/status/STATUS.md`](docs/status/STATUS.md).

## Mode MVP

Lokal, single-user, read-only, sandbox demo company. Tanpa login portal.

## Modul MVP

| Modul | Status | Spesifikasi |
|---|---|---|
| `bc_sdk` | Direncanakan (Fase 1) | [bc-sdk.md](docs/modules/bc-sdk.md) |
| API Explorer | Direncanakan (Fase 2) | [api-explorer.md](docs/modules/api-explorer.md) |
| Documentation Generator | Dikeluarkan dari MVP (ADR-003) | [docs-generator.md](docs/modules/docs-generator.md) |

## Struktur

```
bc-tools/
├── AGENTS.md              # instruksi AI agent
├── backend/               # FastAPI (modular monolith)
├── packages/bc_sdk/       # SDK BC mandiri (auth, client, resources, errors)
├── frontend/              # React + Vite + TS + Ant Design (Fase 1+)
├── integrations/          # catatan hubungan dengan tool eksternal (Typst builder: tidak diintegrasikan di MVP)
├── infra/                 # script bantu (docker menyusul setelah ada pengguna kedua)
├── docs/                  # dokumentasi (lihat docs/README.md)
└── data/                  # data lokal (di-gitignore)
```

## Mulai (Fase 0)

1. Salin `.env.example` ke `.env` dan isi nilai sandbox.
2. Verifikasi koneksi: `pwsh infra/scripts/check-bc-connection.ps1`
3. Baca `AGENTS.md` lalu `docs/tasks/phase-0.md`.

Perintah instalasi dan menjalankan aplikasi ditambahkan Codex di Fase 0 (Tugas T3) dan didokumentasikan di `docs/runbook.md`.
