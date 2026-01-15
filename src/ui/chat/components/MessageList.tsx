/**
 * MessageList Component
 * 
 * Lista de mensagens de uma conversa
 * Scroll automático para última mensagem
 */

'use client'

import { useEffect, useRef } from 'react'
import { useMessages } from '../hooks/useMessages'
import { MessageBubble } from './MessageBubble'
import { useChatStore } from '../store/chatStore'
import { useCurrentUser } from '../contexts/UserContext'

interface MessageListProps {
  conversationId: string | null
}

export function MessageList({ conversationId }: MessageListProps) {
  const { messages, isLoading } = useMessages(conversationId)
  const { activeConversationId } = useChatStore()
  const currentUserId = useCurrentUser()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  if (!conversationId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#f8f9fa]">
        <p className="text-sm text-gray-500">Selecione uma conversa para começar</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#f8f9fa]">
        <p className="text-sm text-gray-500">Carregando mensagens...</p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#f8f9fa] py-6">
      <div className="space-y-0.5">
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            isOwn={message.senderId === currentUserId}
          />
        ))}
      </div>
      <div ref={messagesEndRef} />
    </div>
  )
}