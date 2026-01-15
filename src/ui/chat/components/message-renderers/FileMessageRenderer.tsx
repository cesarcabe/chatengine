/**
 * File Message Renderer
 * 
 * Renderiza mensagens com arquivo genérico
 */

import { MessageRenderer, MessageRendererProps } from './MessageRenderer'
import { Attachment } from '@/modules/chatengine/domain/Attachment'

export class FileMessageRenderer implements MessageRenderer {
  canRender(attachment: Attachment): boolean {
    return attachment.type === 'file'
  }

  render({ message, attachment }: MessageRendererProps) {
    return (
      <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 max-w-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg
              className="w-5 h-5 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-900 truncate">
              {attachment.metadata?.filename || 'Arquivo'}
            </div>
            {attachment.metadata?.size && (
              <div className="text-xs text-gray-500 mt-0.5">
                {(attachment.metadata.size / 1024).toFixed(1)} KB
              </div>
            )}
          </div>
        </div>
        {message.content && (
          <div className="mt-2.5 text-sm leading-relaxed">{message.content}</div>
        )}
      </div>
    )
  }
}


