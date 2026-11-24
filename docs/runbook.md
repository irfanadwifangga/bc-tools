# Runbook (lokal)

## Pengembangan lokal (Fase 0)

Prasyarat: Windows, PowerShell, Python 3.12, dan `uv`. Jalankan dari root repo:

```powershell
uv sync --locked --all-packages
uv run --locked --all-packages ruff check .
uv run --locked --all-packages ruff format --check .
uv run --locked --all-packages mypy
uv run --locked --all-packages pytest
uv run --locked --all-packages pre-commit install
```

`pytest` menguji `GET /api/v1/health` dalam proses dan mengecualikan marker `integration` secara default. Untuk mencoba endpoint dari PowerShell, jalankan:

```powershell
uv run --locked --all-packages uvicorn backend.app.main:app --host 127.0.0.1
```

Di terminal lain, jalankan `Invoke-RestMethod http://127.0.0.1:8000/api/v1/health`. Respons yang diharapkan `{"status":"ok"}`. Hentikan server dengan `Ctrl+C` setelah pengecekan.

## Business Central (manual oleh pemilik, Fase 1)

Prasyarat: akses BC sandbox demo company dan Entra app registration.

## Konfigurasi
1. `Copy-Item .env.example .env`
2. Isi `BC_TENANT_ID`, `BC_CLIENT_ID`, `BC_CLIENT_SECRET`, dan `BC_ENVIRONMENT=Sandbox`. Isi `BC_COMPANY_ID` dengan ID demo company untuk tes SDK.
3. Jangan pernah commit `.env`.

## Verifikasi koneksi (read-only)
```powershell
pwsh infra/scripts/check-bc-connection.ps1
```
Berhasil jika mengembalikan daftar companies sandbox. Gagal 401/403 → periksa app registration dan
status aplikasi di halaman *Microsoft Entra Applications* di BC beserta permission set-nya.

## Integration test SDK (GET saja)

Jalankan dari root repo setelah `BC_COMPANY_ID` tersedia:

```powershell
uv run --locked --all-packages --env-file .env pytest -m integration packages/bc_sdk/tests/test_sandbox_integration.py
```

Tes memanggil daftar companies dan memastikan ID terkonfigurasi menunjuk ke `DEMO COMPANY` sebelum membaca maksimal satu customer dan satu item. Tes berhasil saat ketiga request GET lulus. Marker `integration` dikecualikan dari pytest default dan CI.

## Troubleshooting
| Gejala | Kemungkinan penyebab |
|---|---|
| 401 saat ambil token | Tenant/client ID/secret salah atau secret kedaluwarsa |
| 401/403 saat GET BC | Aplikasi belum di-enable di BC atau permission set belum diberikan |
| 404 pada URL | Nama environment atau company ID salah |
| 429 | Throttling BC; SDK harus retry dengan backoff |
