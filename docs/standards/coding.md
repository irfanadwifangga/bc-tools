# Standar Coding

## Python
- Python 3.13 (lihat ADR-002 untuk fallback). Type hint wajib pada semua fungsi publik.
- Lint dan format: `ruff`. Type check: `mypy` (strict untuk `bc_sdk`, standar untuk backend).
- I/O selalu lewat model Pydantic. Tidak ada `dict` bebas melintasi batas modul.
- `httpx` async. Timeout eksplisit di setiap client. Tidak ada `requests`.
- Logging: modul `logging` standar, pesan terstruktur (key=value). **Tidak pernah** mencatat token, secret, atau header Authorization.
- Konfigurasi: satu objek settings (Pydantic Settings) dari `.env`; tidak ada `os.environ` tersebar.

## Struktur dan batas
- Router tipis: validasi → panggil service → kembalikan schema. Logic ada di `service`.
- `bc_sdk` tidak mengimpor `backend`. Modul backend tidak saling mengimpor.
- Satu file satu tanggung jawab; fungsi pendek; hindari abstraksi spekulatif.

## Error handling
Hierarki di `bc_sdk.errors`: `BCError` → `BCAuthError`, `BCNotFoundError`, `BCRateLimitError`, `BCServerError`, `BCRequestError`.
Backend memetakan error SDK ke respons API standar (lihat `api.md`).

## Test
- `pytest`. SDK: unit test dengan HTTP di-mock (mis. `respx`). Tidak ada panggilan jaringan di test default.
- Integration test ke sandbox: tanda `@pytest.mark.integration`, dijalankan **manual saja**, tidak di CI (butuh secret).
- Test baru wajib untuk setiap perilaku baru dan setiap bugfix.

## Penamaan
`snake_case` Python, `PascalCase` kelas/komponen React, `kebab-case` nama file dokumen. Bahasa kode dan komentar teknis: English.
Dokumentasi: Bahasa Indonesia dengan istilah teknis English.
