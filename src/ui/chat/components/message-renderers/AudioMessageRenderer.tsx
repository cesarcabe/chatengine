/**
 * Audio Message Renderer
 * 
 * Renderiza mensagens com áudio usando o componente AudioMessage existente
 */

import { MessageRenderer, MessageRendererProps } from './MessageRenderer'
import { Attachment } from '@/modules/chatengine/domain/Attachment'
import { AudioMessage } from '../AudioMessage'

export class AudioMessageRenderer implements MessageRenderer {
  canRender(attachment: Attachment): boolean {
    return attachment.type === 'audio'
  }

  render({ message, attachment, isOwn, senderName }: MessageRendererProps) {
    return (
      <div>
        <AudioMessage
          src={attachment.url}
          isOwn={isOwn}
          senderName={senderName}
        />
        {message.content && (
          <div className="mt-2 text-sm leading-relaxed">{message.content}</div>
        )}
      </div>
    )
  }
}


