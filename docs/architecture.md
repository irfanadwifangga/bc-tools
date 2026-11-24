# Architecture

## Gaya
Modular monolith. Satu backend FastAPI, satu frontend, dan satu package `bc_sdk` mandiri.

```
Pemilik (browser, localhost)
        │
        ▼
Frontend (React + Ant Design)            ← frontend/
        │  HTTP (OpenAPI, 127.0.0.1)
        ▼
Backend FastAPI                          ← backend/app
  ├─ modules/api_explorer
  └─ core (config, logging, errors)
        │
        ▼
packages/bc_sdk                          ← satu-satunya jalur ke BC
  ├─ auth (TokenProvider)
  ├─ client (httpx, paging, retry)
  ├─ resources (companies, customers, items)
  └─ errors
        │  HTTPS, read-only
        ▼
Microsoft Entra ID (token)  +  Business Central API (sandbox demo company)
```

## Aturan dependency (satu arah)
`modules` → `core`, `bc_sdk`. `bc_sdk` tidak mengimpor apa pun dari `backend`.
Antar modul tidak saling mengimpor; komunikasi lewat `core` atau `bc_sdk`.

## Alur autentikasi
Ada dua alur konseptual. Untuk MVP, ADR-001 mengusulkan alur B tanpa login portal.

- **A. User → portal:** tidak ada di MVP. Backend bind `127.0.0.1`, hanya pemilik yang mengakses secara lokal.
- **B. Portal/backend → BC:** OAuth2 client credentials via MSAL (`ConfidentialClientApplication`),
  scope `https://api.businesscentral.dynamics.com/.default`. Akses efektif dibatasi oleh *permission set* yang
  diberikan ke aplikasi di BC (halaman Microsoft Entra Applications). Detail dan alasan: [ADR-001](decisions/ADR-001-auth.md).

Usulan `TokenProvider` memisahkan perolehan token dari kode resource. Delegated dan on-behalf-of
memerlukan desain login, penjagaan token, dan review tersendiri sebelum platform dibagikan.

## Bentuk URL BC (referensi)
- Standard API: `https://api.businesscentral.dynamics.com/v2.0/{tenantId}/{environment}/api/v2.0/companies({companyId})/customers`
- Daftar company: `.../api/v2.0/companies`
- Metadata: `.../api/v2.0/$metadata`
- Custom API (AL): `.../api/{publisher}/{group}/{version}/companies({companyId})/{entitySet}`
- Paging: ikuti `@odata.nextLink`. Throttling: tangani HTTP 429 dengan `Retry-After`.

## Data lokal
MVP tidak membutuhkan database sampai ada fitur yang menyimpannya (misal request favorit). Jika dibutuhkan:
SQLite + migrasi sejak awal. Lihat [ADR-002](decisions/ADR-002-stack-and-repo-structure.md).
