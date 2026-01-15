/**
 * Chat API (Gateway)
 * 
 * Gateway único para comunicação com a Chat API.
 * Chama rotas internas /api/chat do próprio projeto.
 * 
 * O store é o único consumidor desta API.
 * Componentes NUNCA chamam fetch diretamente.
 * 
 * Preparado para futura integração com WhatsApp / Evolution API.
 * 
 * FUNÇÕES EXPOSAS:
 * - getConversations()
 * - getMessages(conversationId, options?)
 * - sendMessage(payload)
 * - uploadAttachment(file)
 */

import { Conversation } from '@/modules/chatengine/domain/Conversation'
import { Message, MessageType } from '@/modules/chatengine/domain/Message'
import { Attachment } from '@/modules/chatengine/domain/Attachment'
import { useAuthStore } from '../store/authStore'

// Payload para envio de mensagem
export interface SendMessagePayload {
  conversationId: string
  type: MessageType
  content: string
  replyToMessageId?: string
  attachments?: Attachment[]
}

// Opções para getMessages (suporte a polling)
export interface GetMessagesOptions {
  since?: Date | string // Timestamp para buscar apenas mensagens após essa data
}

// Base URL da API (rotas internas)
const API_BASE_URL = '/api/chat'

/**
 * Erro de autenticação
 */
export class AuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuthError'
  }
}

/**
 * Obtém token de autenticação do store
 */
function getAuthToken(): string | null {
  if (typeof window === 'undefined') {
    return null
  }
  return useAuthStore.getState().getToken()
}

/**
 * Faz requisição HTTP com autenticação
 */
async function fetchWithAuth(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getAuthToken()

  if (!token) {
    throw new AuthError('Token de autenticação ausente')
  }

  const headers = new Headers(options.headers)
  headers.set('Authorization', `Bearer ${token}`)
  headers.set('Content-Type', 'application/json')

  const response = await fetch(url, {
    ...options,
    headers,
  })

  if (response.status === 401) {
    throw new AuthError('Token de autenticação inválido')
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Erro desconhecido' }))
    throw new Error(error.error || `HTTP ${response.status}`)
  }

  return response
}

/**
 * Busca lista de conversas
 */
export async function getConversations(): Promise<Conversation[]> {
  const response = await fetchWithAuth(`${API_BASE_URL}/conversations`)
  const data = await response.json()
  
  // Converte dates de string para Date
  return data.map((conv: any) => ({
    ...conv,
    updatedAt: new Date(conv.updatedAt),
    lastMessage: conv.lastMessage
      ? {
          ...conv.lastMessage,
          createdAt: new Date(conv.lastMessage.createdAt),
        }
      : undefined,
  }))
}

/**
 * Busca mensagens de uma conversa
 * Suporta polling via parâmetro since
 */
export async function getMessages(
  conversationId: string,
  options?: GetMessagesOptions
): Promise<Message[]> {
  const params = new URLSearchParams({ conversationId })
  
  if (options?.since) {
    const sinceDate = typeof options.since === 'string' 
      ? options.since 
      : options.since.toISOString()
    params.set('since', sinceDate)
  }

  const response = await fetchWithAuth(`${API_BASE_URL}/messages?${params.toString()}`)
  const data = await response.json()
  
  // Converte dates de string para Date
  return data.map((msg: any) => ({
    ...msg,
    createdAt: new Date(msg.createdAt),
    updatedAt: msg.updatedAt ? new Date(msg.updatedAt) : undefined,
  }))
}

/**
 * Envia uma nova mensagem
 * Retorna mensagem com ID definitivo e status 'sent'
 */
export async function sendMessage(payload: SendMessagePayload): Promise<Message> {
  const { conversationId, type, content, replyToMessageId, attachments } = payload

  const response = await fetchWithAuth(`${API_BASE_URL}/messages`, {
    method: 'POST',
    body: JSON.stringify({
      conversationId,
      type,
      content,
      replyToMessageId,
      attachments,
    }),
  })

  const data = await response.json()
  
  // Converte dates de string para Date
  return {
    ...data,
    createdAt: new Date(data.createdAt),
    updatedAt: data.updatedAt ? new Date(data.updatedAt) : undefined,
  }
}

/**
 * Faz upload de um anexo (imagem, vídeo, áudio ou arquivo)
 * Retorna Attachment com URL
 * 
 * IMPORTANTE: Upload ≠ Envio de mensagem
 * O upload deve ser feito ANTES do envio da mensagem
 */
export async function uploadAttachment(file: File): Promise<Attachment> {
  const token = getAuthToken()

  if (!token) {
    throw new AuthError('Token de autenticação ausente')
  }

  const formData = new FormData()
  formData.append('file', file)

  const headers = new Headers()
  headers.set('Authorization', `Bearer ${token}`)

  const response = await fetch(`${API_BASE_URL}/attachments`, {
    method: 'POST',
    headers,
    body: formData,
  })

  if (response.status === 401) {
    throw new AuthError('Token de autenticação inválido')
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Erro desconhecido' }))
    throw new Error(error.error || `HTTP ${response.status}`)
  }

  const data = await response.json()
  return data
}

