# CLAUDE.md — n8n Workflow Development

Este arquivo orienta o Claude Code na criação e manutenção de workflows n8n para o projeto ORVAX.

## Contexto do Projeto

**ORVAX** é um sistema de controle pessoal anti-procrastinação com agente WhatsApp (Atlas/Aurora). O n8n é responsável pela orquestração do agente conversacional via WhatsApp Business API.

- **Instância n8n:** https://n8n.reidodrama.cloud/
- **Supabase (backend):** configurado via variáveis de ambiente no n8n
- **LLM:** GPT-4o-mini via OpenAI node (AI Agent)
- **Canal:** WhatsApp Business API (Meta)

---

## Ferramentas Disponíveis

### 1. n8n-MCP Server
Repositório: https://github.com/czlonkowski/n8n-mcp

Acesso a **20 ferramentas** divididas em dois grupos:

#### Documentação e Busca (sem API key)
| Ferramenta | O que faz |
|---|---|
| `tools_documentation` | Documentação de qualquer ferramenta MCP |
| `search_nodes` | Busca full-text em 1.396 nodes (`query`, `source`: all/core/community/verified, `includeExamples`) |
| `get_node` | Info completa de um node (`nodeType`, `detail`: minimal/standard/full, `mode`: docs/search_properties/versions) |
| `validate_node` | Valida configuração de um node (`mode`: minimal/full, `profile`: runtime/ai-friendly/strict) |
| `validate_workflow` | Valida workflow completo — conexões, expressões, language model detection |
| `search_templates` | Busca em 2.709 templates (`searchMode`: keyword/by_nodes/by_task/by_metadata) |
| `get_template` | Retorna JSON completo de um template (`mode`: nodes_only/structure/full) |

#### Gerenciamento da Instância (requer API key — já configurada)
| Ferramenta | O que faz |
|---|---|
| `n8n_list_workflows` | Listar todos os workflows |
| `n8n_get_workflow` | Detalhes de um workflow específico |
| `n8n_create_workflow` | Criar novo workflow |
| `n8n_update_full_workflow` | Substituir workflow completo |
| `n8n_update_partial_workflow` | Atualizar partes específicas (batch diff) |
| `n8n_delete_workflow` | Deletar workflow |
| `n8n_validate_workflow` | Validar na instância |
| `n8n_autofix_workflow` | Tentar corrigir erros automaticamente |
| `n8n_workflow_versions` | Histórico de versões |
| `n8n_deploy_template` | Importar template direto da biblioteca |
| `n8n_test_workflow` | Executar workflow (detecta tipo de trigger automaticamente) |
| `n8n_executions` | Listar/obter/deletar execuções |
| `n8n_health_check` | Verificar status da instância |

### 2. n8n Skills
Repositório: https://github.com/czlonkowski/n8n-skills

7 skills especializadas que ativam automaticamente conforme o contexto:

| Skill | Quando usar |
|---|---|
| **MCP Tools Expert** | Ao buscar nodes, validar configs, gerenciar workflows — PRIORIDADE MÁXIMA |
| **Workflow Patterns** | Ao criar workflows — 5 padrões arquiteturais prontos (webhook, HTTP API, DB, AI, scheduled) |
| **Node Configuration** | Ao configurar nodes — regras de dependência entre propriedades |
| **Expression Syntax** | Ao escrever expressões `{{}}` — variáveis core ($json, $node, $now, $env) |
| **Validation Expert** | Ao depurar erros de validação — catálogo de erros e falsos positivos |
| **Code JavaScript** | Ao escrever Code nodes JS — formato de retorno, acesso a dados de webhook |
| **Code Python** | Ao usar Python em Code nodes — limitação: sem bibliotecas externas |

---

## Fluxo de Trabalho Padrão

Ao receber uma solicitação de criação ou edição de workflow, **executar as ferramentas silenciosamente** (sem comentários intermediários) e responder apenas após todas completarem:

1. **Buscar templates** com `search_templates` — sempre antes de construir do zero (2.709 disponíveis)
2. **Listar workflows** com `n8n_list_workflows` para evitar duplicatas
3. **Pesquisar nodes** com `search_nodes` para qualquer node desconhecido
4. **Obter documentação** com `get_node` para nodes críticos (`detail: 'full'`)
5. **Validar** com `validate_workflow` antes de aplicar (`mode: 'full'`)
6. **Criar ou atualizar** com `n8n_create_workflow` ou `n8n_update_partial_workflow`
7. **Testar** com `n8n_test_workflow` se aplicável
8. **Ativar** com `n8n_update_partial_workflow` apenas com confirmação explícita do usuário

**Regras de execução:**
- Chamadas independentes: executar em paralelo
- Usar `n8n_update_partial_workflow` com múltiplas operações em batch (não uma por vez)
- Nunca confiar em defaults — configurar explicitamente todos os parâmetros relevantes
- Nunca ativar/publicar workflow sem confirmação explícita

---

## Estrutura dos Workflows ORVAX

### Workflow Principal — Agente WhatsApp

```
Webhook (WhatsApp)
  → Processar Mensagem Recebida
  → Montar Contexto do Usuário (Code node)
  → Atualizar Última Interação (HTTP Request → Supabase PATCH)
  → Tipo de Mensagem? (Switch)
      ├── Texto → Cérebro ORVAX (AI Agent + Tools)
      ├── Áudio → Transcrever (Whisper) → Cérebro ORVAX
      └── Outros → Resposta padrão
  → Formatar Resposta
  → Enviar WhatsApp (HTTP Request → Meta API)
```

### Workflow Proativo
Disparo agendado (Schedule Trigger) para reengajar usuários inativos antes da janela de 24h do WhatsApp fechar. Ver `setup-guide.md` para lógica de custos.

---

## Convenções de Implementação

### Variáveis de Ambiente (n8n Settings > Variables)
Referenciar via `{{ $env.NOME }}`:
- `SUPABASE_URL` — URL do projeto Supabase
- `SUPABASE_KEY` — **service_role key** (nunca anon key)
- `WHATSAPP_PHONE_ID` — Phone Number ID do Meta Business
- `WHATSAPP_TOKEN` — Token permanente da API WhatsApp Business

### Headers Padrão Supabase
Todo HTTP Request ao Supabase:
```
apikey: {{ $env.SUPABASE_KEY }}
Authorization: Bearer {{ $env.SUPABASE_KEY }}
Content-Type: application/json
Prefer: return=representation
```

### Expressões Recorrentes
```javascript
// ID do usuário
{{ $('Montar Contexto do Usuário').item.json.user_id }}

// Data de hoje YYYY-MM-DD
{{ new Date().toISOString().split('T')[0] }}

// Timestamp ISO
{{ new Date().toISOString() }}

// System prompt do mentor (AI Agent)
{{ $('Montar Contexto do Usuário').item.json.system_prompt }}
```

### Roteamento IF/Switch
- IF node: usar `branch: "true"` ou `branch: "false"` para rotear outputs
- Dados de webhook: sempre acessar via `$json.body` (não `$json` direto)

### Code Node — Formato de Retorno Obrigatório
```javascript
// CORRETO
return [{ json: { campo: valor } }];

// ERRADO
return { campo: valor };
```

### Nomeação de Nós
- Tools do agente: `snake_case` (ex: `registrar_agua`)
- Nós de fluxo: frase em português BR (ex: "Montar Contexto do Usuário")

### AI Agent — Inventory de Tools
Ver `tools-config.md` para configuração completa. Categorias:
- **Tarefas:** criar_tarefa, consultar_tarefas, atualizar_tarefa, deletar_tarefa
- **Finanças:** registrar_transacao, consultar_transacoes, criar_meta_financeira, consultar_metas_financeiras, consultar_resumo_financeiro
- **Saúde:** registrar_agua, consultar_agua_hoje, registrar_peso, consultar_peso_recente, registrar_treino, consultar_treinos
- **Alimentação:** registrar_refeicao, consultar_refeicoes_hoje
- **Hábitos e Metas:** registrar_habito1, consultar_habitos, criar_meta1, consultar_metas1, atualizar_meta
- **Foco:** registrar_foco, consultar_foco_hoje, consultar_foco_total_hoje
- **Gamificação:** consultar_perfil, consultar_telemetria, consultar_conquistas, registrar_pontos, verificar_conquistas, calcular_streak
- **Notas:** criar_nota, consultar_notas, atualizar_nota, deletar_nota
- **Sistema:** salvar_conversa, registrar_acao, atualizar_config_app, consultar_stats_hoje, consultar_atividade_semana

---

## Arquivos de Referência

| Arquivo | Conteúdo |
|---|---|
| `orvax-agent-v2.json` | Export JSON do workflow principal |
| `orvax-proactive.json` | Export JSON do workflow proativo |
| `montar-contexto-v2.js` | Código do nó "Montar Contexto do Usuário" |
| `setup-guide.md` | Configuração, custos WhatsApp/OpenAI, política Meta 2026 |
| `tools-config.md` | Configuração detalhada de cada tool HTTP Request do agente |

---

## Regras de Segurança e Compliance

1. **Isolamento de dados:** toda tool que lê/escreve dados deve filtrar por `user_id` (equivalente ao RLS do Supabase)
2. **Confirmação antes de deletar:** tools de delete devem instruir o agente a confirmar com o usuário
3. **Sem publicação automática:** nunca ativar workflow sem confirmação explícita
4. **Janela WhatsApp:** manter reengajamento DENTRO das 24h — templates custam ~R$0,04/msg e são fallback apenas
5. **Escopo do agente:** responder somente sobre funcionalidades do ORVAX — não agir como assistente genérico (política Meta 2026)
