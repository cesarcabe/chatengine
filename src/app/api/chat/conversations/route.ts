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

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireWorkspace(request)
    if ('response' in authResult) {
      return authResult.response
    }
    const { workspaceId } = authResult.auth

    const conversations = await chatEngine.useCases.listConversations({ workspaceId })
    return NextResponse.json(conversations)
  } catch (error) {
    console.error('Erro ao buscar conversas:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
