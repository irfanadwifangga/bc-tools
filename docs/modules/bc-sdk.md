# Modul: bc_sdk

- **Fase:** 1 · **Status:** Spesifikasi (belum diimplementasi)
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

## API publik target
```python
bc = BCClient.from_settings(settings)
await bc.companies.list()
await bc.customers.list(company_id=...)
await bc.items.list(company_id=..., top=50)
```
API publik dan transport menggunakan async sesuai ADR-002.

## Konfigurasi
`BC_TENANT_ID`, `BC_CLIENT_ID`, `BC_CLIENT_SECRET`, `BC_ENVIRONMENT`, `BC_COMPANY_ID` (opsional).

## Implementasi autentikasi

`TokenProvider.get_token()` menyediakan antarmuka async untuk client SDK. `MsalTokenProvider`
menerima tenant ID berbentuk UUID, client ID, dan client secret. Provider menggunakan cache
in-memory MSAL dan menerjemahkan kegagalan menjadi `BCAuthError` tanpa detail respons Entra.

Delapan unit test dengan MSAL mock lulus di Windows. Tes mencakup penggunaan ulang aplikasi
MSAL, validasi tenant dan token, serta redaksi error. Integration test GET dijalankan setelah
client read-only tersedia.

## Acceptance criteria
- [ ] Token diperoleh otomatis dengan client credentials
- [ ] `companies.list()`, `customers.list()`, `items.list()` berhasil terhadap sandbox (integration test manual)
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
