/**
 * Text Message Renderer
 * 
 * Renderiza mensagens de texto simples
 */

import { MessageRenderer, MessageRendererProps } from './MessageRenderer'
import { Attachment } from '@/modules/chatengine/domain/Attachment'

export class TextMessageRenderer implements MessageRenderer {
  canRender(attachment: Attachment): boolean {
    // Text messages não têm attachment ou têm attachment do tipo 'file'
    return false // Text messages são renderizadas diretamente, não via attachment
  }

  render({ message }: MessageRendererProps) {
    return (
      <div className="text-sm whitespace-pre-wrap break-words leading-relaxed">
        {message.content}
      </div>
    )
  }
}


