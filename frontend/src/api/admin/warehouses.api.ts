import api from '../axiosInstance'
import type { Warehouse, Store, WarehouseStock, PaginatedResponse } from '@/types'

export const warehousesApi = {
  list: (params?: { search?: string; status?: string; page?: number }) =>
    api.get<PaginatedResponse<Warehouse>>('/admin/warehouses', { params }),

  get: (id: number) =>
    api.get<{ data: Warehouse }>(`/admin/warehouses/${id}`),

  create: (data: Partial<Warehouse> & { stocks?: Partial<WarehouseStock>[] }) =>
    api.post<{ data: Warehouse; message: string }>('/admin/warehouses', data),

  update: (id: number, data: Partial<Warehouse>) =>
    api.put<{ data: Warehouse; message: string }>(`/admin/warehouses/${id}`, data),

  delete: (id: number) =>
    api.delete<{ message: string }>(`/admin/warehouses/${id}`),

  getStores: (id: number) =>
    api.get<{ data: Store[] }>(`/admin/warehouses/${id}/stores`),

  getStocks: (id: number) =>
    api.get<{ data: WarehouseStock[] }>(`/admin/warehouses/${id}/stocks`),

  bulkUpdateStocks: (id: number, stocks: Partial<WarehouseStock>[]) =>
    api.post<{ data: WarehouseStock[]; message: string }>(
      `/admin/warehouses/${id}/stocks/bulk`,
      { stocks }
    ),

  deleteStock: (warehouseId: number, stockId: number) =>
    api.delete<{ message: string }>(`/admin/warehouses/${warehouseId}/stocks/${stockId}`),
}
