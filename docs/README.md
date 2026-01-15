# Documentação do ChatEngine

Este diretório centraliza a documentação do ChatEngine. O produto principal é o **core backend**; a UI é apenas camada de consumo/demonstração.

## Ordem de leitura recomendada
1. `../README.md` — visão geral do produto e do repositório
2. `../src/modules/chatengine/README.md` — detalhes do core backend
3. `SupabeEnv.md` — variáveis e estrutura Supabase usadas no código

## Documentos técnicos e históricos
- `ARCHITECTURE_AUDIT.md` — audit técnico (2024). Histórico, pode conter referências antigas.
- `audit-15012026.md` — auditoria arquitetural e security audit. Histórico.
- `structure-15012026.md` — snapshot de estrutura e recomendações. Histórico.

## Convenções
- O termo padrão é **ChatEngine**
- **Core backend**: `src/modules/chatengine`
- **UI de consumo**: `src/ui` e `src/app`
- **Adapters HTTP**: `src/app/api`

