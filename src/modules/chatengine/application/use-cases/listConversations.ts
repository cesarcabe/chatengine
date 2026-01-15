import { ConversationRepository } from '../ports/ConversationRepository'

export type ListConversationsInput = {
  workspaceId: string
}

export type ListConversationsDeps = {
  conversationRepository: ConversationRepository
}

export async function listConversations(
  deps: ListConversationsDeps,
  input: ListConversationsInput
) {
  const { workspaceId } = input
  const conversations = await deps.conversationRepository.findAll(workspaceId)
  conversations.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
  return conversations
}
