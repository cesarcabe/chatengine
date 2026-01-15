/**
 * Chat Page
 * 
 * Página principal do chat
 * Layout responsivo:
 * - Desktop (md+): duas colunas (lista + chat)
 * - Mobile (< md): uma tela por vez (lista OU chat)
 */

'use client'

import { useState, useEffect } from 'react'
import { ConversationList } from '@/ui/chat/components/ConversationList'
import { MessageList } from '@/ui/chat/components/MessageList'
import { MessageInput } from '@/ui/chat/components/MessageInput'
import { useChatStore } from '@/ui/chat/store/chatStore'
import { useAuthStore } from '@/ui/chat/store/authStore'
import { useUserStore } from '@/ui/chat/store/userStore'
import { UserProvider, useCurrentUser } from '@/ui/chat/contexts/UserContext'
import { isAllowedOrigin } from '@/ui/chat/utils/origin'

type MobileView = 'list' | 'chat'

function ChatPageContent() {
  const { 
    activeConversationId, 
    conversations, 
    setActiveConversation, 
    startPolling, 
    stopPolling,
    startConversationPolling,
    stopConversationPolling,
  } = useChatStore()
  const { token, setToken } = useAuthStore()
  const { setUserId } = useUserStore()
  const currentUserId = useCurrentUser()
  const [mobileView, setMobileView] = useState<MobileView>('list')

  // Sincroniza userId do contexto com o store
  useEffect(() => {
    setUserId(currentUserId)
  }, [currentUserId, setUserId])

  // Captura token via querystring
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const tokenFromQuery = params.get('token')
    if (tokenFromQuery) {
      setToken(tokenFromQuery)
    }
  }, [setToken])

  // Captura token via postMessage (iframe)
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleMessage = (event: MessageEvent) => {
      // Valida origem (allowlist)
      if (!isAllowedOrigin(event.origin)) {
        console.warn('Origem não permitida:', event.origin)
        return
      }

      // Espera mensagem do tipo CHAT_AUTH_TOKEN
      if (event.data?.type === 'CHAT_AUTH_TOKEN' && event.data?.token) {
        setToken(event.data.token)
      }
    }

    window.addEventListener('message', handleMessage)
    return () => {
      window.removeEventListener('message', handleMessage)
    }
  }, [setToken])

  // Inicia polling de conversas quando há token
  useEffect(() => {
    if (token) {
      startConversationPolling()
    } else {
      stopConversationPolling()
    }

    return () => {
      stopConversationPolling()
    }
  }, [token, startConversationPolling, stopConversationPolling])

  // Inicia polling de mensagens quando há token e conversa ativa
  useEffect(() => {
    if (token && activeConversationId) {
      startPolling(activeConversationId)
    } else {
      stopPolling()
    }

    return () => {
      stopPolling()
    }
  }, [token, activeConversationId, startPolling, stopPolling])

  const activeConversation = conversations.find(
    (c) => c.id === activeConversationId
  )
  const otherParticipant = activeConversation?.participants.find(
    (p) => p.id !== currentUserId
  )

  // Sincroniza mobileView com activeConversationId
  useEffect(() => {
    if (activeConversationId) {
      setMobileView('chat')
    }
  }, [activeConversationId])

  // Handler para selecionar conversa no mobile
  const handleConversationSelect = (conversationId: string) => {
    setActiveConversation(conversationId)
    setMobileView('chat')
  }

  // Handler para voltar à lista no mobile
  const handleBackToList = () => {
    setMobileView('list')
  }

  // Sem token, não conseguimos chamar /api/chat/* (chatApi exige Authorization).
  // Mantemos o componente montado para permitir que o token chegue via querystring/postMessage.
  if (!token) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100 px-6">
        <div className="max-w-md w-full bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h1 className="text-lg font-semibold text-gray-900 mb-2">Sem autenticação</h1>
          <p className="text-sm text-gray-600 mb-4">
            Para carregar conversas/mensagens, abra com{' '}
            <code className="px-1 py-0.5 bg-gray-100 rounded">?token=...</code> ou envie via{' '}
            <code className="px-1 py-0.5 bg-gray-100 rounded">postMessage</code> (iframe).
          </p>
          <div className="text-xs text-gray-500">
            Exemplo: <code className="px-1 py-0.5 bg-gray-100 rounded">/chat?token=dev</code>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      <div className="flex-1 flex overflow-hidden">
        {/* Lista de Conversas */}
        {/* Desktop: sempre visível | Mobile: visível apenas quando mobileView === 'list' */}
        <div className={`${mobileView === 'list' ? 'flex' : 'hidden'} md:flex w-full md:w-80 bg-white border-r border-gray-200 flex-col`}>
          <ConversationList onConversationSelect={handleConversationSelect} />
        </div>

        {/* Área de Mensagens */}
        {/* Desktop: sempre visível | Mobile: visível apenas quando mobileView === 'chat' */}
        <div className={`${mobileView === 'chat' ? 'flex' : 'hidden'} md:flex flex-1 flex-col bg-white`}>
          {activeConversationId ? (
            <>
              {/* Header da Conversa */}
              <div className="h-16 bg-white border-b border-gray-200 flex items-center px-4 md:px-5 shadow-sm">
                {/* Botão Voltar (mobile apenas) */}
                <button
                  onClick={handleBackToList}
                  className="md:hidden mr-3 p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                  aria-label="Voltar para lista de conversas"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </button>

                {/* Nome/Info do contato */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {otherParticipant && (
                    <>
                      {/* Avatar (mobile) */}
                      <div className="md:hidden w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                        <span className="text-white text-xs font-medium">
                          {otherParticipant.name?.[0]?.toUpperCase() || '?'}
                        </span>
                      </div>
                      <h2 className="text-base font-semibold text-gray-900 truncate">
                        {otherParticipant.name || 'Conversa'}
                      </h2>
                    </>
                  )}
                  {!otherParticipant && (
                    <h2 className="text-base font-semibold text-gray-900">
                      Conversa
                    </h2>
                  )}
                </div>
              </div>

              {/* Lista de Mensagens */}
              <MessageList conversationId={activeConversationId} />

              {/* Input de Mensagem */}
              <MessageInput conversationId={activeConversationId} />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-[#f8f9fa]">
              <div className="text-center">
                <p className="text-gray-500 text-base font-medium mb-1.5">
                  Selecione uma conversa
                </p>
                <p className="text-gray-400 text-sm hidden md:block">
                  Escolha uma conversa da lista ao lado para começar
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ChatPage() {
  // TODO: Em produção, userId virá do token JWT decodificado ou do backend
  // Por enquanto, usa 'me' como default (compatibilidade)
  // Em produção: const userId = decodeToken(token)?.userId || 'unknown'
  const defaultUserId = 'me'

  return (
    <UserProvider userId={defaultUserId}>
      <ChatPageContent />
    </UserProvider>
  )
}