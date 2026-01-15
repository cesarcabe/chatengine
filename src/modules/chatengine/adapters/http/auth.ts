import { NextRequest, NextResponse } from 'next/server'
import { JWTPayload, jwtVerify } from 'jose'

export type AuthContext = {
  token: string
  workspaceId: string
  userId?: string
  claims: JWTPayload
}

type AuthResult = { auth: AuthContext } | { response: NextResponse }

function getBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return null
  const [scheme, token] = authHeader.split(' ')
  if (scheme !== 'Bearer' || !token) return null
  return token
}

function getJwtSecret(): Uint8Array | null {
  const secret = process.env.CHATENGINE_JWT_SECRET || process.env.JWT_SECRET
  if (!secret || !secret.trim()) return null
  return new TextEncoder().encode(secret)
}

function extractWorkspaceId(claims: JWTPayload): string | null {
  const workspaceId =
    (typeof claims.workspace_id === 'string' && claims.workspace_id) ||
    (typeof (claims as any).workspaceId === 'string' && (claims as any).workspaceId) ||
    (typeof (claims as any).workspace === 'string' && (claims as any).workspace)
  return workspaceId || null
}

function extractUserId(claims: JWTPayload): string | undefined {
  if (typeof claims.sub === 'string' && claims.sub) return claims.sub
  if (typeof (claims as any).user_id === 'string') return (claims as any).user_id
  if (typeof (claims as any).userId === 'string') return (claims as any).userId
  return undefined
}

export async function requireWorkspace(request: NextRequest): Promise<AuthResult> {
  const token = getBearerToken(request)
  if (!token) {
    return {
      response: NextResponse.json(
        { error: 'Token de autenticação ausente ou inválido' },
        { status: 401 }
      ),
    }
  }

  const secret = getJwtSecret()
  if (!secret) {
    return {
      response: NextResponse.json(
        { error: 'Autenticação não configurada no servidor' },
        { status: 500 }
      ),
    }
  }

  try {
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ['HS256'],
      issuer: process.env.CHATENGINE_JWT_ISSUER || undefined,
      audience: process.env.CHATENGINE_JWT_AUDIENCE || undefined,
    })

    const workspaceId = extractWorkspaceId(payload)
    if (!workspaceId) {
      return {
        response: NextResponse.json(
          { error: 'workspace_id ausente no token' },
          { status: 403 }
        ),
      }
    }

    return {
      auth: {
        token,
        workspaceId,
        userId: extractUserId(payload),
        claims: payload,
      },
    }
  } catch (error) {
    console.error('Falha ao validar JWT:', error)
    return {
      response: NextResponse.json(
        { error: 'Token de autenticação inválido' },
        { status: 401 }
      ),
    }
  }
}
