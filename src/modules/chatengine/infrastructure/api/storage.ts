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

// Storage em memória (module-scope)
// Estrutura por workspace para evitar vazamento entre tenants.
const conversations = new Map<string, Map<string, Conversation>>()
const messages = new Map<string, Map<string, Message[]>>()
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

// Inicializa com dados mock
// Inicializa dados mock na primeira importação
if (conversations.size === 0) {
  initializeMockData()
}

export const storage = {
  conversations,
  messages,
  attachments,
  getWorkspaceConversations,
  getWorkspaceMessages,
}
