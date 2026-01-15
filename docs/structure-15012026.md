# Estrutura Atual + Recomendações de Ajuste

**Nota:** Documento histórico (15/01/2026). Algumas referências a caminhos antigos (ex: `src/modules/chat`) foram preservadas para rastreabilidade. A estrutura atual do core está em `src/modules/chatengine`.

Este documento registra a estrutura do repositório na época (excluindo `node_modules` e `.next`) e recomendações do que **modificar**, **adicionar** e **excluir** para aderir totalmente às diretrizes do audit de 15/01/2026.

## Estrutura Atual (arquivos)

```
.eslintrc.json
.gitignore
ARCHITECTURE_AUDIT.md
audit-15012026.md
ChatEngine.code-workspace
next-env.d.ts
next.config.js
package-lock.json
package.json
postcss.config.js
README.md
tailwind.config.ts
tsconfig.json
src/app/globals.css
src/app/layout.tsx
src/app/page.tsx
src/app/providers.tsx
src/app/api/chat/attachments/route.ts
src/app/api/chat/conversations/route.ts
src/app/api/chat/media/route.ts
src/app/api/chat/messages/route.ts
src/app/api/webhooks/whatsapp/route.ts
src/app/chat/page.tsx
src/modules/chat/index.ts
src/modules/chat/api/chatApi.ts
src/modules/chat/api/storage.ts
src/modules/chat/components/AudioMessage.tsx
src/modules/chat/components/ConversationList.tsx
src/modules/chat/components/EmojiPicker.tsx
src/modules/chat/components/MessageBubble.tsx
src/modules/chat/components/MessageInput.tsx
src/modules/chat/components/MessageList.tsx
src/modules/chat/components/ReplyPreview.tsx
src/modules/chat/components/message-renderers/AudioMessageRenderer.tsx
src/modules/chat/components/message-renderers/FileMessageRenderer.tsx
src/modules/chat/components/message-renderers/ImageMessageRenderer.tsx
src/modules/chat/components/message-renderers/index.ts
src/modules/chat/components/message-renderers/MessageRenderer.ts
src/modules/chat/components/message-renderers/TextMessageRenderer.tsx
src/modules/chat/components/message-renderers/VideoMessageRenderer.tsx
src/modules/chat/config/polling.ts
src/modules/chat/contexts/UserContext.tsx
src/modules/chat/domain/Attachment.ts
src/modules/chat/domain/Conversation.ts
src/modules/chat/domain/Message.ts
src/modules/chat/hooks/useAudioRecorder.ts
src/modules/chat/hooks/useConversations.ts
src/modules/chat/hooks/useMessages.ts
src/modules/chat/providers/EvolutionWhatsAppProvider.ts
src/modules/chat/providers/index.ts
src/modules/chat/providers/whatsappProvider.ts
src/modules/chat/repositories/ConversationRepository.ts
src/modules/chat/repositories/index.ts
src/modules/chat/repositories/InMemoryConversationRepository.ts
src/modules/chat/repositories/InMemoryMessageRepository.ts
src/modules/chat/repositories/MessageRepository.ts
src/modules/chat/store/authStore.ts
src/modules/chat/store/chatStore.ts
src/modules/chat/store/userStore.ts
src/modules/chat/utils/conversationId.ts
src/modules/chat/utils/evolutionWebhook.ts
src/modules/chat/utils/normalizeJid.ts
src/modules/chat/utils/origin.ts
```

---

## Recomendações para aderir ao audit

### Modificar (e por quê)
- **Handlers HTTP**: mover lógica de negócio para casos de uso (Application layer) e deixar as rotas como orquestração mínima.
- **Domain**: adicionar `workspace_id`, `provider`, `external_message_id`, invariantes de imutabilidade e status.
- **Repositories**: substituir `InMemory*` por implementações Supabase/Postgres reais.
- **Webhook flow**: transformar evento em fato persistido com idempotência e processamento eventual.
- **Auth**: substituir `verifyToken` mock por JWT validado e derivar `workspace_id` confiável.
- **Media**: substituir data URLs por storage real com URLs assinadas expiráveis.

### Adicionar (o que falta)
- **Camada Application**: casos de uso como `IngestWebhook`, `SendMessage`, `UpdateStatus`.
- **Camada Infrastructure**: repositórios Supabase, storage de mídia, provider adapters.
- **Outbox/Jobs**: fila para envio confiável e reprocessamento.
- **Event log**: tabela de fatos (`message_facts` ou `message_events`) para auditoria.
- **Tenancy module**: validação sistemática de `workspace_id` em todas as operações.
- **Context API**: endpoint de contexto de mensagem e ações customizadas com autorização mínima.

### Excluir ou isolar (para evitar acoplamento)
- **`src/modules/chat/api/storage.ts`** e **`InMemory*Repository`**: remover do fluxo principal (apenas dev/test).
- **Componentes, hooks e stores em `src/modules/chat`**: mover para um pacote/área de frontend. O ChatEngine backend não deveria conter UI.
- **`src/app/chat` e `src/modules/chat/components`**: isolar em um frontend separado (`apps/web` ou `packages/ui`), ou remover do backend.

---

## Estrutura sugerida (alto nível)
```
src/
  modules/
    chat/
      domain/
      application/
        use-cases/
      infrastructure/
        db/
        media/
        providers/
      adapters/
        http/
        webhooks/
      outbox/
      tenancy/
      context/
```

Este alinhamento mantém o monolito modular e permite evolução incremental sem reescrever o core.

