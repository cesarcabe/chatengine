-- Conversations table adjustments
alter table if exists conversations
  add column if not exists workspace_id text,
  add column if not exists contact_id text,
  add column if not exists whatsapp_number_id text,
  add column if not exists last_message jsonb,
  add column if not exists participants jsonb,
  add column if not exists updated_at timestamptz default now();

-- Messages table adjustments
alter table if exists messages
  add column if not exists workspace_id text,
  add column if not exists conversation_id text,
  add column if not exists sender_id text,
  add column if not exists type text,
  add column if not exists content text,
  add column if not exists reply_to_message_id text,
  add column if not exists status text,
  add column if not exists attachments jsonb,
  add column if not exists metadata jsonb,
  add column if not exists provider text,
  add column if not exists external_message_id text,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz;

-- Pending status table for out-of-order events
create table if not exists message_status_pending (
  workspace_id text not null,
  provider text not null,
  external_message_id text not null,
  status text not null,
  received_at timestamptz not null default now(),
  primary key (workspace_id, provider, external_message_id)
);

-- Idempotency constraint for messages
create unique index if not exists messages_workspace_provider_external_unique
  on messages (workspace_id, provider, external_message_id)
  where provider is not null and external_message_id is not null;

-- Uniqueness for conversations by workspace + contact + whatsapp number
create unique index if not exists conversations_workspace_contact_whatsapp_unique
  on conversations (workspace_id, contact_id, whatsapp_number_id)
  where workspace_id is not null and contact_id is not null and whatsapp_number_id is not null;

-- Outbox table for reliable sending
create table if not exists message_outbox (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null,
  message_id text not null,
  provider text not null,
  payload jsonb not null,
  status text not null default 'pending',
  attempts int not null default 0,
  next_retry_at timestamptz not null default now(),
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists message_outbox_pending_idx
  on message_outbox (status, next_retry_at);
