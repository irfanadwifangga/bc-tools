# Modul: bc_sdk

- **Fase:** 1 · **Status:** Implementasi bertahap
- **Lokasi:** `packages/bc_sdk/`

## Tujuan
Fondasi seluruh komunikasi dengan BC. Developer tidak menulis HTTP request ke BC secara langsung.

## Evaluasi BC Ladder
Standard BC, Config, Workflow, dan Power Automate tidak menyelesaikan kebutuhan "akses programatik yang reusable
untuk banyak tool internal". Dipilih API Integration (REST/OData BC) dengan lapisan SDK tipis. Custom Development
terbatas pada SDK itu sendiri. AI: tidak relevan.

## Lingkup (MVP, read-only)
- Autentikasi client credentials via MSAL, di balik interface `TokenProvider`
- Token management (cache, refresh otomatis lewat MSAL)
- HTTP client async (`httpx`): timeout, retry dengan backoff untuk 429/5xx (hormati `Retry-After`), paging `@odata.nextLink`
- Resource: `companies`, `customers`, `items`; mekanisme sederhana untuk menambah resource, termasuk Custom API (AL)
- Error hierarchy standar, logging tanpa secret
- Penolakan semua method selain GET di level client

## API publik
```python
from bc_sdk import BCClient

async with BCClient.from_settings(settings) as bc:
    entities = await bc.metadata.list_entities()
    companies = await bc.companies.list()
    customers = await bc.customers.list()
    items = await bc.items.list(top=50)
```
API publik dan transport menggunakan async sesuai ADR-002. Setiap `list()` mengembalikan model Pydantic bertipe. `top` membatasi jumlah hasil lintas halaman. Argumen `company_id` pada `customers` dan `items`, jika diberikan, harus cocok dengan ID demo company di konfigurasi.

Resource `customers` dan `items` menerima `order_by` opsional dari enum `RecordOrder` (nomor atau nama, naik atau turun) untuk mengirim `$orderby` bersama `$top`.

Resource `customers` dan `items` juga menerima `number` opsional untuk kecocokan persis. SDK membatasi nomor ke 100 karakter cetak dan menangani apostrof sebagai bagian dari nilai literal.

Resource `customers` dan `items` juga menerima `fields` opsional dari enum `RecordField` (`id`, `number`, `displayName`, minimal satu field unik) untuk mengirim `$select` sesuai pilihan tanpa field asing.

## Katalog metadata (Fase 2)

Jika `BCSettings.custom_api_route` terisi, `bc.custom_metadata.list_entities()` membaca `$metadata` dari satu kombinasi publisher, group, dan version pada host Business Central Sandbox yang dikonfigurasi. SDK membatasi permintaan custom ke path metadata tersebut.

`bc.metadata.list_entities()` membaca `GET /api/v2.0/$metadata` di sandbox terkonfigurasi. Setiap hasil berisi nama entity set, nama lengkap entity type, serta nama dan tipe field struktural termasuk field warisan. Dua entity set yang memakai tipe sama tetap muncul sebagai dua endpoint. Katalog ini mencakup API standar dan dapat dibaca tanpa ID company.

Irfan menjalankan pemeriksaan manual di sandbox pada 24 November 2026 dan mengonfirmasi bahwa katalog metadata mengembalikan `customers.id` dengan tipe `Edm.Guid`.

## Konfigurasi
Gunakan `BCSettings` untuk menampung `BC_TENANT_ID`, `BC_CLIENT_ID`, `BC_CLIENT_SECRET`, `BC_ENVIRONMENT`, dan `BC_COMPANY_ID`. ID company boleh kosong saat membaca daftar companies dan wajib diisi saat membaca data customers atau items.

## Implementasi autentikasi

`TokenProvider.get_token()` menyediakan antarmuka async untuk client SDK. `MsalTokenProvider`
menerima tenant ID berbentuk UUID, client ID, dan client secret. Provider menggunakan cache
in-memory MSAL dan menerjemahkan kegagalan menjadi `BCAuthError` tanpa detail respons Entra.

Delapan unit test dengan MSAL mock lulus di Windows. Tes mencakup penggunaan ulang aplikasi
MSAL, validasi tenant dan token, serta redaksi error. Integration test GET dijalankan setelah
client read-only tersedia.

## Implementasi HTTP client

Client async hanya mengirim GET melalui HTTPS ke API v2.0 pada tenant terkonfigurasi dan environment Sandbox. Daftar company dapat diminta sebelum company ID ditetapkan. Request data company memerlukan ID demo company yang dikonfigurasi.

Pagination memakai nextLink untuk endpoint yang sama. Redirect ditolak. Retry dibatasi tiga percobaan total per halaman untuk HTTP 429 dan 5xx. Retry-After mendukung detik dan tanggal HTTP. Jika waktu tunggu yang diminta melebihi 30 detik, client mengembalikan error tanpa retry lebih awal.

Resource standar `companies`, `customers`, dan `items` memakai client yang sama dan diuji dengan HTTP mock. Integration test GET sandbox bersifat manual. Lihat [runbook](../runbook.md).

## Acceptance criteria
- [ ] Token diperoleh otomatis dengan client credentials
- [x] Ketiga resource lulus integration test GET terhadap `DEMO COMPANY` di sandbox.
- [ ] Paging mengikuti `@odata.nextLink`
- [ ] Retry/backoff untuk 429 dan 5xx; `Retry-After` dihormati
- [ ] Logging berjalan; token/secret tidak pernah tercatat (ada test)
- [ ] Error handling standar (`BCError` hierarchy) dengan pesan jelas
- [ ] Client menolak method selain GET (ada test)
- [ ] Dapat digunakan modul backend manapun tanpa menulis HTTP langsung
- [ ] Unit test dengan HTTP di-mock; cakupan perilaku inti
- [ ] Docs ini diperbarui dengan bentuk API final

## Definition of Done
Developer memanggil `bc.companies.list()`, `bc.customers.list()`, `bc.items.list()` tanpa menulis HTTP request,
CI hijau, dan docs sinkron.

## Non-goals
Operasi write, delegated/on-behalf-of auth, caching data BC, ORM lokal.
