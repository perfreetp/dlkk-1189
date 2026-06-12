import { create } from 'zustand'

interface User {
  id: number
  username: string
  role: 'student' | 'instructor'
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  loading: boolean
  error: string | null
}

interface AuthActions {
  login: (username: string, password: string) => Promise<void>
  register: (username: string, password: string, role: string) => Promise<void>
  logout: () => void
  fetchMe: () => Promise<void>
  clearError: () => void
}

type AuthStore = AuthState & AuthActions

async function apiFetch<T>(url: string, options?: RequestInit): Promise<{ success: boolean; data?: T; error?: string }> {
  const token = localStorage.getItem('token')
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  const res = await fetch(url, {
    ...options,
    headers: { ...headers, ...(options?.headers as Record<string, string>) },
  })
  return res.json()
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: !!localStorage.getItem('token'),
  loading: false,
  error: null,

  login: async (username, password) => {
    set({ loading: true, error: null })
    try {
      const res = await apiFetch<{ user: User; token: string }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      })
      if (res.success && res.data) {
        localStorage.setItem('token', res.data.token)
        set({
          user: res.data.user,
          token: res.data.token,
          isAuthenticated: true,
          loading: false,
          error: null,
        })
      } else {
        set({ loading: false, error: res.error || '登录失败' })
      }
    } catch {
      set({ loading: false, error: '网络错误' })
    }
  },

  register: async (username, password, role) => {
    set({ loading: true, error: null })
    try {
      const res = await apiFetch<{ user: User; token: string }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ username, password, role }),
      })
      if (res.success && res.data) {
        localStorage.setItem('token', res.data.token)
        set({
          user: res.data.user,
          token: res.data.token,
          isAuthenticated: true,
          loading: false,
          error: null,
        })
      } else {
        set({ loading: false, error: res.error || '注册失败' })
      }
    } catch {
      set({ loading: false, error: '网络错误' })
    }
  },

  logout: () => {
    localStorage.removeItem('token')
    set({ user: null, token: null, isAuthenticated: false, error: null })
  },

  fetchMe: async () => {
    set({ loading: true })
    try {
      const res = await apiFetch<User>('/api/auth/me')
      if (res.success && res.data) {
        set({ user: res.data, isAuthenticated: true, loading: false })
      } else {
        localStorage.removeItem('token')
        set({ user: null, token: null, isAuthenticated: false, loading: false })
      }
    } catch {
      localStorage.removeItem('token')
      set({ user: null, token: null, isAuthenticated: false, loading: false })
    }
  },

  clearError: () => set({ error: null }),
}))

export { apiFetch }
