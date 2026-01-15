# Variáveis e Estrutura Supabase (ChatEngine)

Este documento descreve as variáveis e a estrutura Supabase usadas pelo ChatEngine no código atual.

## Schema
- Nenhum schema é configurado no código.
- O schema padrão utilizado é `public` (padrão do Supabase).

## Variáveis de ambiente (tabelas)
- `SUPABASE_MESSAGES_TABLE` (default: `messages`)
- `SUPABASE_CONVERSATIONS_TABLE` (default: `conversations`)
- `SUPABASE_MESSAGE_STATUS_PENDING_TABLE` (default: `message_status_pending`)

## Colunas usadas por tabela

### `messages`
- `id`
- `workspace_id`
- `conversation_id`
- `sender_id`
- `type`
- `content`
- `reply_to_message_id`
- `status`
- `attachments`
- `metadata`
- `provider`
- `external_message_id`
- `created_at`
- `updated_at`

### `conversations`
- `id`
- `workspace_id`
- `contact_id`
- `whatsapp_number_id`
- `channel`
- `participants`
- `last_message`
- `updated_at`

### `message_status_pending`
- `workspace_id`
- `provider`
- `external_message_id`
- `status`
- `received_at`

