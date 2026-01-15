/**
 * Image Message Renderer
 * 
 * Renderiza mensagens com imagem
 */

import { MessageRenderer, MessageRendererProps } from './MessageRenderer'
import { Attachment } from '@/modules/chatengine/domain/Attachment'

export class ImageMessageRenderer implements MessageRenderer {
  canRender(attachment: Attachment): boolean {
    return attachment.type === 'image'
  }

  render({ message, attachment }: MessageRendererProps) {
    return (
      <div className="rounded-xl overflow-hidden max-w-xs shadow-sm">
        <img
          src={attachment.url}
          alt={message.content || 'Imagem'}
          className="w-full h-auto object-cover"
        />
        {message.content && (
          <div className="px-3 py-2 text-sm bg-black/60 backdrop-blur-sm text-white leading-relaxed">
            {message.content}
          </div>
        )}
      </div>
    )
  }
}


