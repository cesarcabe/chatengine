/**
 * Video Message Renderer
 * 
 * Renderiza mensagens com vídeo
 */

import { MessageRenderer, MessageRendererProps } from './MessageRenderer'
import { Attachment } from '@/modules/chatengine/domain/Attachment'

export class VideoMessageRenderer implements MessageRenderer {
  canRender(attachment: Attachment): boolean {
    return attachment.type === 'video'
  }

  render({ message, attachment }: MessageRendererProps) {
    return (
      <div className="rounded-xl overflow-hidden max-w-xs shadow-sm">
        <video
          src={attachment.url}
          controls
          className="w-full h-auto max-h-64 object-cover"
          poster={attachment.thumbnailUrl}
        >
          Seu navegador não suporta vídeo.
        </video>
        {message.content && (
          <div className="px-3 py-2 text-sm bg-black/60 backdrop-blur-sm text-white leading-relaxed">
            {message.content}
          </div>
        )}
      </div>
    )
  }
}


