import { NextRequest, NextResponse } from 'next/server'
import { chatEngine } from '@/modules/chatengine/composition/root'

function requireWorkerToken(request: NextRequest): boolean {
  const token = request.headers.get('x-outbox-token')
  const expected = process.env.OUTBOX_WORKER_TOKEN
  if (!expected || !expected.trim()) return false
  return token === expected
}

export async function POST(request: NextRequest) {
  if (!requireWorkerToken(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const limit = Number(body.limit || 10)

  try {
    const result = await chatEngine.useCases.processOutboxBatch(limit)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Erro ao processar outbox:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
