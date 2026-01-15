/**
 * Auth Store (Zustand)
 * 
 * Gerencia autenticação via token (JWT)
 * Armazena token em memória (não localStorage por padrão)
 * 
 * STATE:
 * - token: string | null
 * 
 * ACTIONS:
 * - setToken(token)
 * - clearToken()
 * - getToken()
 */

import { create } from 'zustand'

interface AuthState {
  token: string | null

  setToken: (token: string) => void
  clearToken: () => void
  getToken: () => string | null
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,

  setToken: (token) => {
    set({ token })
  },

  clearToken: () => {
    set({ token: null })
  },

  getToken: () => {
    return get().token
  },
}))
