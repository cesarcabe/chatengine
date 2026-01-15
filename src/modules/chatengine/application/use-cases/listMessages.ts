import { MessageRepository } from '../ports/MessageRepository'
import { normalizeJid } from '../../domain/utils/normalizeJid'
import { resolveConversationOneToOne } from '../../domain/resolveConversationOneToOne'
import { InvalidRequestError } from './errors'

export type ListMessagesInput = {
  workspaceId: string
  conversationId: string
  since?: string | null
  limit?: number | null
}

export type ListMessagesDeps = {
  messageRepository: MessageRepository
}

export async function listMessages(deps: ListMessagesDeps, input: ListMessagesInput) {
  const { workspaceId, conversationId, since, limit } = input
  if (!conversationId) {
    throw new InvalidRequestError('conversationId é obrigatório')
  }

  const jid = normalizeJid(conversationId)
  const { conversationId: conversationKey } = resolveConversationOneToOne({ remoteJid: jid })
  const sinceDate = since ? new Date(since) : undefined

  const safeLimit = limit && limit > 0 ? Math.min(limit, 200) : 50

  return deps.messageRepository.findByConversationId(
    workspaceId,
    conversationKey,
    sinceDate,
    safeLimit
  )
}
