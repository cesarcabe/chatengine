/**
 * API Route: POST /api/webhooks/whatsapp/[token]
 * 
 * Webhook para receber mensagens do WhatsApp via Evolution API
 * COM autenticação por token na URL
 * 
 * Esta rota valida o token contra EVOLUTION_WEBHOOK_SECRET antes de processar
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

function timingSafeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a)
  const bBuf = Buffer.from(b)
  if (aBuf.length !== bBuf.length) return false
  return crypto.timingSafeEqual(aBuf, bBuf)
}

/**
 * Valida token da URL contra EVOLUTION_WEBHOOK_SECRET
 */
function validateToken(token: string): boolean {
  const secret = process.env.EVOLUTION_WEBHOOK_SECRET
  if (!secret || !secret.trim()) {
    console.warn('EVOLUTION_WEBHOOK_SECRET não configurado - token não pode ser validado')
    return false
  }

  return timingSafeEqual(token, secret)
}

/**
 * Extrai instance e api_key do body do webhook
 */
function extractInstanceFromPayload(payload: any): { instance: string | null; apiKey: string | null } {
  const instance = payload?.instance || payload?.instanceName || null
  const apiKey = payload?.api_key || payload?.apiKey || null
  return { instance, apiKey }
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
 */
export async function GET() {
  return NextResponse.json({ status: 'ok' })
}

/**
 * Handler OPTIONS para CORS
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const token = params.token

    // 🔍 DEBUG: Token validation
    const expectedSecret = process.env.EVOLUTION_WEBHOOK_SECRET
    console.log('=== DEBUG WEBHOOK WITH TOKEN ===')
    console.log('Token recebido na URL:', token ? '***' : 'não fornecido')
    console.log('EVOLUTION_WEBHOOK_SECRET configurado:', expectedSecret ? 'sim' : 'não')

    // Valida token
    if (!token) {
      console.log('Token não fornecido na URL')
      console.log('=====================')
      return NextResponse.json({ error: 'Token é obrigatório na URL' }, { status: 400 })
    }

    const isValidToken = validateToken(token)
    console.log('Token válido?', isValidToken)

    if (!isValidToken) {
      console.log('Token inválido - acesso negado')
      console.log('=====================')
      return NextResponse.json({ error: 'Invalid token' }, { status: 403 })
    }

    const rawBody = await request.text()

    // Parse do payload
    let payload: any
    try {
      payload = JSON.parse(rawBody)
    } catch {
      console.log('Erro ao fazer parse do body')
      console.log('=====================')
      return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })
    }

    // 🔍 DEBUG: Payload details
    const { instance: instanceName, apiKey } = extractInstanceFromPayload(payload)
    const eventType = extractEventType(payload)
    
    console.log('Body (payload):', JSON.stringify(payload, null, 2))
    console.log('Evento do Evolution:', eventType || 'não encontrado')
    console.log('Instância:', instanceName || 'não encontrada')
    console.log('API Key no body:', apiKey ? '***' : 'não fornecido')
    console.log('=====================')

    if (!instanceName) {
      return NextResponse.json({ error: 'instance é obrigatório no payload' }, { status: 400 })
    }

    // Busca workspace_id por instance_name na tabela whatsapp_numbers
    const instanceData = await findWorkspaceByInstance(instanceName)

    if (!instanceData) {
      console.log('Instance não encontrado na tabela whatsapp_numbers:', instanceName)
      return NextResponse.json({ error: 'Instance não autorizado' }, { status: 403 })
    }

    const { workspaceId, whatsappNumberId } = instanceData

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
