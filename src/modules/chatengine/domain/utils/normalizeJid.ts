/**
 * Normalize JID Utility
 * 
 * Normaliza número de telefone para formato JID do WhatsApp
 * Formato esperado: 5581999999999@s.whatsapp.net
 * 
 * @param phoneNumber - Número de telefone (pode vir com ou sem @s.whatsapp.net)
 * @returns JID normalizado
 */

export function normalizeJid(phoneNumber: string): string {
  if (!phoneNumber) {
    throw new Error('phoneNumber é obrigatório')
  }

  // Se já está no formato JID, retorna
  if (phoneNumber.includes('@s.whatsapp.net')) {
    return phoneNumber
  }

  // Remove caracteres não numéricos
  const cleaned = phoneNumber.replace(/\D/g, '')

  if (!cleaned) {
    throw new Error('Número de telefone inválido')
  }

  // Adiciona @s.whatsapp.net
  return `${cleaned}@s.whatsapp.net`
}

/**
 * Extrai número de telefone de um JID
 * @param jid - JID no formato 5581999999999@s.whatsapp.net
 * @returns Número de telefone sem o sufixo @s.whatsapp.net
 */
export function extractPhoneFromJid(jid: string): string {
  if (!jid) return jid
  return jid.split('@')[0]
}
