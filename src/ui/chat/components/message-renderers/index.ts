/**
 * Message Renderers Registry
 * 
 * Registry de todos os renderers disponíveis
 * Para adicionar novo tipo de mensagem, basta criar um novo renderer e adicioná-lo aqui
 * MessageBubble NÃO precisa ser modificado (OCP)
 */

import { MessageRenderer } from './MessageRenderer'
import { TextMessageRenderer } from './TextMessageRenderer'
import { ImageMessageRenderer } from './ImageMessageRenderer'
import { VideoMessageRenderer } from './VideoMessageRenderer'
import { AudioMessageRenderer } from './AudioMessageRenderer'
import { FileMessageRenderer } from './FileMessageRenderer'

/**
 * Lista de renderers disponíveis (ordem importa - primeiro match vence)
 */
export const messageRenderers: MessageRenderer[] = [
  new ImageMessageRenderer(),
  new VideoMessageRenderer(),
  new AudioMessageRenderer(),
  new FileMessageRenderer(),
  // TextMessageRenderer não é usado aqui (texto é renderizado diretamente)
]

/**
 * Encontra o renderer apropriado para um attachment
 * Retorna null se nenhum renderer puder renderizar
 */
export function findRendererForAttachment(
  attachment: { type: string }
): MessageRenderer | null {
  return messageRenderers.find((renderer) => renderer.canRender(attachment as any)) || null
}
