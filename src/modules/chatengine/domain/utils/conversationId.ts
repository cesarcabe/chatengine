/**
 * Conversation ID Utility
 * 
 * Normaliza JID para ID único e consistente de conversa
 * Garante que o mesmo JID sempre gere o mesmo ID
 */

/**
 * Converte JID do WhatsApp para ID de conversa
 * 
 * @param jid - JID no formato 5581999999999@s.whatsapp.net ou 5581999999999@lid
 * @returns ID normalizado da conversa
 * 
 * Exemplo:
 * - "5581999999999@s.whatsapp.net" → "5581999999999"
 * - "5581999999999@lid" → "5581999999999"
 */
export function conversationIdFromJid(jid: string): string {
  if (!jid) {
    throw new Error('JID é obrigatório')
  }

  // Regra do projeto: ID de conversa é SEMPRE o número (sem sufixos)
  // Nunca usar remoteJid cru como ID no frontend/store.
  return jid.replace('@s.whatsapp.net', '').replace('@lid', '')
}
