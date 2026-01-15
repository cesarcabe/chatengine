import { MessageStatus } from '../../../domain/Message'
import { MessageStatusRepository } from '../../../application/ports/MessageStatusRepository'

type PendingStatusKey = string

export class InMemoryMessageStatusRepository implements MessageStatusRepository {
  private pending = new Map<PendingStatusKey, MessageStatus>()

  private buildKey(workspaceId: string, provider: string, externalMessageId: string) {
    return `${workspaceId}:${provider}:${externalMessageId}`
  }

  async upsertPendingStatus(
    workspaceId: string,
    provider: string,
    externalMessageId: string,
    status: MessageStatus
  ): Promise<void> {
    const key = this.buildKey(workspaceId, provider, externalMessageId)
    this.pending.set(key, status)
  }

  async getPendingStatus(
    workspaceId: string,
    provider: string,
    externalMessageId: string
  ): Promise<MessageStatus | null> {
    const key = this.buildKey(workspaceId, provider, externalMessageId)
    return this.pending.get(key) || null
  }

  async deletePendingStatus(
    workspaceId: string,
    provider: string,
    externalMessageId: string
  ): Promise<void> {
    const key = this.buildKey(workspaceId, provider, externalMessageId)
    this.pending.delete(key)
  }
}
