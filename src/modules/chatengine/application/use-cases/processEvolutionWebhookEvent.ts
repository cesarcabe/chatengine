import { Message, MessageType, MessageStatus } from '../../domain/Message'
import { Conversation } from '../../domain/Conversation'
import { extractPhoneFromJid } from '../../domain/utils/normalizeJid'
import { resolveConversationOneToOne } from '../../domain/resolveConversationOneToOne'
import { DuplicateMessageError, InvalidPayloadError } from './errors'
import { updateMessageStatus } from './updateMessageStatus'
import { MessageRepository } from '../ports/MessageRepository'
import { ConversationRepository } from '../ports/ConversationRepository'
import { MessageStatusRepository } from '../ports/MessageStatusRepository'

export type ProcessEvolutionWebhookDeps = {
  messageRepository: MessageRepository
  conversationRepository: ConversationRepository
  messageStatusRepository: MessageStatusRepository
}

type ProcessEvolutionWebhookArgs = {
  payload: any
  workspaceId: string
  currentUserId: string
  whatsappNumberId?: string
}

function toDataUrl(mimeType: string | undefined, base64: string): string {
  if (base64.startsWith('data:')) return base64
  const mt = mimeType && mimeType.trim() ? mimeType : 'application/octet-stream'
  return `data:${mt};base64,${base64}`
}

function extractBase64FromMessage(obj: any): string | undefined {
  if (!obj || typeof obj !== 'object') return undefined
  return (
    obj.base64 ||
    obj.base64Data ||
    obj.mediaBase64 ||
    obj.fileBase64 ||
    obj.dataBase64 ||
    obj.media ||
    obj.file ||
    obj.body
  )
}

function buildMediaProxyUrl(providerMessageId: string, attachmentId: string): string {
  const pmid = encodeURIComponent(providerMessageId)
  const aid = encodeURIComponent(attachmentId)
  return `/api/chat/media?providerMessageId=${pmid}&attachmentId=${aid}`
}

export async function processEvolutionWebhookEvent(
  deps: ProcessEvolutionWebhookDeps,
  {
  payload,
  workspaceId,
  currentUserId,
  whatsappNumberId,
}: ProcessEvolutionWebhookArgs
): Promise<void> {
  const eventType = payload.event

  if (eventType === 'messages.upsert' || eventType === 'message.upsert') {
    const data = payload.data || payload
    const key = data?.key
    const message = data?.message || {}
    const messageTimestamp = data?.messageTimestamp || Math.floor(Date.now() / 1000)

    if (!key) {
      throw new InvalidPayloadError('Mensagem sem key')
    }

    const providerMessageId = key.id
    const remoteJid = key.remoteJid
    const fromMe = key.fromMe === true || key.fromMe === 'true'

    if (!providerMessageId || !remoteJid) {
      throw new InvalidPayloadError('Mensagem sem id ou remoteJid')
    }

    const { conversationId } = resolveConversationOneToOne({ remoteJid })

    const existingMessage = await deps.messageRepository.findByProviderMessageId(
      workspaceId,
      providerMessageId
    )
    if (existingMessage) {
      throw new DuplicateMessageError()
    }

    let type: MessageType = 'text'
    let content = ''
    let attachments: Message['attachments'] = undefined

    if (message.conversation) {
      type = 'text'
      content = message.conversation
    } else if (message.extendedTextMessage) {
      type = 'text'
      content = message.extendedTextMessage.text || ''
    } else if (message.imageMessage) {
      type = 'image'
      content = message.imageMessage.caption || ''
      const imageBase64 = extractBase64FromMessage(message.imageMessage)
      const evolutionSourceUrl = message.imageMessage.url
      const directPath = message.imageMessage.directPath

      const attachmentId = `att-${providerMessageId}-img`
      const imageUrl = imageBase64
        ? toDataUrl(message.imageMessage.mimetype, imageBase64)
        : buildMediaProxyUrl(providerMessageId, attachmentId)

      if (imageUrl) {
        attachments = [
          {
            id: attachmentId,
            messageId: '',
            type: 'image',
            url: imageUrl,
            thumbnailUrl: message.imageMessage.jpegThumbnail
              ? toDataUrl('image/jpeg', message.imageMessage.jpegThumbnail)
              : undefined,
            metadata: {
              filename: message.imageMessage.fileName,
              mimeType: message.imageMessage.mimetype,
              size: message.imageMessage.fileLength,
              evolutionSourceUrl,
              directPath,
            },
          },
        ]
      }
    } else if (message.videoMessage) {
      type = 'video'
      content = message.videoMessage.caption || ''
      const videoBase64 = extractBase64FromMessage(message.videoMessage)
      const evolutionSourceUrl = message.videoMessage.url
      const directPath = message.videoMessage.directPath

      const attachmentId = `att-${providerMessageId}-vid`
      const videoUrl = videoBase64
        ? toDataUrl(message.videoMessage.mimetype, videoBase64)
        : buildMediaProxyUrl(providerMessageId, attachmentId)

      if (videoUrl) {
        attachments = [
          {
            id: attachmentId,
            messageId: '',
            type: 'video',
            url: videoUrl,
            thumbnailUrl: message.videoMessage.jpegThumbnail
              ? toDataUrl('image/jpeg', message.videoMessage.jpegThumbnail)
              : undefined,
            metadata: {
              filename: message.videoMessage.fileName,
              mimeType: message.videoMessage.mimetype,
              size: message.videoMessage.fileLength,
              duration: message.videoMessage.seconds,
              evolutionSourceUrl,
              directPath,
            },
          },
        ]
      }
    } else if (message.audioMessage) {
      type = 'audio'
      content = ''
      const audioBase64 = extractBase64FromMessage(message.audioMessage)
      const evolutionSourceUrl = message.audioMessage.url
      const directPath = message.audioMessage.directPath

      const attachmentId = `att-${providerMessageId}-aud`
      const audioUrl = audioBase64
        ? toDataUrl(message.audioMessage.mimetype, audioBase64)
        : buildMediaProxyUrl(providerMessageId, attachmentId)

      if (audioUrl) {
        attachments = [
          {
            id: attachmentId,
            messageId: '',
            type: 'audio',
            url: audioUrl,
            metadata: {
              mimeType: message.audioMessage.mimetype,
              size: message.audioMessage.fileLength,
              duration: message.audioMessage.seconds,
              evolutionSourceUrl,
              directPath,
            },
          },
        ]
      }
    } else if (message.documentMessage) {
      type = 'file'
      content = message.documentMessage.caption || ''
      const docBase64 = extractBase64FromMessage(message.documentMessage)
      const evolutionSourceUrl = message.documentMessage.url
      const directPath = message.documentMessage.directPath

      const attachmentId = `att-${providerMessageId}-doc`
      const docUrl = docBase64
        ? toDataUrl(message.documentMessage.mimetype, docBase64)
        : buildMediaProxyUrl(providerMessageId, attachmentId)

      if (docUrl) {
        attachments = [
          {
            id: attachmentId,
            messageId: '',
            type: 'file',
            url: docUrl,
            metadata: {
              filename: message.documentMessage.fileName || 'documento',
              mimeType: message.documentMessage.mimetype,
              size: message.documentMessage.fileLength,
              evolutionSourceUrl,
              directPath,
            },
          },
        ]
      }
    }

    if (!content && !attachments) {
      return
    }

    const senderId = fromMe ? currentUserId : extractPhoneFromJid(remoteJid)
    const status: MessageStatus = fromMe ? 'sent' : 'delivered'
    const createdAt = new Date(messageTimestamp * 1000)
    const messageId = `evo-${providerMessageId}`

    if (attachments) {
      attachments = attachments.map((att) => ({
        ...att,
        messageId,
      }))
    }

    const domainMessage: Message = {
      id: messageId,
      workspaceId,
      conversationId,
      senderId,
      type,
      content,
      status,
      attachments,
      metadata: {
        providerMessageId,
      },
      createdAt,
    }

    await deps.messageRepository.save(domainMessage)

    const conversation = await deps.conversationRepository.findById(
      workspaceId,
      conversationId
    )

    if (conversation) {
      await deps.conversationRepository.update(conversationId, {
        workspaceId,
        lastMessage: {
          id: domainMessage.id,
          content: domainMessage.content || (attachments ? `[${type}]` : ''),
          senderId: domainMessage.senderId,
          createdAt: domainMessage.createdAt,
        },
        updatedAt: new Date(),
      })
    } else {
      const phoneNumber = extractPhoneFromJid(conversationId)
      const newConversation: Conversation = {
        id: conversationId,
        workspaceId,
        contactId: conversationId,
        whatsappNumberId: whatsappNumberId || payload?.instance || undefined,
        channel: 'whatsapp',
        participants: [
          {
            id: fromMe ? currentUserId : phoneNumber,
            name: fromMe ? 'Eu' : phoneNumber,
            avatar: undefined,
          },
          {
            id: fromMe ? phoneNumber : currentUserId,
            name: fromMe ? phoneNumber : 'Eu',
            avatar: undefined,
          },
        ],
        lastMessage: {
          id: domainMessage.id,
          content: domainMessage.content || (attachments ? `[${type}]` : ''),
          senderId: domainMessage.senderId,
          createdAt: domainMessage.createdAt,
        },
        updatedAt: new Date(),
      }
      await deps.conversationRepository.save(newConversation)
    }

    return
  }

  if (eventType === 'messages.update' || eventType === 'message.update') {
    const data = payload.data || payload
    const providerMessageId = data?.keyId || data?.key?.id
    const statusUpdate = data?.status || data?.update?.status

    if (!providerMessageId || statusUpdate === undefined) {
      throw new InvalidPayloadError('Status sem keyId ou status')
    }

    let status: MessageStatus = 'sent'
    if (typeof statusUpdate === 'string') {
      if (statusUpdate === 'DELIVERY_ACK' || statusUpdate === 'DELIVERED') {
        status = 'delivered'
      } else if (statusUpdate === 'READ' || statusUpdate === 'READED') {
        status = 'read'
      } else if (statusUpdate === 'SERVER_ACK' || statusUpdate === 'SENT') {
        status = 'sent'
      }
    } else if (typeof statusUpdate === 'number') {
      if (statusUpdate === 2) {
        status = 'delivered'
      } else if (statusUpdate === 3) {
        status = 'read'
      } else if (statusUpdate === 1) {
        status = 'sent'
      }
    }

    await updateMessageStatus(
      {
        messageRepository: deps.messageRepository,
        messageStatusRepository: deps.messageStatusRepository,
      },
      {
        workspaceId,
        providerMessageId,
        status,
      }
    )
    return
  }
}
