import { NextRequest, NextResponse } from 'next/server'
import { buildCorsHeaders, isAllowedOrigin } from './src/modules/chatengine/adapters/http/cors'

export function middleware(request: NextRequest) {
  const origin = request.headers.get('origin')

  if (!origin || !isAllowedOrigin(origin)) {
    return request.method === 'OPTIONS'
      ? new NextResponse(null, { status: 204 })
      : NextResponse.next()
  }

  const headers = buildCorsHeaders(origin)

  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { status: 204, headers })
  }

  const response = NextResponse.next()
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value)
  })
  return response
}

export const config = {
  matcher: ['/api/:path*'],
}
