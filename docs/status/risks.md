# Risiko

| ID | Risiko | Peluang | Dampak | Mitigasi | Status |
|---|---|---|---|---|---|
| R-01 | Scope creep / over-governance (dokumen lebih besar dari produk) | Tinggi | Tinggi | Dokumen minimum; review scope tiap 4 minggu; backlog sebagai penampung | Terbuka |
| R-02 | Aplikasi punya hak tulis di BC padahal MVP read-only | Sedang | Sedang | Permission set read-only di BC; SDK GET-only; test penolakan non-GET | Terbuka (izin read-only dibuat menurut Irfan; akses efektif belum diperiksa, lihat Q2) |
| R-03 | Secret bocor (commit/log) | Rendah | Tinggi | `.env` gitignored; redaksi log; rotasi bila bocor | Terbuka |
| R-04 | Backend tanpa login terekspos jaringan | Rendah | Tinggi | Bind `127.0.0.1`; CORS terkunci; jangan hosting sebelum ADR auth baru | Terbuka |
| R-05 | Tidak ada pengguna/pain point nyata → tool tidak terpakai | Sedang | Sedang | Isi Q1; validasi setelah Fase 1 | Terbuka |
| R-06 | Dibagikan/dipakai di luar sandbox tanpa sepengetahuan atasan | Rendah | Tinggi | Q5; checklist sebelum berbagi di `security.md` | Terbuka |
| R-07 | BC throttling/paging menyebabkan kegagalan | Sedang | Sedang | Retry/backoff dan paging di SDK sejak awal | Terbuka |
| R-08 | Agen menyentuh atau menjalankan isi builder (termasuk skill pihak ketiga dengan MCP eksternal) | Rendah | Sedang | Aturan 7 di AGENTS.md; builder tetap repo terpisah | Terbuka |
| R-09 | Kecepatan belajar BC menjadi bottleneck | Sedang | Sedang | Validasi dengan konsultan senior; fokus ke use case nyata | Terbuka |
| R-10 | Ketergantungan pada satu agent/model | Rendah | Sedang | `AGENTS.md` model-agnostic; docs sebagai sumber kebenaran | Terbuka |
| R-11 | Agent menyetujui/mengubah keputusan sendiri | Sedang | Sedang | Aturan peran; ADR hanya disetujui pemilik; review manusia sebelum merge | Terbuka |
