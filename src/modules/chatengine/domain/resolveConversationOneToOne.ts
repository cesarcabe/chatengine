import { normalizeJid, extractPhoneFromJid } from './utils/normalizeJid'
import { conversationIdFromJid } from './utils/conversationId'

export type ResolveConversationInput = {
  remoteJid: string
}

export type ResolveConversationResult = {
  conversationId: string
  contactNumber: string
}

export function resolveConversationOneToOne({
  remoteJid,
}: ResolveConversationInput): ResolveConversationResult {
  const normalizedJid = normalizeJid(remoteJid)
  const conversationId = conversationIdFromJid(normalizedJid)
  const contactNumber = extractPhoneFromJid(conversationId)
  return { conversationId, contactNumber }
}
