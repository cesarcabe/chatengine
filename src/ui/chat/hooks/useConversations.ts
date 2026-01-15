/**
 * Hook para gerenciar conversas
 * 
 * Integra React Query com Zustand store
 * Busca conversas da API via store e sincroniza com o store
 */

'use client'

import { useQuery } from '@tanstack/react-query'
import { useChatStore } from '../store/chatStore'

export function useConversations() {
  const { conversations, loadConversations } = useChatStore()

  const query = useQuery({
    queryKey: ['conversations'],
    queryFn: loadConversations,
    refetchOnWindowFocus: false,
  })

  return {
    conversations,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  }
}
