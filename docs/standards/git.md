# Standar Git

- Trunk-based: `main` selalu hijau. Branch pendek: `feat/...`, `fix/...`, `docs/...`, `chore/...`.
- **Conventional Commits** dengan scope: `feat(sdk): ...`, `fix(backend): ...`, `docs(adr): ...`, `chore(ci): ...`.
- Satu commit satu perubahan logis. Tidak ada commit berisi secret.
- Merge hanya jika CI hijau dan `STATUS.md`/docs terkait sudah diperbarui.
- Changelog dibuat dari riwayat commit (tidak ditulis manual).
- Tag rilis: `v0.<fase>.<patch>` (contoh `v0.1.0` setelah Fase 1).
- Agent membuat branch dan commit; **pemilik** yang merge ke `main`.
