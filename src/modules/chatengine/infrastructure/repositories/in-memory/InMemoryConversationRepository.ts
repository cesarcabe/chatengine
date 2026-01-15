/**
 * In-Memory Conversation Repository
 * 
 * Implementação em memória do ConversationRepository
 * Usa Map para armazenamento temporário (desenvolvimento)
 * Em produção, seria substituído por DatabaseConversationRepository
 */

import { ConversationRepository } from '../../../application/ports/ConversationRepository'
import { Conversation } from '../../../domain/Conversation'
import { storage } from '../../api/storage'

export class InMemoryConversationRepository implements ConversationRepository {
  async findAll(workspaceId: string): Promise<Conversation[]> {
    const workspaceConversations = storage.getWorkspaceConversations(workspaceId)
    return Array.from(workspaceConversations.values())
  }

  async findById(workspaceId: string, id: string): Promise<Conversation | null> {
    const workspaceConversations = storage.getWorkspaceConversations(workspaceId)
    return workspaceConversations.get(id) || null
  }

  async save(conversation: Conversation): Promise<void> {
    const workspaceConversations = storage.getWorkspaceConversations(conversation.workspaceId)
    workspaceConversations.set(conversation.id, conversation)
  }

  async update(id: string, updates: Partial<Conversation>): Promise<void> {
    const workspaceId = updates.workspaceId
    if (!workspaceId) {
      throw new Error('workspaceId é obrigatório para atualizar Conversation')
    }
    const workspaceConversations = storage.getWorkspaceConversations(workspaceId)
    const existing = workspaceConversations.get(id)
    if (!existing) {
      throw new Error(`Conversation ${id} not found`)
    }
    workspaceConversations.set(id, { ...existing, ...updates })
  }
}
