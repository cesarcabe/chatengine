/**
 * MessageBubble Component
 * 
 * Renderiza uma mensagem individual (bolha)
 * Suporta diferentes tipos e status
 * Renderiza corretamente cada tipo de mídia (imagem, vídeo, áudio, arquivo)
 */

'use client'

import { Message } from '@/modules/chatengine/domain/Message'
import { useChatStore } from '../store/chatStore'
import { useCurrentUser } from '../contexts/UserContext'
import { findRendererForAttachment } from './message-renderers'
import { TextMessageRenderer } from './message-renderers/TextMessageRenderer'

interface MessageBubbleProps {
  message: Message
  isOwn: boolean
  showReply?: boolean
}

export function MessageBubble({ message, isOwn, showReply = true }: MessageBubbleProps) {
  const { messagesByConversation, setReplyToMessage, conversations } = useChatStore()
  const currentUserId = useCurrentUser()

  const getReplyMessage = (replyToId?: string): Message | null => {
    if (!replyToId || !messagesByConversation[message.conversationId]) return null
    return messagesByConversation[message.conversationId].find((m) => m.id === replyToId) || null
  }

  const replyMessage = message.replyToMessageId ? getReplyMessage(message.replyToMessageId) : null

  const getStatusIcon = (status: Message['status']) => {
    switch (status) {
      case 'pending':
        return <span className="text-gray-400">⏱</span>
      case 'sent':
        return <span className="text-gray-400">✓</span>
      case 'delivered':
        return <span className="text-gray-400">✓✓</span>
      case 'read':
        return <span className="text-blue-500">✓✓</span>
      case 'failed':
        return <span className="text-red-500">✗</span>
      default:
        return null
    }
  }

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Obtém nome do remetente para mensagens recebidas
  const getSenderName = (): string | undefined => {
    if (isOwn) return undefined
    const conversation = conversations.find((c) => c.id === message.conversationId)
    const sender = conversation?.participants.find((p) => p.id === message.senderId)
    return sender?.name
  }

  // Renderiza conteúdo da mensagem baseado no tipo
  // Usa Strategy Pattern: delega renderização para o renderer apropriado
  const renderMessageContent = () => {
    // Se tem attachments, renderiza usando renderers
    if (message.attachments && message.attachments.length > 0) {
      return (
        <div className="space-y-2">
          {message.attachments.map((attachment) => {
            const renderer = findRendererForAttachment(attachment)
            
            if (renderer) {
              return (
                <div key={attachment.id}>
                  {renderer.render({
                    message,
                    attachment,
                    isOwn,
                    senderName: getSenderName(),
                  })}
                </div>
              )
            }

            // Fallback: se nenhum renderer encontrado, renderiza texto simples
            return (
              <div key={attachment.id} className="text-sm text-gray-500">
                Tipo de anexo não suportado: {attachment.type}
              </div>
            )
          })}
        </div>
      )
    }

    // Mensagem de texto simples (usa TextMessageRenderer)
    const textRenderer = new TextMessageRenderer()
    return textRenderer.render({ message, attachment: {} as any, isOwn })
  }

  if (isOwn) {
    return (
      <div className="flex justify-end mb-3 px-4">
        <div className="max-w-[65%]">
          {showReply && replyMessage && (
            <div className="mb-1.5 px-3 py-2 bg-white/30 backdrop-blur-sm rounded-lg text-xs border-l-2 border-white/50">
              <div className="font-medium text-white/90 mb-0.5 text-[11px]">
                {replyMessage.senderId === currentUserId ? 'Você' : 'Resposta'}
              </div>
              <div className="text-white/80 truncate leading-relaxed">{replyMessage.content}</div>
            </div>
          )}
          <div
            className={`inline-block px-3.5 py-2 rounded-2xl shadow-sm ${
              message.status === 'failed'
                ? 'bg-red-500'
                : 'bg-[#0ea5e9]'
            } text-white`}
          >
            {renderMessageContent()}
            <div className="flex items-center justify-end gap-1.5 mt-1.5 text-[11px] opacity-90">
              <span>{formatTime(message.createdAt)}</span>
              {getStatusIcon(message.status)}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-start mb-3 px-4">
      <div className="max-w-[65%]">
        {showReply && replyMessage && (
          <div className="mb-1.5 px-3 py-2 bg-gray-100 rounded-lg text-xs border-l-2 border-gray-300">
            <div className="font-medium text-gray-700 mb-0.5 text-[11px]">
              {replyMessage.senderId === currentUserId ? 'Você' : 'Resposta'}
            </div>
            <div className="text-gray-600 truncate leading-relaxed">{replyMessage.content}</div>
          </div>
        )}
        <div
          className="inline-block px-3.5 py-2 rounded-2xl bg-white text-gray-900 shadow-sm cursor-pointer hover:bg-gray-50 transition-colors border border-gray-100"
          onDoubleClick={() => setReplyToMessage(message)}
        >
          {renderMessageContent()}
          <div className="flex items-center justify-end gap-1 mt-1.5 text-[11px] text-gray-500">
            <span>{formatTime(message.createdAt)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

