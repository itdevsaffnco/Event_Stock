# Technical Documentation — Event Stock System

> Sistem manajemen stok untuk event/booth yang dikelola oleh Saff & Co.

---

## Table of Contents

1. [Tech Stack](#1-tech-stack)
2. [Arsitektur Sistem](#2-arsitektur-sistem)
3. [Database Schema](#3-database-schema)
4. [Struktur Direktori](#4-struktur-direktori)
5. [Autentikasi & Otorisasi](#5-autentikasi--otorisasi)
6. [Business Logic Utama](#6-business-logic-utama)
7. [Setup Lokal](#7-setup-lokal)
8. [Deployment](#8-deployment)
9. [Environment Variables](#9-environment-variables)

---

## 1. Tech Stack

### Backend
| Komponen | Teknologi |
|----------|-----------|
| Framework | Laravel 11 |
| Auth | Laravel Sanctum (token-based) |
| PHP | 8.2 |
| Database | SQLite (dev) / MySQL (prod) |
| ORM | Eloquent |

### Frontend
| Komponen | Teknologi |
|----------|-----------|
| Framework | React 18 |
| Build Tool | Vite |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| State/Fetch | TanStack Query v5 (useQuery, useMutation) |
| HTTP Client | Axios |
| Icons | Lucide React |

### Infrastructure
| Komponen | Teknologi |
|----------|-----------|
| CI/CD | GitHub Actions |
| Container | Docker |
| Registry | Docker Hub |
| Server | VPS (Docker Compose-less, manual docker run) |
| Web Server (BE) | Nginx (dalam Docker image) |
| Web Server (FE) | Nginx (serve static Vite build) |

---

## 2. Arsitektur Sistem

```
┌─────────────────────────────────────────────────────────┐
│                     CLIENT BROWSER                       │
│         React 18 + Vite + TypeScript + Tailwind          │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Auth Pages  │  │ Admin Pages  │  │ Staff Pages  │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│           │               │                │             │
│           └───────────────┴────────────────┘             │
│                    Axios + TanStack Query                 │
└──────────────────────────┬──────────────────────────────┘
                           │  HTTPS (Bearer Token)
┌──────────────────────────▼──────────────────────────────┐
│                   BACKEND (Laravel 11)                    │
│                                                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │
│  │  Auth API   │  │  Admin API  │  │   Staff API     │ │
│  │ /api/auth/* │  │ /api/admin/*│  │  /api/staff/*   │ │
│  └─────────────┘  └─────────────┘  └─────────────────┘ │
│           │               │                │             │
│           └───────────────┴────────────────┘             │
│                      Eloquent ORM                        │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│                       DATABASE                           │
│  users · events · warehouses · stores                    │
│  event_stocks · stock_logs · warehouse_stocks            │
└─────────────────────────────────────────────────────────┘
```

**Request flow:**
1. Frontend mengirim request via Axios dengan header `Authorization: Bearer <token>`
2. Sanctum middleware memvalidasi token di tabel `personal_access_tokens`
3. Middleware `role:admin` / `role:staff` mengecek kolom `role` di tabel `users`
4. Controller memproses dan mengembalikan JSON response

---

## 3. Database Schema

### Tabel: `users`
| Kolom | Tipe | Keterangan |
|-------|------|------------|
| id | bigint PK | |
| name | varchar | Nama lengkap |
| email | varchar UNIQUE | |
| password | varchar | bcrypt hash |
| role | enum | `admin`, `staff` |
| created_at / updated_at | timestamp | |

### Tabel: `warehouses`
| Kolom | Tipe | Keterangan |
|-------|------|------------|
| id | bigint PK | |
| name | varchar | Nama gudang |
| location | varchar nullable | Alamat/lokasi |
| created_at / updated_at | timestamp | |

### Tabel: `stores`
| Kolom | Tipe | Keterangan |
|-------|------|------------|
| id | bigint PK | |
| warehouse_id | FK → warehouses | Gudang induk |
| name | varchar | Nama booth/toko |
| location | varchar nullable | |
| status | enum | `active`, `inactive` |
| created_at / updated_at | timestamp | |

### Tabel: `events`
| Kolom | Tipe | Keterangan |
|-------|------|------------|
| id | bigint PK | |
| name | varchar | Nama event |
| code | varchar UNIQUE | Auto-generate: `EVT-YYYYMMDD-001` |
| created_by | FK → users | Admin pembuat |
| description | text nullable | |
| start_date | date | |
| end_date | date nullable | |
| status | enum | `active`, `closed`, `cancelled` |
| deleted_at | timestamp | Soft delete |
| created_at / updated_at | timestamp | |

### Tabel: `event_warehouses` (pivot)
| Kolom | Tipe | Keterangan |
|-------|------|------------|
| event_id | FK → events | |
| warehouse_id | FK → warehouses | |

### Tabel: `event_stocks`
| Kolom | Tipe | Keterangan |
|-------|------|------------|
| id | bigint PK | |
| event_id | FK → events | |
| store_id | FK → stores | Booth tempat stok berada |
| sku_code | varchar nullable | Kode produk |
| sku_name | varchar | Nama produk |
| qty_initial | integer | Stok awal (dari initial log) |
| qty_current | integer | Stok saat ini (hasil recalculate) |
| price | decimal(10,2) nullable | Harga jual |
| created_at / updated_at | timestamp | |

### Tabel: `stock_logs`
| Kolom | Tipe | Keterangan |
|-------|------|------------|
| id | bigint PK | |
| event_stock_id | FK → event_stocks | |
| event_id | FK → events | |
| store_id | FK → stores | Store asal |
| user_id | FK → users | Staff/admin yang input |
| from_warehouse_id | FK → warehouses nullable | Asal gudang |
| to_store_id | FK → stores nullable | Store tujuan (pengiriman) |
| type | enum | `initial`, `penjualan`, `tester`, `pengiriman`, `adjustment` |
| qty | integer | Positif = masuk, Negatif = keluar |
| price_per_unit | decimal(10,2) nullable | |
| notes | text nullable | |
| reference_no | varchar nullable | No. referensi dokumen |
| logged_at | datetime | Waktu transaksi |
| created_at / updated_at | timestamp | |

### Tabel: `warehouse_stocks`
| Kolom | Tipe | Keterangan |
|-------|------|------------|
| id | bigint PK | |
| warehouse_id | FK → warehouses | |
| sku_code | varchar nullable | |
| sku_name | varchar | |
| qty | integer | |
| price | decimal nullable | |

### Relasi Antar Tabel
```
users ──────────────────── stock_logs (user_id)
                        └─ events (created_by)

warehouses ─────────────── event_warehouses ──── events
         └───────────────── stores ─────────────── event_stocks
                                    └────────────── stock_logs

events ──────────────────── event_stocks ────────── stock_logs
                         └── stock_logs
```

---

## 4. Struktur Direktori

```
Event_Stock/
├── .github/
│   └── workflows/
│       └── deploy.yml          # CI/CD pipeline
│
├── backend/                    # Laravel 11
│   ├── app/
│   │   ├── Http/
│   │   │   ├── Controllers/
│   │   │   │   └── API/
│   │   │   │       ├── AuthController.php
│   │   │   │       ├── Admin/
│   │   │   │       │   ├── DashboardController.php
│   │   │   │       │   ├── EventController.php
│   │   │   │       │   ├── EventStockController.php
│   │   │   │       │   ├── StockLogController.php
│   │   │   │       │   ├── StoreController.php
│   │   │   │       │   ├── UserController.php
│   │   │   │       │   ├── WarehouseController.php
│   │   │   │       │   └── ExportController.php
│   │   │   │       └── Staff/
│   │   │   │           └── StaffEventController.php
│   │   │   └── Middleware/
│   │   │       └── CheckRole.php
│   │   └── Models/
│   │       ├── User.php
│   │       ├── Event.php
│   │       ├── EventStock.php
│   │       ├── StockLog.php
│   │       ├── Store.php
│   │       ├── Warehouse.php
│   │       └── WarehouseStock.php
│   ├── routes/
│   │   └── api.php
│   └── Dockerfile
│
├── frontend/                   # React + Vite + TypeScript
│   ├── src/
│   │   ├── api/
│   │   │   ├── axiosInstance.ts
│   │   │   ├── admin/
│   │   │   │   └── events.api.ts
│   │   │   └── staff/
│   │   │       └── staff.api.ts
│   │   ├── components/
│   │   │   ├── admin/layout/
│   │   │   │   └── Sidebar.tsx
│   │   │   └── ui/
│   │   ├── pages/
│   │   │   ├── auth/
│   │   │   │   └── LoginPage.tsx
│   │   │   ├── admin/
│   │   │   │   └── DashboardPage.tsx
│   │   │   └── staff/
│   │   │       └── StaffEventPage.tsx
│   │   ├── types/
│   │   │   └── index.ts
│   │   └── main.tsx
│   ├── public/
│   │   └── saffnco_logo.png
│   ├── index.html
│   ├── vite.config.ts
│   └── Dockerfile
│
├── docs/
│   ├── TECHNICAL.md            # ← file ini
│   ├── USER_MANUAL.md
│   └── API_REFERENCE.md
└── FLOWCHART.md
```

---

## 5. Autentikasi & Otorisasi

### Token Flow (Sanctum)
```
1. POST /api/auth/login  →  { token: "1|abc..." }
2. Frontend simpan token di localStorage
3. Setiap request: Header Authorization: Bearer 1|abc...
4. Middleware auth:sanctum memvalidasi token
5. Middleware role:admin / role:staff mengecek user.role
```

### Role
| Role | Akses |
|------|-------|
| `admin` | Full access: dashboard, events, stocks, logs, users, export |
| `staff` | Terbatas: lihat event aktif, input transaksi, lihat log sendiri |

### Middleware Chain
```
Route → auth:sanctum → role:admin/staff → Controller
```

---

## 6. Business Logic Utama

### 6.1 recalculateQty()
Dipanggil setiap kali ada perubahan pada `stock_logs` (create, update, delete).

```php
// EventStock::recalculateQty()
$this->qty_current = $this->logs()
    ->whereIn('type', ['initial', 'penjualan', 'tester', 'pengiriman', 'adjustment'])
    ->sum('qty');
$this->save();
```

> `qty` selalu disimpan dengan sign: positif = masuk, negatif = keluar.
> `qty_current` = SUM semua log → tidak pernah dihitung manual dengan increment/decrement.

### 6.2 Bulk Log (Staff)
Staff dapat menambah multiple produk ke keranjang sebelum submit.

- Semua item divalidasi terlebih dahulu (pre-validate loop) sebelum menyentuh DB
- Jika ada satu item yang gagal, seluruh batch ditolak
- Semua insert dilakukan dalam satu `DB::transaction`
- Item dikelompokkan berdasarkan `type` (penjualan vs tester) — satu request per group

### 6.3 Delete Pengiriman (Admin)
Pengiriman selalu terdiri dari 2 log (asal `-N`, tujuan `+N`).

Saat delete, sistem mencari pasangan log berdasarkan:
```
event_id = sama
logged_at = sama (timestamp)
ABS(qty) = sama
id ≠ log yang dihapus
```
Kedua log dihapus dalam satu `DB::transaction`, dan `recalculateQty` dipanggil pada kedua `EventStock`.

### 6.4 Auto-generate Event Code
```php
// Event::booted()
$date  = now()->format('Ymd');
$count = Event::withTrashed()->whereDate('created_at', today())->count() + 1;
$code  = 'EVT-' . $date . '-' . str_pad($count, 3, '0', STR_PAD_LEFT);
// → EVT-20260608-001
```

### 6.5 Stock Alert Threshold
Dashboard menampilkan produk dengan `qty_current < threshold`.
- Default threshold: **50 pcs**
- Dapat di-override via query param: `?threshold=30`

---

## 7. Setup Lokal

### Prerequisites
- PHP 8.2 (via XAMPP)
- Composer
- Node.js 18+
- npm

### Backend
```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate

# Edit .env: set DB_DATABASE, DB_USERNAME, DB_PASSWORD
php artisan migrate --seed

php artisan serve --port=8000
```

### Frontend
```bash
cd frontend
npm install

# Edit .env.local
VITE_API_URL=http://localhost:8000

npm run dev
# → http://localhost:5173
```

### Akun Default (Seeder)
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@saffnco.com | password |
| Staff | staff@saffnco.com | password |

---

## 8. Deployment

### GitHub Actions Pipeline
```
push to main
    ├── Job: build-frontend → docker build → push itsaffnco/saffnco_eventstock_frontend_app:latest
    ├── Job: build-backend  → docker build → push itsaffnco/saffnco_eventstock_backend_app:latest
    └── Job: deploy (needs both builds)
            └── SSH ke VPS
                    ├── docker pull + run frontend → port 3010
                    └── docker pull + run backend  → port 3011
```

### Port Mapping
| Service | Container Port | Host Port | Public URL |
|---------|---------------|-----------|------------|
| Frontend | 80 | 3010 | https://eventstock.saffnco.app |
| Backend | 80 | 3011 | https://servereventstock.saffnco.app |

### Persistent Volumes (Backend)
```
/DATA/AppData/eventstock/storage  → /var/www/html/storage
/DATA/AppData/eventstock/database → /var/www/html/database
```

---

## 9. Environment Variables

### Backend (.env)
```env
APP_NAME="Event Stock"
APP_ENV=production
APP_KEY=base64:...
APP_URL=https://servereventstock.saffnco.app

DB_CONNECTION=mysql
DB_HOST=...
DB_PORT=3306
DB_DATABASE=eventstock
DB_USERNAME=...
DB_PASSWORD=...

SANCTUM_STATEFUL_DOMAINS=eventstock.saffnco.app
SESSION_DOMAIN=.saffnco.app

FRONTEND_URL=https://eventstock.saffnco.app
```

### Frontend (.env / build-arg)
```env
VITE_API_URL=https://servereventstock.saffnco.app
```
