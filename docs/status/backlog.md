# Backlog

Prioritas: P1 (MVP inti) · P2 (MVP stretch) · P3 (pasca-MVP). Perubahan scope dicatat di sini.

| ID | Item | Prioritas | Fase | Catatan |
|---|---|---|---|---|
| B-01 | `bc_sdk`: auth client credentials + `TokenProvider` | P1 | 1 | ADR-001 |
| B-02 | `bc_sdk`: client (paging, retry, GET-only) + resource companies/customers/items | P1 | 1 | |
| B-03 | Kerangka frontend (Vite + TS + Ant Design, layout) | P1 | 1 | `docs/standards/ui.md` |
| B-04 | API Explorer: browse + metadata + GET test + JSON viewer | P1 | 2 | |
| B-05 | API Explorer: generator Python/C# + copy | P1 | 2 | Nilai tambah utama |
| B-06 | Documentation Generator: **perlu re-scope** (builder adalah workflow agen, bukan program) | P3 | - | ADR-003; butuh pain point nyata |
| B-07 | Export DOCX: evaluasi Pandoc vs `python-docx` vs tanpa DOCX | P3 | - | Hanya jika ada permintaan nyata |
| B-08 | Docker/Compose | P3 | - | Setelah pengguna kedua |
| B-09 | Login multi-user (delegated/OBO) + ADR baru | P3 | - | Sebelum dibagikan |
| B-10 | Dashboard, activity log, notifikasi, user settings | P3 | - | Ditunda dari MVP |
| B-11 | Permission Analyzer | P3 | 3 | Selesai (`v0.3.0`, PR #26–#28) |
| B-12 | Change Analyzer | P3 | - | Ditunda (belum ada pain point rutin) |
| B-13 | BC Consultant Copilot (Azure OpenAI + AI Search + RAG) | P3 | - | Setelah fondasi stabil |
| B-14 | Currency Sync | P3 | - | Menunggu API resmi dan requirement final |
| B-15 | Operasi write ke BC | P3 | - | ADR terpisah; ETag/If-Match, idempotensi |
