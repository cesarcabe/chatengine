import { OutboxRepository } from '../ports/OutboxRepository'
import { MessageRepository } from '../ports/MessageRepository'
import { ConversationRepository } from '../ports/ConversationRepository'
import { WhatsAppProvider } from '../ports/whatsappProvider'
import { MediaStorage } from '../ports/MediaStorage'
import { findEvolutionInstanceByWhatsappNumberId } from '../../infrastructure/repositories/whatsappNumbersRepository'

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
  conversationRepository: ConversationRepository
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

      // Busca a mensagem para obter conversationId
      const message = await deps.messageRepository.findById(item.workspaceId, item.messageId)
      if (!message) {
        throw new Error('mensagem_nao_encontrada')
      }

      // Busca a conversa para obter whatsappNumberId
      const conversation = await deps.conversationRepository.findById(
        item.workspaceId,
        message.conversationId
      )
      
      let instanceName: string | undefined
      let apiKey: string | undefined

      // Se houver whatsappNumberId, busca instance_name e api_key do Supabase
      if (conversation?.whatsappNumberId) {
        const instanceData = await findEvolutionInstanceByWhatsappNumberId(conversation.whatsappNumberId)
        if (instanceData) {
          instanceName = instanceData.instanceName
          apiKey = instanceData.apiKey || undefined
        }
      }

      let providerMessageId: string | undefined
      const replyMessageId = payload.replyMessageId as string | undefined

      // Prepara opções com instance e apiKey dinâmicas (se encontradas)
      const providerOptions: { replyMessageId?: string; instance?: string; apiKey?: string } = {
        replyMessageId,
      }
      if (instanceName) {
        providerOptions.instance = instanceName
      }
      if (apiKey) {
        providerOptions.apiKey = apiKey
      }

      if (type === 'text') {
        const result = await deps.whatsAppProvider.sendText(to, payload.text || '', providerOptions)
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
          providerOptions
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
