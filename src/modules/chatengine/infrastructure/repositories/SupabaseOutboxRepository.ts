import { supabase } from '../db/supabaseClient'
import { OutboxEntry, OutboxRepository, OutboxStatus } from '../../application/ports/OutboxRepository'

const TABLE = process.env.SUPABASE_OUTBOX_TABLE || 'message_outbox'

function mapRowToOutbox(row: any): OutboxEntry {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    messageId: row.message_id,
    provider: row.provider,
    payload: row.payload || {},
    status: row.status as OutboxStatus,
    attempts: row.attempts || 0,
    nextRetryAt: new Date(row.next_retry_at),
    lastError: row.last_error || undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }
}

export class SupabaseOutboxRepository implements OutboxRepository {
  async enqueue(entry: {
    workspaceId: string
    messageId: string
    provider: string
    payload: Record<string, any>
  }): Promise<OutboxEntry> {
    const { data, error } = await supabase
      .from(TABLE)
      .insert({
        workspace_id: entry.workspaceId,
        message_id: entry.messageId,
        provider: entry.provider,
        payload: entry.payload,
        status: 'pending',
        attempts: 0,
        next_retry_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('*')
      .single()

    if (error || !data) {
      throw new Error('Erro ao enfileirar mensagem')
    }

    return mapRowToOutbox(data)
  }

  async claimPending(limit: number): Promise<OutboxEntry[]> {
    const now = new Date().toISOString()
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('status', 'pending')
      .lte('next_retry_at', now)
      .order('created_at', { ascending: true })
      .limit(limit)

    if (error) {
      throw new Error('Erro ao buscar outbox pendente')
    }

    const claimed: OutboxEntry[] = []
    for (const row of data || []) {
      const { data: updated, error: updateError } = await supabase
        .from(TABLE)
        .update({ status: 'processing', updated_at: new Date().toISOString() })
        .eq('id', row.id)
        .eq('status', 'pending')
        .select('*')
        .maybeSingle()

      if (updateError) {
        continue
      }

      if (updated) {
        claimed.push(mapRowToOutbox(updated))
      }
    }

    return claimed
  }

  async markSent(outboxId: string): Promise<void> {
    const { error } = await supabase
      .from(TABLE)
      .update({ status: 'sent', updated_at: new Date().toISOString() })
      .eq('id', outboxId)

    if (error) {
      throw new Error('Erro ao marcar outbox como sent')
    }
  }

  async markFailed(
    outboxId: string,
    attempts: number,
    nextRetryAt: Date,
    lastError: string
  ): Promise<void> {
    const { error } = await supabase
      .from(TABLE)
      .update({
        status: 'pending',
        attempts,
        next_retry_at: nextRetryAt.toISOString(),
        last_error: lastError,
        updated_at: new Date().toISOString(),
      })
      .eq('id', outboxId)

    if (error) {
      throw new Error('Erro ao reagendar outbox')
    }
  }

  async markPermanentFailure(outboxId: string, lastError: string): Promise<void> {
    const { error } = await supabase
      .from(TABLE)
      .update({
        status: 'failed',
        last_error: lastError,
        updated_at: new Date().toISOString(),
      })
      .eq('id', outboxId)

    if (error) {
      throw new Error('Erro ao marcar outbox como failed')
    }
  }
}
