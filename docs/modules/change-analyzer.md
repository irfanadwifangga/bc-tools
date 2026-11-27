# Modul: Change Analyzer (B-12)

- **Fase:** 3 (Pasca-MVP) · **Status:** Implementasi Slice 1 (API Schema Snapshot & Diff)
- **Lokasi:** `backend/app/modules/change_analyzer/` + `frontend/src/features/change-analyzer/`

## Tujuan
Membantu developer dan BA Business Central mendeteksi perubahan kontrak API (`$metadata`) sebelum dan sesudah upgrade mayor BC (misalnya v28 → v29) atau deploy Custom API AL baru, sehingga potensi *breaking change* pada integrasi eksternal terlihat lebih awal.

## Evaluasi BC Decision Ladder
1. **Standard Business Central feature (tidak cukup sendiri):** *Extension Management* dan catatan rilis Microsoft menjelaskan perubahan fitur serta objek AL, tetapi tidak membandingkan kontrak `$metadata` OData yang dipublikasikan oleh tenant sebelum vs sesudah upgrade/deploy.
2. **Configuration (tidak relevan):** konfigurasi BC tidak menyediakan diff snapshot `$metadata`.
3. **Workflow (tidak relevan):** workflow BC ditujukan untuk alur persetujuan dokumen bisnis.
4. **Power Automate (tidak cocok sebagai UI audit):** kurang praktis untuk membandingkan ratusan endpoint/field serta menyaring *breaking change* secara interaktif di lokal.
5. **API Integration — DIPILIH:** membaca `$metadata` secara **GET-only** lewat `bc_sdk` (`bc.metadata.list_entities()`, `bc.custom_metadata.list_entities()`, dan `bc.automation.list_metadata()`) sebagai JSON snapshot terurut, lalu membandingkan dua snapshot (Baseline JSON vs Live Sandbox atau dua file JSON) di frontend.
6. **Custom Development (AL — tidak diperlukan):** tidak butuh extension AL tambahan karena seluruh endpoint `$metadata` sudah tersedia di `bc_sdk`.
7. **AI (tidak relevan):** perbandingan skema dan klasifikasi *breaking change* bersifat deterministik; tidak memakai AI.

## Lingkup (read-only & stateless)
1. **Ambil & ekspor snapshot skema:**
   - `GET /api/v1/change-analyzer/snapshot?source=all|standard|custom|automation` mengembalikan daftar endpoint terurut (`source`, `name`, `entityType`, `fields`) tanpa data bisnis dan tanpa kredensial.
   - Tombol **Unduh Baseline JSON** di UI menyimpan snapshot untuk dipakai nanti (misalnya sebelum upgrade BC v28 → v29).
2. **Perbandingan (diff) deterministik:**
   - Membandingkan **Baseline (Lama)** (unggah `.json`, tempel JSON, atau ambil dari Live Sandbox) vs **Target (Baru)** (**Live Sandbox saat ini**, unggah `.json`, atau tempel JSON).
   - Klasifikasi otomatis:
     - **Breaking:** endpoint dihapus, `entityType` berubah, field dihapus, atau tipe `Edm.*` field berubah.
     - **Non-breaking (Penambahan):** endpoint baru atau field baru ditambahkan.
   - Filter berdasarkan nama endpoint/field, sumber (`standard`, `custom`, `automation`), serta toggle **Hanya Breaking**, ditambah **Salin Ringkasan Markdown** untuk dokumentasi PR/rilis.

## Batasan keamanan & arsitektur
- **GET-only & stateless:** tidak ada operasi write ke BC maupun ke disk server atau database lokal.
- **Semua akses BC melalui `bc_sdk`:** memakai jalur `metadata`, `custom_metadata`, dan `automation.list_metadata` pada host `api.businesscentral.dynamics.com` environment `Sandbox`.
- **Tanpa secret:** snapshot hanya memuat nama entity/field dan tipe Edm publik.

## Acceptance criteria
- [x] `GET /api/v1/change-analyzer/snapshot` mengembalikan snapshot `$metadata` deterministik via `bc_sdk` dengan validasi query (`422`) dan unit test mock
- [x] Frontend dapat mengambil/mengunduh snapshot JSON, membandingkan dua snapshot atau terhadap Live Sandbox, dan menandai *breaking change* vs penambahan
- [x] `ruff`, `mypy`, `pytest`, `bun test`, `tsc`, dan `vite build` lulus (dengan HTTP/client mock); verifikasi live Sandbox menunggu uji manual Irfan di `STATUS.md`

## Definition of Done
Developer BC dapat menyimpan baseline kontrak `$metadata` dan langsung melihat endpoint/field mana yang *breaking* atau bertambah setelah upgrade BC maupun deploy Custom API.
