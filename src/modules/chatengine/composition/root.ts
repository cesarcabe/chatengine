import {
  SupabaseConversationRepository,
  SupabaseMessageRepository,
  SupabaseMessageStatusRepository,
  SupabaseOutboxRepository,
} from '../infrastructure/repositories'
import { EvolutionWhatsAppProvider } from '../infrastructure/providers/EvolutionWhatsAppProvider'
import { listConversations } from '../application/use-cases/listConversations'
import { listMessages } from '../application/use-cases/listMessages'
import { sendMessage } from '../application/use-cases/sendMessage'
import { updateMessageStatus } from '../application/use-cases/updateMessageStatus'
import { processEvolutionWebhookEvent } from '../application/use-cases/processEvolutionWebhookEvent'
import { processOutboxBatch } from '../application/use-cases/processOutbox'
import { fetchMessageContext } from '../application/use-cases/fetchMessageContext'
import { SupabaseMediaStorage } from '../infrastructure/media/SupabaseMediaStorage'
import { initStorage } from '../infrastructure/api/storage'

let storageInitialized = false
if (!storageInitialized) {
  initStorage()
  storageInitialized = true
}

const repositories = {
  conversationRepository: new SupabaseConversationRepository(),
  messageRepository: new SupabaseMessageRepository(),
  messageStatusRepository: new SupabaseMessageStatusRepository(),
  outboxRepository: new SupabaseOutboxRepository(),
}

const providers = {
  whatsAppProvider: new EvolutionWhatsAppProvider(),
}

const mediaStorage = new SupabaseMediaStorage()

const useCases = {
  listConversations: (input: Parameters<typeof listConversations>[1]) =>
    listConversations({ conversationRepository: repositories.conversationRepository }, input),
  listMessages: (input: Parameters<typeof listMessages>[1]) =>
    listMessages({ messageRepository: repositories.messageRepository }, input),
  sendMessage: (input: Parameters<typeof sendMessage>[1]) =>
    sendMessage(
      {
        messageRepository: repositories.messageRepository,
        conversationRepository: repositories.conversationRepository,
        outboxRepository: repositories.outboxRepository,
        mediaStorage,
      },
      input
    ),
  updateMessageStatus: (input: Parameters<typeof updateMessageStatus>[1]) =>
    updateMessageStatus(
      {
        messageRepository: repositories.messageRepository,
        messageStatusRepository: repositories.messageStatusRepository,
      },
      input
    ),
  processEvolutionWebhookEvent: (input: Parameters<typeof processEvolutionWebhookEvent>[1]) =>
    processEvolutionWebhookEvent(
      {
        messageRepository: repositories.messageRepository,
        conversationRepository: repositories.conversationRepository,
        messageStatusRepository: repositories.messageStatusRepository,
      },
      input
    ),
  processOutboxBatch: (limit?: number) =>
    processOutboxBatch(
      {
        outboxRepository: repositories.outboxRepository,
        messageRepository: repositories.messageRepository,
        whatsAppProvider: providers.whatsAppProvider,
        mediaStorage,
      },
      limit
    ),
  fetchMessageContext: (input: Parameters<typeof fetchMessageContext>[1]) =>
    fetchMessageContext(
      {
        messageRepository: repositories.messageRepository,
      },
      input
    ),
}

export const chatEngine = {
  repositories,
  providers,
  mediaStorage,
  useCases,
}
