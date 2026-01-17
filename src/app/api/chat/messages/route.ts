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
import { setCorsHeaders, handleCorsPreflightRequest } from '@/modules/chatengine/adapters/http/cors'

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin')
  const response = handleCorsPreflightRequest(origin)
  if (response) return response
  return new NextResponse(null, { status: 404 })
}

export async function GET(request: NextRequest) {
  try {
    const origin = request.headers.get('origin')
    const authResult = await requireWorkspace(request)
    if ('response' in authResult) {
      return setCorsHeaders(origin, authResult.response)
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
    const response = NextResponse.json(messages)
    return setCorsHeaders(origin, response)
  } catch (error) {
    const origin = request.headers.get('origin')
    if (error instanceof InvalidRequestError) {
      const response = NextResponse.json({ error: error.message }, { status: 400 })
      return setCorsHeaders(origin, response)
    }
    console.error('Erro ao buscar mensagens:', error)
    const response = NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
    return setCorsHeaders(origin, response)
  }
}

export async function POST(request: NextRequest) {
  try {
    const origin = request.headers.get('origin')
    const authResult = await requireWorkspace(request)
    if ('response' in authResult) {
      return setCorsHeaders(origin, authResult.response)
    }
    const { workspaceId, userId } = authResult.auth

    // Lê body
    const body = await request.json()
    const { conversationId, type, content, replyToMessageId, attachments, whatsappNumberId } = body
    
    // Busca conversa para obter whatsappNumberId se não foi fornecido
    let finalWhatsappNumberId = whatsappNumberId
    if (!finalWhatsappNumberId && conversationId) {
      const conversation = await chatEngine.repositories.conversationRepository.findById(
        workspaceId,
        conversationId
      )
      if (conversation?.whatsappNumberId) {
        finalWhatsappNumberId = conversation.whatsappNumberId
      }
    }
    
    const newMessage = await chatEngine.useCases.sendMessage({
      workspaceId,
      userId,
      conversationId,
      whatsappNumberId: finalWhatsappNumberId,
      type,
      content,
      replyToMessageId,
      attachments,
    })

    const response = NextResponse.json(newMessage, { status: 201 })
    return setCorsHeaders(origin, response)
  } catch (error) {
    const origin = request.headers.get('origin')
    if (error instanceof InvalidRequestError) {
      const response = NextResponse.json({ error: error.message }, { status: 400 })
      return setCorsHeaders(origin, response)
    }
    console.error('Erro ao enviar mensagem:', error)
    const response = NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
    return setCorsHeaders(origin, response)
  }
}
