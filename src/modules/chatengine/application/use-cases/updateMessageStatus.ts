import { MessageStatus } from '../../domain/Message'
import { MessageRepository } from '../ports/MessageRepository'
import { MessageStatusRepository } from '../ports/MessageStatusRepository'

export type UpdateMessageStatusInput = {
  workspaceId: string
  providerMessageId: string
  status: MessageStatus
}

export type UpdateMessageStatusDeps = {
  messageRepository: MessageRepository
  messageStatusRepository: MessageStatusRepository
}

export async function updateMessageStatus(
  deps: UpdateMessageStatusDeps,
  input: UpdateMessageStatusInput
) {
  const { workspaceId, providerMessageId, status } = input
  const existingMessage = await deps.messageRepository.findByProviderMessageId(
    workspaceId,
    providerMessageId
  )

  if (!existingMessage) {
    await deps.messageStatusRepository.upsertPendingStatus(
      workspaceId,
      'evolution',
      providerMessageId,
      status
    )
    return
  }

  await deps.messageRepository.updateStatus(workspaceId, existingMessage.id, status)
}
