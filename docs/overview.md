# Overview

## Visi
Pusat automation dan integration untuk Business Central yang reusable, modular, dan terdokumentasi,
sehingga tidak perlu banyak repository kecil yang terpisah. AI ditambahkan setelah fondasi matang.

## Prinsip
- **BC Decision Ladder**: Standard BC → Configuration → Workflow → Power Automate → API → Custom → AI.
- **Fondasi dulu**, fitur kemudian. **Read-only dulu**, write kemudian.
- **Docs-with-code**: dokumen minimum sebelum coding, sisanya tumbuh bersama kode.
- **Mulai dari pengguna nyata**: pemilik proyek adalah pengguna pertama.

## Konteks pengguna dan lingkungan
- Pengguna saat ini: satu orang (pemilik). Dibagikan ke rekan hanya jika stabil dan terbukti membantu.
- Environment BC: **sandbox demo company**. Entra app registration sudah dibuat.
- Belum ada persetujuan formal atasan. **Wajib memberi tahu atasan sebelum dipakai di luar sandbox atau dibagikan.**

## Scope MVP
| Modul | Peran | Fase |
|---|---|---|
| `bc_sdk` | Fondasi komunikasi BC (read-only) | 1 |
| API Explorer | Jelajahi API BC, generate sample code Python/C# | 2 |
| UI shell minimal | Layout dan navigasi Ant Design | 1-2 |

## Non-goals MVP
- Operasi write ke BC
- Login multi-user, activity log, notifikasi, user settings, dashboard
- Documentation Generator (dikeluarkan dari MVP; ADR-003 Accepted dan `docs/modules/docs-generator.md`)
- Export DOCX (Typst tidak native; lihat backlog)
- Docker/Compose, deployment ke Azure
- Semua fitur AI (Copilot, RAG)
- Currency Sync (menunggu API resmi dan requirement final)

## Roadmap modul future (setelah MVP, urutan usulan)
1. Permission Analyzer 2. Change Analyzer 3. BC Consultant Copilot (Azure OpenAI + AI Search + RAG)
Urutan final ditentukan setelah retrospektif akhir MVP.
