/**
 * API Route: GET/POST /api/chat/messages
 * 
 * GET: Retorna mensagens de uma conversa (com suporte a since para polling)
 * POST: Envia nova mensagem
 * Valida token via Authorization header
 */

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireWorkspace } from '@/modules/chatengine/adapters/http/auth'
import { chatEngine } from '@/modules/chatengine/composition/root'
import { InvalidRequestError } from '@/modules/chatengine/application/use-cases/errors'

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireWorkspace(request)
    if ('response' in authResult) {
      return authResult.response
    }
    const { workspaceId } = authResult.auth

    // Lê parâmetros
    const searchParams = request.nextUrl.searchParams
    const conversationId = searchParams.get('conversationId')
    const since = searchParams.get('since') // timestamp ISO string
    const limitParam = searchParams.get('limit')
    const limit = limitParam ? Number(limitParam) : undefined
    const messages = await chatEngine.useCases.listMessages({
      workspaceId,
      conversationId: conversationId || '',
      since,
      limit,
    })
    return NextResponse.json(messages)
  } catch (error) {
    if (error instanceof InvalidRequestError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error('Erro ao buscar mensagens:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireWorkspace(request)
    if ('response' in authResult) {
      return authResult.response
    }
    const { workspaceId, userId } = authResult.auth

    // Lê body
    const body = await request.json()
    const { conversationId, type, content, replyToMessageId, attachments } = body
    const newMessage = await chatEngine.useCases.sendMessage({
      workspaceId,
      userId,
      conversationId,
      whatsappNumberId: process.env.EVOLUTION_INSTANCE,
      type,
      content,
      replyToMessageId,
      attachments,
    })

    return NextResponse.json(newMessage, { status: 201 })
  } catch (error) {
    if (error instanceof InvalidRequestError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error('Erro ao enviar mensagem:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
