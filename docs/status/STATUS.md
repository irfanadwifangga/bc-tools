# STATUS

_Terakhir diperbarui: 2026-11-24_

## Status fase
**Fase 2 — katalog endpoint dan field untuk API Explorer.** Fase 0 sudah masuk `main` lewat [PR #1](https://github.com/irfanadwifangga/bc-tools/pull/1).

## Selesai
- Scaffold repo, `AGENTS.md`, dokumen inti, standar, spesifikasi modul, draft ADR-001/002/003 (disusun Claude sebagai analis)
- Entra app registration dibuat; environment: sandbox demo company
- Screenshot dari Irfan mengonfirmasi aplikasi berstatus `Enabled` dengan permission set `D365 READ` di sandbox.

- Review kritis, tooling Python 3.12, dan pemeriksaan Fase 0 selesai. Lihat [review Fase 0](phase-0-review.md) dan [hasil CI](https://github.com/irfanadwifangga/bc-tools/actions/runs/45324683780).
- `TokenProvider` async dan adapter MSAL tersedia. Delapan unit test autentikasi dengan mock lulus. Lihat [spesifikasi SDK](../modules/bc-sdk.md).
- Client async GET-only, pagination, dan retry sudah diuji dengan HTTP mock.
- Resource `companies`, `customers`, dan `items` serta `BCClient.from_settings()` tersedia dan diuji dengan HTTP mock.
- Integration test GET sandbox lulus dua kali pada 2026-11-24, dijalankan oleh Irfan.
- Kerangka frontend tersedia: Ringkasan, sidebar responsif, dan pilihan tema.

- Irfan menjalankan pemeriksaan manual di sandbox pada 24 November 2026 dan mengonfirmasi bahwa katalog metadata mengembalikan `customers.id` dengan tipe `Edm.Guid`.

- Backend menyediakan `GET /api/v1/api-explorer/entities` untuk katalog standar. Kontrak respons dan pemetaan error diuji dengan SDK mock.
- Irfan menguji route katalog lokal melalui Postman. Respons `200 OK` memuat `entityDefinitions.entityName` bertipe `Edm.String`.

- Frontend API Explorer menyediakan pencarian endpoint dan daftar nama serta tipe field.
- Irfan menguji API Explorer melalui frontend lokal. Pencarian `customers` menampilkan endpoint `customers` dengan entity type `Microsoft.NAV.customer` dan field `id` bertipe `Edm.Guid`.

- Backend API Explorer menyediakan preview maksimum lima customer dari demo company terkonfigurasi. Tes route menggunakan SDK mock.
- Irfan menguji `GET /api/v1/api-explorer/customers/preview` melalui backend lokal. Respons JSON memuat lima customer, masing-masing dengan field `id`, `number`, dan `displayName`.

- Preview customer di frontend dimuat saat pengguna memilih **Lihat contoh data**. Irfan menguji preview `customers` melalui UI API Explorer. Tabel menampilkan lima baris dengan kolom `id`, `number`, dan `displayName`.

## Blocker dan pertanyaan terbuka
| # | Pertanyaan | Pemilik | Dibutuhkan sebelum |
|---|---|---|---|
| Q4 | Pilih SQLAlchemy atau SQLModel jika DB dibutuhkan | Irfan | Sebelum fitur pertama yang menyimpan data |
| Q5 | Pemberitahuan ke atasan (sebelum dibagikan/di luar sandbox) | Irfan | Sebelum pengguna kedua |

## Keputusan terkini
Lihat `docs/decisions/`. ADR-001 **Accepted** untuk autentikasi app-only via MSAL. ADR-002 tetap **Proposed** dengan keputusan `uv` workspace dan SDK async sudah disetujui. ADR-003 **Accepted** (Documentation Generator keluar dari MVP; builder tetap terpisah).
