# Standar UI (Ant Design 5)

## Tema
- Satu file `src/theme/tokens.ts` untuk `ConfigProvider` (primary color, radius, font). Dilarang override CSS Ant langsung.
- Light/dark via `theme.algorithm`. Default mengikuti sistem.

## Layout
`Layout` + `Sider` (menu modul, collapse di bawah breakpoint `lg`) + `Header` (judul, tema) + `Content` dengan breadcrumb.
Hindari `pro-components` di awal untuk menjaga dependensi ringan.

## Struktur frontend
```
src/
├── app/          # providers, router
├── layouts/
├── components/   # wrapper bersama (dibuat bila dipakai >= 3 kali)
├── features/<modul>/{pages,components,api}
├── api/          # client hasil generate OpenAPI
├── hooks/
└── theme/
```

## Konvensi
- **Tabel:** pagination server-side; definisi kolom bertipe; state loading/empty/error seragam.
- **Form:** Ant `Form`; validasi selaras dengan skema backend; tombol Simpan/Batal di posisi tetap.
- **Notifikasi:** `message` untuk aksi ringan; `notification` untuk proses panjang/error; semua error API lewat satu handler.
- **Komponen bersama awal:** `PageHeader`, `DataTable`, `JsonViewer`, `CodeBlock` (dengan copy-to-clipboard).
- **Dashboard:** ditunda dari MVP. Jika dibuat: tidak ada grafik tanpa pertanyaan bisnis yang dijawabnya.
- **Responsif:** desktop-first (alat internal); tabel scroll horizontal pada layar sempit.
- **Aksesibilitas:** kontras memadai, navigasi keyboard, label form eksplisit.
