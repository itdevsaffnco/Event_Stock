import api from '../axiosInstance'
import type {
  Event, EventStock, StockLog, WarehouseStock,
  PaginatedResponse, DashboardSummary, SalesChartPoint, Warehouse, Store,
} from '@/types'

export const eventsApi = {
  list: (params?: { search?: string; status?: string; page?: number }) =>
    api.get<PaginatedResponse<Event>>('/admin/events', { params }),

  get: (id: number) =>
    api.get<{
      data: Event
      summary: Record<string, number>
      stores: Store[]
      warehouses: Pick<Warehouse, 'id' | 'name' | 'location'>[]
    }>(`/admin/events/${id}`),

  create: (data: {
    name: string
    warehouse_ids: number[]
    description?: string
    start_date: string
    end_date?: string
  }) => api.post<{ data: Event; message: string }>('/admin/events', data),

  update: (id: number, data: Partial<Event> & { warehouse_ids?: number[] }) =>
    api.put<{ data: Event; message: string }>(`/admin/events/${id}`, data),

  delete: (id: number) =>
    api.delete<{ message: string }>(`/admin/events/${id}`),

  updateStatus: (id: number, status: string) =>
    api.patch<{ data: Event; message: string }>(`/admin/events/${id}/status`, { status }),
}

export const eventStocksApi = {
  list: (eventId: number, params?: { store_id?: number; warehouse_id?: number; search?: string }) =>
    api.get<{ data: EventStock[] }>(`/admin/events/${eventId}/stocks`, { params }),

  bulkCreate: (eventId: number, stocks: {
    store_id: number
    sku_code?: string
    sku_name: string
    qty_initial: number
    price?: number
  }[]) => api.post<{ message: string }>(`/admin/events/${eventId}/stocks/bulk`, { stocks }),

  importFromWarehouse: (eventId: number, warehouseId: number, storeId: number) =>
    api.post<{ data: WarehouseStock[]; message: string }>(
      `/admin/events/${eventId}/stocks/import-warehouse`,
      { warehouse_id: warehouseId, store_id: storeId }
    ),

  update: (eventId: number, stockId: number, data: Partial<EventStock>) =>
    api.put<{ data: EventStock; message: string }>(`/admin/events/${eventId}/stocks/${stockId}`, data),

  delete: (eventId: number, stockId: number) =>
    api.delete<{ message: string }>(`/admin/events/${eventId}/stocks/${stockId}`),
}

export const stockLogsApi = {
  list: (eventId: number, params?: { type?: string; store_id?: number; date?: string; page?: number }) =>
    api.get<PaginatedResponse<StockLog>>(`/admin/events/${eventId}/logs`, { params }),

  delete: (logId: number) =>
    api.delete<{ message: string }>(`/admin/logs/${logId}`),
}

export const dashboardApi = {
  summary: () =>
    api.get<DashboardSummary>('/admin/dashboard/summary'),

  salesChart: (params?: { range?: '7d' | '30d'; from?: string; to?: string; event_id?: number; store_id?: number }) =>
    api.get<{ data: SalesChartPoint[] }>('/admin/dashboard/sales-chart', { params }),

  topSkus: (params?: { from?: string; to?: string; event_id?: number; store_id?: number }) =>
    api.get<{ data: { sku_name: string; total_sold: number; total_value: number }[] }>(
      '/admin/dashboard/top-skus', { params }
    ),

  stockAlerts: (params?: { event_id?: number; store_id?: number; threshold?: number }) =>
    api.get<{ data: EventStock[] }>('/admin/dashboard/stock-alerts', { params }),

  stores: (params?: { event_id?: number }) =>
    api.get<{ data: Store[] }>('/admin/stores', { params: { ...params, all: 1 } }),
}

export const exportApi = {
  stocks: (eventId: number) =>
    api.get(`/admin/export/events/${eventId}/stocks`, { responseType: 'blob' }),

  logs: (eventId: number, type?: string) =>
    api.get(`/admin/export/events/${eventId}/logs`, { params: { type }, responseType: 'blob' }),

  dashboardSales: (params: { from?: string; to?: string; event_id?: number; store_id?: number }) =>
    api.get('/admin/export/dashboard/sales', { params, responseType: 'blob' }),
}
