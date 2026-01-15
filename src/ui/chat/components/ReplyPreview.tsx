/**
 * ReplyPreview Component
 * 
 * Preview da mensagem que está sendo respondida
 * Aparece acima do input quando uma mensagem é selecionada para reply
 */

'use client'

import { useChatStore } from '../store/chatStore'
import { useCurrentUser } from '../contexts/UserContext'
import { Message } from '@/modules/chatengine/domain/Message'

export function ReplyPreview() {
  const { replyToMessage, setReplyToMessage } = useChatStore()
  const currentUserId = useCurrentUser()

  if (!replyToMessage) return null

  return (
    <div className="px-5 py-3 bg-blue-50/50 border-l-4 border-blue-400 flex items-center justify-between">
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-blue-700 mb-1">
          Respondendo para {replyToMessage.senderId === currentUserId ? 'Você' : 'Mensagem'}
        </div>
        <div className="text-sm text-gray-700 truncate leading-relaxed">{replyToMessage.content}</div>
      </div>
      <button
        onClick={() => setReplyToMessage(null)}
        className="ml-3 text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-full"
        aria-label="Cancelar reply"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
