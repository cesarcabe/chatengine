import { MessageRepository } from '../ports/MessageRepository'
import { MessageNotFoundError } from './errors'

export type FetchMessageContextInput = {
  workspaceId: string
  messageId: string
  userId?: string
}

export type MessageContextDTO = {
  message_id: string
  conversation_id: string
  workspace_id: string
  direction: 'inbound' | 'outbound'
  provider: string
  type: 'text' | 'image' | 'audio' | 'document'
  status: 'sent' | 'delivered' | 'read' | 'failed' | 'pending'
  has_attachments: boolean
  is_reply: boolean
  created_at: string
}

export type FetchMessageContextDeps = {
  messageRepository: MessageRepository
}

function resolveDirection(senderId: string, userId?: string): 'inbound' | 'outbound' {
  if (!senderId) return 'inbound'
  if (senderId === 'me' || senderId === 'system') return 'outbound'
  if (userId && senderId === userId) return 'outbound'
  return 'inbound'
}

function mapType(type: string): MessageContextDTO['type'] {
  if (type === 'file') return 'document'
  if (type === 'image' || type === 'audio') return type
  return 'text'
}

export async function fetchMessageContext(
  deps: FetchMessageContextDeps,
  input: FetchMessageContextInput
): Promise<MessageContextDTO> {
  const { workspaceId, messageId, userId } = input
  if (!messageId) {
    throw new MessageNotFoundError('message_id inválido')
  }

  const message = await deps.messageRepository.findById(workspaceId, messageId)
  if (!message) {
    throw new MessageNotFoundError()
  }

  const provider = message.metadata?.providerMessageId ? 'evolution' : 'unknown'

  return {
    message_id: message.id,
    conversation_id: message.conversationId,
    workspace_id: message.workspaceId,
    direction: resolveDirection(message.senderId, userId),
    provider,
    type: mapType(message.type),
    status: message.status,
    has_attachments: Boolean(message.attachments && message.attachments.length > 0),
    is_reply: Boolean(message.replyToMessageId),
    created_at: message.createdAt.toISOString(),
  }
}
