import { Message } from '../../domain/Message'
import { MessageRepository } from '../../application/ports/MessageRepository'
import { supabase } from '../db/supabaseClient'
import { DuplicateMessageError, MessageNotFoundError } from '../../application/use-cases/errors'

const TABLE = process.env.SUPABASE_MESSAGES_TABLE || 'messages'
const STATUS_TABLE = process.env.SUPABASE_MESSAGE_STATUS_PENDING_TABLE || 'message_status_pending'
const PROVIDER = 'evolution'

function mapRowToMessage(row: any): Message {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    type: row.type,
    content: row.content || '',
    replyToMessageId: row.reply_to_message_id || undefined,
    status: row.status,
    attachments: row.attachments || undefined,
    metadata: row.metadata || undefined,
    createdAt: new Date(row.created_at),
    updatedAt: row.updated_at ? new Date(row.updated_at) : undefined,
  }
}

export class SupabaseMessageRepository implements MessageRepository {
  async findByConversationId(
    workspaceId: string,
    conversationId: string,
    since?: Date,
    limit?: number
  ): Promise<Message[]> {
    let query = supabase
      .from(TABLE)
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (since) {
      query = query.gt('created_at', since.toISOString())
    }

    if (limit) {
      query = query.limit(limit)
    }

    const { data, error } = await query

    if (error) {
      throw new Error('Erro ao buscar mensagens')
    }

    return (data || []).map(mapRowToMessage)
  }

  async findById(workspaceId: string, messageId: string): Promise<Message | null> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('id', messageId)
      .maybeSingle()

    if (error) {
      throw new Error('Erro ao buscar mensagem')
    }

    return data ? mapRowToMessage(data) : null
  }

  async save(message: Message): Promise<void> {
    const externalMessageId = message.metadata?.providerMessageId
    const provider = externalMessageId ? PROVIDER : null

    // Idempotência: unique constraint por workspace + provider + external_message_id
    const { error } = await supabase.from(TABLE).insert({
      id: message.id,
      workspace_id: message.workspaceId,
      conversation_id: message.conversationId,
      sender_id: message.senderId,
      type: message.type,
      content: message.content,
      reply_to_message_id: message.replyToMessageId || null,
      status: message.status,
      attachments: message.attachments || null,
      metadata: message.metadata || null,
      provider,
      external_message_id: externalMessageId || null,
      created_at: message.createdAt.toISOString(),
      updated_at: message.updatedAt ? message.updatedAt.toISOString() : null,
    })

    if (error) {
      if (error.code === '23505') {
        throw new DuplicateMessageError()
      }
      throw new Error('Erro ao salvar mensagem')
    }

    if (externalMessageId) {
      const { data: pending, error: pendingError } = await supabase
        .from(STATUS_TABLE)
        .select('status')
        .eq('workspace_id', message.workspaceId)
        .eq('provider', PROVIDER)
        .eq('external_message_id', externalMessageId)
        .maybeSingle()

      if (pendingError) {
        throw new Error('Erro ao reconciliar status pendente')
      }

      if (pending?.status) {
        await this.updateStatus(message.workspaceId, message.id, pending.status)
        await supabase
          .from(STATUS_TABLE)
          .delete()
          .eq('workspace_id', message.workspaceId)
          .eq('provider', PROVIDER)
          .eq('external_message_id', externalMessageId)
      }
    }
  }

  async updateStatus(
    workspaceId: string,
    messageId: string,
    status: Message['status']
  ): Promise<void> {
    const { data, error } = await supabase
      .from(TABLE)
      .update({ status })
      .eq('workspace_id', workspaceId)
      .eq('id', messageId)
      .select('id')

    if (error) {
      throw new Error('Erro ao atualizar status')
    }

    if (!data || data.length === 0) {
      throw new MessageNotFoundError()
    }
  }

  async update(
    workspaceId: string,
    messageId: string,
    updates: Partial<Message>
  ): Promise<void> {
    const providerMessageId = updates.metadata?.providerMessageId
    const payload: Record<string, any> = {
      conversation_id: updates.conversationId,
      sender_id: updates.senderId,
      type: updates.type,
      content: updates.content,
      reply_to_message_id: updates.replyToMessageId,
      status: updates.status,
      attachments: updates.attachments,
      metadata: updates.metadata,
      provider: providerMessageId ? PROVIDER : undefined,
      external_message_id: providerMessageId,
      updated_at: updates.updatedAt ? updates.updatedAt.toISOString() : new Date().toISOString(),
    }

    Object.keys(payload).forEach((key) => {
      if (payload[key] === undefined) delete payload[key]
    })

    const { error } = await supabase
      .from(TABLE)
      .update(payload)
      .eq('workspace_id', workspaceId)
      .eq('id', messageId)

    if (error) {
      throw new Error('Erro ao atualizar mensagem')
    }
  }

  async findByProviderMessageId(
    workspaceId: string,
    providerMessageId: string
  ): Promise<Message | null> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('provider', PROVIDER)
      .eq('external_message_id', providerMessageId)
      .maybeSingle()

    if (error) {
      throw new Error('Erro ao buscar mensagem do provedor')
    }

    if (data) {
      return mapRowToMessage(data)
    }

    const { data: fallback, error: fallbackError } = await supabase
      .from(TABLE)
      .select('*')
      .eq('workspace_id', workspaceId)
      .filter('metadata->>providerMessageId', 'eq', providerMessageId)
      .maybeSingle()

    if (fallbackError) {
      throw new Error('Erro ao buscar mensagem do provedor')
    }

    return fallback ? mapRowToMessage(fallback) : null
  }
}
