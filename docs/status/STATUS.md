# STATUS

_Terakhir diperbarui: 2026-11-27_

## Status fase
**MVP Fase 0–2 selesai (`v0.2.0`)** dan masuk `main` lewat [PR #23](https://github.com/irfanadwifangga/bc-tools/pull/23). **Fase 3 — Permission Analyzer (`B-11`) selesai (`v0.3.0`)**: Slice 1 (`bc_sdk` Automation API) masuk lewat [PR #26](https://github.com/irfanadwifangga/bc-tools/pull/26), Slice 2 (backend + UI) lewat [PR #27](https://github.com/irfanadwifangga/bc-tools/pull/27), dan poles modul existing lewat [PR #28](https://github.com/irfanadwifangga/bc-tools/pull/28), dengan seluruh 3 tab terverifikasi live di Sandbox `DEMO COMPANY`; lihat [spesifikasi modul](../modules/permission-analyzer.md) dan [ADR-004](../decisions/ADR-004-automation-api-readonly.md) (`Accepted`). **Change Analyzer (`B-12`) selesai** (API Schema Snapshot & Diff, terverifikasi live di Sandbox `DEMO COMPANY`); lihat [change-analyzer.md](../modules/change-analyzer.md).

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

- API Explorer mengurutkan endpoint A–Z per huruf awal. Pencarian berdasarkan nama endpoint atau field menampilkan grup yang memiliki hasil. Hasil menyorot teks yang cocok dan menampilkan contoh nama field pada endpoint tertutup. Detail menampilkan daftar nama serta tipe field.
- Tangkapan layar Irfan menunjukkan pencarian `user` menghasilkan 9 endpoint. Saat detail tertutup, bagian nama endpoint dan field yang cocok tersorot di tema terang dan gelap.
- Pada katalog uji lokal, detail `approvalUserSetups` diperiksa melalui browser di kedua tema. Pencarian `user` menyorot bagian yang cocok pada `userId` dan `assignedUserId`. Field `city` tetap terlihat tanpa sorotan.
- Irfan menguji API Explorer melalui frontend lokal. Pencarian `customers` menampilkan endpoint `customers` dengan entity type `Microsoft.NAV.customer` dan field `id` bertipe `Edm.Guid`.

- Backend API Explorer menyediakan preview maksimum lima customer dari demo company terkonfigurasi. Tes route menggunakan SDK mock.
- Irfan menguji `GET /api/v1/api-explorer/customers/preview` melalui backend lokal. Respons JSON memuat lima customer, masing-masing dengan field `id`, `number`, dan `displayName`.

- Preview customer di frontend dimuat saat pengguna memilih **Lihat contoh data**. Irfan menguji preview `customers` melalui UI API Explorer. Tabel menampilkan lima baris dengan kolom `id`, `number`, dan `displayName`.

- Preview `customers` menyediakan pilihan **Tabel** dan **JSON** dari satu respons backend. Irfan memeriksa preview `customers` melalui UI API Explorer. Tampilan JSON memuat lima objek dengan field dan nilai yang sama seperti tampilan Tabel.

- Tampilan JSON preview `customers` membedakan nama field dan nilai string dengan warna pada tema terang dan gelap serta menyediakan tombol **Salin JSON**. Irfan memeriksa kedua tema dan mengonfirmasi hasil tempel di editor lokal sesuai dengan JSON yang ditampilkan.

- Detail `customers` dan `items` menyediakan contoh GET Python dan C# dengan pewarnaan sintaks dan tombol salin. Tes memeriksa konsistensi template dan path untuk kedua endpoint. Eksekusi terhadap sandbox menunggu uji manual Irfan.

- API Explorer menyediakan preview maksimal lima item dalam Tabel dan JSON. Uji sandbox menunggu verifikasi Irfan.

- Preview `customers` dan `items` menerima pilihan 1–5 baris. Batas diteruskan ke SDK dan diuji dengan mock.

- Contoh GET Python dan C# untuk `customers` dan `items` memakai pilihan jumlah baris yang sama dengan preview.

- Preview dan contoh GET `customers` dan `items` mendukung urutan nomor atau nama, naik atau turun. Pengiriman `$orderby` diuji dengan HTTP mock. Uji Sandbox menunggu verifikasi Irfan.

- Preview dan contoh GET `customers` dan `items` menyediakan filter nomor. Tes mock mencakup hasil cocok, hasil kosong, dan pengodean karakter khusus. Uji Sandbox menunggu verifikasi Irfan.

- API Explorer dapat menampilkan katalog satu custom API yang dikonfigurasi, dengan penanda sumber dan daftar field. Pengambilan metadata custom diuji dengan mock, 4 skenario browser simulasi lulus, dan Irfan mengonfirmasi `customers` Custom beserta field custom tampil dari Sandbox (`ptmis/demo/v1.0`).

- API Explorer memakai komponen bersama `PageHeader` rata tengah dengan deskripsi, toolbar pencarian dengan filter sumber (`Semua`, `Standar`, `Custom`) dan toggle List/Grid di bawah kotak pencarian, kontrol `<Select>` Ant Design berikon di preview, serta modal detail split-pane (struktur field ber-filter & scroll mandiri di kiri, tab **Preview Data** dan **Contoh Kode GET** di kanan).

- Preview dan contoh GET `customers` dan `items` mendukung pilihan **Field ($select)** dari `id`, `number`, dan `displayName` dengan validasi allowlist di SDK/backend (`422` untuk input tidak valid), kolom Tabel/JSON tersinkron, serta tes mock Python & frontend. Irfan memverifikasi `$select` parsial (`fields = ("id", "displayName")`) pada Sandbox `DEMO COMPANY` dan UI tombol/state (`Spin`, `Skeleton`, `Empty`, `Alert`).

- Preview dan contoh GET `customers` & `items` ditambah filter `name` (`contains(displayName,'...')`) dan opsi `$count` (`X-Total-Count`), panel **Contoh Kode GET** diperluas ke seluruh endpoint standar dan custom API, `.env.example` diperbarui dengan `# BC_CUSTOM_API_ROUTE=`, modal layar sempit dirapikan, dan bundle frontend di-split di `vite.config.ts`. Irfan memverifikasi `$count` (`5 ditampilkan dari 12 total`) pada `customers` dan generator kode `countriesRegions` di Sandbox; uji Sandbox filter `name` dan eksekusi script generik tetap menunggu verifikasi.

- Halaman **Ringkasan** (`#ringkasan`) diperbarui menjadi Workspace Hub (`OverviewPage`) yang memuat status backend lokal (`/api/v1/health`), jumlah endpoint Standar & Custom, total Customer & Item `DEMO COMPANY`, tombol aksi cepat ke **API Explorer**, serta tombol **Periksa ulang**, dengan unit test mock dan SSR. Irfan memverifikasi tampilan live di browser (`Backend lokal: Aktif`, `150 endpoint` Standar, `7 endpoint` Custom, `12` Customer, `51` Item).

- **Fase 3 Slice 1 (Permission Analyzer SDK):** [ADR-004](../decisions/ADR-004-automation-api-readonly.md) disetujui (`Accepted`), `bc.automation` ditambahkan di `bc_sdk` dengan allowlist GET-only `microsoft/automation/v2.0` dan diuji dengan HTTP mock (`test_automation.py`). Integration test Sandbox (`test_sandbox_automation_integration.py`) lulus oleh Irfan pada 2026-11-26: 25 entity Automation terdeteksi beserta skema field `$metadata` untuk `users`, `usersPermissions`, `permissionSets`, `userPermissionSets`, `expandedPermissionSets`, `accessControls`, dan `userPermissions`.

- **Fase 3 Slice 2 (Permission Analyzer Backend & UI):** Ekstrak helper bersama `backend/app/core/bc.py`, tambah endpoint read-only `/api/v1/permission-analyzer/{users,objects,diff}` (`backend/app/modules/permission_analyzer/`), regenerasi `frontend/src/api/schema.d.ts`, tambah halaman `#permission-analyzer` (tab **User & Aplikasi**, **Cari Akses Objek**, dan **Bandingkan (Diff)**) dengan lebar kolom sub-tabel sama rata, `showTotal` pada pagination, serta penyelarasan kotak loading skeleton penuh bersama API Explorer. Seluruh unit test mock Python & frontend lulus; Irfan memverifikasi probe integration test Sandbox (`objectId eq 18` 58 baris `0.53s`, `contains(objectName,'Customer')` `1.35s`, dan filter gabungan `or` gagal sehingga disederhanakan menjadi filter tunggal), tab **User & Aplikasi** (`16` akun `DEMO COMPANY`), serta pada 2026-11-27 memverifikasi tab **Cari Akses Objek** (query `18` dan `Customer`) dan **Bandingkan (Diff)** (user vs user dan permission set vs permission set) lulus live di browser.

- **Sinkronisasi & Poles Modul Existing (`bc_sdk`, API Explorer, Ringkasan, Permission Analyzer):** Menyetarakan seluruh checkbox Acceptance Criteria di `bc-sdk.md`, memasang `CORSMiddleware` (`FRONTEND_ORIGIN` + `expose_headers=["X-Total-Count"]`) di `backend/app/main.py`, mencegah crash digit Unicode & pemborosan panggilan BC saat objek kosong, memperbaiki abort race & masking error `TypeError` di frontend, memperbaiki wrap/lebar tabel modal API Explorer & warna `[data-tone="error"]` di Ringkasan, menyatukan helper role, serta menambah unit test backend (`155 passed`) dan frontend (`49 pass`).

- **Fase 3 — Change Analyzer (`B-12`, API Schema Snapshot & Diff):** Menambah `GET /api/v1/change-analyzer/snapshot` (`backend/app/modules/change_analyzer/`) yang membaca `$metadata` `standard`, `custom`, dan `automation` secara GET-only via `bc_sdk`, regenerasi `frontend/src/api/schema.d.ts`, serta menambah halaman `#change-analyzer` (ekspor/unggah/tempel snapshot JSON, perbandingan terhadap Live Sandbox atau dua file snapshot, klasifikasi *Breaking* vs *Penambahan*, salin ringkasan Markdown, modal **Panduan Penggunaan**, `<Tour>` *step-by-step*, tombol simulasi, dan tombol **Reset**). Seluruh unit test mock Python (`160 passed`) dan frontend (`53 pass`) lulus; pada 2026-11-27 Irfan memverifikasi simulasi/Reset dan pengambilan snapshot live Sandbox (`DEMO COMPANY`) lulus di browser.

## Blocker dan pertanyaan terbuka
| # | Pertanyaan | Pemilik | Dibutuhkan sebelum |
|---|---|---|---|
| Q4 | Pilih SQLAlchemy atau SQLModel jika DB dibutuhkan | Irfan | Sebelum fitur pertama yang menyimpan data |
| Q5 | Pemberitahuan ke atasan (sebelum dibagikan/di luar sandbox) | Irfan | Sebelum pengguna kedua |

## Keputusan terkini
Lihat `docs/decisions/`. ADR-001 **Accepted** (MSAL app-only), ADR-002 **Proposed** (`uv` workspace & SDK async disetujui), ADR-003 **Accepted** (Documentation Generator keluar dari MVP), ADR-004 **Accepted** (`microsoft/automation/v2.0` read-only via `bc_sdk` dengan `D365 AUTOMATION`).
