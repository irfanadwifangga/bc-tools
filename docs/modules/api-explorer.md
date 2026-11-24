# Modul: API Explorer

- **Fase:** 2 · **Status:** Spesifikasi (bergantung pada `bc_sdk`)
- **Lokasi:** `backend/app/modules/api_explorer/` + `frontend/src/features/api-explorer/`

## Tujuan
Membantu BA/developer menjelajahi API BC dan menghasilkan sample code, tanpa Postman.

## Catatan kritis
Request tester saja kurang bernilai karena Postman dan collection resmi BC sudah ada. **Nilai tambah modul ini ada di
konteks BA (daftar entity, field, relasi) dan code generator Python/C#.** Prioritaskan fitur itu.

## Evaluasi BC Ladder
Standard BC (API reference Microsoft, Page Inspector) dan tool existing (Postman) mencakup sebagian. Kekurangannya:
sample code siap pakai yang konsisten dengan konvensi internal. Opsi 5 (API Integration) dipilih; tanpa AI.
**Tugas validasi sebelum mulai:** pemilik menyebutkan 1-2 pekerjaan manual mingguan yang ingin dipercepat (lihat `docs/status/STATUS.md`).

## Lingkup
- Browse endpoint (parsing `$metadata`), tampilkan metadata entity/field
- Test request GET dengan query option tervalidasi
- JSON viewer
- Generate sample code Python dan C# (template statis, di-snapshot test)
- Copy-to-clipboard

## Aturan keamanan
Hanya GET; path allowlist; tanpa URL penuh dari klien; `$top` dibatasi. Lihat `docs/standards/api.md`.

## Acceptance criteria
- [ ] Daftar endpoint BC tampil (standard dan custom API yang terdeteksi)
- [ ] Metadata entity/field tampil
- [ ] GET request berjalan dan JSON tampil
- [ ] Generate sample Python (httpx + MSAL, mandiri tanpa `bc_sdk`) dan C# (`HttpClient` + MSAL.NET)
- [ ] Copy-to-clipboard
- [ ] Aturan keamanan di atas ditegakkan dan dites (termasuk percobaan non-GET dan path di luar allowlist)

## Definition of Done
Pengguna menemukan endpoint BC dan menghasilkan sample code tanpa Postman.
