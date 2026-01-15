import { NextRequest, NextResponse } from 'next/server'
import { requireWorkspace } from '@/modules/chatengine/adapters/http/auth'
import { chatEngine } from '@/modules/chatengine/composition/root'
import { MessageNotFoundError } from '@/modules/chatengine/application/use-cases/errors'

/**
 * Este endpoint é consumido por SaaS para montar ações contextuais.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { messageId: string } }
) {
  const authResult = await requireWorkspace(request)
  if ('response' in authResult) {
    return authResult.response
  }

  const { workspaceId, userId } = authResult.auth
  const messageId = params?.messageId

  if (!messageId) {
    return NextResponse.json({ error: 'message_id inválido' }, { status: 400 })
  }

  try {
    const context = await chatEngine.useCases.fetchMessageContext({
      workspaceId,
      messageId,
      userId,
    })
    return NextResponse.json(context)
  } catch (error) {
    if (error instanceof MessageNotFoundError) {
      return NextResponse.json({ error: 'Mensagem não encontrada' }, { status: 404 })
    }
    console.error('Erro ao buscar contexto da mensagem:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
