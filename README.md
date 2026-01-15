# ChatEngine

ChatEngine é um core backend pluggable de conversação para WhatsApp, pronto para produção e pensado para integração em múltiplos SaaS (ex: Lovable). O produto principal deste repositório é o **core backend**, enquanto a UI é apenas uma camada de consumo/demonstração.

## O que é
- Motor de conversação modular com arquitetura Clean/Hexagonal
- Monólito modular com separação clara entre domain, application e infrastructure
- Source of truth em Supabase
- Integração com provider WhatsApp via Evolution API

## Para que serve
- Ingestão e processamento de webhooks do provider
- Persistência de conversas e mensagens
- Envio de mensagens com outbox e status de entrega/leitura
- Base reutilizável para acoplar em SaaS com diferentes UIs

## O que este repositório contém
- **Core backend**: `src/modules/chatengine`
- **Rotas HTTP/Next (adapters)**: `src/app/api`
- **UI de consumo**: `src/ui` e `src/app` (Next.js)
- **Migrations Supabase**: `supabase/migrations`

## O que este repositório NÃO é
- Não é um CRM ou sistema de automação
- Não é um produto de UI final
- Não é um conjunto de integrações específicas de um único SaaS

## Arquitetura (alto nível)
```
src/
  modules/
    chatengine/         # Core backend (domain, application, infrastructure)
  app/
    api/                # Adapters HTTP (Next.js API routes)
  ui/                   # Camada de consumo (UI Next.js)
docs/                   # Documentação centralizada
supabase/               # Migrations do banco
```

## Documentação
- Índice geral: `docs/README.md`
- Detalhes do core: `src/modules/chatengine/README.md`

