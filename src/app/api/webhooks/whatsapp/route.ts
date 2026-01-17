/**
 * API Route: POST /api/webhooks/whatsapp
 * 
 * Webhook para receber mensagens do WhatsApp via Evolution API
 * 
 * CONFIGURAÇÃO NO EVOLUTION:
 * 1. Acesse o painel do Evolution API
 * 2. Configure Webhook URL: POST https://SEU_DOMINIO/api/webhooks/whatsapp
 * 3. Eventos necessários:
 *    - messages.upsert - mensagens recebidas/enviadas
 *    - messages.update - atualizações de status
 */

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import {
  hashPayload,
  recordWebhookEvent,
  updateWebhookEventStatus,
} from '@/modules/chatengine/infrastructure/api/webhookEventStore'
import { chatEngine } from '@/modules/chatengine/composition/root'
import {
  DuplicateMessageError,
  InvalidPayloadError,
  MessageNotFoundError,
} from '@/modules/chatengine/application/use-cases/errors'
import { findWorkspaceByInstance } from '@/modules/chatengine/infrastructure/repositories/whatsappNumbersRepository'

const rateLimitBucket = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX = Number(process.env.EVOLUTION_WEBHOOK_RATE_LIMIT_PER_MINUTE || '60')

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() || 'unknown'
  }
  return 'unknown'
}

function isRateLimited(request: NextRequest): boolean {
  const key = `evolution:${getClientIp(request)}`
  const now = Date.now()
  const bucket = rateLimitBucket.get(key)
  if (!bucket || bucket.resetAt <= now) {
    rateLimitBucket.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return false
  }
  bucket.count += 1
  if (bucket.count > RATE_LIMIT_MAX) {
    return true
  }
  return false
}

function timingSafeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a)
  const bBuf = Buffer.from(b)
  if (aBuf.length !== bBuf.length) return false
  return crypto.timingSafeEqual(aBuf, bBuf)
}

/**
 * Extrai instance e api_key do body do webhook
 * Evolution não envia headers customizados, então extraímos do body
 */
function extractInstanceFromPayload(payload: any): { instance: string | null; apiKey: string | null } {
  // Evolution envia instance no body
  const instance = payload?.instance || payload?.instanceName || null
  const apiKey = payload?.api_key || payload?.apiKey || null

  return { instance, apiKey }
}

/**
 * Validação simplificada: apenas verifica se a instância existe no banco
 * Se instance existir na tabela whatsapp_numbers, o webhook é válido
 */
async function verifyWebhookByInstance(instanceName: string | null): Promise<boolean> {
  if (!instanceName) {
    return false
  }

  const instanceData = await findWorkspaceByInstance(instanceName)
  return instanceData !== null
}

function extractEventType(payload: any): string | undefined {
  return typeof payload?.event === 'string' ? payload.event : undefined
}

function extractExternalMessageId(payload: any): string | undefined {
  const data = payload?.data || payload
  return data?.keyId || data?.key?.id
}

function extractEventTimestamp(payload: any): number | null {
  const data = payload?.data || payload
  const raw =
    data?.messageTimestamp ??
    data?.timestamp ??
    payload?.timestamp ??
    payload?.messageTimestamp
  if (typeof raw === 'number') return raw
  if (typeof raw === 'string' && /^\d+$/.test(raw)) {
    return Number(raw)
  }
  return null
}

/**
 * GET - Handler de teste usado pelo Evolution API ao salvar o webhook
 * Evolution faz um GET para verificar se o endpoint está acessível
 */
export async function GET() {
  return NextResponse.json({ status: 'ok' })
}

/**
 * Handler OPTIONS para CORS (caso o Evolution faça preflight request)
 */
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

export async function POST(request: NextRequest) {
  try {
    // if (isRateLimited(request)) {
    //   return NextResponse.json({ error: 'Rate limit excedido' }, { status: 429 })
    // }

    const rawBody = await request.text()
    
    // Parse do payload primeiro para extrair instance e api_key do body
    let payload: any
    try {
      payload = JSON.parse(rawBody)
    } catch {
      return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })
    }

    // 🔍 DEBUG: Ver o que está chegando
    console.log('=== DEBUG WEBHOOK ===')
    console.log('Payload instance:', payload?.instance || payload?.instanceName)
    console.log('Payload api_key:', payload?.api_key || payload?.apiKey ? '***' : 'não fornecido')
    
    // Extrai instance e api_key do body (Evolution não envia headers customizados)
    const { instance: instanceName, apiKey } = extractInstanceFromPayload(payload)

    if (!instanceName) {
      console.log('Instance não encontrado no payload')
      console.log('=====================')
      return NextResponse.json({ error: 'instance é obrigatório no payload' }, { status: 400 })
    }

    // Busca workspace_id por instance_name na tabela whatsapp_numbers
    const instanceData = await findWorkspaceByInstance(instanceName)
    
    if (!instanceData) {
      console.log('Instance não encontrado na tabela whatsapp_numbers:', instanceName)
      console.log('=====================')
      return NextResponse.json({ error: 'Instance não autorizado' }, { status: 403 })
    }

    const { workspaceId, whatsappNumberId } = instanceData

    // Validação opcional: se api_key foi fornecida no body, pode validar
    // (mas não é obrigatório para processar o webhook)
    if (apiKey && instanceData.apiKey) {
      // Validação opcional de api_key se ambas existirem
      // Não bloqueia o processamento se não bater
    }

    console.log('Workspace encontrado:', workspaceId)
    console.log('WhatsApp Number ID:', whatsappNumberId)
    console.log('=====================')

    const eventType = extractEventType(payload)
    const externalMessageId = extractExternalMessageId(payload)
    const nowSeconds = Math.floor(Date.now() / 1000)
    const timestamp = extractEventTimestamp(payload)
    const maxAgeSeconds = Number(process.env.EVOLUTION_WEBHOOK_MAX_AGE_SECONDS || '300')
    const payloadHash = hashPayload(rawBody)

    const eventId = `evolution:${payloadHash}`
    const idempotencyKey = externalMessageId
      ? `${workspaceId}:${eventType}:${externalMessageId}`
      : `${workspaceId}:${eventType}:${payloadHash}`

    const { event, isDuplicate } = recordWebhookEvent({
      id: eventId,
      provider: 'evolution',
      workspaceId,
      eventType,
      payloadRaw: payload,
      payloadHash,
      idempotencyKey,
      receivedAt: new Date(),
      status: 'received',
    })

    if (!eventType) {
      updateWebhookEventStatus(event.id, 'rejected', 'missing_event_type')
      return NextResponse.json({ error: 'Evento inválido' }, { status: 400 })
    }

    if (timestamp !== null && Math.abs(nowSeconds - timestamp) > maxAgeSeconds) {
      updateWebhookEventStatus(event.id, 'rejected', 'timestamp_out_of_range')
      return NextResponse.json({ error: 'Evento expirado' }, { status: 400 })
    }

    if (
      !externalMessageId &&
      (eventType === 'messages.upsert' ||
        eventType === 'message.upsert' ||
        eventType === 'messages.update' ||
        eventType === 'message.update')
    ) {
      updateWebhookEventStatus(event.id, 'rejected', 'missing_external_message_id')
      return NextResponse.json({ error: 'Evento inválido' }, { status: 400 })
    }

    if (isDuplicate) {
      return NextResponse.json({ ok: true })
    }

    try {
      await chatEngine.useCases.processEvolutionWebhookEvent({
        payload,
        workspaceId,
        currentUserId: 'system',
        whatsappNumberId,
      })
      updateWebhookEventStatus(event.id, 'processed')
      return NextResponse.json({ ok: true })
    } catch (error) {
      if (error instanceof DuplicateMessageError) {
        updateWebhookEventStatus(event.id, 'duplicate', error.message)
        return NextResponse.json({ ok: true })
      }
      if (error instanceof InvalidPayloadError) {
        updateWebhookEventStatus(event.id, 'rejected', error.message)
        return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })
      }
      if (error instanceof MessageNotFoundError) {
        updateWebhookEventStatus(event.id, 'processed', error.message)
        return NextResponse.json({ ok: true })
      }
      const reason = error instanceof Error ? error.message : 'processing_error'
      updateWebhookEventStatus(event.id, 'failed', reason)
      return NextResponse.json({ ok: true }, { status: 202 })
    }
  } catch (error) {
    console.error('Erro ao processar webhook:', error)
    return NextResponse.json({ error: 'Erro interno ao processar webhook' }, { status: 500 })
  }
}
