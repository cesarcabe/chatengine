import { Conversation } from '../../domain/Conversation'
import { supabase } from '../db/supabaseClient'
import { ConversationRepository } from '../../application/ports/ConversationRepository'

const TABLE = process.env.SUPABASE_CONVERSATIONS_TABLE || 'conversations'

function mapRowToConversation(row: any): Conversation {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    contactId: row.contact_id || undefined,
    whatsappNumberId: row.whatsapp_number_id || undefined,
    channel: row.channel,
    participants: row.participants || [],
    lastMessage: row.last_message
      ? {
          id: row.last_message.id,
          content: row.last_message.content,
          senderId: row.last_message.senderId,
          createdAt: new Date(row.last_message.createdAt),
        }
      : undefined,
    updatedAt: new Date(row.updated_at),
  }
}

export class SupabaseConversationRepository implements ConversationRepository {
  async findAll(workspaceId: string): Promise<Conversation[]> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('updated_at', { ascending: false })

    if (error) {
      throw new Error('Erro ao buscar conversas')
    }

    return (data || []).map(mapRowToConversation)
  }

  async findById(workspaceId: string, id: string): Promise<Conversation | null> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('id', id)
      .maybeSingle()

    if (error) {
      throw new Error('Erro ao buscar conversa')
    }

    return data ? mapRowToConversation(data) : null
  }

  async save(conversation: Conversation): Promise<void> {
    const { error } = await supabase.from(TABLE).insert({
      id: conversation.id,
      workspace_id: conversation.workspaceId,
      contact_id: conversation.contactId || conversation.id,
      whatsapp_number_id: conversation.whatsappNumberId || null,
      channel: conversation.channel,
      participants: conversation.participants,
      last_message: conversation.lastMessage
        ? {
            id: conversation.lastMessage.id,
            content: conversation.lastMessage.content,
            senderId: conversation.lastMessage.senderId,
            createdAt: conversation.lastMessage.createdAt.toISOString(),
          }
        : null,
      updated_at: conversation.updatedAt.toISOString(),
    })

    if (error) {
      if (error.code === '23505') {
        return
      }
      throw new Error('Erro ao salvar conversa')
    }
  }

  async update(id: string, updates: Partial<Conversation>): Promise<void> {
    if (!updates.workspaceId) {
      throw new Error('workspaceId é obrigatório para atualizar Conversation')
    }

    const payload: Record<string, any> = {
      updated_at: updates.updatedAt ? updates.updatedAt.toISOString() : undefined,
      last_message: updates.lastMessage
        ? {
            id: updates.lastMessage.id,
            content: updates.lastMessage.content,
            senderId: updates.lastMessage.senderId,
            createdAt: updates.lastMessage.createdAt.toISOString(),
          }
        : undefined,
      participants: updates.participants,
      contact_id: updates.contactId,
      whatsapp_number_id: updates.whatsappNumberId,
      channel: updates.channel,
    }

    Object.keys(payload).forEach((key) => {
      if (payload[key] === undefined) delete payload[key]
    })

    const { error } = await supabase
      .from(TABLE)
      .update(payload)
      .eq('workspace_id', updates.workspaceId)
      .eq('id', id)

    if (error) {
      throw new Error('Erro ao atualizar conversa')
    }
  }
}
