# ORVAX — PROTOCOLO VERITAS
## PRD + GDD: Reconstrução do Sistema de Evolução (v1.0)

> **Documento de produto, game design e guia de implementação.**
> Autor: Claude (Game Design / Product / UX / Psicologia Comportamental / Economia de Jogos)
> Data: 2026-07-20 · Alvo: ORVAX v3 ("Era 2")
> Princípio central: **XP não é recompensa por clicar. XP é a sombra mensurável de uma vida que mudou.**

---

# 0. SUMÁRIO EXECUTIVO

O ORVAX hoje tem um esqueleto de RPG (XP, ranks E-→SSS, streak, pilares, Compass) sobre um sistema de confiança **inexistente**: o cliente decide quanto XP ganha, toda tarefa vale o mesmo, nenhuma execução é verificada, e as dimensões medem check-ins — não vida real.

O Protocolo VERITAS reconstrói isso em cinco camadas:

| Camada | Nome | O que resolve |
|---|---|---|
| 1 | **Motor de XP** (server-side, fórmula multiplicativa) | XP aleatório e manipulável |
| 2 | **Escada de Verificação + Trust Score** | "Como saber se fez de verdade?" |
| 3 | **Ritual de Encerramento** (Registrar Dia 2.0) | Formulário sem alma → cerimônia diária |
| 4 | **Dimensões Profundas** (8 sistemas de progressão com ~15 métricas reais cada) | Pilares superficiais |
| 5 | **Conselho de IAs** (1 orquestrador + 8 especialistas) + **Antifraude** + **Economia sazonal** | Coach genérico, farm, inflação |

**Tese de design:** o usuário não deve *ganhar* XP — deve *provar* XP. E o app deve tornar provar mais fácil, bonito e rápido do que mentir.

---

# 1. DIAGNÓSTICO DO SISTEMA ATUAL (baseado no código)

Auditoria feita sobre o código real do repositório. Cada problema abaixo tem arquivo e linha.

## 1.1 O cliente decide o próprio XP (falha crítica de integridade)

- `src/components/lifeOs/PendingTodayPanel.jsx:32` → `async function awardXp(amount, reason)` — o **navegador** envia o valor.
- `src/features/lifeOs/components/creation/CreationHub.tsx:236` → `awardXp({ amount: currentKind.xp, ... })`.
- `src/features/lifeOs/components/deepdive/FinanceDeepDive.tsx:380` → `awardXp({ amount: 10, ... })`.
- A RPC `add_xp_and_update_streak` aceita qualquer quantia de qualquer usuário autenticado.

**Consequência:** um `supabase.rpc('add_xp_and_update_streak', { amount: 999999 })` no console do navegador dá rank SSS em 5 segundos. Enquanto isso existir, TODO o resto do jogo é decorativo.

## 1.2 XP flat e sem contexto

Valores atuais (KIND_META / CreationHub): task=5, habit=8, event=3, reminder=2, payment=5, goal=20. Lavar louça = escrever um capítulo de TCC. Criar tarefa dá XP (!) — criar 100 tarefas vazias = 500 XP sem fazer nada.

## 1.3 Zero verificação

Concluir = um clique. Não há pergunta, prova, análise ou custo de mentir. A tela do Nexus diz "estou sempre te observando" — mas o sistema não observa nada.

## 1.4 Dimensões rasas

- Compass (pillarDataAdapter.ts): score = contagem de check-ins de hábito normalizada. Um hábito "beber água" e um "correr 10km" movem a dimensão igual.
- Registrar Dia (QuickLogEntry): 8 domínios × 3 checkpoints binários com pesos 4/3/3 — autodeclarados, sem memória, sem tendência, sem consequência.
- O app JÁ COLETA dados ricos que as dimensões ignoram: FitCal (kcal, macros, água, peso), GymRats (treinos, minutos, kcal), Capital (transações reais), Vault (tarefas/hábitos/notas), timer de foco.

## 1.5 Ranks sem economia

RANK_DEFS (db.js) tem 20+ ranks com lore excelente (Fase de Inércia → Nêmesis do Caos), mas a curva de XP que os sustenta é alcançável em dias com farm — e em meses fica estagnada sem sinks nem temporadas.

**Veredito:** a fantasia ("sistema que te observa e te faz evoluir") está pronta na UI. Falta o motor que a torna verdadeira.

---

# 2. PARTE 1 — O MOTOR DE XP

## 2.1 Problema → Solução → Porquê

- **Problema:** XP flat, client-side, sem relação com esforço real; farm trivial.
- **Solução:** cálculo 100% server-side (Edge Function `xp-engine`), fórmula multiplicativa com 7 fatores, rendimentos decrescentes e tetos suaves.
- **Porquê:** multiplicadores (e não somas) fazem cada fator IMPORTAR: verificação fraca ou confiança baixa corta o ganho inteiro, não só um pedaço. Rendimentos decrescentes tornam o farm matematicamente inútil sem punir dias genuinamente épicos.
- **Benefício ao usuário:** XP passa a significar algo. Subir de rank vira conquista social defensável ("meu D+ foi provado").
- **Risco:** fricção. Mitigação: a verificação é OPCIONAL por tarefa (autonomia) — só o multiplicador muda.

## 2.2 A Fórmula

```
XP = round( B × D × Q × C × T × S × K ) × Crit
```

| Fator | Nome | Faixa | O que mede |
|---|---|---|---|
| **B** | Base | 8–30 | Tipo do evento (tabela 2.3) |
| **D** | Dificuldade | 0.5–3.0 | Peso real da ação (2.4) |
| **Q** | Qualidade da verificação | 0.6–1.3 | Nível de prova N1–N4 (Parte 3) |
| **C** | Consistência | 1.0–1.5 | Streak com saturação logarítmica (2.5) |
| **T** | Confiança | 0.3–1.2 | Trust Score /100 (Parte 3) |
| **S** | Saturação | 0.10–1.0 | Rendimento decrescente anti-farm (2.6) |
| **K** | Contexto | 0.9–1.15 | Executou quando/onde planejou (2.7) |
| **Crit** | Surto de Evolução | ×1 ou ×2 | 5% de chance, reforço variável (2.8) |

## 2.3 B — Base por tipo de evento

| Evento | B | Nota |
|---|---|---|
| Tarefa concluída | 10 | — |
| Check-in de hábito | 8 | — |
| Marco de meta (goal milestone) | 25 | Só com progresso mensurável |
| Meta concluída | 50 | Evento raro por natureza |
| Ritual diário completo | 15 | + streak próprio do ritual |
| Desafio semanal de dimensão | 30 | Emitido pela IA especialista |
| Check-in Arena (com foto) | 12 | Já nasce N3 |
| Registro financeiro | 2 | Registrar é higiene, não conquista |
| **Criar** tarefa/hábito/meta | **0** | ⚠️ MUDANÇA: criar não pontua. Planejar é grátis; executar paga. |

## 2.4 D — Dificuldade composta

```
D = clamp(0.5, 3.0,
      0.40
    + 0.15 × dificuldade_declarada     # 1–5, escolhida na criação
    + 0.20 × log2(1 + minutos_reais/15) # tempo pesa, mas com saturação
    + 0.25 × raridade                   # 0–1: quão incomum é esta ação PARA ESTE usuário
    + 0.20 × prioridade_norm )          # P3=0.3, P2=0.6, P1=1.0
```

- **dificuldade_declarada** é auditada: a IA compara o texto da tarefa com um classificador de esforço ("lavar louça" declarada como 5/5 → recalibra para 1 e registra evento de Trust −2). O usuário vê a recalibração e pode contestar (1 clique → vira auditoria N4).
- **raridade** = 1 − frequência relativa dessa categoria de ação nos últimos 30 dias (via embedding do título). A 40ª "beber água" do mês vale quase nada; a 1ª "renegociei uma dívida" vale muito. **É o principal antídoto estrutural contra farm**: repetir o que é fácil derruba a raridade a zero.
- **minutos_reais** vem do timer de foco quando usado (N3); senão da estimativa declarada (limitada pela mediana histórica do usuário para tarefas similares).

## 2.5 C — Consistência (streak que perdoa)

```
C = 1 + 0.5 × (1 − e^(−streak_dias/21))
```

- Assíntota em 1.5 (21 dias ≈ 1.32; 60 dias ≈ 1.47). Nunca explode — veteranos não viram impressoras de XP.
- **Escudo de Streak:** a cada 7 dias perfeitos o usuário ganha 1 escudo (máx. 2). Quebrou o dia? O escudo consome-se e o streak **cai 30% em vez de zerar**.
  *Fundamento:* aversão à perda funciona para reter, mas reset total gera o efeito "que se dane" (what-the-hell effect) e churn — o Duolingo mediu isso e criou o Streak Freeze. Copiamos a lição, não o erro.

## 2.6 S — Saturação (a matemática que mata o farm)

Para a *n*-ésima ação **similar** (mesma dimensão + cluster semântico do título) no mesmo dia:

| n | 1ª | 2ª | 3ª | 4ª | 5ª+ |
|---|---|---|---|---|---|
| S | 1.00 | 0.55 | 0.30 | 0.15 | 0.10 |

Além disso, dois tetos **suaves** (nunca zero — dias épicos genuínos existem):

1. **Teto diário pessoal:** acima de `1.5 × P75(XP diário dos últimos 30d)`, XP adicional vale 50%; acima de `2.5×`, vale 25%.
2. **Teto por dimensão:** nenhuma dimensão pode gerar mais de 40% do XP do dia. *Efeito colateral desejado:* o jeito ótimo de ganhar XP é ter uma vida equilibrada — a economia empurra para o propósito do produto.

## 2.7 K — Contexto

- Concluída dentro da janela planejada (agenda): ×1.10
- Concluída no "horário de pico" pessoal (aprendido do histórico): ×1.05
- Conclusão entre 2h–5h da manhã sem histórico noturno: ×0.90 + flag de auditoria
- Sem plano prévio: ×1.00 (neutro — espontaneidade não é punida)

## 2.8 Crit — "Surto de Evolução"

5% das conclusões verificadas (N2+) disparam ×2 com animação própria. **Só bônus, nunca penalidade aleatória.** É o reforço de razão variável (Skinner) na sua forma ética: imprevisibilidade na recompensa, jamais no castigo.

## 2.9 Exemplos numéricos

| Cenário | Cálculo | XP |
|---|---|---|
| "Responder e-mail" (dif 1, 5min, comum, N1, streak 3, TS 50) | 10 × 0.62 × 0.6 × 1.07 × 0.75 × 1.0 × 1.0 | **3** |
| "Treino de pernas 60min" (dif 3, raro-médio, N3 foto+timer, streak 12, TS 78) | 10 × 1.55 × 1.1 × 1.22 × 1.00 × 1.0 × 1.1 | **23** |
| Mesma tarefa, 3ª repetição no dia | idem × S=0.30 | **7** |
| "Terminei o capítulo do TCC" (dif 5, 3h, raríssima, N4 PDF, streak 30, TS 92) | 10 × 2.6 × 1.3 × 1.38 × 1.13 × 1.0 × 1.1 | **58** |
| Farm: 20 tarefas "beber água" N1 | S despenca + raridade→0 + teto diário | **~11 no total** |

O farmador honestamente trabalha MAIS para ganhar MENOS que uma pessoa real com 4 tarefas verdadeiras. Essa é a definição de sistema anti-abuso: não proibir, tornar **não-lucrativo**.

## 2.10 Implementação técnica (resumo — detalhes na Parte 10)

- **Nova tabela `xp_events`** (ledger imutável, append-only): `id, user_id, source_type, source_id, base, d, q, c, t, s, k, crit, xp_final, dimension, created_at, meta jsonb`.
- **Edge Function `xp-engine`** (service role): única entidade que insere em `xp_events` e atualiza `profiles.xp`. RLS: usuário só faz SELECT dos próprios eventos.
- **Revogar** o acesso do cliente à RPC `add_xp_and_update_streak` (ou reescrevê-la como SECURITY DEFINER que só aceita chamadas da função).
- O front passa a enviar **fatos** ("concluí a tarefa X às 14:32 com timer de 48min e esta foto"), nunca valores.

---

# 3. PARTE 2 — VERIFICAÇÃO DE EXECUÇÃO + TRUST SCORE

## 3.1 Filosofia

Não existe app capaz de PROVAR com 100% de certeza que alguém meditou. Quem promete isso mente. O que existe — e é o que bancos, seguradoras e anti-cheat de jogos fazem — é **tornar a mentira cara, inconsistente e estatisticamente detectável**, enquanto a verdade flui sem atrito. Três princípios:

1. **Verificação é um espectro, não um portão.** Todo nível é aceito; o multiplicador Q muda.
2. **Auditoria é amostral e imprevisível.** Como fiscalização de trânsito: ninguém sabe quando vem, então o comportamento muda o tempo todo (teoria dos jogos + reforço variável).
3. **A confiança é do usuário, visível e explicável.** Nada de shadowban kafkiano: o Trust Score aparece no Dossiê com o histórico do que o moveu.

## 3.2 A Escada de Verificação (N1–N4)

### N1 — Palavra de Agente (autodeclaração) · Q = 0.6
Um toque. Texto na UI: *"Registrado na sua palavra."* Zero fricção, XP reduzido. É o padrão para ações triviais — e está OK. Não humilhar o usuário por confiar nele.

### N2 — Micro-entrevista (Debrief) · Q = 0.85
Ao concluir, 2–3 perguntas dinâmicas geradas pela IA, respondíveis em ~20s (chips + campo curto):

- "O que travou no meio?" / "Qual foi a parte mais difícil?"
- "Quanto tempo levou de verdade?" (comparado à estimativa — alimenta a métrica de calibração)
- "Uma coisa que você faria diferente?"

**Como isso valida:** a IA não avalia se a resposta é "bonita" — avalia **especificidade, coerência com o histórico e não-repetição** (similaridade de embedding vs. últimas 50 respostas). "Foi difícil mas consegui" pela 9ª vez = genérico → Q cai para 0.7 e Trust −1. "O cliente mudou o escopo no meio e tive que refazer o slide 4" = específico → Q pleno. Detalhe importa: mentir com especificidade nova toda vez é MAIS trabalhoso que fazer a tarefa.

### N3 — Prova Material · Q = 1.1
Anexos aceitos, com validador próprio por tipo:

| Prova | Validação automática |
|---|---|
| Foto/vídeo | pHash contra provas anteriores (repetição), EXIF timestamp vs. horário declarado, análise de conteúdo por visão (a foto mostra uma academia ou um teto?) |
| Timer de foco in-app | Início/fim/pausas server-side; jitter humano (pausas, variação) vs. timer "perfeito" |
| PDF/print/arquivo | Hash de conteúdo (duplicata), OCR + coerência com a tarefa |
| Áudio (voice note de 20s) | "Me conta o que você fez" — transcrição → mesmo pipeline do N2, com o bônus de que falar é mais rápido e mais difícil de fingir que digitar |
| Localização (opt-in) | Ex.: check-in de treino a <200m de uma academia. Nunca rastreio contínuo — snapshot no momento do check-in, apagado após validação |
| Integrações | FitCal (refeição registrada), GymRats (check-in com foto), Capital (transação real), futuro: Health Connect/Google Fit (passos, sono, FC) |

### N4 — Validação por IA (Tribunal) · Q até 1.3
Disparada em 3 situações: (a) o usuário pede ("quero XP máximo"); (b) auditoria amostral; (c) contestação de recalibração. A IA cruza:

- **Coerência interna:** a prova bate com a tarefa, o horário, o local?
- **Consistência histórica:** essa pessoa costuma fazer isso? É um salto plausível? (correu 5km ontem → 42km hoje = flag)
- **Consistência cruzada:** disse que treinou → o FitCal mostra mais fome/água? A Arena tem check-in? O sono declarado condiz?
- **Padrão comportamental:** rajadas, horários impossíveis, cadência robótica.

Saída: `confidence 0–1` + justificativa legível ("Validado: a foto é inédita, o timer teve 2 pausas naturais e seu histórico sustenta o volume"). `confidence` module o Q final entre 0.9 e 1.3.

## 3.3 Trust Score — "Índice de Integridade" (0–100)

### Composição (recalculado semanalmente, movido por eventos diariamente)

```
TS = 0.40×P + 0.25×Coer + 0.20×Temp + 0.15×Cross
```

| Componente | O que mede | Fonte |
|---|---|---|
| **P** (Prova) | % de conclusões N3/N4 válidas nos últimos 30d | validadores |
| **Coer** (Coerência) | Média da especificidade/não-repetição nas micro-entrevistas | NLP |
| **Temp** (Padrão temporal) | Entropia dos horários; ausência de rajadas (>5 conclusões em <60s) e de cadência robótica | telemetria |
| **Cross** (Consistência cruzada) | Os módulos confirmam uns aos outros (treino↔FitCal↔Arena; economia↔Capital) | joins |

### Dinâmica

- Todo usuário nasce com **TS 50** (neutro — presunção de inocência).
- Eventos: prova validada +2..+4 · auditoria passada +5 · auditoria falhada −10 · resposta quase-duplicada −3 · rajada −5 · recalibração de dificuldade abusiva −2 · contestação vencida +6 (e a IA aprende).
- Suavização EWMA + **regressão à média**: sem eventos, TS caminha ±1/semana em direção a 50. Reputação é conquistada e mantida, nunca "zerada para sempre" (redimível por design).

### Efeitos por faixa

| TS | Faixa | Multiplicador T | Auditoria amostral | UX |
|---|---|---|---|---|
| 0–39 | Em observação | 0.30–0.66 | ~50% das conclusões | Mais pedidos de prova; nada é dito com tom acusatório |
| 40–69 | Padrão | 0.66–0.92 | ~20% | Normal |
| 70–89 | Confiável | 0.93–1.10 | ~8% | Menos fricção, badge no Dossiê |
| 90–100 | Alta Integridade | 1.11–1.20 | ~3% (nunca 0) | Selo "VERITAS", multiplicador exibido no perfil, requisito para o topo do ranking da Arena |

Probabilidade de auditoria: `clamp(3%, 50%, 55% − TS/2)` — **quanto mais confiável, mais leve o jogo fica.** A recompensa da honestidade não é só XP: é liberdade de fricção. Esse é o loop virtuoso central.

### Transparência (requisito ético inegociável)

Tela própria no Dossiê: score atual, gráfico de 90 dias, últimos 10 eventos com explicação, e botão "contestar" em cada um. O usuário nunca descobre que "o app desconfia dele" por inferência — ele vê o placar e as regras do jogo.

---

# 4. PARTE 3 — O RITUAL DE ENCERRAMENTO (Registrar Dia 2.0)

## 4.1 Problema → Solução

- **Problema:** o QuickLogEntry atual é um formulário de 24 checkboxes sem memória nem consequência. Preenchê-lo não muda nada no dia seguinte.
- **Solução:** uma cerimônia de 3–5 minutos, em 6 atos, onde o app **apresenta** o dia ao usuário (com os dados que já coletou) e o usuário só completa o que os sensores não veem. Termina com a única fonte de "nota do dia" e o preview de amanhã.
- **Porquê:** rituais criam âncoras de hábito (Tiny Habits: âncora = "antes de dormir"); a regra do pico-fim (Kahneman) diz que a memória de um dia é definida pelo seu momento mais intenso e pelo FINAL — controlar o final do dia é controlar a memória que o usuário tem do próprio progresso.

## 4.2 Os 6 Atos

### ATO I — A Retrospectiva (30s, passivo)
O app abre com um replay cinematográfico do dia, montado sozinho: *"14 ações. 3h12 de foco. Treino às 7h. R$ 84 gastos, dentro do plano. Sequência: 12 dias."* Cards deslizando, estética terminal.
*Psicologia:* competência percebida (SDT) — o sistema mostra que **observou**, cumprindo a fantasia central do ORVAX sem tom de ameaça.

### ATO II — Acerto de Contas (45s)
Missões pendentes aparecem UMA a uma: **Concluir agora** (dispara verificação normal) / **Migrar para amanhã** / **Abandonar (dizendo por quê — 1 chip: sem tempo · sem energia · perdeu o sentido · imprevisto)**.
*Psicologia:* efeito Zeigarnik — pendências abertas ocupam RAM mental; fechá-las explicitamente reduz ansiedade. O "por quê" do abandono alimenta a IA (padrões de superplanejamento).

### ATO III — Escaneamento (30s)
Energia (1–5, slider com feedback tátil) · 2 emoções predominantes (grade de 8) · qualidade do sono da noite anterior (1–5 + horas).
*Nota de design:* deslizar, nunca digitar. Digitação só onde há valor de verificação.

### ATO IV — O Interrogatório Gentil (60–90s)
O Mentor (persona ativa: Atlas/Aurora/etc.) faz **3 perguntas geradas do dia real**:
- Maior vitória? (chips com as tarefas do dia + campo livre)
- Maior desafio/atrito?
- O que aprendeu? (voz ou texto)
- Gratidão em uma linha.
*Estas respostas são o coração do N2 diário* — alimentam Coerência do Trust e o RAG pessoal das IAs especialistas.

### ATO V — O Veredito (45s, passivo — o payoff)
A IA processa e devolve:
1. **Reflexão personalizada** (2–3 frases na voz da persona: *"Terceira quarta seguida com treino às 7h. O padrão que você queria em março existe agora. O atrito de hoje — a reunião que atropelou seu foco — apareceu 4 vezes este mês: quer que eu proteja esse horário?"*)
2. **Nota do dia (0–10) CALCULADA, não autoatribuída:** `40% execução real (missões×peso) + 20% equilíbrio entre dimensões + 15% autoavaliação + 15% qualidade do ritual + 10% consistência`. A autoavaliação importa, mas não domina — notas têm lastro.
3. **Cerimônia de XP:** contadores subindo, dimensões pulsando no Compass, conquistas desbloqueadas, Surto de Evolução se houver.

### ATO VI — O Amanhã (30s)
*"Sua primeira missão amanhã: treino às 7h. Confirma?"* — 1 tap define a **intenção de implementação** ("amanhã, QUANDO acordar, ENTÃO treino") — a técnica com maior efeito comprovado em execução de metas (Gollwitzer, d≈0.65). Fecha com o selo no calendário-heatmap e o streak do ritual.

## 4.3 Regras do Ritual

- Ritual completo: 15 XP base × fatores. Ritual tem streak PRÓPRIO (independe das tarefas — dias ruins também merecem encerramento; aliás, **principalmente** eles).
- Pode ser pulado sem punição além do XP não ganho. Versão "exausto" de 45s (Atos III+V comprimidos) disponível — respeito pela vida real gera retenção, não o contrário.
- Janela: configurável (padrão 20h–2h). Preencher às 3h da tarde seguinte não vale streak (anti-farm retroativo).

---

# 5. PARTE 4 — AS DIMENSÕES PROFUNDAS (Terminal Compass 2.0)

## 5.1 Arquitetura comum a toda dimensão

Cada uma das 8 dimensões (alinhadas aos domínios já existentes no app: Corpo, Mente, Execução, Capital, Carreira, Social, Sentido, Evolução) vira um **sistema de progressão completo**:

| Elemento | Definição |
|---|---|
| **Atributos** | 3–4 stats RPG (0–100) derivados de clusters de métricas — o que o radar do Compass exibe |
| **Métricas** | 12–18 indicadores REAIS com fonte, unidade, janela e direção (tabelas abaixo) |
| **Fontes** | `D`=declarada (ritual/N2) · `V`=verificada (N3/N4) · `∫`=integração de módulo do app · `⚙`=derivada (cálculo) |
| **Níveis** | 5 patamares nomeados por dimensão (progressão por métricas, não por XP — não dá pra "comprar" nível de Corpo) |
| **Missões** | Geradas semanalmente pela IA especialista a partir da métrica mais fraca |
| **Fraquezas/Forças** | Detectadas por tendência (30d) e comparação intra-usuário (nunca contra outros usuários — comparação social só na Arena, que é opt-in) |
| **Score da dimensão** | `0.5×média_atributos + 0.3×tendência_30d + 0.2×consistência` — melhorar vale tanto quanto estar bem (motiva iniciantes) |

## 5.2 CORPO — IA: **VITALIS** (dimensão-exemplar, profundidade máxima)

**Atributos:** Motor (força/resistência) · Combustível (nutrição/hidratação) · Regeneração (sono/recuperação) · Constância física

| Métrica | Fonte | Unidade/Janela | Direção |
|---|---|---|---|
| Frequência de treino | ∫ GymRats / V foto | sessões/sem | ↑ |
| Regularidade | ⚙ desvio-padrão dos dias de treino | σ dias, 28d | ↓ |
| Volume de treino | ∫ GymRats minutos | min/sem | ↑ até alvo |
| Intensidade média | ∫ kcal/min declarado + FC se integrada | kcal/min | faixa |
| VO₂ estimado | ⚙ teste submáximo mensal guiado (12min, distância+FC) | ml/kg/min | ↑ |
| Progressão de carga | D/V registros de treino (PRs) | % mês | ↑ |
| Recuperação percebida | D check-in pós-treino (1–5) | média 7d | ↑ |
| Fadiga acumulada | ⚙ EWMA da energia declarada no ritual | 1–5 | equilíbrio |
| Sono: duração | D ritual (futuro ∫ Health) | h/noite, 7d | 7–9 |
| Sono: qualidade | D ritual (1–5) | média 7d | ↑ |
| Consistência de horário de sono | ⚙ variância do horário declarado | min | ↓ |
| Hidratação | ∫ FitCal WaterCard | ml/dia vs alvo | ↑ |
| Aderência calórica | ∫ FitCal | % dias na faixa, 14d | ↑ |
| Proteína relativa | ∫ FitCal + peso | g/kg/dia | faixa |
| Peso: tendência | ∫ FitCal weight_logs | Δ 7d médias móveis | conforme meta |
| Passos | ∫ Health Connect (fase 4) | média/dia | ↑ |
| Mobilidade/alongamento | D/V sessões | sessões/sem | ↑ |
| Dor/lesão ativa | D flag | booleano | monitor |

**Níveis:** Sedentário → Ativo → Consistente → Atleta → Máquina Biológica.
**Exemplo de missão gerada:** *"Sua Regeneração caiu 18% (sono médio 5h50). Missão da semana: 3 noites com 7h+. Recompensa: 90 XP + escudo de streak."*

## 5.3 MENTE — IA: **NOÛS**

**Atributos:** Foco profundo · Aprendizado · Clareza · Higiene digital

Métricas (fonte/janela): horas de foco profundo (∫ timer, /sem) · nº de sessões >45min sem pausa (∫) · interrupções por sessão (⚙ timer, ↓) · páginas ou minutos de estudo (D/V foto/print) · retenção (⚙ micro-quiz da IA 48h depois: "o que você lembra do que estudou terça?") · razão criação/consumo (⚙ tarefas criativas vs. consumo declarado) · tempo de tela ocioso (D, ↓, futuro ∫) · meditação/mindfulness min (D/V timer) · clareza mental declarada (ritual, 1–5) · aprendizados novos/sem (ritual Ato IV, ⚙ contagem) · profundidade das reflexões (⚙ NLP: especificidade média das respostas do ritual) · leitura concluída (livros/mês, V foto).
**Níveis:** Disperso → Atento → Focado → Deep Worker → Mente Blindada.

## 5.4 EXECUÇÃO — IA: **FORGE**

**Atributos:** Vazão · Pontualidade · Calibração · Anti-procrastinação

Métricas: throughput ponderado por dificuldade (⚙ ΣD/sem — 10 tarefas fáceis < 3 pesadas) · taxa de conclusão do planejado (⚙ %/sem) · **latência de início** (⚙ tempo entre horário planejado e primeiro toque na tarefa — a MEDIDA REAL de procrastinação, ↓) · pontualidade (% concluídas na janela) · calibração de estimativas (⚙ |estimado−real|/estimado, ↓ — melhora com o N2 "quanto levou?") · P1 primeiro (% de dias em que a prioridade máxima foi a 1ª concluída) · WIP médio (tarefas em aberto, ↓) · dias zero-overdue streak · taxa de migração (tarefas empurradas 3+ vezes, ↓) · abandono consciente vs. silencioso (Ato II) · deep-work ratio (foco/total) · retrabalho declarado (N2).
**Níveis:** Reativo → Organizado → Operador → Executor → Força de Execução.

## 5.5 CAPITAL — IA: **AUREUS**

**Atributos:** Controle · Acúmulo · Disciplina de gasto · Visão

Métricas (quase tudo ∫ Capital — transações REAIS): taxa de poupança (% receita, /mês) · burn rate diário · runway (meses de reserva, ⚙) · aderência ao orçamento por categoria (%, quando orçado) · gasto impulsivo (⚙ transações de lazer/compras não planejadas <1h após criação, ↓) · dias no verde streak · aportes em metas (∫ goal deposits, R$/mês) · % metas financiadas no ritmo (⚙ funded vs. prazo) · dívida ativa e Δ (↓) · patrimônio líquido Δ (/mês) · custo de hábitos rastreados (⚙ ex.: delivery/mês) · latência de registro (⚙ tempo entre gasto e registro — proxy de consciência financeira, ↓) · nº de categorias estouradas (/mês, ↓).
**Níveis:** No Escuro → Consciente → Controlado → Acumulador → Soberano.

## 5.6 CARREIRA — IA: **ASCENT**

**Atributos:** Competência · Entrega · Rede · Visibilidade

Métricas: horas em skill-building (D/V timer+prova, /sem) · entregas de alto impacto (V, marcos com prova) · % avanço em projetos longos (⚙ metas de carreira) · touchpoints de rede (D: conversas profissionais significativas, /sem) · visibilidade (D/V: posts, apresentações, portfólio, /mês) · feedback pedido (D, /mês — pedir feedback é métrica, receber é consequência) · mentoria dada/recebida (D) · leitura técnica (V) · certificações/cursos concluídos (V certificado) · renda ligada a novas skills (D+∫ Capital, ⚙) · satisfação com o trabalho (ritual semanal, 1–5) · equilíbrio carreira-vida (⚙ % do XP total vindo só de Carreira — acima de 50% gera ALERTA, não parabéns).
**Níveis:** Espectador → Aprendiz → Profissional → Referência → Autoridade.

## 5.7 SOCIAL — IA: **NEXUS**

**Atributos:** Presença · Profundidade · Contribuição · Manutenção de laços

Métricas: interações significativas (D ritual: "teve conversa de verdade hoje?", /sem) · tempo presencial de qualidade (D h/sem) · reconexões (⚙ IA sugere pessoas sem contato >30d a partir de menções; usuário confirma) · atos de contribuição (D/V: ajudou alguém concretamente, /sem) · gratidão expressa A PESSOAS (Ato IV quando cita alguém, ⚙ NLP) · conflitos abertos vs. resolvidos (D) · escuta (autoavaliação pós-interação 1–5) · novos laços (/mês) · rituais sociais mantidos (jantares, ligações recorrentes — hábitos da dimensão) · qualidade percebida da rede de apoio (check-in mensal 1–5).
**Níveis:** Isolado → Presente → Conectado → Pilar → Centro Gravitacional.

## 5.8 SENTIDO — IA: **LUMEN**

**Atributos:** Prática · Gratidão · Alinhamento · Silêncio

Métricas: prática contemplativa (meditação/oração/journaling — min/sem, D/V timer) · streak de gratidão (Ato IV) · diversidade da gratidão (⚙ NLP: agradecer coisas novas vs. repetir — profundidade real, não checkbox) · **alinhamento valores-ações** (⚙ mensal: usuário declara 5 valores; a IA compara com a distribuição real do tempo/tarefas e devolve o gap — a métrica mais confrontadora do app) · tempo em natureza (D min/sem) · detox digital (blocos declarados/verificados sem tela, /sem) · serviço/voluntariado (D/V, /mês) · reflexões profundas (⚙ especificidade média no ritual) · clareza de propósito (check-in mensal 1–5) · leitura reflexiva (V).
**Níveis:** Anestesiado → Desperto → Praticante → Alinhado → Inabalável.

## 5.9 EVOLUÇÃO — IA: o próprio **MENTOR** (meta-dimensão orquestradora)

Não tem hábitos próprios: agrega o crescimento das outras 7.
Métricas: % de métricas com tendência positiva 30d (⚙) · equilíbrio (⚙ desvio-padrão entre os scores das 7 dimensões — **quanto menor, maior o score**; a build "min-maxada" é a única que o ORVAX pune) · hábitos angulares ativos (hábitos que puxam 2+ dimensões) · desafios de IA completados (/mês) · rituais completos (%/mês) · PRs pessoais em qualquer dimensão (/mês) · autoconhecimento (⚙ riqueza acumulada do RAG pessoal) · anti-frágil (⚙ velocidade de recuperação de streaks após quedas — cair e voltar PONTUA).
**Níveis:** os ranks existentes (E- → Nêmesis do Caos) — o rank global vira o nível desta dimensão, unificando o sistema.

---

# 6. PARTE 5 — O CONSELHO DE IAs

## 6.1 Arquitetura (1 cérebro, 8 chapéus — não 8 produtos)

**Decisão técnica crítica:** NÃO são 8 agentes/instâncias separadas (custo e complexidade proibitivos). É **uma** infraestrutura com especialização por contexto:

```
┌─ Edge Function `dimension-coach` (Deno, service role)
│   entrada: { user_id, dimension, task: 'weekly_plan' | 'insight' | 'challenge' | 'chat' }
│   1. Context Builder: métricas 30/90d + tendências + flags + últimos rituais (RAG pessoal)
│   2. System prompt do ESPECIALISTA (VITALIS/NOÛS/FORGE/AUREUS/ASCENT/NEXUS/LUMEN)
│   3. LLM (mesmo modelo do mentor-chat) → saída estruturada JSON
│   4. Persiste em `ai_insights` (o front nunca chama o LLM direto)
└─ Cron semanal (domingo à noite): gera o plano da semana das 2 dimensões mais fracas
```

O Mentor central (Atlas/Aurora — persona escolhida) continua sendo A voz do app; os especialistas assinam os insights ("VITALIS: seu sono…") mas falam ATRAVÉS do Mentor. Uma personalidade, oito competências — coerência narrativa e 1 única fatura de API.

## 6.2 O que cada especialista FAZ (contrato de saída)

| Função | Saída | Frequência |
|---|---|---|
| **Analisar** | 3 insight-cards: fato + interpretação + dado que sustenta | semanal |
| **Prever** | 1 risco ("padrão de queda de treino detectado às sextas") com probabilidade | semanal |
| **Planejar** | plano de 7 dias: 3 missões calibradas na métrica mais fraca | semanal |
| **Desafiar** | 1 desafio opt-in com recompensa (XP + escudo) | semanal |
| **Corrigir** | intervenção assíncrona quando métrica crítica despenca (ex.: 5 dias sem registro) — via notificação do Mentor, tom da persona | event-driven |
| **Explicar** | TODA recomendação cita os dados ("porque X caiu 40% em 14d") — explicabilidade é requisito, não feature | sempre |

## 6.3 Regras de conduta das IAs (guard-rails)

1. Nunca diagnostica saúde física/mental — encaminha ("isso é assunto pra um profissional; posso te ajudar a agendar?").
2. Nunca usa culpa ou vergonha; usa dados + próxima ação mínima (o tom da LP: firmeza com cuidado).
3. Nunca compara com outros usuários fora da Arena.
4. Máx. 1 notificação proativa/dia/dimensão — atenção do usuário é o recurso mais escasso da economia.

---

# 7. PARTE 6 — SISTEMA ANTIFRAUDE

## 7.1 Doutrina

Fraude num app de autodesenvolvimento tem uma ironia embutida: **quem trapaceia só rouba a si mesmo** — mas destrói a Arena, o ranking e o significado do rank para todos os outros. Logo: resposta **silenciosa e econômica** (tornar não-lucrativo) para fraude solo; resposta **dura** apenas onde há vítimas (competição).

Escada de resposta (nunca pula degraus): 1) neutralização matemática silenciosa → 2) XP em custódia (escrow até validação) → 3) auditoria dirigida → 4) queda de Trust → 5) cap de XP invisível → 6) exclusão de rankings competitivos. **Nunca** acusação frontal; sempre "verificação adicional".

## 7.2 Vetores × Detecção × Resposta

| Vetor | Detecção | Resposta |
|---|---|---|
| Respostas copiadas/repetidas | Similaridade de embedding >0.92 vs. últimas 50 respostas próprias | Q→0.6 silencioso; reincidência: Trust −3 |
| Respostas geradas por IA | Perplexidade/estilo + follow-up contextual impossível de terceirizar ("qual slide você refez?") | Sem resposta específica → N1; padrão: auditoria |
| Tarefas concluídas em segundos | Δt criação→conclusão < mínimo plausível da categoria | XP escrow + contagem para Temp do Trust |
| Rajadas (spam de conclusão) | >5 conclusões em <60s | Saturação agressiva retroativa do lote + flag |
| Farm de XP | Já neutralizado por raridade + saturação + tetos (seção 2.6) | Matemática — sem drama |
| Fotos falsas/repetidas | pHash duplicado, EXIF incoerente, visão ("conteúdo não corresponde") | Prova rejeitada c/ motivo; 3 rejeições→auditoria |
| Documentos repetidos | Hash de conteúdo + OCR | idem fotos |
| Dificuldade inflada | Classificador de esforço vs. declarado | Recalibração visível + contestável |
| Automação/scripts | Cadência sem jitter humano (intervalos σ≈0), user-agent, horários cravados | Cap invisível + desafio interativo (não CAPTCHA imposto pelo app a humanos honestos — só a padrões robóticos) |
| Múltiplas contas | Fingerprint de dispositivo + customer do Stripe + padrões de rede | Contas irmãs não pareiam na Arena; XP social zerado entre elas |
| Timer fantasma (liga e larga) | Foco sem interação alguma no dispositivo por sessões inteiras, repetidamente | Timer pede "prova de vida" leve (1 toque) em pontos aleatórios de sessões >90min |
| Relógio do dispositivo alterado | Timestamps server-side SEMPRE; cliente nunca informa hora | Imune por arquitetura |

## 7.3 O escudo definitivo: arquitetura

A maior parte da fraude morre no design, não na detecção: XP server-side (ninguém "manda" XP), ledger imutável (`xp_events` é append-only — auditável para sempre, recomputável se uma regra mudar), provas com hash, e RLS que impede o cliente de escrever em qualquer tabela de pontuação.

---

# 8. PARTE 7 — ECONOMIA DE XP

## 8.1 Renda diária de referência (jogador honesto e ativo)

| Perfil | XP/dia típico |
|---|---|
| Dia mínimo (3 ações N1 + ritual) | ~35 |
| Dia sólido (5 ações mistas N2/N3 + treino + ritual) | ~90–130 |
| Dia excepcional (raro por definição: provas, marco de meta, crit) | ~200–280 (teto suave morde acima disso) |

## 8.2 Curva de progressão (a espinha da longevidade)

```
XP_total_para_nível(L) = 100 × L^1.8
```

| Nível | XP acumulado | Tempo em jogo honesto (~110/dia) |
|---|---|---|
| 5 | 1.810 | ~2,5 semanas |
| 10 | 6.310 | ~2 meses |
| 20 | 21.960 | ~6,5 meses |
| 35 | 60.510 | ~1,5 ano |
| 50 | 114.100 | ~2,8 anos |
| 70 | 209.500 | ~5 anos |

- **Por que expoente 1.8:** linear estagna veteranos; exponencial (tipo 2^L) mata iniciantes. Polinomial 1.8 dá o "corredor de progresso": você SEMPRE está a semanas — não dias, não anos — do próximo marco. Mapeia-se 1:1 nos ranks existentes (E- → Nêmesis: 24 patamares).
- **Goal Gradient integrado:** a UI mostra sempre "faltam X para [próximo rank]" com barra — a motivação acelera perto do fim (efeito comprovado: cartões de fidelidade).

## 8.3 Anti-inflação (4 travas)

1. **Tetos suaves diários** (2.6) — limitam a emissão.
2. **Raridade** — a emissão por ação repetida tende a zero.
3. **Duas moedas:** `XP vitalício` (rank, nunca some — respeita o loss aversion) e `XP sazonal` (Arena/ranking, zera a cada temporada de 90 dias). Competição sempre recomeça justa; veteranos não são intocáveis; novatos têm chance real — o **fresh start effect** institucionalizado.
4. **Sinks (onde XP é gasto, sem pay-to-win):** desbloquear personas de Mentor (o Filósofo, o Gênio…), temas de terminal, molduras do Dossiê, apostas de XP sazonal em desafios da Arena ("dobro ou nada no desafio de 30 dias"), e o **Rito de Ascensão**: para cruzar marcos de rank (E→D, D→C…), além do XP é preciso completar uma prova real da dimensão mais fraca — rank é gate de VIDA, não só de número.

## 8.4 Curto vs. longo prazo

| Horizonte | Mecanismo |
|---|---|
| Hoje | XP do dia, crit, cerimônia do ritual |
| Semana | Desafios de IA, escudo ganho, plano semanal |
| Mês | Nível de dimensão, PRs, relatório mensal do Conselho |
| Trimestre | Temporada da Arena, Rito de Ascensão |
| Anos | Rank vitalício, heatmap anual, "Era" do personagem |

---

# 9. PARTE 8 — FUNDAMENTOS DE PSICOLOGIA COMPORTAMENTAL

Cada mecanismo mapeado à ciência que o sustenta:

| Mecanismo VERITAS | Princípio | Por que aumenta adesão |
|---|---|---|
| Escada N1–N4 opcional | **Autonomia (SDT/Deci&Ryan)** | Escolher o nível de compromisso preserva motivação intrínseca; imposição gera reatância |
| Nota do dia calculada + níveis por métrica | **Competência (SDT)** | Progresso precisa parecer MERECIDO para nutrir; XP de graça esvazia o significado (undermining effect) |
| Arena, grupos VIP, contribuição no Social | **Pertencimento (SDT)** | O terceiro pilar da motivação — sem ele, apps de hábito viram diários solitários |
| Crit 5% + auditoria imprevisível | **Reforço de razão variável (Skinner)** | O agendamento de recompensa mais resistente à extinção que existe; usado só no positivo = ético |
| "Faltam 240 XP para C-" | **Goal Gradient (Hull/Kivetz)** | Esforço acelera com a proximidade do objetivo |
| Ato II (pendências uma a uma) | **Efeito Zeigarnik** | Tarefas abertas ocupam a mente; fechá-las ritualmente reduz carga cognitiva e ansiedade |
| Escudo de streak (cai 30%, não zera) | **Aversão à perda SEM what-the-hell effect** | Perda total → desistência total (medido pelo Duolingo); perda parcial mantém o jogo vivo |
| Ato VI ("amanhã, 7h, treino — confirma?") | **Implementation Intentions (Gollwitzer)** | Maior efeito individual conhecido sobre execução de metas (d≈0.65) |
| Ritual ancorado à noite + missões mínimas | **Tiny Habits (Fogg) / Atomic Habits (Clear)** | Âncora + ação minúscula + celebração imediata = formação de hábito |
| Dificuldade calibrada por IA (missões na métrica fraca, nível certo) | **Flow (Csikszentmihalyi)** | Desafio ≈ habilidade+ε mantém engajamento; fácil entedia, difícil paralisa |
| Temporadas de 90 dias | **Fresh Start Effect (Milkman)** | Marcos temporais renovam motivação; ninguém fica preso ao próprio passado |
| Cerimônia no FIM do ritual | **Peak-End Rule (Kahneman)** | A memória do dia é seu pico + seu fim; um fim bonito = um dia lembrado como bom = volta amanhã |
| Retrospectiva automática (Ato I) | **Percepção de esforço reconhecido** | Ser visto é a fantasia central do ORVAX — entregue com dados, não com ameaça |
| Score valoriza tendência, não só estado | **Mindset de crescimento (Dweck)** | Iniciantes melhorando pontuam — o app premia a derivada, não o privilégio do ponto de partida |

## 9.1 Compromissos éticos (o "viciante saudável" por escrito)

1. Nenhuma mecânica de culpa, vergonha ou medo. 2. Nenhuma compra de XP ou vantagem paga (a assinatura destrava módulos, nunca progresso). 3. Notificações com orçamento diário e horário de silêncio. 4. Trust Score transparente e contestável. 5. Dados de prova (fotos, localização) apagados após validação — retenção mínima. 6. O objetivo declarado do app é o usuário PRECISAR MENOS dele com o tempo (autonomia crescente) — churn por graduação é vitória, não derrota.

---

# 10. PARTE 9 — IMPLEMENTAÇÃO (roadmap técnico)

## 10.1 Schema novo (migrations Supabase/Postgres)

```sql
-- Ledger imutável de XP (fonte única da verdade)
CREATE TABLE xp_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id),
  source_type TEXT NOT NULL,        -- task|habit|goal|ritual|challenge|arena|finance
  source_id UUID,
  dimension TEXT NOT NULL,
  base NUMERIC, d NUMERIC, q NUMERIC, c NUMERIC, t NUMERIC, s NUMERIC, k NUMERIC,
  crit BOOLEAN DEFAULT FALSE,
  xp_final INT NOT NULL,
  meta JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
-- RLS: SELECT próprio; INSERT/UPDATE/DELETE: ninguém (só service role)

CREATE TABLE verifications (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL, source_id UUID NOT NULL,
  level SMALLINT NOT NULL,          -- 1..4
  kind TEXT,                        -- photo|timer|file|audio|geo|integration|interview
  payload_hash TEXT, phash TEXT,
  ai_confidence NUMERIC, status TEXT DEFAULT 'pending',  -- pending|valid|rejected|contested
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE trust_scores (
  user_id UUID PRIMARY KEY REFERENCES profiles(id),
  score NUMERIC NOT NULL DEFAULT 50,
  p NUMERIC, coher NUMERIC, temp NUMERIC, cross_c NUMERIC,
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE trust_events ( id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID, delta NUMERIC, reason TEXT, ref JSONB, created_at TIMESTAMPTZ DEFAULT now());

CREATE TABLE metric_definitions ( key TEXT PRIMARY KEY, dimension TEXT, source TEXT,
  unit TEXT, window_days INT, direction TEXT, weight NUMERIC );
CREATE TABLE metric_samples ( id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID, metric_key TEXT REFERENCES metric_definitions(key),
  value NUMERIC, sampled_at TIMESTAMPTZ DEFAULT now());

CREATE TABLE daily_reviews ( id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID, day DATE, energy SMALLINT, emotions TEXT[], sleep_h NUMERIC, sleep_q SMALLINT,
  victory TEXT, challenge TEXT, learning TEXT, gratitude TEXT,
  self_score SMALLINT, computed_score NUMERIC, ai_reflection TEXT,
  completed BOOLEAN DEFAULT FALSE, created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, day));

CREATE TABLE ai_insights ( id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID, dimension TEXT, kind TEXT,  -- insight|risk|plan|challenge|correction
  content JSONB, week DATE, created_at TIMESTAMPTZ DEFAULT now());

CREATE TABLE seasons ( id SMALLINT PRIMARY KEY, starts DATE, ends DATE, name TEXT );
ALTER TABLE profiles ADD COLUMN season_xp INT DEFAULT 0;
```

## 10.2 Edge Functions novas

| Função | Papel |
|---|---|
| `xp-engine` | Recebe FATOS (evento+prova+timestamps), calcula a fórmula, insere no ledger, atualiza profiles |
| `verify` | Valida provas (pHash, EXIF, hash, visão), roda micro-entrevista N2, dispara N4 |
| `daily-review` | Orquestra o ritual: monta retrospectiva, processa Atos, chama LLM p/ reflexão, emite XP |
| `dimension-coach` | O Conselho (seção 6.1) |
| `fraud-scan` | Cron diário: rajadas, duplicatas, cadência robótica → trust_events |
| `trust-recompute` | Cron semanal: EWMA + regressão à média |

## 10.3 Fases de entrega

| Fase | Semanas | Entrega | Critério de sucesso |
|---|---|---|---|
| **F1 — Fundação** | 1–4 | `xp_events` + `xp-engine` server-side; fórmula com B/D/S/C (Q=0.6 fixo, T=0.75 fixo); revogar XP client-side; front envia fatos; recalibrar KIND_META (criar=0) | Console do navegador não consegue mais gerar XP; farm de 20 tarefas rende <15 XP |
| **F2 — Verdade** | 5–8 | N2 micro-entrevista + N3 (foto/timer/arquivo) + `verifications` + Trust v1 + tela de Integridade no Dossiê | ≥40% das conclusões com N2+; TS discrimina (distribuição não-colapsada) |
| **F3 — Ritual** | 9–12 | Registrar Dia 2.0 completo (6 Atos) substituindo QuickLogEntry; `daily_reviews`; nota calculada | ≥50% de rituais/DAU; D7 retention +20% vs. baseline |
| **F4 — Profundidade** | 13–18 | `metric_definitions/samples` para as 8 dimensões (fontes já existentes: FitCal/GymRats/Capital/Vault); Compass 2.0 lê métricas; níveis por dimensão | Score de dimensão correlaciona com dados reais, não com nº de check-ins |
| **F5 — Conselho** | 19–24 | `dimension-coach` + cron semanal + missões/desafios; N4; antifraude completo | ≥30% dos desafios aceitos são concluídos |
| **F6 — Temporadas** | 25+ | season_xp, Arena sazonal com gate de Trust, Ritos de Ascensão, sinks cosméticos | Inflação de XP/dia estável trimestre a trimestre |

## 10.4 Integração com o app existente (mapa de toque mínimo)

- **PendingTodayPanel / ExecutionBoard / CreationHub / FinanceDeepDive:** trocam `awardXp(valor)` por `reportEvent(fato)` → `xp-engine`. UI de conclusão ganha o seletor N1/N2/N3 (padrão N1, 1 toque).
- **QuickLogEntry** → substituído pelo Ritual (`daily-review`); os 8 domínios viram as 8 dimensões.
- **Compass (pillarDataAdapter)** → passa a ler `metric_samples` agregadas em atributos (fim do "score = nº de check-ins").
- **MentorAssistant / mentor-chat** → ganha a rota `dimension-coach`; personas existentes viram as vozes.
- **GymRats/FitCal/Capital** → viram FONTES de métricas (∫) sem mudança de UX; check-in da Arena já nasce N3.
- **RankSystem** → mantém lore e visual; thresholds re-ancorados na curva 8.2; migração: XP legado é congelado como "Era 1" no Dossiê (badge de veterano) e todos começam a Era 2 juntos — **não** se recalcula o passado, celebra-se.
- **Conquistas (aba bloqueada)** → desbloqueia junto com F3, alimentada pelo ledger (conquistas verificáveis).

## 10.5 Riscos e limitações (honestidade de engenharia)

| Risco | Mitigação |
|---|---|
| Fricção de verificação derruba conclusões | N1 continua 1-toque; medir taxa de conclusão por coorte na F2 e ajustar Q antes de subir a régua |
| Custo de LLM (N2/N4/coach) | N2 usa modelo pequeno; N4 e coach são raros/semanal; orçamento por usuário com degradação graciosa (sem IA → regras heurísticas) |
| Falsos positivos de fraude | Escada silenciosa + contestação + nunca acusar; medir taxa de contestações vencidas |
| Privacidade (fotos/geo) | Opt-in por prova, retenção mínima, hash em vez de mídia sempre que possível, LGPD by design |
| Complexidade percebida | O usuário casual vê só: tarefas → XP → rank → ritual. Fórmula, Trust e métricas são profundidade OPCIONAL (padrão Pokémon GO: IVs existem, ninguém precisa saber) |

---

# 11. UMA FRASE

O ORVAX de hoje diz *"estou te observando"* — e não observa nada. O Protocolo VERITAS faz o app finalmente cumprir a própria promessa: **um sistema que observa de verdade, confia com inteligência, recompensa com justiça e transforma consistência em identidade.**

*Fim do documento. Próximo passo sugerido: aprovar F1 e abrir a migration `xp_events` + Edge Function `xp-engine`.*
