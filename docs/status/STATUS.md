# STATUS

_Terakhir diperbarui: 2026-11-24_

## Fase aktif
**Fase 0 — Fondasi dan keputusan** (lihat `docs/tasks/phase-0.md`)

## Selesai
- Scaffold repo, `AGENTS.md`, dokumen inti, standar, spesifikasi modul, draft ADR-001/002/003 (disusun Claude sebagai analis)
- Entra app registration dibuat; environment: sandbox demo company

## Sedang dikerjakan
- Review dokumen oleh Codex dan setup tooling (T0-T5 di `docs/tasks/phase-0.md`)

## Berikutnya
- Fase 1: `bc_sdk` (read-only) + kerangka frontend minimal

## Blocker dan pertanyaan terbuka
| # | Pertanyaan | Pemilik | Dibutuhkan sebelum |
|---|---|---|---|
| Q1 | Pain point nyata: 1-2 pekerjaan BC manual yang paling sering dilakukan tiap minggu | Irfan | Fase 2 (menentukan prioritas fitur API Explorer) |
| Q2 | Permission set aplikasi di BC sudah read-only? | Irfan | Fase 1 |
| Q4 | `uv` atau pip/Poetry; SQLAlchemy atau SQLModel | Irfan | Fase 1 / saat DB dibutuhkan |
| Q5 | Pemberitahuan ke atasan (sebelum dibagikan/di luar sandbox) | Irfan | Sebelum pengguna kedua |

## Keputusan terkini
Lihat `docs/decisions/`. ADR-003 **Accepted** (Documentation Generator keluar dari MVP; builder tetap terpisah). ADR-001 dan ADR-002 masih Proposed.
