/**
 * Chat Store (Zustand)
 * 
 * Motor central do estado do chat.
 * Gerencia o estado global do chat e consome APENAS a chatApi.
 * Nenhuma lógica de UI dentro do store.
 * 
 * STATE:
 * - conversations: Conversation[]
 * - messagesByConversation: Record<string, Message[]>
 * - activeConversationId: string | null
 * - replyToMessage: Message | null
 * - sendingMessageIds: string[]
 * - pollingIntervalId: NodeJS.Timeout | null
 * - lastSeenMessageTimestamp: Record<string, Date>
 * 
 * ACTIONS:
 * - loadConversations()
 * - loadMessages(conversationId)
 * - setActiveConversation(conversationId)
 * - setReplyToMessage(message | null)
 * - sendMessageOptimistic(payload)
 * - updateMessageStatus(messageId, status)
 * - startPolling(conversationId)
 * - stopPolling()
 */

import { create } from 'zustand'
import { Conversation } from '@/modules/chatengine/domain/Conversation'
import { Message } from '@/modules/chatengine/domain/Message'
import * as chatApi from '../api/chatApi'
import type { SendMessagePayload } from '../api/chatApi'
import { POLL_INTERVAL_MS } from '../config/polling'
import { useUserStore } from './userStore'

// Re-export SendMessagePayload para uso externo
export type { SendMessagePayload } from '../api/chatApi'

interface ChatState {
  // Estado
  conversations: Conversation[]
  messagesByConversation: Record<string, Message[]>
  activeConversationId: string | null
  replyToMessage: Message | null
  sendingMessageIds: string[]
  pollingIntervalId: NodeJS.Timeout | null
  conversationPollingIntervalId: NodeJS.Timeout | null
  lastSeenMessageTimestamp: Record<string, Date>

  // Actions
  // IMPORTANTE: também retorna os dados para compatibilidade com React Query (queryFn não pode retornar undefined)
  loadConversations: () => Promise<Conversation[]>
  loadMessages: (conversationId: string) => Promise<Message[]>
  setActiveConversation: (conversationId: string | null) => void
  setReplyToMessage: (message: Message | null) => void
  sendMessageOptimistic: (payload: SendMessagePayload) => Promise<void>
  updateMessageStatus: (messageId: string, status: Message['status']) => void
  startPolling: (conversationId: string) => void
  stopPolling: () => void
  startConversationPolling: () => void
  stopConversationPolling: () => void
}

export const useChatStore = create<ChatState>((set, get) => ({
  // Estado inicial
  conversations: [],
  messagesByConversation: {},
  activeConversationId: null,
  replyToMessage: null,
  sendingMessageIds: [],
  pollingIntervalId: null,
  conversationPollingIntervalId: null,
  lastSeenMessageTimestamp: {},

  // Carrega lista de conversas da API
  loadConversations: async () => {
    try {
      const conversations = await chatApi.getConversations()
      set({ conversations })
      return conversations
    } catch (error) {
      console.error('Erro ao carregar conversas:', error)
      throw error
    }
  },

  // Carrega mensagens de uma conversa da API
  loadMessages: async (conversationId: string) => {
    try {
      const messages = await chatApi.getMessages(conversationId)
      
      // Atualiza lastSeenMessageTimestamp
      const lastMessage = messages[messages.length - 1]
      if (lastMessage) {
        set((state) => ({
          messagesByConversation: {
            ...state.messagesByConversation,
            [conversationId]: messages,
          },
          lastSeenMessageTimestamp: {
            ...state.lastSeenMessageTimestamp,
            [conversationId]: lastMessage.createdAt,
          },
        }))
      } else {
        set((state) => ({
          messagesByConversation: {
            ...state.messagesByConversation,
            [conversationId]: messages,
          },
        }))
      }
      return messages
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error)
      throw error
    }
  },

  // Define conversa ativa
  setActiveConversation: (conversationId) => {
    set({ activeConversationId: conversationId, replyToMessage: null })
  },

  // Define mensagem para reply
  setReplyToMessage: (message) => {
    set({ replyToMessage: message })
  },

  // Envio otimista de mensagem
  // 1. Cria mensagem com status pending (ID temporário)
  // 2. Adiciona ao estado imediatamente
  // 3. Chama API para envio
  // 4. Atualiza status quando resposta chega
  sendMessageOptimistic: async (payload: SendMessagePayload) => {
    const { conversationId, type, content, replyToMessageId, attachments } = payload

    // ID temporário para mensagem otimista
    const tempId = `temp-${Date.now()}-${Math.random()}`

    // Obtém userId atual do userStore
    const currentUserId = useUserStore.getState().getUserId()

    // Cria mensagem otimista com status pending
    const optimisticMessage: Message = {
      id: tempId,
      workspaceId: 'unknown',
      conversationId,
      senderId: currentUserId,
      type,
      content,
      replyToMessageId,
      attachments,
      status: 'pending',
      createdAt: new Date(),
    }

    // Adiciona mensagem otimista ao estado
    set((state) => {
      const conversationMessages = state.messagesByConversation[conversationId] || []
      return {
        messagesByConversation: {
          ...state.messagesByConversation,
          [conversationId]: [...conversationMessages, optimisticMessage],
        },
        sendingMessageIds: [...state.sendingMessageIds, tempId],
      }
    })

    try {
      // Chama API para envio real
      const sentMessage = await chatApi.sendMessage(payload)

      // Atualiza mensagem otimista com dados reais da API
      set((state) => {
        const conversationMessages = state.messagesByConversation[conversationId] || []
        const updatedMessages = conversationMessages.map((msg) =>
          msg.id === tempId ? sentMessage : msg
        )

        return {
          messagesByConversation: {
            ...state.messagesByConversation,
            [conversationId]: updatedMessages,
          },
          sendingMessageIds: state.sendingMessageIds.filter((id) => id !== tempId),
        }
      })
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error)

      // Em caso de erro, atualiza status para failed
      set((state) => {
        const conversationMessages = state.messagesByConversation[conversationId] || []
        const updatedMessages = conversationMessages.map((msg) =>
          msg.id === tempId ? { ...msg, status: 'failed' as Message['status'] } : msg
        )

        return {
          messagesByConversation: {
            ...state.messagesByConversation,
            [conversationId]: updatedMessages,
          },
          sendingMessageIds: state.sendingMessageIds.filter((id) => id !== tempId),
        }
      })
    }
  },

  // Atualiza status de uma mensagem (útil para atualização de status)
  updateMessageStatus: (messageId, status) => {
    set((state) => {
      const newMessagesByConversation = { ...state.messagesByConversation }
      
      Object.keys(newMessagesByConversation).forEach((conversationId) => {
        newMessagesByConversation[conversationId] = newMessagesByConversation[
          conversationId
        ].map((msg) => (msg.id === messageId ? { ...msg, status } : msg))
      })

      return { messagesByConversation: newMessagesByConversation }
    })
  },

  // Inicia polling para uma conversa
  startPolling: (conversationId: string) => {
    const state = get()
    
    // Para polling anterior se existir
    if (state.pollingIntervalId) {
      clearInterval(state.pollingIntervalId)
    }

    // Função de polling
    const pollMessages = async () => {
      try {
        const currentState = get()
        const lastSeen = currentState.lastSeenMessageTimestamp[conversationId]
        
        // Busca mensagens novas desde lastSeen (se houver)
        const newMessages = await chatApi.getMessages(conversationId, {
          since: lastSeen || new Date(0),
        })

        if (newMessages.length > 0) {
          // Atualiza mensagens (merge sem duplicar)
          set((state) => {
            const existingMessages = state.messagesByConversation[conversationId] || []
            const existingIds = new Set(existingMessages.map((m) => m.id))
            
            // Adiciona apenas mensagens novas
            const messagesToAdd = newMessages.filter((m) => !existingIds.has(m.id))
            const updatedMessages = [...existingMessages, ...messagesToAdd].sort(
              (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
            )

            // Atualiza lastSeenMessageTimestamp
            const lastMessage = updatedMessages[updatedMessages.length - 1]
            const newLastSeen = lastMessage ? lastMessage.createdAt : state.lastSeenMessageTimestamp[conversationId]

            return {
              messagesByConversation: {
                ...state.messagesByConversation,
                [conversationId]: updatedMessages,
              },
              lastSeenMessageTimestamp: {
                ...state.lastSeenMessageTimestamp,
                [conversationId]: newLastSeen || new Date(),
              },
            }
          })
        }
      } catch (error) {
        console.error('Erro no polling:', error)
        // Não interrompe o polling em caso de erro (retentará no próximo intervalo)
      }
    }

    // Determina intervalo baseado na visibilidade da aba
    const getPollInterval = () => {
      if (typeof document !== 'undefined' && document.hidden) {
        return POLL_INTERVAL_MS.BACKGROUND
      }
      // Detecta mobile por user agent (simplificado)
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
      return isMobile ? POLL_INTERVAL_MS.MOBILE : POLL_INTERVAL_MS.DESKTOP
    }

    // Polling inicial
    pollMessages()

    // Configura intervalo
    const intervalId = setInterval(() => {
      // Ajusta intervalo dinamicamente se aba estiver em background
      const currentInterval = getPollInterval()
      // Em uma implementação mais robusta, recriaria o intervalo aqui
      pollMessages()
    }, getPollInterval())

    set({ pollingIntervalId: intervalId as any })
  },

  // Para polling de mensagens
  stopPolling: () => {
    const state = get()
    if (state.pollingIntervalId) {
      clearInterval(state.pollingIntervalId)
      set({ pollingIntervalId: null })
    }
  },

  // Inicia polling da lista de conversas
  startConversationPolling: () => {
    const state = get()
    
    // Para polling anterior se existir
    if (state.conversationPollingIntervalId) {
      clearInterval(state.conversationPollingIntervalId)
    }

    // Função de polling
    const pollConversations = async () => {
      try {
        const conversations = await chatApi.getConversations()
        set({ conversations })
      } catch (error) {
        console.error('Erro no polling de conversas:', error)
        // Não interrompe o polling em caso de erro
      }
    }

    // Polling inicial
    pollConversations()

    // Configura intervalo (2-3 segundos)
    const intervalId = setInterval(() => {
      pollConversations()
    }, POLL_INTERVAL_MS.DESKTOP)

    set({ conversationPollingIntervalId: intervalId as any })
  },

  // Para polling de conversas
  stopConversationPolling: () => {
    const state = get()
    if (state.conversationPollingIntervalId) {
      clearInterval(state.conversationPollingIntervalId)
      set({ conversationPollingIntervalId: null })
    }
  },
}))

