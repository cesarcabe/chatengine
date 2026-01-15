export type OutboxStatus = 'pending' | 'processing' | 'sent' | 'failed'

export type OutboxEntry = {
  id: string
  workspaceId: string
  messageId: string
  provider: string
  payload: Record<string, any>
  status: OutboxStatus
  attempts: number
  nextRetryAt: Date
  lastError?: string
  createdAt: Date
  updatedAt: Date
}

export interface OutboxRepository {
  enqueue(entry: {
    workspaceId: string
    messageId: string
    provider: string
    payload: Record<string, any>
  }): Promise<OutboxEntry>

  claimPending(limit: number): Promise<OutboxEntry[]>

  markSent(outboxId: string): Promise<void>

  markFailed(
    outboxId: string,
    attempts: number,
    nextRetryAt: Date,
    lastError: string
  ): Promise<void>

  markPermanentFailure(outboxId: string, lastError: string): Promise<void>
}
