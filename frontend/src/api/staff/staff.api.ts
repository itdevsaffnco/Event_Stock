import api from '../axiosInstance'
import type { Event, EventStock, StockLog, PaginatedResponse, Warehouse, Store } from '@/types'

export const staffApi = {
  getActiveEvents: () =>
    api.get<{ data: Event[] }>('/staff/events'),

  getEventDetail: (id: number) =>
    api.get<{
      data: Event
      stores: Store[]
      warehouses: Pick<Warehouse, 'id' | 'name'>[]
    }>(`/staff/events/${id}`),

  getStocks: (eventId: number, storeId: number) =>
    api.get<{ data: EventStock[] }>(`/staff/events/${eventId}/stocks`, {
      params: { store_id: storeId },
    }),

  createLog: (eventId: number, data: {
    event_stock_id: number
    type: 'penjualan' | 'tester' | 'pengiriman'
    qty: number
    to_store_id?: number
    notes?: string
    reference_no?: string
    logged_at?: string
  }) =>
    api.post<{ message: string; qty_current: number }>(`/staff/events/${eventId}/logs`, data),

  createLogBulk: (eventId: number, data: {
    type: 'penjualan' | 'tester'
    store_id: number
    logged_at?: string
    notes?: string
    items: { event_stock_id: number; qty: number }[]
  }) =>
    api.post<{ message: string }>(`/staff/events/${eventId}/logs/bulk`, data),

  getMyLogs: (eventId: number, date?: string) =>
    api.get<PaginatedResponse<StockLog>>(`/staff/events/${eventId}/my-logs`, {
      params: { date },
    }),
}
