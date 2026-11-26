# Modul: Permission Analyzer (B-11)

- **Fase:** 3 (Pasca-MVP) · **Status:** Spesifikasi & evaluasi awal (belum ada kode)
- **Lokasi target (saat implementasi):** `backend/app/modules/permission_analyzer/` + `frontend/src/features/permission-analyzer/` + ekstensi read-only di `packages/bc_sdk/`

## Tujuan
Membantu BA dan administrator Business Central mengaudit siapa yang memiliki akses apa di Sandbox/company tanpa menelusuri halaman **Users** dan **Effective Permissions** satu per satu secara manual.

## Evaluasi BC Decision Ladder
1. **Standard Business Central feature (tidak cukup sendiri):** halaman **Effective Permissions**, **Permission Sets**, dan **Users** tersedia di BC, tetapi hanya menampilkan satu user/set per layar; tidak mendukung pencarian terbalik lintas user ("siapa saja yang bisa Modify/Delete tabel X?") atau perbandingan dua user/set sekaligus.
2. **Configuration (tidak cukup):** penataan security group dan permission set di BC merapikan assignment, tetapi tidak memberi tampilan audit/diff antar user.
3. **Workflow (tidak relevan):** workflow BC ditujukan untuk persetujuan dokumen bisnis, bukan analisis hak akses.
4. **Power Automate (tidak cocok sebagai UI utama):** cocok untuk notifikasi perubahan assignment, tetapi kurang sesuai untuk matriks/diff interaktif lokal.
5. **API Integration — DIPILIH:** membaca data user, permission set, assignment, dan detail objek/tabel secara **GET-only** melalui **Business Central Automation API (`microsoft/automation/v2.0`)** lewat `bc_sdk` (membutuhkan permission set `D365 AUTOMATION` pada Entra app dan persetujuan [ADR-004](../decisions/ADR-004-automation-api-readonly.md)), lalu menghitung matriks izin dan diff di backend/frontend.
6. **Custom Development (AL API Page — ditunda):** hanya dipertimbangkan jika Automation API di Sandbox tidak mengekspos detail izin objek yang dibutuhkan.
7. **AI (tidak relevan):** analisis hak akses bersifat deterministik; tidak memakai AI.

## Lingkup (MVP Permission Analyzer, read-only)

1. **Inspeksi izin per user & pencarian terbalik per objek:**
   - Daftar user/aplikasi dan permission set yang terpasang (tenant-wide maupun per company).
   - Pencarian objek (TableData, Table, Page, Report, Codeunit) untuk melihat siapa saja yang memiliki hak `Read`, `Insert`, `Modify`, `Delete`, atau `Execute`, serta penanda izin sensitif (`SUPER` atau akses tulis/hapus).
2. **Perbandingan (diff) dua user atau dua permission set:**
   - Membandingkan dua user atau dua permission set secara berdampingan untuk melihat izin yang sama, hanya ada di A, atau hanya ada di B (misalnya membandingkan user baru dengan user referensi atau memeriksa sebelum/sesudah perubahan role).

## Sumber data BC (Automation API)

[PERLU VERIFIKASI: Irfan memastikan endpoint Automation API `microsoft/automation/v2.0` (`permissionSets`, `userPermissionSets`, `expandedPermissionSets`, `accessControls`, `usersPermissions`) aktif di Sandbox dan dapat diakses dengan `D365 AUTOMATION` pada `BC-Sandbox-Latihan`, serta mencatat skema field aktual (ID objek, tipe objek, `readPermission`, `insertPermission`, `modifyPermission`, `deletePermission`, `executePermission`, `company`).]

## Batasan keamanan & arsitektur

- **Read-only total (GET-only):** tidak ada operasi assign, revoke, create, atau delete permission set.
- **Semua akses BC melalui `bc_sdk`:** rute Automation API dibatasi ke allowlist endpoint read-only tertentu pada host `api.businesscentral.dynamics.com` dalam environment `Sandbox` sesuai [ADR-004](../decisions/ADR-004-automation-api-readonly.md).
- **Tanpa kebocoran data sensitif:** jangan simpan dump izin pengguna atau kredensial di repo/fixture; tes unit memakai data sintetis dengan HTTP mock.

## Pertanyaan terbuka

| # | Pertanyaan | Pemilik | Dibutuhkan sebelum |
|---|---|---|---|
| PA-1 | Konfirmasi hasil uji `D365 AUTOMATION` pada endpoint `microsoft/automation/v2.0` di Sandbox | Irfan | Implementasi `bc_sdk` Fase 3 |
| PA-2 | Persetujuan [ADR-004](../decisions/ADR-004-automation-api-readonly.md) (`Proposed` -> `Accepted`) | Irfan | Implementasi `bc_sdk` Fase 3 |
| PA-3 | Apakah **Permission Set** khusus user saja atau termasuk aplikasi Entra (`Microsoft Entra Applications`)? | Irfan | Implementasi backend Fase 3 |

## Acceptance criteria awal
- [ ] `bc_sdk` mendukung pembacaan GET-only endpoint Automation API yang disetujui di ADR-004 dengan HTTP mock test
- [ ] Backend menyediakan endpoint read-only untuk ringkasan izin user, pencarian akses objek (Read/Write/Delete/`SUPER`), dan diff dua user/permission set
- [ ] UI menampilkan filter user/objek/akses berisiko serta tampilan diff berdampingan
- [ ] `ruff`, `mypy`, `pytest`, `bun test`, `tsc`, dan `vite build` lulus; verifikasi manual Sandbox terdokumentasi di `STATUS.md`

## Definition of Done
Irfan dapat memeriksa siapa yang memiliki akses baca/tulis/hapus ke suatu objek dan membandingkan dua user atau permission set di Sandbox secara lokal tanpa menelusuri layar BC satu per satu.
