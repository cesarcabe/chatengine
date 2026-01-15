/**
 * Message Renderer Interface
 * 
 * Interface para renderizadores de mensagens por tipo (Strategy Pattern)
 * Permite adicionar novos tipos de mensagem sem modificar MessageBubble (OCP)
 */

import { Message } from '@/modules/chatengine/domain/Message'
import { Attachment } from '@/modules/chatengine/domain/Attachment'
import { ReactNode } from 'react'

export interface MessageRendererProps {
  message: Message
  attachment: Attachment
  isOwn: boolean
  senderName?: string
}

/**
 * Interface para renderizadores de mensagens
 * Cada renderer sabe se pode renderizar um attachment e como renderizá-lo
 */
export interface MessageRenderer {
  /**
   * Verifica se este renderer pode renderizar o attachment fornecido
   */
  canRender(attachment: Attachment): boolean

  /**
   * Renderiza o conteúdo da mensagem
   */
  render(props: MessageRendererProps): ReactNode
}


