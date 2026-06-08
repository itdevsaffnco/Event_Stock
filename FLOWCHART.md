# Event Stock System — Flowchart

---

## 1. Arsitektur Sistem

```mermaid
flowchart TB
    subgraph CLIENT["🖥️ Frontend — React 18 + Vite + TypeScript + Tailwind"]
        direction LR
        LP[Login Page]
        AP[Admin Pages]
        SP[Staff Pages]
    end

    subgraph SERVER["⚙️ Backend — Laravel 11 + Sanctum"]
        direction LR
        AUTH[Auth API]
        ADMIN_API[Admin API]
        STAFF_API[Staff API]
    end

    subgraph DB["🗄️ Database"]
        direction TB
        U[(users)]
        EV[(events)]
        W[(warehouses)]
        ST[(stores)]
        ES[(event_stocks)]
        SL[(stock_logs)]
    end

    subgraph INFRA["☁️ Infrastructure"]
        direction LR
        GH[GitHub Actions CI/CD]
        DH[Docker Hub Registry]
        SRV[VPS Server\ndocker run]
    end

    CLIENT <-->|"HTTP / Axios + Bearer Token"| SERVER
    SERVER <-->|"Eloquent ORM"| DB
    GH -->|"docker push"| DH
    DH -->|"docker pull"| SRV
```

---

## 2. Alur Autentikasi

```mermaid
flowchart TD
    A([👤 User Buka App]) --> B[/Login Page/]
    B --> C[Input Email & Password]
    C --> D[POST /api/auth/login]
    D --> E{Validasi Kredensial\nSanctum}

    E -->|❌ Gagal| F[Tampilkan Pesan Error]
    F --> C

    E -->|✅ Berhasil| G{Cek Role User}

    G -->|role: admin| H[Simpan Token\nRedirect /admin/dashboard]
    G -->|role: staff| I[Simpan Token\nRedirect /staff/events]

    H --> ADMIN([🔑 Admin Dashboard])
    I --> STAFF([🧑‍💼 Staff — Pilih Event])

    LOGOUT([Logout]) --> L[DELETE /api/auth/logout]
    L --> M[Hapus Token]
    M --> B
```

---

## 3. Alur Staff — Input Transaksi

```mermaid
flowchart TD
    START([🧑‍💼 Staff Login]) --> A[Lihat Daftar Event Aktif]
    A --> B[Pilih Event]
    B --> C[Pilih Store / Booth]
    C --> D[Buka Form Transaksi]

    D --> E{Pilih Tipe\nTransaksi}

    %% ─── PENJUALAN / TESTER ───────────────────────────
    E -->|Penjualan / Tester| F[Cari Produk\ndi Picker]
    F --> G[Set Jumlah Qty]
    G --> H{Validasi}
    H -->|qty = 0| I[❌ Diblok\nqty tidak boleh 0]
    H -->|qty > stok tersisa| J[❌ Diblok\nStok tidak mencukupi]
    H -->|✅ OK| K[➕ Tambah ke Keranjang\nCartItem + type badge]

    I --> G
    J --> G

    K --> L[Tampil di List\n'Produk Ditambahkan']
    L --> M{Tambah\nProduk Lain?}
    M -->|Ya — ganti tipe| N[Switch Penjualan ↔ Tester\nKeranjang tetap tampil\nbadge warna berbeda]
    N --> F
    M -->|Ya — produk baru| F
    M -->|Tidak| O[Klik Simpan N Produk]

    O --> P[Group Item by Type]
    P --> Q[POST /staff/events/id/logs/bulk\nper group type]
    Q --> R[Backend: Cek stok semua item]
    R --> S{Validasi\nSemua Item}
    S -->|❌ Ada yang gagal| T[Return Error 422]
    S -->|✅ Semua OK| U[DB Transaction:\nBuat StockLog + Decrement qty]
    U --> V[✅ Transaksi Tersimpan]
    V --> W[Reset Keranjang]
    W --> D

    %% ─── PENGIRIMAN ───────────────────────────────────
    E -->|Pengiriman| X[Pilih Produk Sumber]
    X --> Y[Pilih Store Tujuan]
    Y --> Z[Set Qty Kirim]
    Z --> AA{Validasi}
    AA -->|Stok asal habis| AB[❌ Diblok]
    AA -->|Asal = Tujuan| AC[❌ Diblok]
    AA -->|Produk tidak ada di tujuan| AD[❌ Diblok]
    AA -->|✅ OK| AE[POST /staff/events/id/logs]
    AE --> AF[DB Transaction:\n• StockLog asal qty=-N\n• StockLog tujuan qty=+N]
    AF --> AG[✅ Pengiriman Tercatat]
```

---

## 4. Alur Admin — Dashboard & Manajemen

```mermaid
flowchart TD
    ADMIN([🔑 Admin Login]) --> DASH[Admin Dashboard]

    %% ─── DASHBOARD ────────────────────────────────────
    DASH --> D1[📊 Summary Cards\nTotal Events, Stores, Transaksi Hari Ini]
    DASH --> D2[📈 Sales Chart\n7d / 30d / Custom Range]
    DASH --> D3[🏆 Top SKUs Terlaris]
    DASH --> D4[⚠️ Stok Menipis\nthreshold < 50 pcs]
    DASH --> D5[🗒️ Recent Transactions\n10 per halaman + pagination]

    D5 --> ACT{Aksi\nTransaksi}
    ACT -->|✏️ Edit\nbukan pengiriman| E1[Edit Modal:\nQty / Tanggal /\nRef No / Catatan]
    E1 --> E2[PATCH /admin/logs/id]
    E2 --> E3[Update Log]
    E3 --> RECALC[recalculateQty\nSUM semua log → qty_current]

    ACT -->|🗑️ Delete| DEL{Cek Tipe Log}
    DEL -->|Penjualan / Tester| D6[DELETE 1 Log]
    DEL -->|Pengiriman| D7[DELETE 2 Log\nasal + tujuan\ndalam DB Transaction]
    D6 --> RECALC
    D7 --> RECALC
    RECALC --> REFRESH[Refresh Data]

    %% ─── SIDEBAR NAV ───────────────────────────────────
    DASH --> NAV[Sidebar Navigasi]

    NAV --> EV[📁 Events Management]
    EV --> EV1[Buat Event Baru\nnama, warehouse, tanggal]
    EV --> EV2[Update Status\nactive / closed / cancelled]
    EV --> EV3[Kelola Stock Event]
    EV3 --> ST1[Bulk Create Stock\nmanual input]
    EV3 --> ST2[Import dari Warehouse\nsku otomatis dari gudang]
    EV3 --> ST3[Edit Harga / Nama SKU]
    EV3 --> ST4[Hapus Stock]

    EV --> EV4[📋 Log Transaksi per Event\nfilter: store, type, tanggal]
    EV4 --> EX[📤 Export Excel]

    NAV --> WH[🏭 Warehouse Management]
    NAV --> STR[🏪 Store Management]
    NAV --> USR[👥 User Management]
```

---

## 5. Logika Perhitungan Stok

```mermaid
flowchart TD
    A([Transaksi Masuk]) --> B{Tipe Transaksi}

    B -->|initial| C["qty = +N\n(Set stok awal)"]
    B -->|penjualan| D["qty = -N\n(Stok dijual)"]
    B -->|tester| E["qty = -N\n(Dipakai sample)"]
    B -->|pengiriman asal| F["qty = -N\n(Keluar dari booth asal)"]
    B -->|pengiriman tujuan| G["qty = +N\n(Masuk ke booth tujuan)"]

    C & D & E & F & G --> H[Simpan ke stock_logs]

    H --> I[Trigger recalculateQty\npada EventStock terkait]
    I --> J["SELECT SUM(qty)\nFROM stock_logs\nWHERE event_stock_id = ?"]
    J --> K[Update event_stocks.qty_current\n= hasil SUM]
    K --> L{qty_current}
    L -->|= 0| M[⚠️ Stok Habis\nBlok transaksi selanjutnya]
    L -->|< 50| N[⚠️ Tampil di 'Stok Menipis']
    L -->|>= 50| O[✅ Normal]
```

---

## 6. CI/CD Pipeline

```mermaid
flowchart LR
    DEV([👨‍💻 Developer\ngit push main]) --> GH[GitHub Actions\ntrigger on push]

    GH --> BF[Job: Build Frontend\nnpm run build\ndocker build + push]
    GH --> BB[Job: Build Backend\ndocker build + push]

    BF --> FIMG[🐳 Docker Hub\nfrontend:latest]
    BB --> BIMG[🐳 Docker Hub\nbackend:latest]

    FIMG & BIMG --> DEPLOY[Job: Deploy via SSH\nneeds: build-frontend\n+ build-backend]

    DEPLOY --> SSH[SSH ke VPS]
    SSH --> SF[docker stop → rm → rmi\ndocker pull → run\nPort 3010]
    SSH --> SB[docker stop → rm → rmi\ndocker pull → run\nPort 3011\nmount: storage + database]

    SF --> VF{✅ eventstock_frontend\nrunning?}
    SB --> VB{✅ eventstock_backend\nrunning?}

    VF & VB -->|✅ Both OK| DONE([🚀 Deploy Sukses\nfrontend: eventstock.saffnco.app\nbackend: servereventstock.saffnco.app])
    VF & VB -->|❌ Gagal| FAIL([💥 Exit Code 1\ndocker logs ditampilkan])
```
