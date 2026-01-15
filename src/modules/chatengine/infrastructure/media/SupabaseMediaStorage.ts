import crypto from 'crypto'
import { supabase } from '../db/supabaseClient'
import { MediaStorage, MediaUploadInput, MediaUploadResult } from '../../application/ports/MediaStorage'

const BUCKET = process.env.SUPABASE_MEDIA_BUCKET || 'chat-media'
const DEFAULT_EXPIRES = Number(process.env.SUPABASE_MEDIA_URL_EXPIRES_IN || '3600')

function buildPath(workspaceId: string, filename?: string): string {
  const ext = filename && filename.includes('.') ? filename.split('.').pop() : undefined
  const suffix = ext ? `.${ext}` : ''
  return `${workspaceId}/${Date.now()}-${crypto.randomUUID()}${suffix}`
}

export class SupabaseMediaStorage implements MediaStorage {
  async upload(input: MediaUploadInput): Promise<MediaUploadResult> {
    const path = buildPath(input.workspaceId, input.filename)
    const { error } = await supabase.storage.from(BUCKET).upload(path, input.buffer, {
      contentType: input.contentType,
      upsert: false,
    })

    if (error) {
      throw new Error('Erro ao fazer upload de mídia')
    }

    const url = await this.getSignedUrl(path)
    return { path, url }
  }

  async getSignedUrl(path: string, expiresInSeconds = DEFAULT_EXPIRES): Promise<string> {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, expiresInSeconds)

    if (error || !data?.signedUrl) {
      throw new Error('Erro ao gerar URL de mídia')
    }

    return data.signedUrl
  }
}
