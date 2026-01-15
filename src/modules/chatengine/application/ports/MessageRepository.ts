/**
 * Message Repository Interface
 * 
 * Abstração para acesso a dados de mensagens
 * Permite trocar implementação (in-memory → database) sem modificar rotas API
 */

import { Message, MessageStatus } from '../../domain/Message'

export interface MessageRepository {
  /**
   * Busca mensagens de uma conversa
   * Sempre deve filtrar por workspace para evitar vazamento entre tenants.
   * @param conversationId - ID da conversa
   * @param since - Opcional: busca apenas mensagens após esta data (para polling)
   */
  findByConversationId(
    workspaceId: string,
    conversationId: string,
    since?: Date,
    limit?: number
  ): Promise<Message[]>

  /**
   * Busca mensagem por ID
   */
  findById(workspaceId: string, messageId: string): Promise<Message | null>

  /**
   * Salva uma nova mensagem
   */
  save(message: Message): Promise<void>

  /**
   * Atualiza status de uma mensagem
   */
  updateStatus(workspaceId: string, messageId: string, status: MessageStatus): Promise<void>

  /**
   * Atualiza uma mensagem existente
   */
  update(workspaceId: string, messageId: string, updates: Partial<Message>): Promise<void>

  /**
   * Busca mensagem por providerMessageId (ID do provedor WhatsApp)
   */
  findByProviderMessageId(
    workspaceId: string,
    providerMessageId: string
  ): Promise<Message | null>
}
