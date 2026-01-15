/**
 * User Store (Zustand)
 * 
 * Armazena userId atual para uso no store e fora de componentes React
 * Complementa UserContext (que é para componentes React)
 * 
 * STATE:
 * - userId: string
 * 
 * ACTIONS:
 * - setUserId(userId)
 * - getUserId()
 */

import { create } from 'zustand'

interface UserState {
  userId: string

  setUserId: (userId: string) => void
  getUserId: () => string
}

export const useUserStore = create<UserState>((set, get) => ({
  userId: 'me', // Default para compatibilidade (será substituído por UserContext)

  setUserId: (userId) => {
    set({ userId })
  },

  getUserId: () => {
    return get().userId
  },
}))
