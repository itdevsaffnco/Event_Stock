# Panduan Flowchart — Event Stock System

> Dokumen ini menjelaskan diagram alur sistem Event Stock, termasuk cara membaca swim-lane diagram dan penjelasan setiap proses.

---

## Daftar Isi

1. [File Diagram yang Tersedia](#1-file-diagram-yang-tersedia)
2. [Cara Membuka di Lucidchart](#2-cara-membuka-di-lucidchart)
3. [Penjelasan Swim-Lane Diagram](#3-penjelasan-swim-lane-diagram)
4. [Legend: Bentuk & Warna](#4-legend-bentuk--warna)
5. [Penjelasan Alur per Lane](#5-penjelasan-alur-per-lane)
6. [Alur Lengkap End-to-End](#6-alur-lengkap-end-to-end)

---

## 1. File Diagram yang Tersedia

| File | Format | Keterangan |
|------|--------|------------|
| `docs/flowchart_swimlane.drawio` | draw.io / Lucidchart XML | Swim-lane diagram utama per role |
| `FLOWCHART.md` | Mermaid (Markdown) | 6 diagram teknis: arsitektur, auth, CI/CD, dll |

---

## 2. Cara Membuka di Lucidchart

1. Buka [lucidchart.com](https://lucidchart.com) dan login
2. Klik **File → Import**
3. Pilih **Diagrams.net / draw.io**
4. Upload file `docs/flowchart_swimlane.drawio`
5. Diagram swim-lane akan muncul dan langsung bisa diedit

> File `.drawio` juga bisa dibuka langsung di [app.diagrams.net](https://app.diagrams.net) tanpa perlu akun.

---

## 3. Penjelasan Swim-Lane Diagram

Swim-lane diagram menggambarkan alur sistem berdasarkan **siapa yang melakukan apa**. Setiap baris (lane) mewakili satu aktor/sistem:

| Lane | Aktor | Warna |
|------|-------|-------|
| **Admin** | Pengelola sistem — setup event, monitor, export | Biru muda |
| **Staff** | Petugas booth — input transaksi harian | Hijau muda |
| **System** | Proses otomatis backend (Laravel) | Ungu muda |

Alur dibaca dari **kiri ke kanan**. Panah yang melintasi lane menunjukkan interaksi antar aktor.

---

## 4. Legend: Bentuk & Warna

### Bentuk

| Bentuk | Arti |
|--------|------|
| ● Lingkaran penuh (biru/hijau) | Titik mulai (Start) |
| ● Lingkaran penuh (warna) | Titik akhir (End) |
| ▭ Persegi panjang rounded | Proses / Aksi |
| ◇ Belah ketupat (diamond) | Keputusan / Percabangan |
| 📄 Dokumen | Output / File (laporan, riwayat) |
| ● Lingkaran merah | Error / Kondisi gagal |

### Warna Panah

| Warna | Arti |
|-------|------|
| Hitam solid | Alur utama |
| Biru putus-putus | Informasi mengalir dari Admin ke aktor lain |
| Ungu putus-putus | Proses autentikasi (System ↔ Staff) |
| Merah putus-putus | Error dikembalikan ke pengirim |

---

## 5. Penjelasan Alur per Lane

### Lane Admin

```
START → Buat Event → Input Stok Awal (Bulk/Import) → Set Status Active
                                                              ↓
                                              [Event tersedia untuk Staff]

       ... (Staff bekerja) ...

Monitor Dashboard ← [Stok terupdate dari System]
      ↓
Export Laporan   |   Edit / Hapus Transaksi (jika ada koreksi)
```

**Tugas Admin:**
1. **Buat Event** — isi nama, pilih warehouse, set tanggal
2. **Input Stok Awal** — bulk manual atau import dari warehouse
3. **Set Status Active** — event baru muncul di daftar Staff
4. **Monitor Dashboard** — pantau penjualan, tester, stok menipis secara real-time
5. **Export Laporan** — unduh Excel stok atau log transaksi
6. **Edit / Hapus Transaksi** — koreksi jika ada kesalahan input Staff

---

### Lane Staff

```
Login → [Auth] → Pilih Event Aktif → Pilih Store/Booth → Pilih Tipe Transaksi
                                                                  ↓
                                              ┌───────────────────┴──────────────────┐
                                              ▼                                       ▼
                                    [Penjualan / Tester]                      [Pengiriman]
                                    Cari Produk & Set Qty              Pilih Produk & Store Tujuan
                                    → Add ke Keranjang                          ↓
                                              ↓                                 ↓
                                              └─────────────┬────────────────────┘
                                                            ▼
                                                  Submit Transaksi
                                                       ↓         ↓
                                               ✓ Berhasil    Error (stok kurang)
                                                  ↓
                                          Lihat Riwayat Saya
```

**Tugas Staff:**
1. **Login** — masuk dengan akun yang diberikan admin
2. **Pilih Event** — hanya event aktif yang muncul
3. **Pilih Store** — pilih booth tempat bertugas
4. **Pilih Tipe** — Penjualan, Tester, atau Pengiriman
5. **Penjualan / Tester** — cari produk, set qty, tambah ke keranjang, bisa multi-produk, submit sekaligus
6. **Pengiriman** — pilih produk dan store tujuan, submit per produk
7. **Submit** — sistem akan validasi dan simpan
8. **Riwayat** — lihat semua transaksi yang sudah diinput hari ini

---

### Lane System

```
[Staff Login] → Validasi Token (Sanctum) → Auth OK → [Staff lanjut ke Pilih Event]

[Staff Submit] → Cek & Lock Stok (lockForUpdate)
                          ↓              ↓
                    [Stok Cukup]   [Stok Kurang]
                          ↓              ↓
                 Simpan StockLog    Error 422 → [kembali ke Staff]
                 (+ pair_id)
                          ↓
                  recalculateQty
                          ↓
                 Update qty_current
                          ↓
              → [Admin: Dashboard terupdate]
```

**Proses otomatis System:**
1. **Validasi Token** — setiap request dicek via Laravel Sanctum
2. **Cek & Lock Stok** — `lockForUpdate()` mencegah race condition saat dua staff input produk sama bersamaan
3. **Simpan StockLog** — log disimpan dengan `pair_id` UUID (untuk pengiriman, kedua log mendapat pair_id yang sama)
4. **recalculateQty** — `qty_current` dihitung ulang dari SUM semua log
5. **Update qty_current** — nilai baru disimpan di `event_stocks`

---

## 6. Alur Lengkap End-to-End

Berikut urutan kronologis penggunaan sistem dari awal event hingga selesai:

```
1. SETUP (Admin)
   ├─ Buat gudang (warehouse) & booth (store)
   ├─ Buat event, pilih warehouse, set tanggal
   ├─ Input stok awal (bulk create / import dari warehouse)
   └─ Set status event → Active

2. OPERASIONAL HARIAN (Staff)
   ├─ Login → pilih event → pilih store
   ├─ Input penjualan (multi-produk ke keranjang, submit)
   ├─ Input tester (multi-produk ke keranjang, submit)
   └─ Input pengiriman (satu produk, pilih store tujuan, submit)

3. MONITORING (Admin)
   ├─ Lihat dashboard: ringkasan, grafik, top SKU, stok menipis
   ├─ Filter transaksi terbaru per event/store/tanggal
   ├─ Edit/hapus transaksi jika ada koreksi
   └─ Export Excel: stok, log, atau laporan penjualan

4. PENUTUPAN (Admin)
   └─ Set status event → Closed (staff tidak bisa input lagi)
```

---

*Flowchart Guide v1.0 — Event Stock System | Saff & Co. | Juni 2026*
