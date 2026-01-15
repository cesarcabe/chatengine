/**
 * Evolution Webhook Utilities
 * 
 * Utilitários para processar webhooks da Evolution API
 * Converte payloads da Evolution em objetos do domínio
 */

import { Message, MessageType, MessageStatus } from '../domain/Message'
import { normalizeJid, extractPhoneFromJid } from '../domain/utils/normalizeJid'

/**
 * Tipos de eventos da Evolution API
 */
export type EvolutionEventType = 'message.upsert' | 'message.update' | 'connection.update' | 'messages.upsert'

/**
 * Interface para payload de mensagem recebida (message.upsert)
 */
interface EvolutionMessageUpsertPayload {
  event: 'message.upsert'
  instance: string
  data: {
    key: {
      remoteJid: string
      fromMe: boolean
      id: string
    }
    message: {
      conversation?: string
      extendedTextMessage?: {
        text: string
      }
      imageMessage?: {
        caption?: string
        mimetype?: string
        url?: string
      }
      videoMessage?: {
        caption?: string
        mimetype?: string
        url?: string
      }
      audioMessage?: {
        mimetype?: string
        url?: string
      }
      documentMessage?: {
        caption?: string
        mimetype?: string
        url?: string
        fileName?: string
      }
    }
    messageTimestamp: number
  }
}

/**
 * Interface para payload de atualização de status (message.update)
 */
interface EvolutionMessageUpdatePayload {
  event: 'message.update'
  instance: string
  data: {
    key: {
      remoteJid: string
      fromMe: boolean
      id: string
    }
    update: {
      status: number // 1 = sent, 2 = delivered, 3 = read
    }
  }
}

/**
 * Converte payload de message.upsert em Message do domínio
 */
export function convertMessageUpsertToMessage(
  payload: EvolutionMessageUpsertPayload,
  workspaceId: string,
  currentUserId: string
): Message | null {
  try {
    const { key, message, messageTimestamp } = payload.data

    // Ignora mensagens enviadas por nós (já estão no sistema)
    if (key.fromMe) {
      return null
    }

    const remoteJid = normalizeJid(key.remoteJid)
    const messageId = key.id
    const timestamp = messageTimestamp ? new Date(messageTimestamp * 1000) : new Date()

    // Determina tipo e conteúdo da mensagem
    let type: MessageType = 'text'
    let content = ''

    if (message.conversation) {
      type = 'text'
      content = message.conversation
    } else if (message.extendedTextMessage) {
      type = 'text'
      content = message.extendedTextMessage.text
    } else if (message.imageMessage) {
      type = 'image'
      content = message.imageMessage.caption || ''
      // TODO: Processar URL da imagem
    } else if (message.videoMessage) {
      type = 'video'
      content = message.videoMessage.caption || ''
      // TODO: Processar URL do vídeo
    } else if (message.audioMessage) {
      type = 'audio'
      content = ''
      // TODO: Processar URL do áudio
    } else if (message.documentMessage) {
      type = 'file'
      content = message.documentMessage.caption || ''
      // TODO: Processar URL do documento
    }

    if (!content && type === 'text') {
      return null // Ignora mensagens vazias
    }

    const domainMessage: Message = {
      id: `evo-${messageId}`,
      workspaceId,
      conversationId: remoteJid,
      senderId: extractPhoneFromJid(remoteJid), // Usa número como senderId
      type,
      content,
      status: 'delivered', // Mensagens recebidas vêm como delivered
      metadata: {
        providerMessageId: messageId,
      },
      createdAt: timestamp,
    }

    return domainMessage
  } catch (error) {
    console.error('Erro ao converter message.upsert:', error)
    return null
  }
}

/**
 * Extrai informações de atualização de status de message.update
 */
export function extractStatusUpdate(
  payload: EvolutionMessageUpdatePayload
): { providerMessageId: string; status: MessageStatus } | null {
  try {
    const { key, update } = payload.data
    const providerMessageId = key.id

    // Mapeia status da Evolution (1=sent, 2=delivered, 3=read)
    let status: MessageStatus = 'sent'
    if (update.status === 2) {
      status = 'delivered'
    } else if (update.status === 3) {
      status = 'read'
    } else if (update.status === 1) {
      status = 'sent'
    }

    return {
      providerMessageId,
      status,
    }
  } catch (error) {
    console.error('Erro ao extrair status update:', error)
    return null
  }
}
