/**
 * WhatsApp Provider Interface
 * 
 * Interface para adaptadores de provedores WhatsApp (Evolution API, Cloud API, etc)
 * Permite trocar de provedor sem alterar a lógica do chat
 */

export interface SendTextResult {
  providerMessageId: string
}

export interface SendMediaResult {
  providerMessageId: string
}

export interface WhatsAppProvider {
  /**
   * Envia mensagem de texto
   */
  sendText(
    to: string,
    text: string,
    options?: { replyMessageId?: string }
  ): Promise<SendTextResult>

  /**
   * Envia mídia (imagem, vídeo, áudio, arquivo)
   */
  sendMedia(
    to: string,
    mediaUrl: string,
    type: 'image' | 'video' | 'audio' | 'file',
    caption?: string,
    options?: { replyMessageId?: string }
  ): Promise<SendMediaResult>
}

/**
 * Mock WhatsApp Provider
 * 
 * Implementação mock para desenvolvimento
 * Simula envio de mensagens sem integração real
 */
export class MockWhatsAppProvider implements WhatsAppProvider {
  async sendText(to: string, text: string): Promise<SendTextResult> {
    // Simula delay de rede
    await new Promise((resolve) => setTimeout(resolve, 500))

    return {
      providerMessageId: `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    }
  }

  async sendMedia(
    to: string,
    mediaUrl: string,
    type: 'image' | 'video' | 'audio' | 'file',
    caption?: string
  ): Promise<SendMediaResult> {
    // Simula delay de rede (maior para mídia)
    await new Promise((resolve) => setTimeout(resolve, 800))

    return {
      providerMessageId: `mock-media-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    }
  }
}
