/**
 * Hook para gerenciar mensagens de uma conversa
 * 
 * Integra React Query com Zustand store
 * Busca mensagens da API via store e sincroniza com o store
 */

'use client'

import { useQuery } from '@tanstack/react-query'
import { useChatStore } from '../store/chatStore'

export function useMessages(conversationId: string | null) {
  const { messagesByConversation, loadMessages } = useChatStore()

  // Query para buscar mensagens
  const query = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: () => loadMessages(conversationId!),
    enabled: !!conversationId,
    refetchOnWindowFocus: false,
  })

  const currentMessages = conversationId ? (messagesByConversation[conversationId] || []) : []

  return {
    messages: currentMessages,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  }
}
