# ADR-001: Autentikasi ke Business Central

- **Status:** Proposed (draft oleh Claude; Codex diminta me-review di Fase 0, pemilik yang menyetujui)
- **Tanggal:** 2026-11-24
- **Pemilik keputusan:** Irfan

## Konteks
Platform harus memanggil API BC. Ada dua pertanyaan identitas yang berbeda:
(a) bagaimana pengguna masuk ke portal, dan (b) sebagai siapa backend memanggil BC.
Saat ini hanya satu pengguna (pemilik), berjalan lokal, sandbox demo company, MVP read-only.
Entra app registration sudah ada dan memiliki permission API Read/Write (sisi Entra).

## Opsi
### Opsi A — Client credentials (app-only) via MSAL
- Pro: paling sederhana; tidak perlu UI login; cocok untuk tool lokal single-user; token otomatis dan di-cache MSAL.
- Kontra: tidak ada identitas per-user di BC (audit trail atas nama aplikasi); akses ditentukan permission set aplikasi, bukan user; tidak cukup begitu dibagikan ke banyak orang.
### Opsi B — Delegated (user login, authorization code + PKCE atau device code)
- Pro: akses mengikuti izin user BC; audit per-user; cocok untuk multi-user.
- Kontra: butuh UI/flow login, penyimpanan token/refresh, redirect URI; kompleksitas tinggi untuk satu pengguna.
### Opsi C — On-behalf-of (user login ke portal, backend memanggil BC atas nama user)
- Pro: kombinasi identitas user dan arsitektur backend yang bersih.
- Kontra: paling kompleks; butuh dua app registration/konfigurasi; berlebihan untuk MVP.

## Rekomendasi (belum keputusan)
**Opsi A untuk MVP**, dibungkus interface `TokenProvider` di `bc_sdk` sehingga Opsi B/C dapat ditambahkan saat
platform dibagikan tanpa mengubah kode resource. Alur login user ke portal ditunda.

## Konsekuensi
- Karena tidak ada login di portal, backend **wajib bind `127.0.0.1`** dan CORS dikunci ke origin frontend lokal.
- Akses BC efektif = permission set aplikasi di BC. **Beri permission set read-only**, meskipun izin Entra "Read/Write".
- SDK menolak method selain GET di level client (defense in depth).
- Client secret hanya di `.env`; untuk non-sandbox pertimbangkan sertifikat atau Key Vault (ADR baru).
- Saat dibagikan ke rekan: wajib ADR baru (Opsi B/C), pemberitahuan ke atasan, dan review security.

## Kondisi tinjau ulang
Pengguna kedua muncul; platform dihosting di luar mesin lokal; kebutuhan operasi write; kebutuhan audit per-user.

## Pertanyaan terbuka
1. Apakah aplikasi di BC (halaman Microsoft Entra Applications) sudah aktif dan permission set-nya read-only? — Irfan, sebelum Fase 1.
2. Secret atau sertifikat untuk non-sandbox? — ditunda sampai ada rencana di luar sandbox.
3. Apakah `Automation` API (mis. company management) dibutuhkan? — dievaluasi di Fase 2.
