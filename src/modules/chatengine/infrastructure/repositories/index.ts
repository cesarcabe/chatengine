/**
 * Repositories Index
 * 
 * Exporta implementações de repositories (infraestrutura)
 */

export { SupabaseConversationRepository } from './SupabaseConversationRepository'
export { SupabaseMessageRepository } from './SupabaseMessageRepository'
export { SupabaseMessageStatusRepository } from './SupabaseMessageStatusRepository'
export { SupabaseOutboxRepository } from './SupabaseOutboxRepository'
export { InMemoryConversationRepository } from './in-memory/InMemoryConversationRepository'
export { InMemoryMessageRepository } from './in-memory/InMemoryMessageRepository'
export { InMemoryMessageStatusRepository } from './in-memory/InMemoryMessageStatusRepository'