/**
 * Origin Utilities
 * 
 * Utilitários para validação de origem em iframe/postMessage
 * Suporta allowlist de origens permitidas via env var
 */

/**
 * Parse allowlist de origens permitidas
 * Espera env var CHAT_PARENT_ORIGINS separada por vírgula
 * Exemplo: "https://app.lovable.dev,https://staging.lovable.dev"
 */
export function parseAllowedOrigins(): string[] {
  const envOrigins = process.env.NEXT_PUBLIC_CHAT_PARENT_ORIGINS || ''
  
  if (!envOrigins.trim()) {
    return []
  }

  return envOrigins
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0)
}

/**
 * Verifica se uma origem está na allowlist
 * @param origin - Origem a verificar (ex: "https://app.lovable.dev")
 * @returns true se permitido, false caso contrário
 */
export function isAllowedOrigin(origin: string): boolean {
  const allowedOrigins = parseAllowedOrigins()
  
  // Se não há allowlist configurada, permite todas (desenvolvimento)
  if (allowedOrigins.length === 0) {
    return true
  }

  return allowedOrigins.includes(origin)
}
