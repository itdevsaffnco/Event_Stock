import api from './axiosInstance'
import type { User } from '@/types'

export const authApi = {
  login: (email: string, password: string) =>
    api.post<{ token: string; user: User }>('/auth/login', { email, password }),

  logout: () => api.post('/auth/logout'),

  me: () => api.get<{ user: User }>('/auth/me'),

  forgotPassword: (email: string) =>
    api.post<{ message: string }>('/auth/forgot-password', { email }),

  resetPassword: (data: { token: string; email: string; password: string; password_confirmation: string }) =>
    api.post<{ message: string }>('/auth/reset-password', data),
}
