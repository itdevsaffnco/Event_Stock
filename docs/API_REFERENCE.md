# API Reference — Event Stock System

**Base URL:** `https://servereventstock.saffnco.app/api`  
**Auth:** Bearer Token (Laravel Sanctum)  
**Content-Type:** `application/json`

---

## Autentikasi

Semua endpoint (kecuali login) memerlukan header:
```
Authorization: Bearer <token>
```

---

## AUTH

### POST `/auth/login`
Login dan dapatkan token.

**Request Body:**
```json
{
  "email": "admin@saffnco.com",
  "password": "password"
}
```

**Response 200:**
```json
{
  "token": "1|abcdef123456...",
  "user": {
    "id": 1,
    "name": "Admin Saff",
    "email": "admin@saffnco.com",
    "role": "admin"
  }
}
```

**Response 422:**
```json
{ "message": "These credentials do not match our records." }
```

---

### POST `/auth/logout`
Invalidate token saat ini.

**Auth:** Required

**Response 200:**
```json
{ "message": "Logged out." }
```

---

### GET `/auth/me`
Ambil data user yang sedang login.

**Auth:** Required

**Response 200:**
```json
{
  "id": 1,
  "name": "Admin Saff",
  "email": "admin@saffnco.com",
  "role": "admin"
}
```

---

## ADMIN — Dashboard

> Semua endpoint admin memerlukan role: `admin`

### GET `/admin/dashboard/summary`
Ringkasan statistik keseluruhan.

**Response 200:**
```json
{
  "total_events_active": 3,
  "total_stores": 12,
  "today_transactions": 47,
  "today_revenue": 4250000
}
```

---

### GET `/admin/dashboard/sales-chart`
Data grafik penjualan.

**Query Params:**
| Param | Tipe | Keterangan |
|-------|------|------------|
| range | string | `7d` \| `30d` (default: `7d`) |
| from | date | YYYY-MM-DD (jika custom range) |
| to | date | YYYY-MM-DD (jika custom range) |
| event_id | integer | Filter per event |
| store_id | integer | Filter per store |

**Response 200:**
```json
{
  "data": [
    { "date": "2026-06-01", "total_qty": 45, "total_value": 1350000 },
    { "date": "2026-06-02", "total_qty": 62, "total_value": 1860000 }
  ]
}
```

---

### GET `/admin/dashboard/top-skus`
SKU dengan penjualan tertinggi.

**Query Params:** `from`, `to`, `event_id`, `store_id`

**Response 200:**
```json
{
  "data": [
    { "sku_name": "Parfum A 30ml", "total_sold": 120, "total_value": 6000000 },
    { "sku_name": "Parfum B 50ml", "total_sold": 95,  "total_value": 7125000 }
  ]
}
```

---

### GET `/admin/dashboard/stock-alerts`
Produk dengan stok di bawah threshold.

**Query Params:**
| Param | Default | Keterangan |
|-------|---------|------------|
| threshold | 50 | Batas minimum stok |
| event_id | - | Filter per event |
| store_id | - | Filter per store |

**Response 200:**
```json
{
  "data": [
    {
      "id": 5,
      "sku_name": "Parfum C 100ml",
      "sku_code": "PFC-100",
      "qty_current": 12,
      "store": { "id": 2, "name": "Booth Timur" }
    }
  ]
}
```

---

### GET `/admin/dashboard/recent-logs`
Transaksi terbaru dengan pagination.

**Query Params:**
| Param | Default | Keterangan |
|-------|---------|------------|
| page | 1 | Halaman |
| per_page | 10 | Item per halaman |
| event_id | - | Filter per event |
| store_id | - | Filter per store |
| from | - | Tanggal mulai |
| to | - | Tanggal selesai |

**Response 200:**
```json
{
  "data": [
    {
      "id": 101,
      "type": "penjualan",
      "qty": -3,
      "logged_at": "2026-06-08T10:30:00.000000Z",
      "notes": null,
      "reference_no": null,
      "event_stock": { "id": 5, "sku_name": "Parfum A 30ml", "sku_code": "PFA-30" },
      "store": { "id": 2, "name": "Booth Timur" },
      "user": { "id": 3, "name": "Staff Ani" },
      "event": { "id": 1, "name": "Bazar Ramadan 2026" },
      "to_store": null
    }
  ],
  "current_page": 1,
  "last_page": 5,
  "per_page": 10,
  "total": 47
}
```

---

## ADMIN — Events

### GET `/admin/events`
Daftar event dengan pagination.

**Query Params:** `search`, `status`, `page`

**Response 200:**
```json
{
  "data": [
    {
      "id": 1,
      "name": "Bazar Ramadan 2026",
      "code": "EVT-20260101-001",
      "status": "active",
      "start_date": "2026-01-01",
      "end_date": "2026-01-30"
    }
  ],
  "current_page": 1,
  "last_page": 2,
  "total": 8
}
```

---

### POST `/admin/events`
Buat event baru.

**Request Body:**
```json
{
  "name": "Bazar Lebaran 2026",
  "warehouse_ids": [1, 2],
  "description": "Event tahunan Saff & Co.",
  "start_date": "2026-03-20",
  "end_date": "2026-04-10"
}
```

**Response 201:**
```json
{
  "data": {
    "id": 5,
    "name": "Bazar Lebaran 2026",
    "code": "EVT-20260308-001",
    "status": "active"
  },
  "message": "Event berhasil dibuat."
}
```

---

### GET `/admin/events/{id}`
Detail event beserta summary, stores, dan warehouses.

**Response 200:**
```json
{
  "data": { "id": 1, "name": "...", "status": "active", "..." },
  "summary": { "total_penjualan": 150, "total_tester": 20, "total_pengiriman": 5 },
  "stores": [{ "id": 2, "name": "Booth Timur", "..." }],
  "warehouses": [{ "id": 1, "name": "Gudang Utama", "location": "Jakarta" }]
}
```

---

### PUT `/admin/events/{id}`
Update event.

**Request Body:** sama dengan POST, semua field opsional

---

### DELETE `/admin/events/{id}`
Hapus event (soft delete).

**Response 200:**
```json
{ "message": "Event berhasil dihapus." }
```

---

### PATCH `/admin/events/{id}/status`
Ubah status event.

**Request Body:**
```json
{ "status": "closed" }
```

---

## ADMIN — Event Stocks

### GET `/admin/events/{event}/stocks`
Daftar stok untuk event tertentu.

**Query Params:** `store_id`, `warehouse_id`, `search`

**Response 200:**
```json
{
  "data": [
    {
      "id": 10,
      "sku_code": "PFA-30",
      "sku_name": "Parfum A 30ml",
      "qty_initial": 100,
      "qty_current": 73,
      "price": "150000.00",
      "store": { "id": 2, "name": "Booth Timur" }
    }
  ]
}
```

---

### POST `/admin/events/{event}/stocks/bulk`
Tambah stok secara massal.

**Request Body:**
```json
{
  "stocks": [
    {
      "store_id": 2,
      "sku_code": "PFA-30",
      "sku_name": "Parfum A 30ml",
      "qty_initial": 100,
      "price": 150000
    },
    {
      "store_id": 2,
      "sku_name": "Parfum B 50ml",
      "qty_initial": 50,
      "price": 250000
    }
  ]
}
```

**Response 201:**
```json
{ "message": "10 stok berhasil ditambahkan." }
```

---

### POST `/admin/events/{event}/stocks/import-warehouse`
Import SKU dari stok warehouse.

**Request Body:**
```json
{
  "warehouse_id": 1,
  "store_id": 2
}
```

**Response 200:**
```json
{
  "data": [...],
  "message": "15 SKU berhasil diimport dari Gudang Utama."
}
```

---

### PUT `/admin/events/{event}/stocks/{stock}`
Update data stok.

**Request Body:**
```json
{
  "sku_name": "Parfum A 30ml Special Edition",
  "price": 175000
}
```

---

### DELETE `/admin/events/{event}/stocks/{stock}`
Hapus stok dari event.

**Response 200:**
```json
{ "message": "Stok berhasil dihapus." }
```

---

## ADMIN — Stock Logs

### GET `/admin/events/{event}/logs`
Log transaksi per event.

**Query Params:** `type`, `store_id`, `date`, `page`

**Response 200:** Paginated list of StockLog objects.

---

### PATCH `/admin/logs/{log}`
Edit log transaksi.

> Tidak bisa edit log dengan tipe `initial`.
> Log `pengiriman` hanya bisa edit kolom non-qty.

**Request Body:**
```json
{
  "qty": 5,
  "notes": "Koreksi dari nota fisik",
  "reference_no": "INV-2026-001",
  "logged_at": "2026-06-08T09:00:00"
}
```

**Response 200:**
```json
{
  "data": { "id": 101, "qty": -5, "..." },
  "message": "Transaksi berhasil diupdate."
}
```

**Response 422 (initial log):**
```json
{ "message": "Log initial tidak bisa diedit." }
```

---

### DELETE `/admin/logs/{log}`
Hapus log transaksi. Stok otomatis direcalculate.

> Menghapus log `pengiriman` akan menghapus pasangan log-nya sekaligus (asal + tujuan).

**Response 200:**
```json
{ "message": "Log berhasil dihapus." }
```

---

## ADMIN — Export

### GET `/admin/export/events/{event}/stocks`
Export stok event ke Excel.

**Response:** File `.xlsx` (blob)

---

### GET `/admin/export/events/{event}/logs`
Export log transaksi event ke Excel.

**Query Params:** `type` (opsional filter tipe)

**Response:** File `.xlsx` (blob)

---

### GET `/admin/export/dashboard/sales`
Export laporan penjualan dashboard.

**Query Params:** `from`, `to`, `event_id`, `store_id`

**Response:** File `.xlsx` (blob)

---

## ADMIN — Users

### GET `/admin/users`
Daftar user.

### POST `/admin/users`
Buat user baru.

**Request Body:**
```json
{
  "name": "Staff Baru",
  "email": "staff@saffnco.com",
  "password": "password123",
  "role": "staff"
}
```

### PUT `/admin/users/{id}`
Update user (nama, email, password, role).

### DELETE `/admin/users/{id}`
Hapus user.

---

## ADMIN — Warehouses

### GET `/admin/warehouses`
Daftar gudang.

### POST `/admin/warehouses`
Buat gudang baru: `{ "name": "...", "location": "..." }`

### PUT `/admin/warehouses/{id}`
Update gudang.

### DELETE `/admin/warehouses/{id}`
Hapus gudang.

### GET `/admin/warehouses/{warehouse}/stores`
Daftar store dalam warehouse.

### GET `/admin/warehouses/{warehouse}/stocks`
Daftar stok di warehouse.

### POST `/admin/warehouses/{warehouse}/stocks/bulk`
Update bulk stok warehouse.

### DELETE `/admin/warehouses/{warehouse}/stocks/{stock}`
Hapus stok warehouse.

---

## ADMIN — Stores

### GET `/admin/stores`
Daftar store. Query param: `all=1` untuk tanpa pagination, `event_id` untuk filter.

### POST `/admin/stores`
Buat store baru: `{ "name": "...", "warehouse_id": 1, "location": "...", "status": "active" }`

### PUT `/admin/stores/{id}` / DELETE `/admin/stores/{id}`
Update / hapus store.

---

## STAFF

> Semua endpoint staff memerlukan role: `staff`

### GET `/staff/events`
Daftar event yang sedang aktif.

**Response 200:**
```json
{
  "data": [
    {
      "id": 1,
      "name": "Bazar Ramadan 2026",
      "code": "EVT-20260101-001",
      "status": "active",
      "start_date": "2026-01-01",
      "end_date": "2026-01-30"
    }
  ]
}
```

---

### GET `/staff/events/{event}`
Detail event (dengan daftar store & warehouse yang tersedia).

**Response 200:**
```json
{
  "data": { "id": 1, "name": "...", "status": "active" },
  "stores": [
    { "id": 2, "name": "Booth Timur", "location": "Hall A" }
  ],
  "warehouses": [
    { "id": 1, "name": "Gudang Utama" }
  ]
}
```

---

### GET `/staff/events/{event}/stocks`
Stok produk di store tertentu.

**Query Params:**
| Param | Required | Keterangan |
|-------|----------|------------|
| store_id | ✅ | ID store yang dipilih |

**Response 200:**
```json
{
  "data": [
    {
      "id": 10,
      "sku_code": "PFA-30",
      "sku_name": "Parfum A 30ml",
      "qty_current": 73,
      "price": "150000.00"
    }
  ]
}
```

---

### POST `/staff/events/{event}/logs`
Input transaksi tunggal (satu produk).

**Request Body:**
```json
{
  "event_stock_id": 10,
  "type": "penjualan",
  "qty": 3,
  "notes": "Pembeli reguler",
  "reference_no": null,
  "logged_at": "2026-06-08"
}
```

Untuk pengiriman:
```json
{
  "event_stock_id": 10,
  "type": "pengiriman",
  "qty": 5,
  "to_store_id": 4,
  "notes": "Kirim ke Booth Barat"
}
```

**Response 201:**
```json
{
  "message": "Transaksi berhasil dicatat.",
  "qty_current": 70
}
```

**Response 422 (stok habis):**
```json
{ "message": "Stok produk ini sudah habis." }
```

**Response 422 (stok kurang):**
```json
{ "message": "Stok tidak mencukupi. Tersisa 2 pcs." }
```

---

### POST `/staff/events/{event}/logs/bulk`
Input transaksi multiple produk sekaligus (penjualan / tester).

**Request Body:**
```json
{
  "type": "penjualan",
  "store_id": 2,
  "logged_at": "2026-06-08",
  "notes": "Transaksi pagi",
  "items": [
    { "event_stock_id": 10, "qty": 3 },
    { "event_stock_id": 11, "qty": 1 },
    { "event_stock_id": 15, "qty": 2 }
  ]
}
```

> Semua item divalidasi terlebih dahulu sebelum ada yang disimpan.
> Jika satu item gagal, seluruh batch ditolak.

**Response 201:**
```json
{ "message": "Semua transaksi berhasil dicatat." }
```

**Response 422 (salah satu item gagal):**
```json
{ "message": "Stok Parfum B 50ml tidak mencukupi (tersisa 1 pcs)." }
```

---

### GET `/staff/events/{event}/my-logs`
Riwayat transaksi milik staff yang login.

**Query Params:**
| Param | Default | Keterangan |
|-------|---------|------------|
| date | hari ini | Format YYYY-MM-DD |

**Response 200:**
```json
{
  "data": [
    {
      "id": 101,
      "type": "penjualan",
      "qty": -3,
      "logged_at": "2026-06-08T10:30:00.000000Z",
      "event_stock": { "sku_name": "Parfum A 30ml", "sku_code": "PFA-30" },
      "store": { "name": "Booth Timur" }
    }
  ],
  "current_page": 1,
  "last_page": 2,
  "total": 25
}
```

---

## Error Codes

| HTTP Status | Keterangan |
|-------------|------------|
| 200 | OK |
| 201 | Created |
| 401 | Unauthenticated — token tidak valid atau tidak ada |
| 403 | Forbidden — role tidak sesuai |
| 404 | Not Found — resource tidak ditemukan |
| 422 | Unprocessable — validasi gagal |
| 500 | Server Error |

**Format error umum:**
```json
{
  "message": "Deskripsi error.",
  "errors": {
    "field_name": ["Pesan validasi spesifik."]
  }
}
```

---

*API Reference v1.0 — Event Stock System | Saff & Co.*
