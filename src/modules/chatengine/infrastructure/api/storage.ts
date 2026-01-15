/**
 * In-Memory Storage
 * 
 * Storage temporário em memória para desenvolvimento
 * Em produção, seria substituído por banco de dados real
 */

import { Conversation } from '../../domain/Conversation'
import { Message } from '../../domain/Message'
import { Attachment } from '../../domain/Attachment'
import { initializeMockData } from './mockData'

export type InMemoryStorage = {
  conversations: Map<string, Map<string, Conversation>>
  messages: Map<string, Map<string, Message[]>>
  attachments: Map<string, Attachment>
  getWorkspaceConversations: (workspaceId: string) => Map<string, Conversation>
  getWorkspaceMessages: (workspaceId: string) => Map<string, Message[]>
}

function createWorkspaceMap<T>() {
  return new Map<string, Map<string, T>>()
}

export function createStorage(): InMemoryStorage {
  // Storage em memória (module-scope)
  // Estrutura por workspace para evitar vazamento entre tenants.
  const conversations = createWorkspaceMap<Conversation>()
  const messages = createWorkspaceMap<Message[]>()
  const attachments = new Map<string, Attachment>()

  function getWorkspaceConversations(workspaceId: string): Map<string, Conversation> {
    const existing = conversations.get(workspaceId)
    if (existing) return existing
    const created = new Map<string, Conversation>()
    conversations.set(workspaceId, created)
    return created
  }

  function getWorkspaceMessages(workspaceId: string): Map<string, Message[]> {
    const existing = messages.get(workspaceId)
    if (existing) return existing
    const created = new Map<string, Message[]>()
    messages.set(workspaceId, created)
    return created
  }

  return {
    conversations,
    messages,
    attachments,
    getWorkspaceConversations,
    getWorkspaceMessages,
  }
}

export const storage = createStorage()

export function initStorage(target: InMemoryStorage = storage) {
  if (target.conversations.size === 0) {
    initializeMockData(target)
  }
}
