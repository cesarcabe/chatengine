# Integração do ChatEngine com Aplicações Externas

Este documento descreve a configuração mínima para integrar o ChatEngine com outras aplicações
via webhooks e API REST. O foco é garantir autenticação correta, mapeamento de workspace e
testes de conectividade usando apenas CLI.

## Visão geral
- O ChatEngine expõe APIs REST (Next.js API Routes).
- O webhook principal de entrada é:
  - `POST /api/webhooks/whatsapp`
- A aplicação é stateless e depende de serviços externos (ex: Supabase, providers).

## Variáveis de ambiente obrigatórias

### Webhook (Evolution)
- `EVOLUTION_WEBHOOK_SECRET`
  - Segredo usado para autenticar o webhook.
- `EVOLUTION_WEBHOOK_TOKENS`
  - JSON que mapeia **token -> workspace_id**.
  - Exemplo:
    - `{"evolution_webhook_secret_123":"ws_123"}`
- `EVOLUTION_INSTANCE_WORKSPACE_MAP`
  - JSON que mapeia **instance -> workspace_id**.
  - Exemplo:
    - `{"default":"ws_123"}`

### API (saída para Evolution)
- `EVOLUTION_API_URL`
  - URL interna do Evolution (ex: `http://evolution_api:8080`).
- `EVOLUTION_API_KEY`
  - Chave da API do Evolution.

### Supabase
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_MEDIA_BUCKET`
- `SUPABASE_MEDIA_URL_EXPIRES_IN`

## Autenticação do webhook (obrigatória)

O endpoint `POST /api/webhooks/whatsapp` exige **autenticação**.
São aceitos **apenas** estes headers:

1) `x-evolution-token`
   - Deve ser igual ao `EVOLUTION_WEBHOOK_SECRET`.

2) `x-evolution-signature`
   - HMAC SHA256 do corpo (raw body) usando `EVOLUTION_WEBHOOK_SECRET`.
   - Formato: `sha256=<hash>`.

Sem header válido, o endpoint retorna **401**.

## Mapeamento de workspace (obrigatório)

Mesmo com autenticação válida, o webhook precisa resolver o `workspace_id`.
Se não houver mapeamento, o endpoint retorna **403**.

Opções válidas (uma delas basta):
- `EVOLUTION_WEBHOOK_TOKENS` mapeando token → workspace_id
- `EVOLUTION_INSTANCE_WORKSPACE_MAP` mapeando instance → workspace_id

## Payload mínimo de teste

Para validar o webhook, use um payload simples com:
- `event`
- `instance`
- `timestamp`
- `data.key.id`
- `data.messageTimestamp`

Exemplo:
```
{"event":"messages.upsert","instance":"default","timestamp":1700000000,"data":{"key":{"id":"test-123"},"messageTimestamp":1700000000}}
```

## Testes de conectividade (CLI)

### 1) Verificar status do container
```
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

### 2) Testar webhook com token
```
curl -i -X POST https://SEU_DOMINIO/api/webhooks/whatsapp \
  -H "Content-Type: application/json" \
  -H "x-evolution-token: SEU_EVOLUTION_WEBHOOK_SECRET" \
  -d '{"event":"messages.upsert","instance":"default","timestamp":1700000000,"data":{"key":{"id":"test-123"},"messageTimestamp":1700000000}}'
```
Esperado: `HTTP/2 200`

### 3) Testar webhook com assinatura
```
BODY='{"event":"messages.upsert","instance":"default","timestamp":1700000000,"data":{"key":{"id":"test-123"},"messageTimestamp":1700000000}}'
SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "SEU_EVOLUTION_WEBHOOK_SECRET" | awk '{print $2}')
curl -i -X POST https://SEU_DOMINIO/api/webhooks/whatsapp \
  -H "Content-Type: application/json" \
  -H "x-evolution-signature: sha256=$SIG" \
  -d "$BODY"
```
Esperado: `HTTP/2 200`

## Diagnóstico rápido por status HTTP
- **401**: autenticação do webhook inválida (header errado ou segredo incorreto).
- **403**: autenticação ok, mas workspace não mapeado.
- **400**: payload inválido (evento/timestamp/id faltando).
- **200**: recebido e aceito.
- **202**: recebido, mas processamento interno teve erro (ver logs).

## Logs úteis
```
docker logs --tail=200 chatengine
```
Procure por `POST /api/webhooks/whatsapp` e mensagens de erro.

