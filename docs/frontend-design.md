# Desain frontend BC Tools

Status **usulan untuk review** · 24 November 2026

## Arah visual

**Buku kerja** adalah ruang kerja internal untuk BA dan developer Business Central. Saat membuka Ringkasan, pengguna perlu tahu environment dan company yang sedang dirujuk, mode akses, dan resource standar yang tersedia di SDK.

Rancangan memakai tiga bagian dengan ritme berbeda. Judul **Business Central Sandbox** menjadi fokus. Baris konteks mengelompokkan Environment, Company, dan Akses. Indeks resource memakai baris yang mudah dipindai. Garis pemisah dan nilai monospace mengingatkan pada lembar kerja tanpa meniru visual spreadsheet.

**ENERGY 2 / RHYTHM 2 / MOTION 1.** Judul punya bobot yang jelas. Spasi lebih rapat di dalam kelompok, lebih lega antarbagian. Gerak cukup untuk memberi umpan balik pada kontrol.

## Susunan Ringkasan

| Area | Isi dan perilaku |
|---|---|
| Header | Nama **BC Tools**, breadcrumb ruang kerja, dan satu tombol ikon tema. Menu menawarkan **Sistem / Terang / Gelap** dengan tanda centang pada pilihan aktif. |
| Sidebar | Rail 56 px pada desktop. Tujuan **Ringkasan** dan **API Explorer** berbagi rail dengan penanda pada halaman aktif. Ikon punya nama aksesibel, tooltip, dan penanda aktif berbentuk garis. |
| Konteks | **Sandbox**, **DEMO COMPANY**, dan **Read-only** bersumber dari cakupan MVP. Label dan nilai dibaca sebagai pasangan. |
| Indeks SDK | **Companies**, **Customers**, dan **Items**, masing-masing dengan satu deskripsi fungsi. Baris bersifat informatif. |

Ringkasan menampilkan cakupan workspace. Indikator koneksi, jumlah record, dan hasil request baru relevan saat ada sumber data yang sesuai. Pertanyaan prioritas API Explorer tetap mengikuti [STATUS](status/STATUS.md).

## Palet

| Peran | Terang | Gelap |
|---|---|---|
| Lembar kerja | `#F4F0E7` | `#201E1B` |
| Header dan sidebar | `#EAE4D8` | `#282520` |
| Teks utama | `#29251F` | `#F3ECE1` |
| Teks sekunder | `#5E574A` | `#C2B8A8` |
| Garis pemisah | `#C8BDA8` | `#50483B` |
| Aksen oker | `#79501A` | `#E8B65D` |
| Latar navigasi aktif | `#E4D4B5` | `#463920` |

Oker menandai navigasi aktif dan memberi kontras saat fokus. Penanda **Read-only** tampil sebagai teks dengan bobot yang sama seperti nilai konteks lain. Permukaan utama rata, dengan garis tipis untuk memisahkan kelompok. Radius 4–8 px membantu membedakan kontrol dari baris data. Pilihan awal **Sistem** mengikuti preferensi perangkat, dan pilihan manual bertahan setelah reload.

Warna, radius, dan font didefinisikan lewat `ConfigProvider` di `frontend/src/theme/tokens.ts`. Tata letak lembar kerja tetap memakai `Layout`, `Sider`, `Header`, dan `Content`. [Standar UI repo](standards/ui.md)

## Tipografi dan responsif

- **Segoe UI** untuk judul, navigasi, dan deskripsi. Judul 28–44 px, isi 14–16 px, label 13 px. **Cascadia Mono**, dengan fallback **Consolas**, untuk nilai konteks dan nama resource.
- Kolom baca maksimal 820 px (terpusat horizontal di layar lebar; halaman katalog mode Grid meluas hingga 1040 px). Gunakan jarak 8–12 px di dalam kelompok dan 24–40 px antarbagian. Susun kelompok isi pada sisi kiri yang sama di dalam kolom tersebut.
- Di bawah breakpoint `lg`, tombol header membuka menu sementara. Escape menutup menu dan mengembalikan fokus ke tombol. Target sentuh minimal 44 × 44 px.
- Pada layar sempit, konteks bisa turun ke baris berikutnya dan deskripsi resource bisa pindah ke bawah nama. Tema dan kontrol navigasi tetap bisa dipakai pada lebar 320 px.

## Kriteria review implementasi

- [ ] Di desktop dan pada lebar 320 px serta 390 px, judul, konteks, dan indeks terbaca tanpa scroll horizontal. Sidebar mobile terbuka dan tertutup tanpa memotong label.
- [ ] Semua kontrol dapat dijalankan dengan keyboard. Fokus terlihat, tujuan aktif punya `aria-current`, dan menu mengembalikan fokus saat ditutup.
- [ ] Tema Sistem, Terang, dan Gelap diuji di browser, termasuk reload setelah memilih tema manual. Kontras teks normal minimal 4,5:1 dan penanda interaktif minimal 3:1 pada permukaan yang relevan.
- [ ] Nama resource dan batas akses cocok dengan SDK dan konfigurasi MVP. Setiap kontrol melakukan tindakan yang sesuai labelnya.
- [ ] `bun run typecheck` dan `bun run build` lulus. Review visual membandingkan screenshot terang dan gelap pada desktop dan mobile.

**Dasar review.** Sidebar lebar dikurangi karena Ringkasan adalah satu-satunya tujuan. Garis aksen pada judul diganti dengan penanda tujuan aktif. Kartu konteks dipecah menjadi satu baris konteks dan satu indeks yang memudahkan pemindaian. [antislop-ui](https://github.com/miqdadbadjuber/anti-slop/blob/main/skills/antislop-ui/SKILL.md) · [Antislop core](https://github.com/miqdadbadjuber/anti-slop/blob/main/antislop.md)
