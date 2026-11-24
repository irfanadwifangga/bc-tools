# Tugas Fase 0 — Fondasi dan Keputusan

**Untuk:** AI agent (Codex/GPT) · **Peran:** Architect/Reviewer lalu Implementer · **Pemilik:** Irfan

## Konteks
Scaffold repo, `AGENTS.md`, dokumen inti, standar, spesifikasi modul, dan ADR-001/002/003 sudah disusun
(oleh Claude sebagai analis). **Jangan membuat ulang dari nol.** Tugasmu: me-review secara kritis, memperbaiki
inkonsistensi faktual, dan menyiapkan tooling. **Belum ada kode fitur di fase ini.**

Baca dulu (urutan): `docs/status/STATUS.md` → `AGENTS.md` → `docs/overview.md` → `docs/architecture.md` →
`docs/decisions/ADR-001..003` (ADR-003 hanya dibaca) → `docs/standards/*` → `docs/modules/*`.

## Aturan khusus Fase 0
- Mode MVP: lokal, single-user, read-only, sandbox demo company. Tanpa login portal.
- Jangan mengubah status ADR. ADR-001 dan ADR-002 berstatus Proposed (hanya pemilik yang menyetujui); ADR-003 sudah Accepted dan tidak boleh diubah.
- Documentation Generator dan Typst builder di luar scope. Jangan membuat modul, folder, atau dependency untuknya.
- Jangan membuat folder modul future. Jangan menginisialisasi frontend (itu Fase 1).
- Jangan membutuhkan atau menulis secret. Tidak ada panggilan ke BC di fase ini.
- Perbedaan pendapat dengan dokumen: **catat dan beri alasan**, jangan diam-diam menulis ulang.

## Tugas

### T0 — Review kritis
Hasilkan `docs/status/phase-0-review.md` berisi: (1) inkonsistensi antar dokumen, (2) celah/hal yang belum jelas,
(3) hal yang kamu tidak setujui beserta pro/kontra dan rekomendasimu, (4) risiko yang belum tercatat.
Urutkan berdasarkan dampak. Jangan menambah dokumen lain.

### T1 — Perbaikan faktual
Perbaiki hanya **inkonsistensi faktual** (nama file, tautan, istilah yang bertentangan). Perubahan yang bersifat
pendapat/keputusan masuk ke T0 sebagai usulan, bukan diedit langsung.

### T2 — Penyempurnaan ADR (tetap Proposed)
Tinjau ADR-001 dan ADR-002. Tambahkan opsi atau pro/kontra yang terlewat, dan pertanyaan terbuka untuk pemilik. Jika ada keberatan terhadap ADR-003, tulis di `phase-0-review.md`, jangan mengubah ADR-nya.
Pertahankan format `docs/decisions/ADR-000-template.md`.

### T3 — Tooling Python (tanpa kode fitur)
Siapkan satu perintah instalasi dari root repo (usulan `uv sync` dengan workspace; jika memilih lain, jelaskan di T0/ADR-002):
- `pyproject.toml` untuk root/workspace, `backend`, dan `packages/bc_sdk`
- Konfigurasi `ruff`, `mypy` (strict untuk `bc_sdk`), `pytest` (marker `integration` dikecualikan secara default)
- `pre-commit` (ruff, format, pemeriksaan file besar, deteksi secret sederhana)
- Satu test dummy di `bc_sdk` dan satu di `backend`
- Boleh menambahkan **hanya** `GET /api/v1/health` di backend sebagai smoke test
- Tambahkan perintah dev ke `docs/runbook.md` (PowerShell)

### T4 — CI
GitHub Actions: lint (`ruff`), type check (`mypy`), test (`pytest`, tanpa integration, tanpa secret). Cache dependency.

### T5 — Laporan akhir
Ikuti format `AGENTS.md` bagian 9. Perbarui `docs/status/STATUS.md`.

## Definition of Done Fase 0
- [ ] Repo di-clone → satu perintah instalasi berhasil di Windows/PowerShell
- [ ] `ruff`, `mypy`, `pytest` hijau lokal dan di CI
- [ ] `phase-0-review.md` ada dan berisi temuan berprioritas
- [ ] ADR-001/002 tetap Proposed dengan pertanyaan terbuka yang jelas; ADR-003 tidak berubah
- [ ] Tidak ada secret, tidak ada kode fitur, tidak ada folder modul future, frontend belum diinisialisasi
- [ ] `STATUS.md` dan `runbook.md` diperbarui

## Berhenti dan tanya jika
Ada keputusan arsitektur yang belum tercakup ADR, ada pertentangan antar dokumen yang tidak bisa diselesaikan secara faktual,
atau tooling yang diusulkan tidak berjalan di Windows.
