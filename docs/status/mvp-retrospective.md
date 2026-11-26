# Retrospektif Akhir MVP (Fase 0–2)

Tanggal: 2026-11-26 · Target tag rilis: `v0.2.0`

## Ringkasan capaian

1. **Fase 0 — Fondasi & tata kelola:**
   - Struktur monorepo (`packages/bc_sdk`, `backend`, `frontend`, `docs`), CI GitHub (`ruff`, `mypy`, `pytest` pada Windows Python 3.12), dan aturan kerja agen (`AGENTS.md`, `BC Decision Ladder`).
   - ADR-001 (**Accepted**, app-only client credentials via MSAL) dan ADR-003 (**Accepted**, builder dokumentasi tetap terpisah dari MVP).
2. **Fase 1 — `bc_sdk` & UI shell:**
   - `TokenProvider` + `MsalTokenProvider`, client HTTP async GET-only dengan validasi scope Sandbox, retry `429`/`5xx`, dan paging `@odata.nextLink`.
   - Resource standar `companies`, `customers`, `items` dengan integrasi manual terhadap `DEMO COMPANY` Sandbox lulus.
   - Kerangka UI Ant Design 5 dengan navigasi responsif, tema Sistem/Terang/Gelap, dan halaman **Ringkasan**.
3. **Fase 2 — API Explorer (PR #17–#23):**
   - Katalog `$metadata` standar dan satu custom API (`BC_CUSTOM_API_ROUTE`, diuji dengan ekstensi `Demo Company` `ptmis/demo/v1.0` di Sandbox).
   - Pencarian endpoint/field, filter sumber (`Semua`, `Standar`, `Custom`), tampilan `List`/`Grid`, dan modal detail split-pane dengan filter field lokal.
   - Preview data `customers` & `items` (Tabel & JSON berwarna, salin JSON, `$top` 1–5, `$orderby`, filter `number`, filter `name`, `$select`, `$count` via `X-Total-Count`) serta generator **Contoh Kode GET** Python (`httpx` + `msal`) dan C# (`HttpClient` + `MSAL.NET`) untuk seluruh endpoint standar dan custom API.

## Verifikasi MVP saat penutupan

- Tes otomatis pada `main` (`d2fe592`): `131 passed` Python (`1 deselected` integration test), `35 pass` frontend, `ruff`, `mypy`, `tsc`, dan `vite build` (tanpa chunk warning).
- Terverifikasi di Sandbox oleh Irfan: koneksi S2S `DEMO COMPANY`, katalog standar & custom (`ptmis/demo/v1.0`), preview `customers` Tabel/JSON, `$select` parsial (`id,displayName`), dan `$count` (`5 ditampilkan dari 12 total`).
- Belum diverifikasi di Sandbox nyata: filter `Nama` (`contains(displayName,'...')`) dan eksekusi script contoh GET untuk endpoint di luar `customers`/`items`.

## Pelajaran utama untuk Fase 3

- Menempatkan token CSS tema pada `:root`/`documentElement` mencegah komponen Portal Ant Design (`Modal`, `Select`) kehilangan warna tema.
- Pembatasan ketat allowlist di `bc_sdk` efektif mencegah kebocoran scope, sehingga perluasan ke Automation API (`microsoft/automation/v2.0`) di Fase 3 wajib melalui ADR baru (`ADR-004`).
- Tetap jalankan slice kecil per modul (`bc_sdk` -> `backend` -> `frontend` + `docs`) dan hindari ketergantungan pada data produksi selama pengembangan.
