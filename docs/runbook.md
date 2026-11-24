# Runbook (lokal)

## Prasyarat
- Windows + PowerShell
- Python 3.13 dan `uv` (usulan, lihat ADR-002)
- Bun (frontend)
- Akses BC sandbox demo company dan Entra app registration

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

## Perintah pengembangan
Ditambahkan oleh Tugas T3 Fase 0 (`docs/tasks/phase-0.md`). Sampai itu selesai, bagian ini belum berlaku.

## Troubleshooting
| Gejala | Kemungkinan penyebab |
|---|---|
| 401 saat ambil token | Tenant/client ID/secret salah atau secret kedaluwarsa |
| 401/403 saat GET BC | Aplikasi belum di-enable di BC atau permission set belum diberikan |
| 404 pada URL | Nama environment atau company ID salah |
| 429 | Throttling BC; SDK harus retry dengan backoff |
