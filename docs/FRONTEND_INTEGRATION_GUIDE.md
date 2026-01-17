# Guia de Integração Frontend (Lovable) com ChatEngine

Este documento descreve como integrar o frontend do Lovable com o ChatEngine para exibir e gerenciar conversas e mensagens do WhatsApp.

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Autenticação](#autenticação)
- [Configuração CORS](#configuração-cors)
- [Endpoints Disponíveis](#endpoints-disponíveis)
- [Estrutura de Dados](#estrutura-de-dados)
- [Exemplos de Uso](#exemplos-de-uso)
- [Tratamento de Erros](#tratamento-de-erros)
- [Polling e Atualizações em Tempo Real](#polling-e-atualizações-em-tempo-real)

---

## 🎯 Visão Geral

O ChatEngine expõe uma API REST que permite ao frontend:
- Listar conversas do workspace
- Buscar mensagens de uma conversa
- Enviar mensagens (texto, mídia, arquivos)
- Fazer upload de anexos
- Acessar contexto de mensagens

**Base URL:** `https://SEU_DOMINIO_CHATENGINE/api/chat`

**Todos os endpoints exigem autenticação via JWT Bearer Token.**

---

## 🔐 Autenticação

### Requisitos do JWT

O ChatEngine valida tokens JWT no formato Bearer Token. O JWT **deve conter**:

**Claims obrigatórios:**
- `workspace_id` (ou `workspaceId` ou `workspace`) - **UUID do workspace do cliente**

**Claims opcionais:**
- `sub` (ou `user_id` ou `userId`) - ID do usuário logado
- `iss` - Issuer (validado se `CHATENGINE_JWT_ISSUER` estiver configurado)
- `aud` - Audience (validado se `CHATENGINE_JWT_AUDIENCE` estiver configurado)

**Algoritmo:** `HS256`  
**Secret:** `CHATENGINE_JWT_SECRET` (variável de ambiente no ChatEngine)

### Exemplo de JWT Payload

```json
{
  "workspace_id": "d28035ee-c2cb-4f8e-9f3a-1a2b3c4d5e6f",
  "sub": "user_123",
  "iat": 1704067200,
  "exp": 1704153600
}
```

### Como usar no Frontend

```typescript
// Todas as requisições devem incluir o header Authorization
const headers = {
  'Authorization': `Bearer ${jwtToken}`,
  'Content-Type': 'application/json'
}
```

---

## 🌐 Configuração CORS

O ChatEngine já está configurado para aceitar requisições do Lovable:

**Origens permitidas automaticamente:**
- `https://crm.newflow.me`
- Domínios `.lovable.app` (qualquer subdomínio)
- `http://localhost:3000` (desenvolvimento)
- `http://localhost:5173` (desenvolvimento)

**Origens adicionais via env var:**
- `CORS_ALLOWED_ORIGINS` (lista separada por vírgula)

**Headers permitidos:**
- `Authorization`
- `Content-Type`
- `X-Requested-With`
- `x-workspace-id`

Não é necessário configurar nada no frontend. O CORS é gerenciado automaticamente pelo ChatEngine.

---

## 📡 Endpoints Disponíveis

### 1. Listar Conversas

**GET** `/api/chat/conversations`

Retorna todas as conversas do workspace autenticado.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Resposta (200):**
```json
[
  {
    "id": "5511999999999@s.whatsapp.net",
    "workspaceId": "d28035ee-c2cb-4f8e-9f3a-1a2b3c4d5e6f",
    "contactId": "5511999999999@s.whatsapp.net",
    "whatsappNumberId": "fcda8bba-1234-5678-90ab-cdef12345678",
    "channel": "whatsapp",
    "participants": [
      {
        "id": "5511999999999@s.whatsapp.net",
        "name": "João Silva",
        "avatar": null
      }
    ],
    "lastMessage": {
      "id": "msg-1234567890",
      "content": "Olá!",
      "senderId": "5511999999999@s.whatsapp.net",
      "createdAt": "2024-01-15T10:30:00.000Z"
    },
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
]
```

---

### 2. Buscar Mensagens

**GET** `/api/chat/messages?conversationId=<id>&since=<timestamp>&limit=<number>`

Retorna mensagens de uma conversa específica.

**Query Parameters:**
- `conversationId` (obrigatório) - ID da conversa (JID do WhatsApp)
- `since` (opcional) - Timestamp ISO para buscar apenas mensagens após essa data (útil para polling)
- `limit` (opcional) - Número máximo de mensagens a retornar

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Exemplo:**
```
GET /api/chat/messages?conversationId=5511999999999@s.whatsapp.net&since=2024-01-15T10:00:00.000Z
```

**Resposta (200):**
```json
[
  {
    "id": "msg-1234567890",
    "workspaceId": "d28035ee-c2cb-4f8e-9f3a-1a2b3c4d5e6f",
    "conversationId": "5511999999999@s.whatsapp.net",
    "senderId": "5511999999999@s.whatsapp.net",
    "type": "text",
    "content": "Olá!",
    "replyToMessageId": null,
    "attachments": null,
    "status": "sent",
    "metadata": {
      "providerMessageId": "3EB01234567890ABCDEF"
    },
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": null
  }
]
```

---

### 3. Enviar Mensagem

**POST** `/api/chat/messages`

Envia uma nova mensagem (texto ou mídia).

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Body:**
```json
{
  "conversationId": "5511999999999@s.whatsapp.net",
  "type": "text",
  "content": "Mensagem de texto",
  "replyToMessageId": "msg-1234567890", // opcional - para responder uma mensagem
  "whatsappNumberId": "fcda8bba-1234-5678-90ab-cdef12345678", // opcional - busca da conversation se não fornecido
  "attachments": [] // obrigatório para tipos != text
}
```

**Tipos de mensagem:**
- `text` - Mensagem de texto
- `image` - Imagem com caption opcional
- `video` - Vídeo com caption opcional
- `audio` - Áudio
- `file` - Arquivo/documento

**Exemplo - Mensagem de texto:**
```json
{
  "conversationId": "5511999999999@s.whatsapp.net",
  "type": "text",
  "content": "Olá, como posso ajudar?"
}
```

**Exemplo - Mensagem com mídia:**
```json
{
  "conversationId": "5511999999999@s.whatsapp.net",
  "type": "image",
  "content": "Veja esta imagem",
  "attachments": [
    {
      "id": "att-1234567890",
      "type": "image",
      "url": "https://storage.supabase.co/...",
      "metadata": {
        "filename": "imagem.jpg",
        "size": 123456,
        "mimeType": "image/jpeg"
      }
    }
  ]
}
```

**Resposta (201):**
```json
{
  "id": "msg-1234567891",
  "workspaceId": "d28035ee-c2cb-4f8e-9f3a-1a2b3c4d5e6f",
  "conversationId": "5511999999999@s.whatsapp.net",
  "senderId": "user_123",
  "type": "text",
  "content": "Mensagem de texto",
  "status": "sent",
  "createdAt": "2024-01-15T10:35:00.000Z"
}
```

---

### 4. Upload de Anexo

**POST** `/api/chat/attachments`

Faz upload de um arquivo (imagem, vídeo, áudio ou documento) e retorna o `Attachment` para usar ao enviar mensagens.

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: multipart/form-data
```

**Body (FormData):**
```
file: File
```

**Resposta (201):**
```json
{
  "id": "att-1234567890",
  "messageId": "",
  "type": "image",
  "url": "https://storage.supabase.co/...",
  "thumbnailUrl": null,
  "metadata": {
    "filename": "imagem.jpg",
    "size": 123456,
    "mimeType": "image/jpeg",
    "storagePath": "d28035ee-c2cb-4f8e-9f3a-1a2b3c4d5e6f/1704067200000-uuid.jpg"
  }
}
```

**Fluxo recomendado:**
1. Fazer upload do anexo via `/api/chat/attachments`
2. Usar o `Attachment` retornado no campo `attachments` ao enviar mensagem via `/api/chat/messages`

---

### 5. Buscar Contexto de Mensagem

**GET** `/api/chat/messages/{messageId}/context`

Retorna contexto de uma mensagem (útil para ações contextuais no SaaS).

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Resposta (200):**
```json
{
  "message": {
    "id": "msg-1234567890",
    "content": "...",
    "conversationId": "..."
  },
  "conversation": {
    "id": "...",
    "contactId": "..."
  },
  "workspace_id": "d28035ee-c2cb-4f8e-9f3a-1a2b3c4d5e6f"
}
```

---

### 6. Proxy de Mídia

**GET** `/api/chat/media?providerMessageId=<id>&attachmentId=<id>`

Proxy para acessar mídias do Evolution API através do ChatEngine (com autenticação).

**Query Parameters:**
- `providerMessageId` (obrigatório) - ID da mensagem no Evolution
- `attachmentId` (obrigatório) - ID do attachment na mensagem

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Resposta:** Stream da mídia (imagem, vídeo, áudio)

---

## 📊 Estrutura de Dados

### Conversation

```typescript
interface Conversation {
  id: string                    // JID do WhatsApp (ex: "5511999999999@s.whatsapp.net")
  workspaceId: string           // UUID do workspace
  contactId: string             // ID do contato
  whatsappNumberId?: string     // UUID da instância WhatsApp (tabela whatsapp_numbers)
  channel: 'whatsapp'
  participants: Array<{
    id: string
    name?: string
    avatar?: string
  }>
  lastMessage?: {
    id: string
    content: string
    senderId: string
    createdAt: string
  }
  updatedAt: string
}
```

### Message

```typescript
interface Message {
  id: string                    // ID único da mensagem
  workspaceId: string
  conversationId: string        // JID do WhatsApp
  senderId: string              // ID do remetente (usuário ou JID)
  type: 'text' | 'image' | 'video' | 'audio' | 'file'
  content: string
  replyToMessageId?: string
  attachments?: Attachment[]
  status: 'sent' | 'delivered' | 'read' | 'failed'
  metadata?: {
    providerMessageId?: string  // ID da mensagem no Evolution
  }
  createdAt: string
  updatedAt?: string
}
```

### Attachment

```typescript
interface Attachment {
  id: string
  messageId: string
  type: 'image' | 'video' | 'audio' | 'file'
  url: string
  thumbnailUrl?: string
  metadata?: {
    filename: string
    size: number
    mimeType: string
    storagePath?: string
  }
}
```

---

## 💻 Exemplos de Uso

### Exemplo 1: Listar Conversas (React/TypeScript)

```typescript
async function getConversations(jwtToken: string): Promise<Conversation[]> {
  const response = await fetch('https://chatengine.example.com/api/chat/conversations', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${jwtToken}`,
      'Content-Type': 'application/json'
    }
  })

  if (!response.ok) {
    throw new Error(`Erro ao buscar conversas: ${response.status}`)
  }

  return response.json()
}
```

### Exemplo 2: Enviar Mensagem de Texto

```typescript
async function sendTextMessage(
  jwtToken: string,
  conversationId: string,
  text: string
): Promise<Message> {
  const response = await fetch('https://chatengine.example.com/api/chat/messages', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwtToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      conversationId,
      type: 'text',
      content: text
    })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || `Erro ao enviar mensagem: ${response.status}`)
  }

  return response.json()
}
```

### Exemplo 3: Upload e Enviar Imagem

```typescript
async function uploadAndSendImage(
  jwtToken: string,
  conversationId: string,
  file: File,
  caption?: string
): Promise<Message> {
  // 1. Upload do arquivo
  const formData = new FormData()
  formData.append('file', file)

  const uploadResponse = await fetch('https://chatengine.example.com/api/chat/attachments', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwtToken}`
    },
    body: formData
  })

  if (!uploadResponse.ok) {
    throw new Error('Erro ao fazer upload do arquivo')
  }

  const attachment = await uploadResponse.json()

  // 2. Enviar mensagem com o attachment
  const messageResponse = await fetch('https://chatengine.example.com/api/chat/messages', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwtToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      conversationId,
      type: 'image',
      content: caption || '',
      attachments: [attachment]
    })
  })

  if (!messageResponse.ok) {
    throw new Error('Erro ao enviar mensagem')
  }

  return messageResponse.json()
}
```

### Exemplo 4: Buscar Mensagens com Polling

```typescript
async function getMessagesSince(
  jwtToken: string,
  conversationId: string,
  since: Date
): Promise<Message[]> {
  const url = new URL('https://chatengine.example.com/api/chat/messages')
  url.searchParams.set('conversationId', conversationId)
  url.searchParams.set('since', since.toISOString())

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${jwtToken}`,
      'Content-Type': 'application/json'
    }
  })

  if (!response.ok) {
    throw new Error(`Erro ao buscar mensagens: ${response.status}`)
  }

  return response.json()
}

// Uso com polling
setInterval(async () => {
  const lastMessageTime = new Date(Date.now() - 60000) // última minuta
  const newMessages = await getMessagesSince(jwtToken, conversationId, lastMessageTime)
  // Atualizar UI com novas mensagens
}, 5000) // Polling a cada 5 segundos
```

---

## ⚠️ Tratamento de Erros

### Status HTTP Comuns

**401 - Unauthorized**
```json
{ "error": "Token de autenticação ausente ou inválido" }
```
- Verificar se o JWT está sendo enviado no header `Authorization`
- Verificar se o JWT contém `workspace_id`
- Verificar se o JWT não expirou

**403 - Forbidden**
```json
{ "error": "workspace_id ausente no token" }
```
- JWT não contém o claim `workspace_id` (ou `workspaceId`/`workspace`)

**400 - Bad Request**
```json
{ "error": "conversationId, type e content são obrigatórios" }
```
- Campos obrigatórios faltando no body da requisição

**404 - Not Found**
```json
{ "error": "Conversa não encontrada" }
```
- `conversationId` não existe ou não pertence ao workspace

**500 - Internal Server Error**
```json
{ "error": "Erro interno do servidor" }
```
- Erro no servidor ChatEngine (verificar logs)

### Exemplo de Tratamento

```typescript
async function safeApiCall<T>(apiCall: () => Promise<Response>): Promise<T> {
  try {
    const response = await apiCall()
    
    if (response.status === 401) {
      // Token inválido - redirecionar para login
      window.location.href = '/login'
      throw new Error('Sessão expirada')
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Erro desconhecido' }))
      throw new Error(error.error || `Erro HTTP ${response.status}`)
    }

    return response.json()
  } catch (error) {
    console.error('Erro na chamada da API:', error)
    throw error
  }
}
```

---

## 🔄 Polling e Atualizações em Tempo Real

O ChatEngine suporta **polling incremental** usando o parâmetro `since`:

```typescript
class ChatPolling {
  private lastMessageTime: Date = new Date(0)

  async pollNewMessages(jwtToken: string, conversationId: string): Promise<Message[]> {
    const messages = await getMessagesSince(
      jwtToken,
      conversationId,
      this.lastMessageTime
    )

    if (messages.length > 0) {
      this.lastMessageTime = new Date(messages[messages.length - 1].createdAt)
    }

    return messages
  }

  start(jwtToken: string, conversationId: string, callback: (messages: Message[]) => void) {
    const interval = setInterval(async () => {
      try {
        const newMessages = await this.pollNewMessages(jwtToken, conversationId)
        if (newMessages.length > 0) {
          callback(newMessages)
        }
      } catch (error) {
        console.error('Erro no polling:', error)
      }
    }, 3000) // Polling a cada 3 segundos

    return () => clearInterval(interval)
  }
}
```

**Nota:** Para atualizações em tempo real, recomenda-se implementar WebSockets no futuro ou usar um serviço de polling mais sofisticado.

---

## 📝 Checklist de Integração

- [ ] Obter JWT com `workspace_id` do workspace do cliente
- [ ] Configurar base URL do ChatEngine no frontend
- [ ] Implementar função de autenticação (adicionar Bearer token)
- [ ] Criar hooks/services para chamadas da API
- [ ] Implementar listagem de conversas
- [ ] Implementar listagem de mensagens
- [ ] Implementar envio de mensagens (texto)
- [ ] Implementar upload e envio de mídia
- [ ] Implementar polling para novas mensagens
- [ ] Tratamento de erros (401, 403, 400, 500)
- [ ] Feedback visual (loading, erros, sucesso)

---

## 🔗 URLs de Referência

- **Base URL:** `https://chatengine.example.com` (configurável)
- **API Base:** `/api/chat`
- **Webhooks:** `/api/webhooks/whatsapp` (não usado pelo frontend)

---

## 📞 Suporte

Para dúvidas ou problemas na integração:
1. Verificar logs do ChatEngine
2. Verificar se o JWT está correto (workspace_id presente)
3. Verificar CORS se houver erros de conexão
4. Testar endpoints com `curl` ou Postman primeiro

---

**Última atualização:** Janeiro 2024
