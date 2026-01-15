# ChatEngine Core

O ChatEngine Core é o motor backend reutilizável responsável por orquestrar conversas, mensagens, status e integrações com providers. Ele é o núcleo do produto e deve permanecer desacoplado da UI.

## Responsabilidades
- Ingestão e normalização de eventos do provider (webhooks)
- Persistência de conversas e mensagens
- Orquestração de envio via outbox
- Atualização de status de entrega/leitura
- Exposição de portas para adapters externos

## O que NÃO faz
- Regras de CRM (pipeline, tarefas, SLA)
- UX/UI do produto final
- Automação de processos de negócio

## Conceitos críticos
- **Workspace**: toda operação é isolada por `workspace_id`
- **Conversa 1:1**: resolução determinística de conversas entre participantes
- **Idempotência**: deduplicação por `workspace + provider + external_message_id`
- **Outbox**: envio confiável com retry e backoff

## Estrutura do core
```
src/modules/chatengine/
  adapters/             # Interfaces de entrada (ex: HTTP)
  application/          # Casos de uso e portas
  composition/          # Wiring e composição do core
  domain/               # Entidades e regras de domínio
  infrastructure/       # Providers, storage, repos, db
```

## Integração no repositório
- **Adapters HTTP**: `src/app/api`
- **UI de consumo**: `src/ui` e `src/app`

## Documentação técnica
- Índice geral: `docs/README.md`
- Variáveis e esquema Supabase: `docs/SupabeEnv.md`
- Audits e histórico: `docs/ARCHITECTURE_AUDIT.md`, `docs/audit-15012026.md`, `docs/structure-15012026.md`

