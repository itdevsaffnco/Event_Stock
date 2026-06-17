# Panduan Pengguna — Event Stock System
### Saff & Co. | Sistem Manajemen Stok Event

---

## Daftar Isi

1. [Login & Akses Sistem](#1-login--akses-sistem)
2. [Panduan Admin](#2-panduan-admin)
   - [Dashboard](#21-dashboard)
   - [Manajemen Event](#22-manajemen-event)
   - [Manajemen Stok Event](#23-manajemen-stok-event)
   - [Log Transaksi](#24-log-transaksi)
   - [Export Data](#25-export-data)
   - [Manajemen Warehouse & Store](#26-manajemen-warehouse--store)
   - [Manajemen User](#27-manajemen-user)
3. [Panduan Staff](#3-panduan-staff)
   - [Pilih Event & Store](#31-pilih-event--store)
   - [Input Penjualan & Tester](#32-input-penjualan--tester)
   - [Input Pengiriman Stok](#33-input-pengiriman-stok)
   - [Riwayat Transaksi Saya](#34-riwayat-transaksi-saya)
4. [Pertanyaan Umum (FAQ)](#4-pertanyaan-umum-faq)

---

## 1. Login & Akses Sistem

### Cara Login
1. Buka browser dan akses: **https://eventstock.saffnco.app**
2. Masukkan **Email** dan **Password** yang telah diberikan admin
3. Klik tombol **Masuk**
4. Sistem akan otomatis mengarahkan ke halaman sesuai role:
   - **Admin** → Dashboard Admin
   - **Staff** → Halaman Pilih Event

### Lupa Password?
Hubungi admin untuk reset password. Tidak ada fitur forgot password mandiri.

### Logout
Klik ikon profil atau tombol **Keluar** di sidebar untuk logout.

---

## 2. Panduan Admin

### 2.1 Dashboard

Dashboard adalah halaman utama admin yang menampilkan ringkasan kondisi event secara keseluruhan.

#### Kartu Ringkasan (Summary Cards)
Menampilkan angka-angka penting:
- **Total Event Aktif** — jumlah event yang sedang berjalan
- **Total Store** — jumlah booth/toko aktif
- **Transaksi Hari Ini** — total penjualan + tester hari ini
- **Pendapatan Hari Ini** — estimasi nilai penjualan hari ini

#### Grafik Penjualan (Sales Chart)
- Menampilkan tren penjualan dalam bentuk grafik garis
- Filter tersedia: **7 hari**, **30 hari**, atau **Custom range** (pilih tanggal)
- Dapat difilter per event atau per store

#### Top SKUs Terlaris
- Daftar produk dengan penjualan tertinggi
- Menampilkan nama SKU, total terjual (pcs), dan total nilai penjualan

#### Stok Menipis
- Produk dengan stok di bawah **50 pcs**
- Warna merah = perlu segera diisi ulang
- Klik nama produk untuk melihat detail

#### Transaksi Terbaru
- Daftar 10 transaksi terakhir (semua event)
- Kolom: Tanggal, Produk, Store, Tipe, Qty, Petugas
- Navigasi halaman tersedia di bawah tabel

**Edit Transaksi:**
1. Klik ikon ✏️ (pensil) di kolom Aksi
2. Ubah: Qty, Tanggal, No. Referensi, atau Catatan
3. Klik **Simpan** — stok otomatis direcalculate

> Transaksi tipe Pengiriman hanya bisa diedit di kolom non-qty (tanggal, catatan, referensi).

**Hapus Transaksi:**
1. Klik ikon 🗑️ (tempat sampah) di kolom Aksi
2. Konfirmasi dialog yang muncul
3. Klik **Hapus** — stok otomatis dikembalikan

> Menghapus transaksi Pengiriman akan menghapus dua log sekaligus (asal + tujuan).

---

### 2.2 Manajemen Event

Akses melalui **Sidebar → Events**

#### Membuat Event Baru
1. Klik tombol **+ Buat Event**
2. Isi form:
   - **Nama Event** — contoh: "Bazar Ramadan Jakarta 2026"
   - **Warehouse** — pilih gudang yang terlibat (bisa lebih dari satu)
   - **Tanggal Mulai** dan **Tanggal Selesai** (opsional)
   - **Deskripsi** (opsional)
3. Klik **Simpan** — kode event otomatis terbuat (contoh: `EVT-20260608-001`)

#### Mengubah Status Event
| Status | Keterangan |
|--------|------------|
| `active` | Event sedang berlangsung, staff bisa input transaksi |
| `closed` | Event selesai, transaksi tidak bisa dilakukan |
| `cancelled` | Event dibatalkan |

Klik tombol status di daftar event untuk mengubahnya.

#### Menghapus Event
Klik ikon 🗑️ → konfirmasi. Event dihapus secara *soft delete* (data masih tersimpan di database).

---

### 2.3 Manajemen Stok Event

Akses melalui **daftar event → klik nama event → tab Stok**

#### Menambah Stok Manual (Bulk Create)
1. Klik **+ Tambah Stok**
2. Isi data per baris: Store, SKU Code, SKU Name, Qty Awal, Harga
3. Tambah baris dengan klik **+ Baris**
4. Klik **Simpan Semua**

#### Import dari Warehouse
1. Klik **Import dari Warehouse**
2. Pilih warehouse dan store tujuan
3. Sistem otomatis mengisi daftar SKU dari stok gudang
4. Klik **Konfirmasi Import**

> Import tidak mengurangi stok di warehouse, hanya menyalin daftar SKU sebagai referensi awal.

#### Edit Stok
- Klik ✏️ untuk mengubah nama SKU, harga, atau kode
- Qty tidak bisa diubah langsung — harus melalui transaksi atau log adjustment

#### Hapus Stok
- Klik 🗑️ — stok dan semua log terkait akan dihapus

---

### 2.4 Log Transaksi

Akses melalui **detail event → tab Log Transaksi**

#### Filter Log
- **Tipe**: Semua / Penjualan / Tester / Pengiriman
- **Store**: filter per booth
- **Tanggal**: pilih tanggal spesifik

#### Memahami Kolom
| Kolom | Keterangan |
|-------|------------|
| Tanggal | Waktu transaksi dicatat |
| Produk | Nama SKU |
| Store | Booth asal |
| Tipe | penjualan / tester / pengiriman |
| Qty | Positif = masuk, Negatif = keluar |
| Petugas | Staff yang input |
| Catatan | Keterangan tambahan |

---

### 2.5 Export Data

#### Export Stok Event
1. Buka detail event → tab Stok
2. Klik tombol **Export Excel**
3. File `.xlsx` otomatis terunduh berisi: SKU, Qty Awal, Qty Saat Ini, Harga

#### Export Log Transaksi
1. Buka detail event → tab Log Transaksi
2. Atur filter yang diinginkan
3. Klik **Export Excel**

#### Export Dashboard Sales
1. Di Dashboard, atur filter tanggal dan event
2. Klik **Export** di area Sales Chart

---

### 2.6 Manajemen Warehouse & Store

#### Warehouse (Gudang)
- Akses: **Sidebar → Warehouses**
- Tambah gudang: nama, lokasi
- Setiap gudang bisa memiliki beberapa store

#### Store (Booth/Toko)
- Akses: **Sidebar → Stores**
- Tambah store: nama, warehouse induk, lokasi
- Status: `active` / `inactive`

> Store hanya bisa digunakan di event jika warehouse-nya terdaftar di event tersebut.

---

### 2.7 Manajemen User

Akses melalui **Sidebar → Users**

#### Menambah User
1. Klik **+ Tambah User**
2. Isi: Nama, Email, Password, Role (Admin/Staff)
3. Klik **Simpan**

#### Mengubah Password User
1. Klik ✏️ pada user
2. Isi password baru
3. Klik **Simpan**

#### Menonaktifkan User
Hapus user dengan klik 🗑️. User yang dihapus tidak bisa login.

---

## 3. Panduan Staff

### 3.1 Pilih Event & Store

Setelah login, staff akan diarahkan ke halaman pemilihan event.

1. **Pilih Event** dari daftar event yang sedang aktif
2. **Pilih Store** — pilih booth tempat Anda bertugas
3. Halaman transaksi akan terbuka

> Pastikan memilih store yang tepat! Store menentukan stok yang tersedia untuk Anda.

---

### 3.2 Input Penjualan & Tester

#### Cara Input Transaksi (Multiple Produk)

1. Pilih tipe: **Penjualan** atau **Tester**
2. Di bagian picker produk:
   - Ketik nama produk di kolom pencarian
   - Pilih produk dari daftar
   - Atur jumlah qty
   - Klik **Add Product**
3. Produk masuk ke list **"Produk Ditambahkan"**
4. Ulangi langkah 2 untuk produk lain
5. Setelah semua selesai, klik **Simpan N Produk**

#### Berpindah Antara Penjualan & Tester
- Klik tipe yang berbeda (contoh: dari Penjualan ke Tester)
- List produk yang sudah ditambahkan **tetap terlihat** dengan badge warna berbeda:
  - 🟢 **Penjualan**
  - 🟡 **Tester**
- Anda bisa submit semua sekaligus — sistem otomatis memisahkan per tipe

#### Validasi
| Kondisi | Yang Terjadi |
|---------|-------------|
| Qty = 0 | ❌ Tidak bisa ditambahkan |
| Qty > stok tersisa | ❌ Ditolak, tampil pesan stok kurang |
| Stok produk = 0 | ❌ Produk tidak bisa dipilih |

#### Hapus Item dari Keranjang
- Klik ✕ di samping produk untuk hapus satu item
- Klik **Hapus Semua** untuk kosongkan keranjang

---

### 3.3 Input Pengiriman Stok

Digunakan ketika memindahkan stok antar booth.

1. Pilih tipe: **Pengiriman**
2. Pilih **produk** yang akan dikirim
3. Pilih **store tujuan** (booth penerima)
4. Masukkan **jumlah** yang dikirim
5. Isi **catatan** dan **no. referensi** jika ada
6. Klik **Kirim**

> Stok di store asal akan berkurang, dan stok di store tujuan akan bertambah secara otomatis.

#### Syarat Pengiriman
- Store asal dan tujuan harus berbeda
- Produk yang dikirim harus sudah terdaftar di store tujuan
- Stok asal harus mencukupi jumlah yang dikirim

---

### 3.4 Riwayat Transaksi Saya

Akses melalui tab **"Riwayat"** di halaman transaksi.

- Menampilkan semua transaksi yang Anda input hari ini
- Bisa filter per tanggal
- Menampilkan: waktu, produk, tipe, jumlah, catatan

> Riwayat hanya menampilkan transaksi milik Anda sendiri, bukan semua staff.

---

## 4. Pertanyaan Umum (FAQ)

**Q: Saya tidak bisa memilih produk, tombolnya abu-abu?**
A: Stok produk tersebut sudah habis (qty = 0). Hubungi admin untuk pengisian ulang.

**Q: Muncul error "Stok tidak mencukupi" padahal stok masih ada?**
A: Qty yang Anda masukkan melebihi stok yang tersisa. Cek jumlah yang tersedia di daftar produk.

**Q: Transaksi yang sudah disubmit bisa dibatalkan?**
A: Hanya admin yang bisa mengedit atau menghapus transaksi. Hubungi admin jika ada kesalahan input.

**Q: Kenapa store saya tidak muncul di pilihan?**
A: Store Anda mungkin tidak aktif atau warehouse-nya belum didaftarkan ke event ini. Hubungi admin.

**Q: Apakah data real-time?**
A: Ya. Setiap transaksi langsung memperbarui stok. Jika ada staff lain yang input bersamaan, stok akan terhitung secara akurat.

**Q: Saya lupa pilih tipe (penjualan/tester) dan sudah submit, bagaimana?**
A: Hubungi admin untuk mengkoreksi transaksi. Admin bisa mengubah catatan tapi tidak bisa mengubah tipe transaksi.

**Q: Muncul pesan "Terlalu banyak percobaan" saat login atau input transaksi?**
A: Sistem membatasi jumlah request untuk mencegah penyalahgunaan. Tunggu 1 menit lalu coba lagi. Jika masalah berlanjut, hubungi admin.

**Q: Halaman tiba-tiba reload sendiri setelah sistem diperbarui?**
A: Ini normal. Setelah ada pembaruan sistem, browser secara otomatis memuat ulang halaman untuk mendapatkan versi terbaru. Transaksi yang sedang diinput mungkin perlu diisi ulang.

---

*Dokumen ini berlaku untuk Event Stock System v1.1 — Saff & Co.*
*Terakhir diperbarui: Juni 2026*
