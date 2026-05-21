export interface User {
  id: number
  name: string
  email: string
  role: 'admin' | 'staff'
  is_active: boolean
  warehouse_id: number | null
  created_at?: string
}

export interface Warehouse {
  id: number
  name: string
  location: string | null
  address: string | null
  pic_name: string | null
  pic_phone: string | null
  status: 'active' | 'inactive'
  stores_count?: number
  warehouse_stocks_count?: number
  warehouse_stocks?: WarehouseStock[]
  stores?: Store[]
  created_at: string
}

export interface WarehouseStock {
  id: number
  warehouse_id: number
  sku_code: string | null
  sku_name: string
  qty_available: number
  price: number | null
}

export interface Store {
  id: number
  warehouse_id: number
  name: string
  pic_name: string | null
  pic_phone: string | null
  status: 'active' | 'inactive'
  warehouse?: Pick<Warehouse, 'id' | 'name'>
}

export interface Event {
  id: number
  name: string
  code: string
  // Sekarang many-to-many
  warehouses?: Pick<Warehouse, 'id' | 'name' | 'location'>[]
  description: string | null
  start_date: string
  end_date: string | null
  status: 'draft' | 'active' | 'closed'
  creator?: Pick<User, 'id' | 'name'>
  event_stocks_count?: number
  created_at: string
}

export interface EventStock {
  id: number
  event_id: number
  store_id: number
  sku_code: string | null
  sku_name: string
  qty_initial: number
  qty_current: number
  qty_sold?: number
  qty_tester?: number
  price: number | null
  store?: Pick<Store, 'id' | 'name' | 'warehouse_id'> & { warehouse?: Pick<Warehouse, 'id' | 'name'> }
}

export interface StockLog {
  id: number
  event_stock_id: number
  event_id: number
  store_id: number
  user_id: number
  from_warehouse_id: number | null
  type: 'initial' | 'penjualan' | 'tester' | 'pengiriman' | 'adjustment'
  qty: number
  notes: string | null
  reference_no: string | null
  logged_at: string
  store?: Pick<Store, 'id' | 'name'>
  user?: Pick<User, 'id' | 'name'>
  from_warehouse?: Pick<Warehouse, 'id' | 'name'>
  eventStock?: Pick<EventStock, 'id' | 'sku_name' | 'sku_code'>
}

export interface PaginatedResponse<T> {
  data: T[]
  current_page: number
  last_page: number
  per_page: number
  total: number
}

export interface DashboardSummary {
  total_events_active: number
  total_events: number
  sales_today: number
  sales_this_month: number
}

export interface SalesChartPoint {
  date: string
  total_qty: number
  total_transactions: number
}
