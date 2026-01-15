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

function verifyWebhookAuth(rawBody: string, request: NextRequest): boolean {
  const secret = process.env.EVOLUTION_WEBHOOK_SECRET
  if (!secret || !secret.trim()) {
    return false
  }

  const signature = request.headers.get('x-evolution-signature')
  if (signature) {
    const computed = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
    const normalized = signature.startsWith('sha256=')
      ? signature.replace('sha256=', '')
      : signature
    return timingSafeEqual(computed, normalized)
  }

  const token = request.headers.get('x-evolution-token')
  if (token) {
    return timingSafeEqual(token, secret)
  }

  return false
}

function parseWorkspaceFromToken(token: string | null): string | null {
  if (!token) return null
  const mapRaw = process.env.EVOLUTION_WEBHOOK_TOKENS
  if (!mapRaw) return null
  try {
    const parsed = JSON.parse(mapRaw) as Record<string, string>
    return parsed[token] || null
  } catch {
    return null
  }
}

function parseWorkspaceFromInstance(instance: string | undefined): string | null {
  if (!instance) return null
  const mapRaw = process.env.EVOLUTION_INSTANCE_WORKSPACE_MAP
  if (!mapRaw) return null
  try {
    const parsed = JSON.parse(mapRaw) as Record<string, string>
    return parsed[instance] || null
  } catch {
    return null
  }
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
    if (isRateLimited(request)) {
      return NextResponse.json({ error: 'Rate limit excedido' }, { status: 429 })
    }

    const rawBody = await request.text()
    if (!verifyWebhookAuth(rawBody, request)) {
      return NextResponse.json({ error: 'Webhook não autorizado' }, { status: 401 })
    }

    let payload: any
    try {
      payload = JSON.parse(rawBody)
    } catch {
      return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })
    }

    const tokenHeader = request.headers.get('x-evolution-token')
    const workspaceFromToken = parseWorkspaceFromToken(tokenHeader)
    const workspaceId =
      workspaceFromToken || parseWorkspaceFromInstance(payload?.instance)

    if (!workspaceId) {
      return NextResponse.json({ error: 'Workspace não autorizado' }, { status: 403 })
    }

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
        whatsappNumberId: payload?.instance,
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
