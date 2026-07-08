-- =============================================================
-- ORVAX Blog — Seed inicial com posts hardcoded do Blog.jsx
-- Idempotente: não insere se já existir qualquer post
-- =============================================================

INSERT INTO public.blog_posts
  (title, summary, content, category, image_url, author_name, author_avatar,
   read_time_min, date_day, date_month, is_highlight, highlight_order, published)
SELECT title, summary, content, category, image_url, author_name, author_avatar,
       read_time_min, date_day, date_month, is_highlight, highlight_order, published
FROM (VALUES

  -- ── HIGHLIGHTS (carousel da capa) ─────────────────────────
  (
    'SINCRONIA NEURAL',
    'ESTRUTURAS FRACTAIS DE FOCO ABSOLUTO.',
    E'A técnica de sincronização fractal permite que o cérebro entre em estados de fluxo mais profundos através de estímulos binaurais em frequências específicas. Pesquisas recentes indicam que a ressonância harmônica em 40Hz pode aumentar a retenção de memória em até 35% durante sessões de foco intenso.\n\nEste protocolo, agora em sua versão 2.0, utiliza algoritmos de IA para ajustar a frequência em tempo real baseando-se na variabilidade da frequência cardíaca do usuário, garantindo uma imersão sem precedentes no ambiente de trabalho ou estudo.\n\nAo longo dos parágrafos seguintes, exploraremos os fundamentos biológicos desta tecnologia e como você pode implementá-la em sua rotina diária para alcançar a performance de elite.',
    'NEUROCIÊNCIA',
    'https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?w=800&q=80',
    'DR. KAELEN',
    NULL,
    5, '24', 'MAR', TRUE, 1, TRUE
  ),
  (
    'DISCIPLINA POR DESIGN',
    'COMO CONSTRUIR UMA VONTADE INABALÁVEL VIA SISTEMAS.',
    E'A disciplina não é um traço de caráter, é uma arquitetura ambiental. Nesta masterclass, exploramos como o design do seu espaço e a automação de decisões podem remover o atrito da execução diária.\n\nEstudamos os padrões de comportamento dos 0.1% e descobrimos que eles não possuem mais força de vontade, mas sim sistemas que tornam a falha impossível.',
    'PROTOCOLOS',
    'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&q=80',
    'ORVAX PROTOCOL',
    NULL,
    5, '25', 'MAR', TRUE, 2, TRUE
  ),
  (
    'SISTEMAS DE ELITE',
    'MAPEAMENTO DE GATILHOS INVISÍVEIS PARA EFICIÊNCIA.',
    'Nesta análise profunda, mergulhamos nos sistemas que regem a produtividade humana em ambientes de alta pressão. Mapeamos os gatilhos invisíveis que desencadeiam a procrastinação e desenvolvemos um framework robusto para substituí-los por hábitos de alta performance.',
    'SISTEMAS',
    'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&q=80',
    'SYS ADMIN',
    NULL,
    5, '22', 'MAR', TRUE, 3, TRUE
  ),

  -- ── FEED POSTS (timeline) ─────────────────────────────────
  (
    'A Química do Estado de Fluxo Profundo',
    'Explorando os neurotransmissores envolvidos na imersão cognitiva e como otimizá-los naturalmente.',
    E'O estado de fluxo não é apenas um conceito psicológico; é uma cascata bioquímica precisa. Quando entramos em ''deep work'', o cérebro libera uma mistura potente de norepinefrina, dopamina, anandamida, serotonina e endorfinas.\n\nCada um desses químicos tem um papel crucial: a norepinefrina aumenta o foco e a atenção; a dopamina aumenta a recompensa e o foco; a anandamida melhora o pensamento lateral e a união de ideias díspares; a serotonina e as endorfinas criam a sensação de prazer e bem-estar que nos mantém engajados por horas.\n\nPara otimizar essa química, recomendamos um protocolo que equilibre o desafio da tarefa com o seu nível de habilidade, eliminando distrações externas e preparando o ambiente para a imersão total.',
    'CIÊNCIA',
    'https://images.unsplash.com/photo-1507413245164-6160d8298b31?w=800&q=80',
    'Dr. Kaelen',
    'https://i.pravatar.cc/150?u=kaelen',
    5, '24', 'MAR', FALSE, 0, TRUE
  ),
  (
    'Atualização de Matriz de Hábitos v2.4',
    'Log de mudanças focado no controle de dopamina sintética e recompensas variáveis.',
    E'A versão 2.4 do nosso framework de hábitos foca na regulação da dopamina sintética. Vivemos em um mundo projetado para hackear nosso sistema de recompensa. Esta atualização traz ferramentas de ''jejum de dopamina'' integradas ao dashboard principal.\n\nAplicamos agora o conceito de ''micro-recompensas analógicas'', incentivando o usuário a encontrar gratificação em processos de longo prazo em vez de notificações instantâneas.',
    'SISTEMAS',
    NULL,
    'Sys Admin',
    'https://i.pravatar.cc/150?u=sysadmin',
    3, '22', 'MAR', FALSE, 0, TRUE
  ),
  (
    'Dopamina Sintética e o Design de Interfaces',
    'Como grandes plataformas usam a psicologia do vício para manter o usuário em loop infinito.',
    E'O design moderno de interfaces evoluiu para uma forma de engenharia comportamental. O ''infinite scroll'', as cores vibrantes das notificações e a gratificação social intermitente são projetados para criar dependência cíclica.\n\nNeste dossiê, desmontamos essas táticas e mostramos como o design ético pode recuperar o controle da atenção do usuário, priorizando a utilidade em vez da retenção forçada.',
    'TECNOLOGIA',
    'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&q=80',
    'Orvax Protocol',
    'https://i.pravatar.cc/150?u=orvax',
    8, '20', 'MAR', FALSE, 0, TRUE
  ),
  (
    'A Matemática da Consistência Inabalável',
    'Por que 1% de melhoria diária é superior a 100% de esforço esporádico.',
    E'O sucesso não é um evento, é um processo de juros compostos. Quando você mantém a consistência por 365 dias, a melhoria de 1% diária resulta em uma evolução 37 vezes superior ao ponto de partida.\n\nA dificuldade não está na execução, mas na manutenção do ritmo em dias de baixa energia. Aqui apresentamos o protocolo de ''Mínimo Viável Diário'' para garantir que a corrente nunca seja quebrada.',
    'PERFORMANCE',
    'https://images.unsplash.com/photo-1434494878577-86c23bcb06b9?w=800&q=80',
    'Coach Mike',
    'https://i.pravatar.cc/150?u=mike',
    6, '18', 'MAR', FALSE, 0, TRUE
  ),
  (
    'Rotina de Aço: O Guia de Alvorada',
    'Como as primeiras 2 horas do seu dia definem o seu teto de performance.',
    'Vencer o dia começa antes do sol nascer. A alvorada é o único momento de silêncio absoluto onde você é o dono da sua agenda. Implementar um ritual de exposição à luz solar, hidratação profunda e 15 minutos de meditação de visualização cria um ''buffer'' psicológico contra o caos do dia corporativo.',
    'PROTOCOLOS',
    'https://images.unsplash.com/photo-1493612276216-ee3925520721?w=800&q=80',
    'Athena AI',
    'https://i.pravatar.cc/150?u=athena',
    4, '15', 'MAR', FALSE, 0, TRUE
  )

) AS t(title, summary, content, category, image_url, author_name, author_avatar,
       read_time_min, date_day, date_month, is_highlight, highlight_order, published)
WHERE NOT EXISTS (SELECT 1 FROM public.blog_posts);
