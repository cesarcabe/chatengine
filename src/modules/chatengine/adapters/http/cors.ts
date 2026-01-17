const DEFAULT_ALLOWED_METHODS = 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
const DEFAULT_ALLOWED_HEADERS = 'Authorization, Content-Type, X-Requested-With, x-workspace-id'

// Origens permitidas por padrão (incluindo domínios do Lovable)
const DEFAULT_ALLOWED_ORIGINS = [
  'https://crm.newflow.me',
  'http://localhost:3000',
  'http://localhost:5173',
]

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
    
    // Aceita HTTP apenas para localhost
    if (url.protocol !== 'https:' && !origin.startsWith('http://localhost')) {
      return false
    }

    // Permite domínios .lovable.app
    if (isLovableOrigin(url.hostname)) {
      return true
    }

    // Verifica lista padrão
    if (DEFAULT_ALLOWED_ORIGINS.includes(origin)) {
      return true
    }

    // Verifica variável de ambiente
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
    'Access-Control-Allow-Credentials': 'true',
  }
}

/**
 * Helper para aplicar headers CORS em uma resposta NextResponse
 */
export function setCorsHeaders(origin: string | null, response: Response): Response {
  if (!origin || !isAllowedOrigin(origin)) {
    return response
  }

  const corsHeaders = buildCorsHeaders(origin)
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value)
  })

  return response
}

/**
 * Helper para lidar com requisições OPTIONS (preflight)
 * Retorna null se a origem não for permitida
 */
export function handleCorsPreflightRequest(origin: string | null): Response | null {
  if (!origin || !isAllowedOrigin(origin)) {
    return null
  }

  const headers = buildCorsHeaders(origin)
  return new Response(null, { status: 204, headers })
}
