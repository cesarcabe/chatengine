import crypto from 'crypto'

export type WebhookEventStatus = 'received' | 'processed' | 'failed' | 'rejected' | 'duplicate'

export type WebhookEvent = {
  id: string
  provider: 'evolution'
  workspaceId?: string
  eventType?: string
  payloadRaw: unknown
  payloadHash: string
  idempotencyKey?: string
  receivedAt: Date
  status: WebhookEventStatus
  error?: string
}

const events = new Map<string, WebhookEvent>()
const idempotencyIndex = new Map<string, string>()

export function hashPayload(rawBody: string): string {
  return crypto.createHash('sha256').update(rawBody).digest('hex')
}

export function recordWebhookEvent(event: WebhookEvent): {
  event: WebhookEvent
  isDuplicate: boolean
} {
  const existingEventId = event.idempotencyKey
    ? idempotencyIndex.get(event.idempotencyKey)
    : undefined
  const isDuplicate = Boolean(existingEventId)
  const stored: WebhookEvent = {
    ...event,
    status: isDuplicate ? 'duplicate' : event.status,
  }

  events.set(event.id, stored)
  if (event.idempotencyKey && !existingEventId) {
    idempotencyIndex.set(event.idempotencyKey, event.id)
  }

  return { event: stored, isDuplicate }
}

export function updateWebhookEventStatus(
  eventId: string,
  status: WebhookEventStatus,
  error?: string
) {
  const existing = events.get(eventId)
  if (!existing) return
  events.set(eventId, {
    ...existing,
    status,
    error,
  })
}
