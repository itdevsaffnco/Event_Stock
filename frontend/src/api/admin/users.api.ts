import api from '../axiosInstance'
import type { User, PaginatedResponse } from '@/types'

export const usersApi = {
  list: (params?: { search?: string; role?: string; page?: number }) =>
    api.get<PaginatedResponse<User>>('/admin/users', { params }),

  create: (data: { name: string; email: string; password: string; role: 'admin' | 'staff' }) =>
    api.post<{ data: User; message: string }>('/admin/users', data),

  update: (id: number, data: { name?: string; email?: string; password?: string; role?: 'admin' | 'staff'; is_active?: boolean }) =>
    api.put<{ data: User; message: string }>(`/admin/users/${id}`, data),

  delete: (id: number) =>
    api.delete<{ message: string }>(`/admin/users/${id}`),
}
