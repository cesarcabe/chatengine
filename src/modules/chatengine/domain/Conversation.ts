/**
 * Conversation Domain Model
 * 
 * Representa uma conversa de chat, independente do canal (WhatsApp, Messenger, etc)
 * Não contém lógica de CRM ou automações, apenas dados estruturais da conversa
 */

export type Channel = 'whatsapp' | 'messenger' | 'telegram' | 'web'

export interface Participant {
  id: string
  name: string
  avatar?: string
}

export interface Conversation {
  id: string
  workspaceId: string
  contactId?: string
  whatsappNumberId?: string
  channel: Channel
  participants: Participant[]
  lastMessage?: {
    id: string
    content: string
    senderId: string
    createdAt: Date
  }
  updatedAt: Date
}