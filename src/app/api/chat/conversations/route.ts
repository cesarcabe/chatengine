/**
 * API Route: GET /api/chat/conversations
 * 
 * Retorna lista de conversas
 * Valida token via Authorization header
 */

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireWorkspace } from '@/modules/chatengine/adapters/http/auth'
import { chatEngine } from '@/modules/chatengine/composition/root'
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

    const conversations = await chatEngine.useCases.listConversations({ workspaceId })
    const response = NextResponse.json(conversations)
    return setCorsHeaders(origin, response)
  } catch (error) {
    console.error('Erro ao buscar conversas:', error)
    const origin = request.headers.get('origin')
    const response = NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
    return setCorsHeaders(origin, response)
  }
}
