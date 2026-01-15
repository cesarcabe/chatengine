/**
 * User Context
 * 
 * Context para representar o usuário atual da aplicação
 * Remove dependência de hardcoded "me" em favor de userId dinâmico
 * 
 * USO:
 * - Envolver aplicação com <UserProvider userId={userId}>
 * - Usar hook useCurrentUser() em componentes
 * - Em produção, userId virá do token JWT decodificado ou backend
 */

'use client'

import { createContext, useContext, ReactNode } from 'react'

interface UserContextValue {
  userId: string
}

const UserContext = createContext<UserContextValue | null>(null)

interface UserProviderProps {
  children: ReactNode
  userId: string
}

/**
 * Provider do UserContext
 * 
 * @param userId - ID do usuário atual (por enquanto pode ser mockado, depois virá do token/backend)
 */
export function UserProvider({ children, userId }: UserProviderProps) {
  return <UserContext.Provider value={{ userId }}>{children}</UserContext.Provider>
}

/**
 * Hook para acessar o usuário atual
 * 
 * @returns userId do usuário atual
 * @throws Error se usado fora do UserProvider
 */
export function useCurrentUser(): string {
  const context = useContext(UserContext)
  
  if (!context) {
    throw new Error('useCurrentUser must be used within UserProvider')
  }
  
  return context.userId
}
