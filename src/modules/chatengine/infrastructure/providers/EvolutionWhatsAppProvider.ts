/**
 * Evolution WhatsApp Provider
 * 
 * Implementação real do WhatsAppProvider usando Evolution API
 * Substitui MockWhatsAppProvider para integração real
 */

import { WhatsAppProvider, SendTextResult, SendMediaResult } from '../../application/ports/whatsappProvider'
import { normalizeJid } from '../../domain/utils/normalizeJid'

// Configuração da Evolution API (via env vars)
const EVOLUTION_BASE_URL = process.env.EVOLUTION_API_BASE_URL || 'https://evo.newflow.me'
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || 'ev0luti0n_API_9fA3X!'
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE || 'Teste - 2177'

/**
 * Evolution WhatsApp Provider
 * 
 * Implementa interface WhatsAppProvider usando Evolution API
 */
export class EvolutionWhatsAppProvider implements WhatsAppProvider {
  private baseUrl: string
  private apiKey: string
  private instance: string

  constructor(
    baseUrl: string = EVOLUTION_BASE_URL,
    apiKey: string = EVOLUTION_API_KEY,
    instance: string = EVOLUTION_INSTANCE
  ) {
    this.baseUrl = baseUrl
    this.apiKey = apiKey
    this.instance = instance
  }

  /**
   * Envia mensagem de texto via Evolution API
   */
  async sendText(
    to: string,
    text: string,
    options?: { replyMessageId?: string }
  ): Promise<SendTextResult> {
    try {
      const normalizedJid = normalizeJid(to)
      const url = `${this.baseUrl}/message/sendText/${encodeURIComponent(this.instance)}`

      const body: any = {
        number: normalizedJid,
        text: text,
      }

      if (options?.replyMessageId) {
        body.quotedMessageId = options.replyMessageId
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          apikey: this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Evolution API error (${response.status}): ${errorText}`)
      }

      const data = await response.json()

      // Evolution retorna o messageId no campo 'key.id' ou 'id'
      const providerMessageId = data?.key?.id || data?.id || data?.messageId || `evo-${Date.now()}`

      return {
        providerMessageId,
      }
    } catch (error) {
      console.error('Erro ao enviar texto via Evolution:', error)
      throw error instanceof Error ? error : new Error('Erro desconhecido ao enviar mensagem')
    }
  }

  /**
   * Envia mídia via Evolution API
   * Suporta: image, video, audio, file (document)
   */
  async sendMedia(
    to: string,
    mediaUrl: string,
    type: 'image' | 'video' | 'audio' | 'file',
    caption?: string,
    options?: { replyMessageId?: string }
  ): Promise<SendMediaResult> {
    try {
      const normalizedJid = normalizeJid(to)
      const url = `${this.baseUrl}/message/sendMedia/${encodeURIComponent(this.instance)}`

      // Mapeia tipo do domínio para tipo da Evolution API
      const evolutionMediaType = type === 'file' ? 'document' : type

      const body: any = {
        number: normalizedJid,
        mediatype: evolutionMediaType,
        media: mediaUrl,
      }

      // Adiciona caption se fornecido
      if (caption) {
        body.caption = caption
      }

      if (options?.replyMessageId) {
        body.quotedMessageId = options.replyMessageId
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          apikey: this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Evolution API error (${response.status}): ${errorText}`)
      }

      const data = await response.json()

      // Evolution retorna o messageId no campo 'key.id' ou 'id'
      const providerMessageId = data?.key?.id || data?.id || data?.messageId || `evo-media-${Date.now()}`

      return {
        providerMessageId,
      }
    } catch (error) {
      console.error('Erro ao enviar mídia via Evolution:', error)
      throw error instanceof Error ? error : new Error('Erro desconhecido ao enviar mídia')
    }
  }
}
