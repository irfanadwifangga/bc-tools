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
2. Isi `BC_TENANT_ID`, `BC_CLIENT_ID`, `BC_CLIENT_SECRET`, `BC_ENVIRONMENT`.
3. Jangan pernah commit `.env`.

## Verifikasi koneksi (read-only)
```powershell
pwsh infra/scripts/check-bc-connection.ps1
```
Berhasil jika mengembalikan daftar companies sandbox. Gagal 401/403 → periksa app registration dan
status aplikasi di halaman *Microsoft Entra Applications* di BC beserta permission set-nya.

## Troubleshooting
| Gejala | Kemungkinan penyebab |
|---|---|
| 401 saat ambil token | Tenant/client ID/secret salah atau secret kedaluwarsa |
| 401/403 saat GET BC | Aplikasi belum di-enable di BC atau permission set belum diberikan |
| 404 pada URL | Nama environment atau company ID salah |
| 429 | Throttling BC; SDK harus retry dengan backoff |
