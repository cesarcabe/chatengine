import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const origin = request.headers.get('origin')
  const allowedOrigins = [
    'https://crm.newflow.me',
    'https://lovable.dev/projects/8b4ff0b8-5b36-414a-a11c-984247e37a62',
    'http://localhost:3000',
    'http://localhost:5173'
  ]

  // Preflight OPTIONS
  if (request.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 204 })
    
    if (origin && allowedOrigins.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin)
    }
    
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Requested-With, x-workspace-id')
    response.headers.set('Access-Control-Allow-Credentials', 'true')
    response.headers.set('Access-Control-Max-Age', '86400')
    
    return response
  }

  // Requisições normais - continua para a rota
  const response = NextResponse.next()
  
  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin)
  }
  
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Requested-With, x-workspace-id')
  response.headers.set('Access-Control-Allow-Credentials', 'true')
  
  return response
}

export const config = {
  matcher: '/api/:path*',
}