import { OutboxRepository } from '../ports/OutboxRepository'
import { MessageRepository } from '../ports/MessageRepository'
import { WhatsAppProvider } from '../ports/whatsappProvider'
import { MediaStorage } from '../ports/MediaStorage'

const MAX_ATTEMPTS = Number(process.env.OUTBOX_MAX_ATTEMPTS || '5')

function computeBackoff(attempt: number): number {
  const base = Number(process.env.OUTBOX_BACKOFF_BASE_SECONDS || '5')
  const max = Number(process.env.OUTBOX_BACKOFF_MAX_SECONDS || '300')
  const delay = Math.min(base * 2 ** Math.max(0, attempt - 1), max)
  return delay * 1000
}

export type ProcessOutboxDeps = {
  outboxRepository: OutboxRepository
  messageRepository: MessageRepository
  whatsAppProvider: WhatsAppProvider
  mediaStorage: MediaStorage
}

export async function processOutboxBatch(deps: ProcessOutboxDeps, limit = 10) {
  // Outbox: retries com backoff exponencial e limite de tentativas.
  const items = await deps.outboxRepository.claimPending(limit)
  let processed = 0
  let sent = 0
  let failed = 0

  for (const item of items) {
    processed += 1
    try {
      const payload = item.payload || {}
      const type = payload.type as 'text' | 'image' | 'video' | 'audio' | 'file'
      const to = payload.to

      if (!to || !type) {
        throw new Error('payload_invalido')
      }

      let providerMessageId: string | undefined
      const replyMessageId = payload.replyMessageId as string | undefined

      if (type === 'text') {
        const result = await deps.whatsAppProvider.sendText(to, payload.text || '', {
          replyMessageId,
        })
        providerMessageId = result.providerMessageId
      } else {
        const mediaUrl = payload.mediaPath
          ? await deps.mediaStorage.getSignedUrl(payload.mediaPath)
          : payload.mediaUrl

        const result = await deps.whatsAppProvider.sendMedia(
          to,
          mediaUrl,
          type,
          payload.caption || undefined,
          {
            replyMessageId,
          }
        )
        providerMessageId = result.providerMessageId
      }

      if (providerMessageId) {
        await deps.messageRepository.update(item.workspaceId, item.messageId, {
          status: 'sent',
          metadata: {
            providerMessageId,
          },
        })
      } else {
        await deps.messageRepository.update(item.workspaceId, item.messageId, {
          status: 'sent',
        })
      }

      await deps.outboxRepository.markSent(item.id)
      sent += 1
    } catch (error) {
      const attempts = item.attempts + 1
      const reason = error instanceof Error ? error.message : 'erro_envio'

      if (attempts >= MAX_ATTEMPTS) {
        await deps.outboxRepository.markPermanentFailure(item.id, reason)
        await deps.messageRepository.update(item.workspaceId, item.messageId, {
          status: 'failed',
        })
        failed += 1
        continue
      }

      const nextRetryAt = new Date(Date.now() + computeBackoff(attempts))
      await deps.outboxRepository.markFailed(item.id, attempts, nextRetryAt, reason)
    }
  }

  return { processed, sent, failed }
}
