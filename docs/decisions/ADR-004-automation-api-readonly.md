# ADR-004: Pembacaan Automation API (`microsoft/automation/v2.0`) secara Read-Only di `bc_sdk`

- **Status:** Proposed
- **Tanggal:** 2026-11-26
- **Pemilik keputusan:** Irfan

## Konteks

Saat ini `bc_sdk` ([client.py](../../packages/bc_sdk/src/bc_sdk/client.py)) membatasi seluruh permintaan ke:
1. API standar `/v2.0/{tenant}/Sandbox/api/v2.0/...` (`companies`, `customers`, `items`, `$metadata`).
2. Satu rute custom API untuk `$metadata` saja, sambil menolak prefix publisher `microsoft`.

Modul **Permission Analyzer** (Fase 3) membutuhkan daftar user, assignment permission set, dan detail izin objek/tabel yang tidak tersedia pada API bisnis standar `api/v2.0/`. Microsoft menyediakan Automation API di bawah namespace `/api/microsoft/automation/v2.0/`, yang membutuhkan permission set `D365 AUTOMATION` pada Entra app di Business Central.

## Opsi

### Opsi A — Izinkan endpoint allowlist GET-only pada `microsoft/automation/v2.0` di `bc_sdk`
- Pro:
  - Tidak perlu membuat dan memelihara Custom AL API Page tambahan di Sandbox/ekstensi PTE.
  - Memanfaatkan endpoint resmi Microsoft Business Central Automation API dengan validasi path eksplisit per resource (hanya endpoint permission/user read-only yang diizinkan, bukan seluruh namespace `microsoft/*`).
  - Tetap mematuhi aturan keras GET-only dan pembatasan environment `Sandbox`.
- Kontra:
  - Aplikasi Entra di Sandbox perlu diberi permission set `D365 AUTOMATION` (akses lebih luas di sisi BC dibanding `D365 READ`, meski `bc_sdk` tetap mengunci metode HTTP hanya `GET` dan daftar path terbatas).
  - [PERLU VERIFIKASI: ketersediaan dan skema pasti endpoint `permissionSets`, `userPermissionSets`, `expandedPermissionSets`, `accessControls`, dan `usersPermissions` pada versi BC Sandbox PT MIS saat memakai S2S `D365 AUTOMATION`.]

### Opsi B — Buat Custom AL API Page read-only di ekstensi terpisah (mis. `ptmis/security/v1.0`)
- Pro:
  - Dapat membatasi izin di BC hanya ke tabel sistem izin (`Access Control`, `Expanded Permission`, `Aggregate Permission Set`) tanpa memberi `D365 AUTOMATION`.
  - Dapat menggabungkan atau memfilter field langsung di sisi AL.
- Kontra:
  - Mengharuskan deployment ekstensi AL ke setiap environment BC yang ingin diaudit (mengurangi sifat zero-footprint alat audit).
  - Menambah beban maintenance kode AL di luar repo `bc-tools`.

## Keputusan

(Kosong selama status `Proposed` — menunggu konfirmasi dan uji akses `D365 AUTOMATION` di Sandbox oleh Irfan.)

## Konsekuensi

- Jika **Opsi A** disetujui:
  - `bc_sdk` menambahkan allowlist path terpisah khusus endpoint read-only Automation API yang terdaftar (tetap menolak `POST`/`PATCH`/`PUT`/`DELETE` dan tetap menolak prefix `microsoft` di `BC_CUSTOM_API_ROUTE`).
  - Irfan menambahkan `D365 AUTOMATION` pada Entra app di Sandbox dan melakukan smoke check GET read-only sebelum implementasi penuh.
- Jika suatu endpoint permission tidak tersedia atau tidak cukup di Automation API, sebagian data dapat dilengkapi lewat Opsi B pada ADR lanjutan.

## Kondisi tinjau ulang

- Jika `D365 AUTOMATION` tidak diizinkan oleh kebijakan keamanan lingkungan target atau endpoint Automation API tidak mengembalikan izin objek yang diperlukan.
- Saat aplikasi diperluas ke environment non-Sandbox atau multi-user (login delegated/OBO).

## Pertanyaan terbuka

1. Apakah aplikasi Entra `BC-Sandbox-Latihan` sudah diberi `D365 AUTOMATION` dan berhasil membaca endpoint `microsoft/automation/v2.0`? — Irfan, sebelum implementasi `bc_sdk` Fase 3.
2. Endpoint mana saja yang tersedia dan paling akurat untuk pemetaan user -> permission set -> izin tabel/page di BC Sandbox saat ini? — Irfan, sebelum implementasi backend Fase 3.

## Evaluasi BC Ladder

1. **Standard BC:** *Effective Permissions* dan *Permission Sets* tersedia per halaman/per user, tetapi tidak mendukung pencarian terbalik lintas user atau diff dua user/set secara cepat.
2. **Configuration:** Pengelompokan role di BC tidak menyediakan laporan matriks atau komparasi interaktif.
3. **Workflow:** Tidak relevan (untuk persetujuan dokumen).
4. **Power Automate:** Tidak cocok untuk UI matriks & diff interaktif lokal.
5. **API Integration (Usulan — Opsi A):** Baca Automation API `microsoft/automation/v2.0` secara GET-only lewat `bc_sdk`.
6. **Custom Development (Opsi B):** Ditunda sebagai cadangan jika Automation API terbukti kurang lengkap.
7. **AI:** Tidak relevan.
