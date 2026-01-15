/**
 * Message Domain Model
 * 
 * Representa uma mensagem individual dentro de uma conversa
 * Suporta diferentes tipos de mídia e status de entrega
 */

import { Attachment } from './Attachment'

export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'file'

export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed'

export interface MessageMetadata {
  providerMessageId?: string // ID da mensagem no provedor (Evolution, Cloud API, etc)
  [key: string]: any // Permite campos adicionais para extensibilidade
}

export interface Message {
  id: string
  workspaceId: string
  conversationId: string
  senderId: string
  type: MessageType
  content: string
  replyToMessageId?: string
  status: MessageStatus
  attachments?: Attachment[]
  metadata?: MessageMetadata
  createdAt: Date
  updatedAt?: Date
}