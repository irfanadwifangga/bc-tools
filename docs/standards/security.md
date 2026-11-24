# Standar Security

1. **Secret** hanya di `.env` (gitignored). Tidak di kode, test, fixture, log, screenshot, atau dokumen. Jika terlanjur bocor: rotasi secret segera.
2. **Least privilege**: beri aplikasi di BC permission set read-only; naikkan hanya lewat ADR.
3. **Read-only di dua lapis**: tidak ada method write di SDK, dan client HTTP menolak method selain GET.
4. **Sandbox saja.** Dilarang data/kredensial produksi atau data klien nyata di repo maupun mesin pengembangan.
5. **Tanpa login = hanya lokal**: backend bind `127.0.0.1`, CORS hanya untuk `FRONTEND_ORIGIN`. Jangan ekspos ke jaringan sebelum ada autentikasi.
6. **Logging**: redaksi token/secret; jangan mencatat body respons BC penuh di level INFO.
7. **Dependency**: gunakan lockfile; tinjau dependency baru; jalankan audit dependency di CI saat tersedia.
8. **Validasi input** di setiap batas (API Explorer: allowlist path, lihat `api.md`).
9. **Sebelum dibagikan/hosting**: ADR autentikasi baru, review security, pemberitahuan ke atasan, dan secret via Key Vault atau sertifikat.
10. **AI (nanti)**: tidak ada data perusahaan yang dikirim ke layanan AI tanpa persetujuan eksplisit; setiap jawaban punya sitasi.
