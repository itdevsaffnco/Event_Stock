import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error.response?.status

    // Token expired / invalid — clear session and redirect
    if (status === 401) {
      localStorage.removeItem('auth_token')
      window.location.href = '/login'
    }

    // Rate limited — inject a friendly message so UI can display it
    if (status === 429) {
      error.response.data = {
        message: 'Terlalu banyak percobaan. Silakan tunggu beberapa saat dan coba lagi.',
      }
    }

    return Promise.reject(error)
  }
)

export default api
