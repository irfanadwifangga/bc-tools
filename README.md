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

## Struktur

```
bc-tools/
├── AGENTS.md              # instruksi AI agent
├── backend/               # FastAPI (modular monolith)
├── packages/bc_sdk/       # SDK BC mandiri (auth, client, resources, errors)
├── frontend/              # React + Vite + TS + Ant Design (Fase 1+)
├── infra/                 # script bantu (docker menyusul setelah ada pengguna kedua)
├── docs/                  # dokumentasi (lihat docs/README.md)
└── data/                  # data lokal (di-gitignore)
```

## Mulai (Fase 0)

1. Baca [`AGENTS.md`](AGENTS.md) dan [instruksi Fase 0](docs/tasks/phase-0.md).
2. Jalankan `uv sync --locked --all-packages` dari root repo dengan Python 3.12.
3. Ikuti [runbook](docs/runbook.md) untuk pemeriksaan lokal. Setup Fase 0 tidak memerlukan konfigurasi BC.
