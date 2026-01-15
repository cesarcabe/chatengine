import { MessageStatus } from '../../domain/Message'
import { supabase } from '../db/supabaseClient'
import { MessageStatusRepository } from '../../application/ports/MessageStatusRepository'

const TABLE = process.env.SUPABASE_MESSAGE_STATUS_PENDING_TABLE || 'message_status_pending'

export class SupabaseMessageStatusRepository implements MessageStatusRepository {
  async upsertPendingStatus(
    workspaceId: string,
    provider: string,
    externalMessageId: string,
    status: MessageStatus
  ): Promise<void> {
    const { error } = await supabase.from(TABLE).upsert(
      {
        workspace_id: workspaceId,
        provider,
        external_message_id: externalMessageId,
        status,
        received_at: new Date().toISOString(),
      },
      { onConflict: 'workspace_id,provider,external_message_id' }
    )

    if (error) {
      throw new Error('Erro ao persistir status pendente')
    }
  }

  async getPendingStatus(
    workspaceId: string,
    provider: string,
    externalMessageId: string
  ): Promise<MessageStatus | null> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('status')
      .eq('workspace_id', workspaceId)
      .eq('provider', provider)
      .eq('external_message_id', externalMessageId)
      .maybeSingle()

    if (error) {
      throw new Error('Erro ao buscar status pendente')
    }

    return data?.status || null
  }

  async deletePendingStatus(
    workspaceId: string,
    provider: string,
    externalMessageId: string
  ): Promise<void> {
    const { error } = await supabase
      .from(TABLE)
      .delete()
      .eq('workspace_id', workspaceId)
      .eq('provider', provider)
      .eq('external_message_id', externalMessageId)

    if (error) {
      throw new Error('Erro ao remover status pendente')
    }
  }
}
