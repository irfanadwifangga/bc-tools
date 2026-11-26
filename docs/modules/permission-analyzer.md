# Modul: Permission Analyzer (B-11)

- **Fase:** 3 (Pasca-MVP) · **Status:** Slice 1 (SDK) & Slice 2 (Backend & UI) terimplementasi (verifikasi live Sandbox menunggu uji manual)
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

Irfan memverifikasi melalui integration test Sandbox (`DEMO COMPANY`, `D365 AUTOMATION`) pada 2026-11-26 bahwa `$metadata` `microsoft/automation/v2.0` mengembalikan 25 entity dengan skema terverifikasi berikut:
- `users`: `userSecurityId` (`Edm.Guid`), `userName` (`Edm.String`), `displayName` (`Edm.String`), `state` (`Edm.String`), `expiryDate` (`Edm.DateTimeOffset`), `contactEmail` (`Edm.String`).
- `usersPermissions`: `id`, `userSecurityId`, `userName`, `fullName`, `state`, `expiryDate`, `windowsSecurityID`, `changePassword`, `licenseType`, `authenticationEmail`, `contactEmail`, `exchangeIdentifier`, `applicationId` (`Edm.Guid` — dipakai membedakan User BC vs Aplikasi Entra).
- `permissionSets`: `scope`, `appId`, `id`, `displayName`, `extensionName`.
- `accessControls`: `id`, `userSecurityId`, `roleId`, `roleName`, `company`, `userName`, `fullName`, `userLicenseType`, `scope`, `appId`, `appName` — dipakai sebagai sumber assignment role per user & company karena lolos query langsung (`company_scoped=True`).
- `expandedPermissionSets`: `id`, `appId`, `appName`, `roleId`, `roleName`, `objectType`, `objectId` (`Edm.Int32`), `objectName`, `readPermission`, `insertPermission`, `modifyPermission`, `deletePermission`, `executePermission`, `alObjectName`, `scope`. Uji Sandbox menunjukkan query berfilter `$filter` per role (`D365 READ`) mengembalikan `2.986` baris dalam `6.92s` dan query `objectId eq 18` (`top=20`) selesai dalam `0.38s`, sehingga rute `/objects` dan `/diff` memakai `timeout=45.0` detik dan batch `5` role.
- `aggregatePermissionSets`: `id`, `appId`, `appName`, `name`, `roleId`, `scope` (terverifikasi `ok` dalam `0.25s`).
- `userPermissionSets` & `userPermissions`: tersedia di `$metadata`, tetapi hasil uji Sandbox menunjukkan HTTP `400` jika diakses langsung pada `companies({id})/...` tanpa parent navigation, dan HTTP `404` di root tenant.

[PERLU VERIFIKASI: tampilan & interaksi langsung 3 tab UI Permission Analyzer di browser terhadap backend lokal (`uvicorn` terbaru) pada Sandbox `DEMO COMPANY`.]

## Kontrak Endpoint Backend (`/api/v1/permission-analyzer`)

- `GET /api/v1/permission-analyzer/users`: mengembalikan daftar user/aplikasi Entra (`usersPermissions`), assignment role per company (`accessControls`), flag `isSuper`, serta daftar `permissionSets` dan `companies`.
- `GET /api/v1/permission-analyzer/objects?query=...&object_type=...&access=...&company=...`: pencarian terbalik objek dari `expandedPermissionSets` yang digabungkan ke pemegang izin (`accessControls` + `usersPermissions`) dengan penanda sensitif.
- `GET /api/v1/permission-analyzer/diff?kind=user|role&left=...&right=...`: membandingkan 2 user (`userSecurityId`) atau 2 permission set (`roleId`) untuk menghasilkan `roleDiff` dan `objectDiff` (`same`, `onlyLeft`, `onlyRight`).

## Batasan keamanan & arsitektur

- **Read-only total (GET-only):** tidak ada operasi assign, revoke, create, atau delete permission set.
- **Semua akses BC melalui `bc_sdk`:** rute Automation API dibatasi ke allowlist endpoint read-only tertentu pada host `api.businesscentral.dynamics.com` dalam environment `Sandbox` sesuai [ADR-004](../decisions/ADR-004-automation-api-readonly.md).
- **Tanpa kebocoran data sensitif:** jangan simpan dump izin pengguna atau kredensial di repo/fixture; tes unit memakai data sintetis dengan HTTP mock.

## Pertanyaan terbuka

| # | Pertanyaan | Pemilik | Dibutuhkan sebelum |
|---|---|---|---|
| PA-1 | Selesai — daftar field `$metadata` 7 entity izin telah diverifikasi di Sandbox pada 2026-11-26 | Irfan | Selesai |
| PA-2 | Persetujuan [ADR-004](../decisions/ADR-004-automation-api-readonly.md) — **Disetujui (Opsi A)** pada 2026-11-26 | Irfan | Selesai |
| PA-3 | Selesai — `usersPermissions.applicationId` & `licenseType` mencakup **User BC dan Aplikasi Entra** (`D365 AUTOMATION` di `BC-Sandbox-Latihan`) | Irfan | Selesai |

## Acceptance criteria awal
- [x] `bc_sdk` mendukung pembacaan GET-only endpoint Automation API yang disetujui di ADR-004 dengan HTTP mock test
- [x] Backend menyediakan endpoint read-only untuk ringkasan izin user, pencarian akses objek (Read/Write/Delete/`SUPER`), dan diff dua user/permission set
- [x] UI menampilkan filter user/objek/akses berisiko serta tampilan diff berdampingan
- [ ] `ruff`, `mypy`, `pytest`, `bun test`, `tsc`, dan `vite build` lulus (lulus dengan mock); verifikasi manual Sandbox terdokumentasi di `STATUS.md`

## Definition of Done
Irfan dapat memeriksa siapa yang memiliki akses baca/tulis/hapus ke suatu objek dan membandingkan dua user atau permission set di Sandbox secara lokal tanpa menelusuri layar BC satu per satu.
