# ORVAX Agent v2 — Guia de Setup

## 1. SQL: Adicionar coluna para rastrear última interação

Execute no Supabase SQL Editor:

```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_whatsapp_interaction TIMESTAMPTZ;
```

---

## 2. Variáveis de Ambiente no n8n

Configure estas variáveis em Settings > Variables:

| Variável | Valor |
|----------|-------|
| `SUPABASE_URL` | `https://SEU-PROJETO.supabase.co` |
| `SUPABASE_KEY` | Sua **service_role** key (não a anon key!) |
| `WHATSAPP_PHONE_ID` | ID do número no Meta Business |
| `WHATSAPP_TOKEN` | Token permanente do WhatsApp Business API |

---

## 3. Atualizar Workflow Principal

### 3.1 Substituir "Montar Contexto do Usuário"
1. Abra o nó Code "Montar Contexto do Usuário"
2. Substitua TODO o código pelo conteúdo de `montar-contexto-v2.js`
3. Salve

### 3.2 Adicionar nó "Atualizar Última Interação"
Adicione um nó **HTTP Request** LOGO APÓS "Montar Contexto do Usuário" e ANTES do "Tipo de Mensagem":

- **Method:** PATCH
- **URL:** `{{$env.SUPABASE_URL}}/rest/v1/profiles?id=eq.{{ $json.user_id }}`
- **Headers:**
  - `apikey`: `{{$env.SUPABASE_KEY}}`
  - `Authorization`: `Bearer {{$env.SUPABASE_KEY}}`
  - `Content-Type`: `application/json`
- **Body (JSON):**
```json
{
  "last_whatsapp_interaction": "{{ new Date().toISOString() }}"
}
```

Isso garante que cada mensagem recebida atualiza o timestamp para o workflow proativo.

### 3.3 Atualizar "Cérebro ORVAX"
No nó do AI Agent, altere o **System Message** para:
```
{{ $('Montar Contexto do Usuário').item.json.system_prompt }}
```
(Provavelmente já está assim, mas confirme.)

### 3.4 Adicionar Novos Tools
Siga as instruções em `tools-config.md` para adicionar cada novo tool.
Conecte todos ao nó "Cérebro ORVAX" na entrada **Tool**.

Prioridade dos tools a adicionar:
1. 🔴 registrar_agua + consultar_agua_hoje
2. 🔴 registrar_peso + consultar_peso_recente
3. 🔴 registrar_treino + consultar_treinos
4. 🔴 atualizar_tarefa + deletar_tarefa
5. 🟡 registrar_refeicao + consultar_refeicoes_hoje
6. 🟡 consultar_perfil + consultar_telemetria
7. 🟡 consultar_habitos + consultar_metas_financeiras
8. 🟢 consultar_conquistas + consultar_notas + consultar_foco_hoje

---

## 4. Importar Workflow Proativo

1. No n8n, vá em **Workflows > Import from File**
2. Selecione `orvax-proactive.json`
3. Configure as credenciais HTTP Header Auth:
   - Para Supabase: crie uma credencial com header `apikey` = sua service_role key
   - Para WhatsApp: use o token do Meta Business
4. Configure as variáveis de ambiente (passo 2)
5. Ative o workflow

---

## 5. Template Messages no Meta Business Manager

Crie estes templates (para fallback quando a janela de 24h fechar):

### Template 1: `orvax_checkin`
- **Categoria:** Utility
- **Idioma:** pt_BR
- **Body:** "{{1}}, faz tempo que não nos falamos! Como andam suas metas? Me manda um oi que te atualizo sobre seu progresso 💪"
- **Parâmetros:** {{1}} = nome do usuário

### Template 2: `orvax_streak_alert`
- **Categoria:** Utility
- **Idioma:** pt_BR
- **Body:** "{{1}}, seu streak de {{2}} dias está em risco! Responda essa mensagem para manter sua sequência ativa 🔥"
- **Parâmetros:** {{1}} = nome, {{2}} = dias de streak

> NOTA: Templates custam ~R$0,04 cada (utility no Brasil).
> O workflow proativo é desenhado para enviar ANTES da janela fechar (grátis).
> Templates são apenas fallback e estão desativados por padrão no JSON.

---

## 6. Análise de Custos

### WhatsApp (Brasil, 2026)
| Tipo | Custo | Quando |
|------|-------|--------|
| Service (user-initiated) | **GRÁTIS** | Sempre que o usuário manda msg primeiro |
| Dentro da janela 24h | **GRÁTIS** | Todas as respostas dentro de 24h |
| Template Utility | ~R$0,04/msg | Só quando janela fecha (fallback) |
| Template Marketing | ~R$0,35/msg | NUNCA usar |

### OpenAI
| Serviço | Custo estimado/mês/usuário |
|---------|---------------------------|
| GPT-4o-mini (texto) | ~R$2,50 |
| Whisper (áudio recebido) | ~R$1,50 |
| **Total OpenAI** | **~R$4,00/mês/usuário** |

### Estratégia de custo zero no WhatsApp
1. Usuário manda mensagem → janela 24h abre (GRÁTIS)
2. Agente responde quantas vezes quiser (GRÁTIS)
3. Às 20h de inatividade, workflow proativo envia nudge (AINDA GRÁTIS, dentro da janela)
4. Se usuário responde → nova janela 24h (GRÁTIS)
5. Ciclo infinito sem pagar WhatsApp ♻️

### Sobre áudio ENVIADO
- O agente NÃO envia áudio (economia de custo)
- O agente RECEBE e TRANSCREVE áudio (Whisper, barato)
- Se quiser enviar áudio futuramente: edge-tts (Microsoft, grátis) ou Google Cloud TTS (4M chars grátis/mês)

---

## 7. Política do WhatsApp 2026 — IMPORTANTE

Em janeiro 2026, Meta proibiu **chatbots de propósito geral** (tipo ChatGPT standalone no WhatsApp).

**Seu caso é PERMITIDO** porque:
- O bot ORVAX é um bot de negócio específico (gerencia metas, finanças, saúde)
- Está vinculado ao seu app/plataforma
- Não é um assistente genérico aberto
- Funciona como automação de negócios (support, tracking, notifications)

Adicionalmente, a **autoridade de concorrência do Brasil (CADE) suspendeu** esses novos termos da Meta por liminar temporária, então no Brasil a restrição pode nem estar em vigor.

Para garantir compliance:
- Mantenha o bot focado nas funcionalidades do app
- Não permita que o bot responda perguntas genéricas fora do escopo
- Tenha opt-in claro do usuário (já tem, via seleção de mentor no app)
