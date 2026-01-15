/**
 * API Route: POST /api/chat/attachments
 * 
 * Faz upload de anexo (imagem, vídeo, áudio, arquivo)
 * Valida token via Authorization header
 * Retorna Attachment com URL
 */

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { Attachment, AttachmentType } from '@/modules/chatengine/domain/Attachment'
import { requireWorkspace } from '@/modules/chatengine/adapters/http/auth'
import { chatEngine } from '@/modules/chatengine/composition/root'

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireWorkspace(request)
    if ('response' in authResult) {
      return authResult.response
    }

    // Lê FormData
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'Arquivo é obrigatório' },
        { status: 400 }
      )
    }

    // Determina tipo de anexo
    let attachmentType: AttachmentType = 'file'
    if (file.type.startsWith('image/')) {
      attachmentType = 'image'
    } else if (file.type.startsWith('video/')) {
      attachmentType = 'video'
    } else if (file.type.startsWith('audio/')) {
      attachmentType = 'audio'
    }

    const bytes = await file.arrayBuffer()
    const upload = await chatEngine.mediaStorage.upload({
      workspaceId: authResult.auth.workspaceId,
      buffer: bytes,
      contentType: file.type,
      filename: file.name,
    })

    const url = upload.url
    let thumbnailUrl: string | undefined

    // Cria attachment
    const attachment: Attachment = {
      id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      messageId: '', // Será preenchido quando a mensagem for criada
      type: attachmentType,
      url,
      thumbnailUrl,
      metadata: {
        filename: file.name,
        size: file.size,
        mimeType: file.type,
        storagePath: upload.path,
      },
    }

    return NextResponse.json(attachment, { status: 201 })
  } catch (error) {
    console.error('Erro ao fazer upload de anexo:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
