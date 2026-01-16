const DEFAULT_ALLOWED_METHODS = 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
const DEFAULT_ALLOWED_HEADERS = 'Authorization, Content-Type, X-Requested-With'

function parseAllowedOrigins(): string[] {
  const raw = process.env.CORS_ALLOWED_ORIGINS || ''
  if (!raw.trim()) return []
  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0)
}

function isLovableOrigin(hostname: string): boolean {
  return hostname.endsWith('.lovable.app')
}

export function isAllowedOrigin(origin: string): boolean {
  try {
    const url = new URL(origin)
    if (url.protocol !== 'https:') return false

    if (isLovableOrigin(url.hostname)) {
      return true
    }

    const allowlist = parseAllowedOrigins()
    return allowlist.includes(origin)
  } catch {
    return false
  }
}

export function buildCorsHeaders(origin: string): HeadersInit {
  return {
    'Access-Control-Allow-Origin': origin,
    Vary: 'Origin',
    'Access-Control-Allow-Methods': DEFAULT_ALLOWED_METHODS,
    'Access-Control-Allow-Headers': DEFAULT_ALLOWED_HEADERS,
  }
}
