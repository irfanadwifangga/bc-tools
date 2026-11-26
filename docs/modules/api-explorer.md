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

### Tampilan katalog

Endpoint dikelompokkan menurut huruf awal nama dan diurutkan A–Z tanpa membedakan huruf besar dan kecil. Grup `#` menampung nama dengan karakter awal di luar A–Z. Saat mencari nama endpoint atau field, hanya grup yang memiliki hasil yang tampil.

Jalankan backend dengan perintah di atas, lalu jalankan `bun run dev` dari `frontend/`. Pilih **API Explorer** di navigasi. Pencarian mencocokkan sebagian nama endpoint atau nama field dari katalog yang sudah dimuat. Misalnya, `postalCode` menampilkan setiap endpoint yang memiliki field dengan nama tersebut. Teks yang cocok disorot. Saat endpoint tertutup, nama field pertama yang cocok tampil di samping nama endpoint. Buka endpoint untuk melihat semua field yang cocok dalam daftar lengkap. Pilih endpoint untuk melihat entity type, nama field, dan tipe field. Tombol **Coba lagi** memuat ulang katalog setelah terjadi kesalahan.

Vite meneruskan request katalog dan preview customer ke backend lokal pada port 8000. Jika skema backend berubah, jalankan `bun run api:types` dari frontend saat backend aktif, lalu periksa perubahan tipe dengan `bun run typecheck`.

## Preview customer

Buka endpoint **customers**, lalu pilih **Lihat contoh data**. Tampilan awal **Tabel** memuat `id`, `number`, dan `displayName`. Pilih **JSON** untuk melihat respons dengan indentasi dan warna sintaks. Di tema gelap, nama field berwarna cyan dan nilai string kuning. Tema terang memakai warna teal dan oker yang lebih gelap. Nilai `number` customer tetap berwarna seperti string karena diapit tanda kutip. Pilih **Salin JSON** untuk menyalin teks persis seperti yang ditampilkan, termasuk indentasi. Hasil kosong disalin sebagai `[]`. Tombol berada di kanan pilihan tampilan dan dapat turun ke baris berikutnya pada layar sempit. Saat proses berlangsung, tombol menampilkan **Menyalin…**. Setelah berhasil, **Tersalin** tampil selama dua detik. Jika gagal, pilih **Coba salin lagi** atau salin teks JSON secara manual. Berpindah tampilan menggunakan data yang sudah dimuat. Jika preview gagal, pilih **Coba lagi**. Menutup detail menghapus preview dari tampilan.

`GET /api/v1/api-explorer/customers/preview` mengembalikan array berisi nol sampai lima customer dari demo company yang dipilih melalui `BC_COMPANY_ID`. Setiap baris memuat `id` (UUID), `number`, dan `displayName`. Jika company belum memiliki customer, hasilnya `200 []`.

Backend memanggil `bc.customers.list(top=5)`. ID company yang kosong atau tidak valid menghasilkan `502 BC_CONFIG_ERROR`. Parameter query menghasilkan `422 INVALID_QUERY`. Error dari BC dipetakan mengikuti standar API backend.

## Contoh kode GET untuk customers

Buka detail **customers**, pilih **Contoh kode GET**, lalu **Python** atau **C#**. Kata kunci, string, literal angka atau boolean, dan komentar dibedakan secara visual di tema terang dan gelap. **Salin kode** menyalin contoh dalam bahasa yang sedang ditampilkan. Membuka atau menyalin kode dilakukan lokal. Saat dijalankan, contoh mengambil token aplikasi, memeriksa nama company, lalu membaca maksimal lima customer dengan field `id`, `number`, dan `displayName`. Kedua contoh menampilkan array JSON, termasuk `[]` untuk hasil kosong.

Python memerlukan `msal` untuk token dan `httpx` untuk GET. Simpan sebagai `customers.py`, lalu jalankan `uv run --with msal --with httpx --env-file .env python customers.py` dari folder dengan konfigurasi sandbox. Untuk C#, salin ke `Program.cs` pada proyek console .NET, jalankan `dotnet add package Microsoft.Identity.Client` di proyek contoh untuk autentikasi MSAL.NET, lalu `dotnet run` dengan environment proses yang sudah dikonfigurasi. Kedua contoh membaca `BC_TENANT_ID`, `BC_CLIENT_ID`, `BC_CLIENT_SECRET`, dan `BC_COMPANY_ID`. Jika diberikan, `BC_ENVIRONMENT` harus bernilai `Sandbox` (kapitalisasi bebas).

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
