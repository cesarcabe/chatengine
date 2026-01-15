import { MessageStatus } from '../../domain/Message'

export interface MessageStatusRepository {
  upsertPendingStatus(
    workspaceId: string,
    provider: string,
    externalMessageId: string,
    status: MessageStatus
  ): Promise<void>

  getPendingStatus(
    workspaceId: string,
    provider: string,
    externalMessageId: string
  ): Promise<MessageStatus | null>

  deletePendingStatus(
    workspaceId: string,
    provider: string,
    externalMessageId: string
  ): Promise<void>
}
