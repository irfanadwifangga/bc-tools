# ADR-001: Autentikasi ke Business Central

- **Status:** Accepted
- **Tanggal:** 2026-11-24
- **Pemilik keputusan:** Irfan

## Konteks
Platform harus memanggil API BC. Ada dua pertanyaan identitas yang berbeda:
(a) bagaimana pengguna masuk ke portal, dan (b) sebagai siapa backend memanggil BC.
Saat ini hanya satu pengguna (pemilik), berjalan lokal, sandbox demo company, MVP read-only.
Entra app registration sudah ada. Microsoft mendokumentasikan `API.ReadWrite.All` untuk API/web services
Business Central dan `Automation.ReadWrite.All` untuk Automation API. Akses objek tetap mengikuti izin
yang diberikan di BC. [Dokumentasi S2S Microsoft](https://learn.microsoft.com/en-us/dynamics365/business-central/dev-itpro/administration/automation-apis-using-s2s-authentication).

## Opsi
### Opsi A — Client credentials (app-only) via MSAL
- Pro: paling sederhana; tidak perlu UI login; cocok untuk tool lokal single-user; token otomatis dan di-cache MSAL.
- Kontra: BC melihat identitas aplikasi, sehingga tindakan tidak bisa diatribusikan ke pengguna portal. Client secret perlu disimpan dan dirotasi.
### Opsi B — Delegated (user login, authorization code + PKCE atau device code)
- Pro: akses mengikuti izin user BC; audit per-user; cocok untuk multi-user.
- Kontra: perlu login interaktif dan pengelolaan siklus token. Authorization code dengan PKCE memerlukan redirect URI; device code menambah langkah verifikasi di browser dan bergantung pada kebijakan tenant.
### Opsi C — On-behalf-of (user login ke portal, backend memanggil BC atas nama user)
- Pro: kombinasi identitas user dan arsitektur backend yang bersih.
- Kontra: paling kompleks; butuh dua app registration/konfigurasi; berlebihan untuk MVP.

### Opsi D — Client credentials dengan sertifikat
- Pro: mempertahankan alur app-only tanpa menyimpan client secret bersama.
- Kontra: perlu pengelolaan private key, masa berlaku, dan rotasi sertifikat.

## Keputusan

Gunakan client credentials via MSAL untuk sandbox demo company.
SDK mengambil token melalui `TokenProvider` dan membatasi akses BC ke GET.

## Konsekuensi
`TokenProvider` menjadi batas perolehan token di `bc_sdk`.
Alur login portal tetap ditunda.

- Karena tidak ada login di portal, backend **wajib bind `127.0.0.1`** dan CORS dikunci ke origin frontend lokal.
- Konfigurasi read-only dikonfirmasi dari screenshot Microsoft Entra Application Card di sandbox. Aplikasi berstatus `Enabled` dengan permission set `D365 READ`.
- SDK menolak method selain GET di level client (defense in depth).
- Client secret hanya di `.env`; untuk non-sandbox pertimbangkan sertifikat atau Key Vault (ADR baru).
- Saat dibagikan ke rekan: wajib ADR baru (Opsi B/C), pemberitahuan ke atasan, dan review security.

## Kondisi tinjau ulang
Pengguna kedua muncul; platform dihosting di luar mesin lokal; kebutuhan operasi write; kebutuhan audit per-user.

## Pertanyaan terbuka
1. Bagaimana hasil integration test GET terhadap sandbox demo company? — Irfan, setelah SDK siap pada Fase 1.
2. Apakah ada kebutuhan Automation API yang konkret? Sampai ada kebutuhan, gunakan izin untuk API BC yang masuk scope MVP. — Irfan, sebelum scope API Explorer ditetapkan pada Fase 2.
