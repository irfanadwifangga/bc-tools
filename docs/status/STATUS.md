# STATUS

_Terakhir diperbarui: 2026-11-24_

## Status fase
**Fase 1 — `bc_sdk` read-only dan kerangka frontend minimal.** Fase 0 sudah masuk `main` lewat [PR #1](https://github.com/irfanadwifangga/bc-tools/pull/1).

## Selesai
- Scaffold repo, `AGENTS.md`, dokumen inti, standar, spesifikasi modul, draft ADR-001/002/003 (disusun Claude sebagai analis)
- Entra app registration dibuat; environment: sandbox demo company
- Screenshot dari Irfan mengonfirmasi aplikasi berstatus `Enabled` dengan permission set `D365 READ` di sandbox.

- Review kritis, tooling Python 3.12, dan pemeriksaan Fase 0 selesai. Lihat [review Fase 0](phase-0-review.md) dan [hasil CI](https://github.com/irfanadwifangga/bc-tools/actions/runs/45324683780).
- `TokenProvider` async dan adapter MSAL tersedia. Delapan unit test autentikasi dengan mock lulus. Lihat [spesifikasi SDK](../modules/bc-sdk.md).
- Client async GET-only, pagination, dan retry sudah diuji dengan HTTP mock.
- Resource `companies`, `customers`, dan `items` serta `BCClient.from_settings()` tersedia dan diuji dengan HTTP mock.
- Integration test GET sandbox lulus dua kali pada 2026-11-24, dijalankan oleh Irfan.

## Berikutnya
- Integration test GET sandbox mengikuti [runbook](../runbook.md). Kerangka frontend minimal dikerjakan sebagai tugas terpisah.

## Blocker dan pertanyaan terbuka
| # | Pertanyaan | Pemilik | Dibutuhkan sebelum |
|---|---|---|---|
| Q1 | Pain point nyata: 1-2 pekerjaan BC manual yang paling sering dilakukan tiap minggu | Irfan | Fase 2 (menentukan prioritas fitur API Explorer) |
| Q4 | Pilih SQLAlchemy atau SQLModel jika DB dibutuhkan | Irfan | Sebelum fitur pertama yang menyimpan data |
| Q5 | Pemberitahuan ke atasan (sebelum dibagikan/di luar sandbox) | Irfan | Sebelum pengguna kedua |

## Keputusan terkini
Lihat `docs/decisions/`. ADR-001 **Accepted** untuk autentikasi app-only via MSAL. ADR-002 tetap **Proposed** dengan keputusan `uv` workspace dan SDK async sudah disetujui. ADR-003 **Accepted** (Documentation Generator keluar dari MVP; builder tetap terpisah).
