# Audit de Arquitetura - ChatEngine

**Nota:** Documento histórico (2024). Algumas referências a caminhos antigos (ex: `src/modules/chat`) foram preservadas para rastreabilidade. A estrutura atual do core está em `src/modules/chatengine`.

**Data:** 2024  
**Escopo:** Clean Architecture, SOLID, Manutenibilidade, Evolução Futura

---

## A) O QUE ESTÁ BEM FEITO ✅

### 1. **Separação de Camadas Clara**

- **Domain isolado:** `Message`, `Conversation`, `Attachment` são modelos puros, sem dependências externas
- **Direção de dependências correta:** Components → Store → API → Domain
- **API como gateway único:** `chatApi.ts` centraliza todas as chamadas HTTP
- **Store não conhece componentes:** `chatStore` é agnóstico de UI

### 2. **Provider Pattern Implementado**

- **Interface `WhatsAppProvider` bem definida:** Facilita troca de provedor (Evolution/Cloud API)
- **MockProvider para desenvolvimento:** Permite desenvolvimento sem integração real
- **Preparado para DIP (Dependency Inversion Principle):** Store/API podem receber provider via injeção

### 3. **Estado Otimista Bem Implementado**

- **`sendMessageOptimistic`:** Cria mensagem com status `pending` imediatamente
- **Reconciliação:** Substitui mensagem otimista pelo ID definitivo da API
- **Tratamento de erro:** Atualiza status para `failed` em caso de falha

### 4. **Polling Estruturado**

- **Configuração centralizada:** `POLL_INTERVAL_MS` em arquivo dedicado
- **Cursor baseado em timestamp:** `lastSeenMessageTimestamp` evita duplicação
- **Heurística de background:** Reduz frequência quando aba está oculta

### 5. **Regras de Arquitetura Respeitadas**

- **Componentes não fazem fetch direto:** Sempre via store → API
- **Store consome apenas API:** Não conhece detalhes de implementação
- **Comentários claros:** Documentação útil nos arquivos principais

---

## B) O QUE ESTÁ ACEITÁVEL (Trade-offs Conscientes) ⚠️

### 1. **MessageInput chama chatApi diretamente**

```typescript
// MessageInput.tsx linha 25, 141
import * as chatApi from '../api/chatApi'
const attachment = await chatApi.uploadAttachment(attachmentPreview.file)
```

**Análise:**
- ✅ **Justificado:** Upload precisa acontecer ANTES do envio da mensagem
- ✅ **Documentado:** Comentário explica o fluxo claramente
- ⚠️ **Trade-off:** Viola a regra "componentes não chamam API", mas é necessário

**Recomendação:** Manter como está. É um trade-off consciente e documentado.

### 2. **chatApi depende de authStore**

```typescript
// chatApi.ts linha 22, 54-58
import { useAuthStore } from '../store/authStore'
function getAuthToken(): string | null {
  return useAuthStore.getState().getToken()
}
```

**Análise:**
- ⚠️ **Dependência cruzada:** API depende de Store (não ideal em Clean Architecture)
- ✅ **Prático:** Token é necessário em todas as requisições
- ✅ **Alternativa seria:** Passar token como parâmetro em todas as funções (mais verboso)

**Recomendação:** Aceitável para este caso. Para evoluir, considerar injetar token via factory ou contexto.

### 3. **MessageBubble acessa store diretamente**

```typescript
// MessageBubble.tsx linha 12, 22
const { messagesByConversation, setReplyToMessage, conversations } = useChatStore()
```

**Análise:**
- ⚠️ **Acoplamento:** Componente acoplado ao store global
- ✅ **Alternativa seria:** Prop drilling (replyMessage, senderName via props)
- ✅ **Trade-off:** Store global é mais prático que passar 3-4 props adicionais

**Recomendação:** Aceitável. Evita prop drilling excessivo.

### 4. **Storage em memória**

```typescript
// storage.ts - Maps em module-scope
const conversations = new Map<string, Conversation>()
```

**Análise:**
- ✅ **Documentado:** Comentário indica que é temporário
- ✅ **Adequado para MVP:** Desenvolvimento e testes
- ⚠️ **Não escala:** Perde dados ao reiniciar servidor

**Recomendação:** OK para desenvolvimento. Preparar abstração para banco de dados real.

---

## C) O QUE É RISCO REAL 🔴

### 1. **MessageBubble viola OCP (Open/Closed Principle)**

**Problema:**
```typescript
// MessageBubble.tsx linha 64-148
const renderMessageContent = () => {
  if (message.attachments && message.attachments.length > 0) {
    return (
      <div>
        {attachment.type === 'image' && (/* JSX */)}
        {attachment.type === 'video' && (/* JSX */)}
        {attachment.type === 'audio' && (/* JSX */)}
        {attachment.type === 'file' && (/* JSX */)}
      </div>
    )
  }
}
```

**Riscos:**
- ❌ Para adicionar novo tipo (ex: `location`, `contact`, `poll`), precisa modificar `MessageBubble`
- ❌ Lógica de renderização misturada (image, video, audio, file)
- ❌ Componente cresce com cada novo tipo
- ❌ Dificulta testes unitários por tipo

**Impacto:**
- 🔴 **Alto ao adicionar IA:** Mensagens com preview de link, cards, etc
- 🔴 **Alto ao integrar WhatsApp real:** Novos tipos de mídia (stickers, contacts, locations)

**Recomendação:** **PRIORITÁRIO** - Refatorar para Strategy/Registry pattern (ver seção D)

---

### 2. **chatApi mistura responsabilidades**

**Problema:**
```typescript
// chatApi.ts
- Define interfaces (SendMessagePayload)
- Faz requisições HTTP
- Converte tipos (string → Date)
- Gerencia autenticação (getAuthToken)
- Define erros (AuthError)
```

**Riscos:**
- ⚠️ Arquivo vai crescer com novas funcionalidades
- ⚠️ Difícil testar isoladamente
- ⚠️ Responsabilidades misturadas (serialização, HTTP, auth)

**Impacto:**
- 🟡 **Médio:** Ainda funcional, mas vai doer com crescimento

**Recomendação:** **MÉDIO** - Separar em módulos menores quando necessário (não urgente)

---

### 3. **Falta abstração para Storage**

**Problema:**
```typescript
// storage.ts - Maps diretos
// Rotas API acessam diretamente
// Não há interface para trocar implementação
```

**Riscos:**
- ❌ Rotas API acopladas a Map em memória
- ❌ Difícil migrar para banco de dados
- ❌ Não testável com mocks

**Impacto:**
- 🔴 **Alto para produção:** Precisa de banco de dados real

**Recomendação:** **ALTO** - Criar interface `MessageRepository`, `ConversationRepository` (ver seção D)

---

### 4. **Hardcoded "me" como senderId**

**Problema:**
```typescript
// chatStore.ts linha 137
senderId: 'me',

// MessageBubble.tsx linha 55
isOwn={message.senderId === 'me'}
```

**Riscos:**
- ❌ Assume que usuário atual sempre tem ID "me"
- ❌ Não funciona com autenticação real
- ❌ Difícil testar cenários multi-usuário

**Impacto:**
- 🔴 **Alto para produção:** Precisa de user context real

**Recomendação:** **ALTO** - Criar `UserContext` ou `useCurrentUser()` hook

---

### 5. **Polling não tem backoff/retry**

**Problema:**
```typescript
// chatStore.ts linha 236-249
const pollMessages = async () => {
  try {
    // ...
  } catch (error) {
    console.error('Erro no polling:', error)
    // Não interrompe, mas não tem backoff
  }
}
```

**Riscos:**
- ⚠️ Em caso de falha de rede, continua tentando a cada 2s
- ⚠️ Pode gerar muitas requisições falhadas
- ⚠️ Não notifica usuário sobre problemas de conexão

**Impacto:**
- 🟡 **Médio:** Pode causar problemas em produção com rede instável

**Recomendação:** **MÉDIO** - Implementar backoff exponencial e estado de conexão

---

## D) RECOMENDAÇÕES PRÁTICAS E INCREMENTAIS 🛠️

### Prioridade ALTA (Fazer logo)

#### 1. Refatorar MessageBubble para Strategy Pattern

**Objetivo:** Permitir adicionar novos tipos de mensagem sem modificar `MessageBubble`

**Implementação:**

```typescript
// src/modules/chat/components/message-renderers/MessageRenderer.ts
export interface MessageRendererProps {
  message: Message
  attachment: Attachment
  isOwn: boolean
}

export interface MessageRenderer {
  canRender(attachment: Attachment): boolean
  render(props: MessageRendererProps): React.ReactNode
}

// src/modules/chat/components/message-renderers/ImageMessageRenderer.tsx
export class ImageMessageRenderer implements MessageRenderer {
  canRender(attachment: Attachment) {
    return attachment.type === 'image'
  }
  render({ message, attachment, isOwn }: MessageRendererProps) {
    // JSX atual de image
  }
}

// src/modules/chat/components/message-renderers/index.ts
export const messageRenderers: MessageRenderer[] = [
  new ImageMessageRenderer(),
  new VideoMessageRenderer(),
  new AudioMessageRenderer(), // Usa AudioMessage component
  new FileMessageRenderer(),
]

// MessageBubble.tsx - simplificado
const renderMessageContent = () => {
  if (message.attachments?.length > 0) {
    return message.attachments.map(attachment => {
      const renderer = messageRenderers.find(r => r.canRender(attachment))
      return renderer?.render({ message, attachment, isOwn }) || null
    })
  }
  return <TextMessageRenderer message={message} />
}
```

**Benefícios:**
- ✅ OCP: Adicionar novo tipo = criar novo renderer
- ✅ Testável: Cada renderer pode ser testado isoladamente
- ✅ Manutenível: Lógica separada por tipo

**Esforço:** 2-3 horas

---

#### 2. Criar abstração para Storage (Repository Pattern)

**Objetivo:** Facilitar migração para banco de dados real

**Implementação:**

```typescript
// src/modules/chat/repositories/ConversationRepository.ts
export interface ConversationRepository {
  findAll(): Promise<Conversation[]>
  findById(id: string): Promise<Conversation | null>
  save(conversation: Conversation): Promise<void>
  update(id: string, conversation: Partial<Conversation>): Promise<void>
}

// src/modules/chat/repositories/MessageRepository.ts
export interface MessageRepository {
  findByConversationId(conversationId: string, since?: Date): Promise<Message[]>
  save(message: Message): Promise<void>
  updateStatus(messageId: string, status: MessageStatus): Promise<void>
}

// src/modules/chat/repositories/InMemoryConversationRepository.ts
export class InMemoryConversationRepository implements ConversationRepository {
  // Implementação atual de storage.ts
}

// Rotas API usam repository
// src/app/api/chat/conversations/route.ts
import { conversationRepository } from '@/modules/chat/repositories'
export async function GET() {
  const conversations = await conversationRepository.findAll()
  return NextResponse.json(conversations)
}
```

**Benefícios:**
- ✅ DIP: Rotas dependem de interface, não implementação
- ✅ Testável: Pode mockar repository
- ✅ Evolutivo: Trocar implementação sem modificar rotas

**Esforço:** 3-4 horas

---

#### 3. Criar UserContext para currentUser

**Objetivo:** Remover hardcoded "me"

**Implementação:**

```typescript
// src/modules/chat/contexts/UserContext.tsx
export const UserContext = createContext<{ userId: string } | null>(null)

export function useCurrentUser() {
  const context = useContext(UserContext)
  if (!context) throw new Error('useCurrentUser must be within UserProvider')
  return context.userId
}

// chatStore.ts
const userId = useCurrentUser() // ou injetar
senderId: userId, // em vez de 'me'

// MessageBubble.tsx
const currentUserId = useCurrentUser()
isOwn={message.senderId === currentUserId}
```

**Benefícios:**
- ✅ Remove hardcode
- ✅ Prepara para autenticação real
- ✅ Testável com diferentes usuários

**Esforço:** 1-2 horas

---

### Prioridade MÉDIA (Fazer quando necessário)

#### 4. Separar chatApi em módulos menores

**Quando fazer:** Quando `chatApi.ts` passar de ~250 linhas

**Estrutura sugerida:**
```
api/
  chatApi.ts (orquestrador, re-exporta tudo)
  http/
    client.ts (fetchWithAuth, getAuthToken)
    errors.ts (AuthError)
  serializers/
    messageSerializer.ts (converte Date)
    conversationSerializer.ts
  endpoints/
    conversations.ts
    messages.ts
    attachments.ts
```

**Esforço:** 2-3 horas (quando necessário)

---

#### 5. Adicionar backoff no polling

**Implementação:**

```typescript
// chatStore.ts
let retryCount = 0
const MAX_RETRIES = 5

const pollMessages = async () => {
  try {
    // ... código atual
    retryCount = 0 // Reset em caso de sucesso
  } catch (error) {
    retryCount++
    if (retryCount >= MAX_RETRIES) {
      // Notificar usuário sobre problema de conexão
      set({ connectionStatus: 'disconnected' })
    }
    // Backoff exponencial
    await new Promise(resolve => 
      setTimeout(resolve, Math.min(1000 * Math.pow(2, retryCount), 30000))
    )
  }
}
```

**Esforço:** 1-2 horas

---

### Prioridade BAIXA (Melhorias futuras)

#### 6. Considerar Command Pattern para ações do store

**Quando:** Se o store crescer muito (10+ actions)

**Benefício:** Facilita undo/redo, logging, testes

**Esforço:** 4-6 horas (não prioritário agora)

---

#### 7. Extrair lógica de polling para hook

**Implementação:**

```typescript
// hooks/usePolling.ts
export function usePolling(
  conversationId: string | null,
  pollFn: () => Promise<void>,
  interval: number
) {
  // Lógica de polling isolada
}
```

**Benefício:** Reutilizável, testável

**Esforço:** 1 hora

---

## RESUMO EXECUTIVO

### ✅ Pontos Fortes
1. Separação de camadas clara e respeitada
2. Provider pattern preparado para WhatsApp real
3. Estado otimista bem implementado
4. Estrutura de pastas organizada

### ⚠️ Trade-offs Aceitáveis
1. MessageInput chama API diretamente (justificado)
2. chatApi depende de authStore (prático)
3. MessageBubble acessa store (evita prop drilling)

### 🔴 Riscos Prioritários
1. **MessageBubble viola OCP** → Refatorar para Strategy (ALTA)
2. **Falta abstração Storage** → Repository Pattern (ALTA)
3. **Hardcoded "me"** → UserContext (ALTA)
4. **Polling sem backoff** → Implementar retry (MÉDIA)

### 📊 Priorização de Ações

**Sprint 1 (Alto Impacto, Baixo Esforço):**
1. UserContext (1-2h) - Remove hardcode crítico
2. MessageRenderer Strategy (2-3h) - Facilita evolução

**Sprint 2 (Preparação para Produção):**
3. Repository Pattern (3-4h) - Necessário para banco de dados
4. Polling com backoff (1-2h) - Melhora robustez

**Futuro:**
5. Separar chatApi (quando necessário)
6. Extrair polling para hook (opcional)

---

## CONCLUSÃO

O projeto está **bem arquitetado para o estágio atual**. As violações identificadas são:
- **Conscientes e documentadas** (MessageInput → API)
- **Práticas e justificáveis** (chatApi → authStore)
- **Riscos futuros** que podem ser mitigados incrementalmente

**Recomendação geral:** Focar nas 3 ações de **Prioridade ALTA** antes de integrar WhatsApp real ou adicionar novos tipos de mensagem. As demais podem ser feitas conforme necessário.

