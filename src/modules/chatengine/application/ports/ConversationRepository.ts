/**
 * Conversation Repository Interface
 * 
 * Abstração para acesso a dados de conversas
 * Permite trocar implementação (in-memory → database) sem modificar rotas API
 */

import { Conversation } from '../../domain/Conversation'

export interface ConversationRepository {
  /**
   * Busca todas as conversas
   */
  findAll(workspaceId: string): Promise<Conversation[]>

  /**
   * Busca conversa por ID
   */
  findById(workspaceId: string, id: string): Promise<Conversation | null>

  /**
   * Salva uma nova conversa
   */
  save(conversation: Conversation): Promise<void>

  /**
   * Atualiza uma conversa existente
   */
  update(id: string, updates: Partial<Conversation>): Promise<void>
}
