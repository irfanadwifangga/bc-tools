# STATUS

_Terakhir diperbarui: 2026-11-24_

## Status fase
**Fase 0 — Fondasi dan keputusan.** Pekerjaan selesai di `chore/phase-0`, menunggu merge oleh Irfan.

## Selesai
- Scaffold repo, `AGENTS.md`, dokumen inti, standar, spesifikasi modul, draft ADR-001/002/003 (disusun Claude sebagai analis)
- Entra app registration dibuat; environment: sandbox demo company
- Irfan mengonfirmasi permission set read-only di BC sudah dibuat. Hak efektif aplikasi perlu diverifikasi manual di Fase 1.

- Review kritis, tooling Python 3.12, dan pemeriksaan Fase 0 selesai. Lihat [review Fase 0](phase-0-review.md) dan [hasil CI](https://github.com/irfanadwifangga/bc-tools/actions/runs/45324683780).

## Berikutnya
- Fase 1: `bc_sdk` (read-only) + kerangka frontend minimal

## Blocker dan pertanyaan terbuka
| # | Pertanyaan | Pemilik | Dibutuhkan sebelum |
|---|---|---|---|
| Q1 | Pain point nyata: 1-2 pekerjaan BC manual yang paling sering dilakukan tiap minggu | Irfan | Fase 2 (menentukan prioritas fitur API Explorer) |
| Q2 | Apakah aplikasi aktif dan hak efektifnya terbatas pada akses read-only di sandbox demo company? | Irfan | Sebelum integration test manual Fase 1 |
| Q4 | Konfirmasi `uv` sebagai tooling berkelanjutan; pilih SQLAlchemy atau SQLModel jika DB dibutuhkan | Irfan | Sebelum Fase 1 / sebelum fitur pertama yang menyimpan data |
| Q5 | Pemberitahuan ke atasan (sebelum dibagikan/di luar sandbox) | Irfan | Sebelum pengguna kedua |

## Keputusan terkini
Lihat `docs/decisions/`. ADR-003 **Accepted** (Documentation Generator keluar dari MVP; builder tetap terpisah). ADR-001 dan ADR-002 masih Proposed.
