/**
 * In-Memory Message Repository
 * 
 * Implementação em memória do MessageRepository
 * Usa Map para armazenamento temporário (desenvolvimento)
 * Em produção, seria substituído por DatabaseMessageRepository
 */

import { MessageRepository } from '../../../application/ports/MessageRepository'
import { Message, MessageStatus } from '../../../domain/Message'
import { storage } from '../../api/storage'

export class InMemoryMessageRepository implements MessageRepository {
  async findByConversationId(
    workspaceId: string,
    conversationId: string,
    since?: Date,
    limit?: number
  ): Promise<Message[]> {
    const workspaceMessages = storage.getWorkspaceMessages(workspaceId)
    let messages = workspaceMessages.get(conversationId) || []

    // Filtra por timestamp se fornecido (para polling)
    if (since) {
      messages = messages.filter((msg) => msg.createdAt > since)
    }

    // Ordena por data (mais antigas primeiro)
    messages.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())

    if (limit) {
      messages = messages.slice(0, limit)
    }

    return messages
  }

  async findById(workspaceId: string, messageId: string): Promise<Message | null> {
    const workspaceMessages = storage.getWorkspaceMessages(workspaceId)
    for (const messages of Array.from(workspaceMessages.values())) {
      const message = messages.find((m) => m.id === messageId)
      if (message) return message
    }
    return null
  }

  async save(message: Message): Promise<void> {
    const workspaceMessages = storage.getWorkspaceMessages(message.workspaceId)
    const conversationMessages = workspaceMessages.get(message.conversationId) || []
    conversationMessages.push(message)
    workspaceMessages.set(message.conversationId, conversationMessages)
  }

  async updateStatus(
    workspaceId: string,
    messageId: string,
    status: MessageStatus
  ): Promise<void> {
    const workspaceMessages = storage.getWorkspaceMessages(workspaceId)
    for (const messages of Array.from(workspaceMessages.values())) {
      const message = messages.find((m) => m.id === messageId)
      if (message) {
        message.status = status
        return
      }
    }
    throw new Error(`Message ${messageId} not found`)
  }

  async update(
    workspaceId: string,
    messageId: string,
    updates: Partial<Message>
  ): Promise<void> {
    const workspaceMessages = storage.getWorkspaceMessages(workspaceId)
    for (const messages of Array.from(workspaceMessages.values())) {
      const messageIndex = messages.findIndex((m) => m.id === messageId)
      if (messageIndex !== -1) {
        messages[messageIndex] = { ...messages[messageIndex], ...updates }
        return
      }
    }
    throw new Error(`Message ${messageId} not found`)
  }

  async findByProviderMessageId(
    workspaceId: string,
    providerMessageId: string
  ): Promise<Message | null> {
    const workspaceMessages = storage.getWorkspaceMessages(workspaceId)
    for (const messages of Array.from(workspaceMessages.values())) {
      const message = messages.find(
        (m) => m.metadata?.providerMessageId === providerMessageId
      )
      if (message) return message
    }
    return null
  }
}
