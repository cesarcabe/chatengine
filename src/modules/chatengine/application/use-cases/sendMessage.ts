import { Message, MessageType } from '../../domain/Message'
import { Conversation } from '../../domain/Conversation'
import { normalizeJid } from '../../domain/utils/normalizeJid'
import { resolveConversationOneToOne } from '../../domain/resolveConversationOneToOne'
import { ConversationRepository } from '../ports/ConversationRepository'
import { MessageRepository } from '../ports/MessageRepository'
import { OutboxRepository } from '../ports/OutboxRepository'
import { MediaStorage } from '../ports/MediaStorage'
import { InvalidRequestError } from './errors'

export type SendMessageInput = {
  workspaceId: string
  userId?: string
  conversationId: string
  whatsappNumberId?: string
  type: MessageType
  content: string
  replyToMessageId?: string
  attachments?: any[]
}

export type SendMessageResult = Message

export type SendMessageDeps = {
  messageRepository: MessageRepository
  conversationRepository: ConversationRepository
  outboxRepository: OutboxRepository
  mediaStorage: MediaStorage
}

export async function sendMessage(
  deps: SendMessageDeps,
  input: SendMessageInput
): Promise<SendMessageResult> {
  const { workspaceId, userId, conversationId, type, content, replyToMessageId, attachments } =
    input
  const { whatsappNumberId } = input

  if (!conversationId || !type || content === undefined) {
    throw new InvalidRequestError('conversationId, type e content são obrigatórios')
  }

  const jidToSend = normalizeJid(conversationId)
  const { conversationId: conversationKey } = resolveConversationOneToOne({
    remoteJid: jidToSend,
  })

  const status: Message['status'] = 'sent'

  if (type !== 'text' && (!attachments || attachments.length === 0)) {
    throw new InvalidRequestError('attachments são obrigatórios para mensagens de mídia')
  }

  const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

  const attachmentsWithMessageId = attachments?.map((att: any) => ({
    ...att,
    messageId,
  }))

  let replyProviderMessageId: string | undefined
  if (replyToMessageId) {
    const replyMessage = await deps.messageRepository.findById(
      workspaceId,
      replyToMessageId
    )
    if (!replyMessage || replyMessage.conversationId !== conversationKey) {
      throw new InvalidRequestError('reply_to_message_id inválido')
    }
    replyProviderMessageId = replyMessage.metadata?.providerMessageId
  }

  const newMessage: Message = {
    id: messageId,
    workspaceId,
    conversationId: conversationKey,
    senderId: userId || 'me',
    type,
    content,
    replyToMessageId,
    attachments: attachmentsWithMessageId,
    status,
    metadata: undefined,
    createdAt: new Date(),
  }

  await deps.messageRepository.save(newMessage)

  const firstAttachment = attachmentsWithMessageId?.[0]
  const mediaPath = firstAttachment?.metadata?.storagePath
  const mediaUrl =
    mediaPath && !firstAttachment?.url
      ? await deps.mediaStorage.getSignedUrl(mediaPath)
      : firstAttachment?.url

  await deps.outboxRepository.enqueue({
    workspaceId,
    messageId: newMessage.id,
    provider: 'evolution',
    payload: {
      type,
      to: jidToSend,
      text: type === 'text' ? content : undefined,
      mediaUrl: type !== 'text' ? mediaUrl : undefined,
      mediaPath: type !== 'text' ? mediaPath : undefined,
      caption: type !== 'text' ? content || undefined : undefined,
      replyMessageId: replyProviderMessageId,
    },
  })

  const conversation = await deps.conversationRepository.findById(
    workspaceId,
    conversationKey
  )
  if (conversation) {
    await deps.conversationRepository.update(conversationKey, {
      workspaceId,
      lastMessage: {
        id: newMessage.id,
        content: newMessage.content,
        senderId: newMessage.senderId,
        createdAt: newMessage.createdAt,
      },
      updatedAt: new Date(),
    })
  } else {
    const newConversation: Conversation = {
      id: conversationKey,
      workspaceId,
      contactId: conversationKey,
      whatsappNumberId,
      channel: 'whatsapp',
      participants: [{ id: userId || 'me', name: 'Eu', avatar: undefined }],
      lastMessage: {
        id: newMessage.id,
        content: newMessage.content,
        senderId: newMessage.senderId,
        createdAt: newMessage.createdAt,
      },
      updatedAt: new Date(),
    }
    await deps.conversationRepository.save(newConversation)
  }

  return newMessage
}
