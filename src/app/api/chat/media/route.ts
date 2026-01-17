/**
 * API Route: GET /api/chat/media
 *
 * Proxy de mídia para Evolution API.
 *
 * Por que existe:
 * - Com "Webhook Base64" DESLIGADO, o webhook normalmente não traz uma URL pública.
 * - O frontend precisa de uma URL HTTP acessível para <img>, <video>, <audio>.
 * - Este endpoint baixa a mídia no backend usando apikey e retorna para o browser.
 *
 * Query params:
 * - providerMessageId: string (Evolution key.id)
 * - attachmentId: string (Attachment.id salvo no Message)
 *
 * Segurança:
 * - Requer Authorization: Bearer <token> (mesma regra dos outros /api/chat/*)
 */

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { chatEngine } from '@/modules/chatengine/composition/root'
import { requireWorkspace } from '@/modules/chatengine/adapters/http/auth'

const EVOLUTION_BASE_URL = process.env.EVOLUTION_API_BASE_URL || 'https://evo.newflow.me'
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || ''

function buildEvolutionUrlFromDirectPath(directPath: string): string {
  // Se já vier URL completa, usa direto
  if (directPath.startsWith('http://') || directPath.startsWith('https://')) return directPath

  const base = EVOLUTION_BASE_URL.endsWith('/') ? EVOLUTION_BASE_URL.slice(0, -1) : EVOLUTION_BASE_URL
  const path = directPath.startsWith('/') ? directPath : `/${directPath}`
  return `${base}${path}`
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireWorkspace(request)
    if ('response' in authResult) {
      return authResult.response
    }
    const { workspaceId } = authResult.auth

    const providerMessageId = request.nextUrl.searchParams.get('providerMessageId')
    const attachmentId = request.nextUrl.searchParams.get('attachmentId')

    if (!providerMessageId || !attachmentId) {
      return NextResponse.json({ error: 'providerMessageId e attachmentId são obrigatórios' }, { status: 400 })
    }

    const message = await chatEngine.repositories.messageRepository.findByProviderMessageId(
      workspaceId,
      providerMessageId
    )
    if (!message) {
      return NextResponse.json({ error: 'Mensagem não encontrada' }, { status: 404 })
    }

    const attachment = message.attachments?.find((a) => a.id === attachmentId)
    if (!attachment) {
      return NextResponse.json({ error: 'Attachment não encontrado' }, { status: 404 })
    }

    const meta = attachment.metadata || {}

    // Preferimos sempre o sourceUrl (do Evolution) ou directPath
    const sourceUrl: string | undefined =
      meta.evolutionSourceUrl || meta.sourceUrl || meta.url || meta.directPath

    if (!sourceUrl) {
      return NextResponse.json({ error: 'Fonte de mídia não disponível' }, { status: 404 })
    }

    const urlToFetch = meta.directPath ? buildEvolutionUrlFromDirectPath(meta.directPath) : buildEvolutionUrlFromDirectPath(sourceUrl)

    const headers = new Headers()

    // Evolution normalmente usa apikey para autenticar
    if (EVOLUTION_API_KEY) {
      headers.set('apikey', EVOLUTION_API_KEY)
    }

    // Suporte a Range (necessário para <video>/<audio> funcionar bem)
    const range = request.headers.get('range')
    if (range) {
      headers.set('Range', range)
    }

    const upstream = await fetch(urlToFetch, {
      method: 'GET',
      headers,
    })

    if (!upstream.ok && upstream.status !== 206) {
      const text = await upstream.text().catch(() => '')
      return NextResponse.json(
        { error: `Falha ao baixar mídia (${upstream.status})`, details: text },
        { status: 502 }
      )
    }

    const outHeaders = new Headers()

    // Content-Type (prioriza o que veio no attachment)
    const contentType =
      meta.mimeType || upstream.headers.get('content-type') || 'application/octet-stream'
    outHeaders.set('Content-Type', contentType)

    // Passa headers de range se existirem
    const contentRange = upstream.headers.get('content-range')
    if (contentRange) outHeaders.set('Content-Range', contentRange)
    const acceptRanges = upstream.headers.get('accept-ranges')
    if (acceptRanges) outHeaders.set('Accept-Ranges', acceptRanges)
    const contentLength = upstream.headers.get('content-length')
    if (contentLength) outHeaders.set('Content-Length', contentLength)

    // Cache leve (dev-friendly)
    outHeaders.set('Cache-Control', 'private, max-age=3600')

    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: outHeaders,
    })
  } catch (error) {
    console.error('Erro no proxy de mídia:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

