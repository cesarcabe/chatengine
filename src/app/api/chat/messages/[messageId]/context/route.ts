import { NextRequest, NextResponse } from 'next/server'
import { requireWorkspace } from '@/modules/chatengine/adapters/http/auth'
import { chatEngine } from '@/modules/chatengine/composition/root'
import { MessageNotFoundError } from '@/modules/chatengine/application/use-cases/errors'
import { setCorsHeaders, handleCorsPreflightRequest } from '@/modules/chatengine/adapters/http/cors'

/**
 * Este endpoint é consumido por SaaS para montar ações contextuais.
 */
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin')
  const response = handleCorsPreflightRequest(origin)
  if (response) return response
  return new NextResponse(null, { status: 404 })
}

export async function GET(
  request: NextRequest,
  { params }: { params: { messageId: string } }
) {
  const origin = request.headers.get('origin')
  const authResult = await requireWorkspace(request)
  if ('response' in authResult) {
    return setCorsHeaders(origin, authResult.response)
  }

  const { workspaceId, userId } = authResult.auth
  const messageId = params?.messageId
  if (!messageId) {
    const response = NextResponse.json({ error: 'message_id inválido' }, { status: 400 })
    return setCorsHeaders(origin, response)
  }

  try {
    const context = await chatEngine.useCases.fetchMessageContext({
      workspaceId,
      messageId,
      userId,
    })
    const response = NextResponse.json(context)
    return setCorsHeaders(origin, response)
  } catch (error) {
    if (error instanceof MessageNotFoundError) {
      const response = NextResponse.json({ error: 'Mensagem não encontrada' }, { status: 404 })
      return setCorsHeaders(origin, response)
    }
    console.error('Erro ao buscar contexto da mensagem:', error)
    const response = NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    return setCorsHeaders(origin, response)
  }
}
