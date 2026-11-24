# Modul: API Explorer

- **Fase:** 2 · **Status:** Implementasi bertahap
- **Lokasi:** `backend/app/modules/api_explorer/` + `frontend/src/features/api-explorer/`

## Tujuan
Membantu BA/developer menjelajahi API BC dan menghasilkan sample code, tanpa Postman.

## Catatan kritis
Request tester saja kurang bernilai karena Postman dan collection resmi BC sudah ada. **Nilai tambah modul ini ada di
konteks BA (daftar entity, field, relasi) dan code generator Python/C#.** Prioritaskan fitur itu.

## Evaluasi BC Ladder
Standard BC (API reference Microsoft, Page Inspector) dan tool existing (Postman) mencakup sebagian. Kekurangannya:
sample code siap pakai yang konsisten dengan konvensi internal. Opsi 5 (API Integration) dipilih; tanpa AI.
Irfan memilih pencarian endpoint dan field API standar sebagai prioritas pertama.

## Lingkup
- Browse endpoint (parsing `$metadata`), tampilkan metadata entity/field
- Test request GET dengan query option tervalidasi
- JSON viewer
- Generate sample code Python dan C# (template statis, di-snapshot test)
- Copy-to-clipboard

## Katalog API standar

`GET /api/v1/api-explorer/entities` mengembalikan array JSON dari `bc.metadata.list_entities()`. Setiap entri berisi `name`, `entity_type`, dan `fields` (pasangan `name` dan `type`). Katalog kosong menghasilkan `200 []`. URL sandbox berasal dari konfigurasi backend. Parameter query menghasilkan 422.

Untuk menguji dengan konfigurasi sandbox lokal, jalankan backend dari root repo:

```powershell
uv run --locked --all-packages --env-file .env uvicorn backend.app.main:app --host 127.0.0.1
```

Skema respons tersedia di OpenAPI. Kredensial atau konfigurasi yang tidak valid menghasilkan 502, metadata yang tidak ditemukan 404, pembatasan laju 429, dan respons upstream yang gagal dibaca 502. Pesan untuk frontend mengikuti format standar backend.

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
