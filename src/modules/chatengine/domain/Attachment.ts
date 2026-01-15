/**
 * Attachment Domain Model
 * 
 * Representa um anexo associado a uma mensagem
 * Pode ser imagem, vídeo, áudio ou arquivo genérico
 */

export type AttachmentType = 'image' | 'video' | 'audio' | 'file'

export interface AttachmentMetadata {
  filename?: string
  size?: number
  mimeType?: string
  width?: number
  height?: number
  duration?: number
  // Permite guardar metadados específicos de provedores (Evolution, Cloud API, etc)
  [key: string]: any
}

export interface Attachment {
  id: string
  messageId: string
  type: AttachmentType
  url: string
  thumbnailUrl?: string
  metadata?: AttachmentMetadata
}