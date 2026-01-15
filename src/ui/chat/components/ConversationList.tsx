/**
 * ConversationList Component
 * 
 * Lista lateral de conversas (inspirado no WhatsApp Web)
 * Exibe todas as conversas e permite selecionar uma
 * Suporta callback customizado para mobile (opcional)
 */

'use client'

import { useConversations } from '../hooks/useConversations'
import { useChatStore } from '../store/chatStore'
import { useCurrentUser } from '../contexts/UserContext'
import { Conversation } from '@/modules/chatengine/domain/Conversation'
import { AuthError } from '../api/chatApi'

interface ConversationListProps {
  onConversationSelect?: (conversationId: string) => void
}

export function ConversationList({ onConversationSelect }: ConversationListProps) {
  const { conversations, isLoading, error } = useConversations()
  const { activeConversationId, setActiveConversation } = useChatStore()
  const currentUserId = useCurrentUser()

  // Handler para selecionar conversa
  const handleConversationClick = (conversationId: string) => {
    setActiveConversation(conversationId)
    // Chama callback customizado se fornecido (para mobile)
    if (onConversationSelect) {
      onConversationSelect(conversationId)
    }
  }

  if (isLoading) {
    return (
      <div className="w-80 bg-gray-50 border-r border-gray-200 flex items-center justify-center">
        <p className="text-sm text-gray-500">Carregando conversas...</p>
      </div>
    )
  }

  if (error) {
    const isAuthError = error instanceof AuthError || String((error as any)?.message || '').includes('Token')
    return (
      <div className="w-full h-full bg-white border-r border-gray-200 flex flex-col">
        <div className="px-5 py-4 border-b border-gray-100 bg-white">
          <h2 className="text-lg font-semibold text-gray-900">Conversas</h2>
        </div>
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="text-center">
            <p className="text-sm font-medium text-gray-900 mb-1.5">
              {isAuthError ? 'Sem autenticação' : 'Erro ao carregar conversas'}
            </p>
            <p className="text-sm text-gray-500">
              {isAuthError
                ? 'Abra /chat?token=SEU_TOKEN (ou envie via postMessage no iframe).'
                : String((error as any)?.message || error)}
            </p>
          </div>
        </div>
      </div>
    )
  }

  const formatLastMessage = (conversation: Conversation) => {
    if (!conversation.lastMessage) return ''
    const prefix = conversation.lastMessage.senderId === currentUserId ? 'Você: ' : ''
    return prefix + conversation.lastMessage.content
  }

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="w-full h-full bg-white border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 bg-white">
        <h2 className="text-lg font-semibold text-gray-900">Conversas</h2>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-gray-500">Nenhuma conversa encontrada</p>
          </div>
        ) : (
          conversations.map((conversation) => {
            const isActive = activeConversationId === conversation.id
            const otherParticipant = conversation.participants.find((p) => p.id !== currentUserId)

            return (
              <button
                key={conversation.id}
                onClick={() => handleConversationClick(conversation.id)}
                className={`w-full px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors text-left ${
                  isActive ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                    <span className="text-white text-sm font-medium">
                      {otherParticipant?.name?.[0]?.toUpperCase() || '?'}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <h3 className={`text-sm font-medium truncate ${
                        isActive ? 'text-gray-900' : 'text-gray-900'
                      }`}>
                        {otherParticipant?.name || 'Desconhecido'}
                      </h3>
                      {conversation.lastMessage && (
                        <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                          {formatTime(conversation.lastMessage.createdAt)}
                        </span>
                      )}
                    </div>
                    {conversation.lastMessage && (
                      <p className="text-sm text-gray-500 truncate leading-relaxed">
                        {formatLastMessage(conversation)}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
