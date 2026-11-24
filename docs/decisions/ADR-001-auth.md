# ADR-001: Autentikasi ke Business Central

- **Status:** Proposed (draft oleh Claude; Codex diminta me-review di Fase 0, pemilik yang menyetujui)
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

## Konsekuensi
Jika pemilik memilih Opsi A, `TokenProvider` menjadi batas perolehan token di `bc_sdk`.
Alur login portal tetap ditunda.

- Karena tidak ada login di portal, backend **wajib bind `127.0.0.1`** dan CORS dikunci ke origin frontend lokal.
- Terapkan least privilege lewat permission set aplikasi di BC. Irfan melaporkan permission set read-only sudah dibuat. Validasi hak efektif tetap dilakukan manual di Fase 1.
- SDK menolak method selain GET di level client (defense in depth).
- Client secret hanya di `.env`; untuk non-sandbox pertimbangkan sertifikat atau Key Vault (ADR baru).
- Saat dibagikan ke rekan: wajib ADR baru (Opsi B/C), pemberitahuan ke atasan, dan review security.

## Kondisi tinjau ulang
Pengguna kedua muncul; platform dihosting di luar mesin lokal; kebutuhan operasi write; kebutuhan audit per-user.

## Pertanyaan terbuka
1. Apakah aplikasi aktif dan hak efektifnya terbatas pada sandbox demo company serta operasi read-only? Periksa assignment, izin efektif, dan GET sandbox secara manual. — Irfan, sebelum integration test Fase 1.
2. Apakah kamu menyetujui client credentials dengan secret untuk sandbox? — Irfan, sebelum implementasi autentikasi Fase 1.
3. Apakah ada kebutuhan Automation API yang konkret? Sampai ada kebutuhan, gunakan izin untuk API BC yang masuk scope MVP. — Irfan, sebelum scope API Explorer ditetapkan pada Fase 2.
