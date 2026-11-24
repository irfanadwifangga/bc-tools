# Standar API (backend kita)

- Prefix `/api/v1`. Skema request/response lewat Pydantic; OpenAPI adalah sumber untuk client frontend.
- Format error standar: `{"error": {"code": "BC_NOT_FOUND", "message": "...", "details": {...}}}`. Kode stabil, pesan manusiawi, tanpa stack trace.
- Pemetaan: `BCAuthError`→502 (konfigurasi), `BCNotFoundError`→404, `BCRateLimitError`→429, `BCServerError`→502, validasi→422.
- Pagination: `?limit=` dan `?cursor=` (opak). Jangan mengekspos `@odata.nextLink` mentah ke frontend jika memuat URL internal.
- Versioning: perubahan breaking → `/api/v2`.
- Idempotensi/cache: GET saja di MVP; tidak ada endpoint yang mengubah state BC.

## API Explorer (aturan khusus — vektor penyalahgunaan)
- Hanya **GET**.
- Path dibatasi allowlist pola (`/api/v2.0/...`, `/api/{publisher}/{group}/{version}/...`) pada base URL BC yang dikonfigurasi.
  Dilarang menerima URL penuh dari klien (mencegah SSRF).
- Query option divalidasi (`$filter`, `$top`, `$select`, `$expand`, `$orderby`, `$count`); `$top` dibatasi maksimum.
