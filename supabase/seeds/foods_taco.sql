-- =============================================================
-- ORVAX FitCal - Seed: 150 alimentos brasileiros (base TACO)
-- Tabela de Composição de Alimentos - UNICAMP
-- Valores por 100g de alimento no estado indicado
-- =============================================================
-- Idempotente: não insere se já existirem alimentos com source='taco'
-- Para executar: supabase db reset   OU   psql ... < this_file.sql
-- =============================================================

INSERT INTO public.foods
  (name, calories, protein_g, carbs_g, fat_g, serving_size_g, serving_unit, source, is_verified)
SELECT name, calories, protein_g, carbs_g, fat_g, serving_size_g, serving_unit, source, is_verified
FROM (VALUES
  -- ── CEREAIS E DERIVADOS ────────────────────────────────────
  ('Arroz branco cozido',             128, 2.5,  28.1,   0.2,  100, 'g', 'taco', true),
  ('Arroz integral cozido',           124, 2.6,  25.8,   1.0,  100, 'g', 'taco', true),
  ('Macarrão cozido',                 150, 5.2,  29.3,   0.8,  100, 'g', 'taco', true),
  ('Farinha de mandioca torrada',     361, 1.6,  88.0,   0.3,  100, 'g', 'taco', true),
  ('Farinha de trigo',                360, 9.8,  75.1,   1.4,  100, 'g', 'taco', true),
  ('Aveia em flocos',                 394,13.9,  66.6,   8.5,  100, 'g', 'taco', true),
  ('Milho verde cozido',              102, 3.2,  22.4,   1.4,  100, 'g', 'taco', true),
  ('Cuscuz de milho cozido',          104, 2.1,  23.2,   0.4,  100, 'g', 'taco', true),
  ('Fubá de milho',                   351, 7.9,  74.8,   1.0,  100, 'g', 'taco', true),
  ('Quinoa cozida',                   120, 4.4,  21.3,   1.9,  100, 'g', 'taco', true),

  -- ── LEGUMINOSAS ───────────────────────────────────────────
  ('Feijão carioca cozido',            76, 4.8,  13.6,   0.5,  100, 'g', 'taco', true),
  ('Feijão preto cozido',              77, 4.5,  14.0,   0.5,  100, 'g', 'taco', true),
  ('Feijão-de-corda cozido',           63, 4.2,  11.3,   0.4,  100, 'g', 'taco', true),
  ('Lentilha cozida',                 113, 9.0,  19.6,   0.5,  100, 'g', 'taco', true),
  ('Grão-de-bico cozido',             164, 8.9,  27.4,   2.6,  100, 'g', 'taco', true),
  ('Soja cozida',                     141,14.6,  11.5,   5.7,  100, 'g', 'taco', true),
  ('Ervilha cozida',                   80, 5.4,  14.1,   0.4,  100, 'g', 'taco', true),
  ('Tofu',                             76, 8.1,   1.9,   4.8,  100, 'g', 'taco', true),

  -- ── CARNES E AVES ──────────────────────────────────────────
  ('Peito de frango grelhado',        159,32.0,   0.0,   3.2,  100, 'g', 'taco', true),
  ('Coxa de frango assada',           220,26.0,   0.0,  12.6,  100, 'g', 'taco', true),
  ('Sobrecoxa de frango assada',      256,27.8,   0.0,  15.9,  100, 'g', 'taco', true),
  ('Frango inteiro assado',           238,28.3,   0.0,  13.4,  100, 'g', 'taco', true),
  ('Carne moída bovina refogada',     246,25.6,   0.0,  15.7,  100, 'g', 'taco', true),
  ('Patinho bovino grelhado',         219,32.7,   0.0,   9.5,  100, 'g', 'taco', true),
  ('Alcatra bovina grelhada',         237,31.4,   0.0,  12.0,  100, 'g', 'taco', true),
  ('Filé mignon grelhado',            219,35.5,   0.0,   8.0,  100, 'g', 'taco', true),
  ('Contrafilé grelhado',             270,30.5,   0.0,  16.0,  100, 'g', 'taco', true),
  ('Costela bovina cozida',           393,24.6,   0.0,  32.5,  100, 'g', 'taco', true),
  ('Linguiça calabresa grelhada',     330,17.5,   1.5,  28.3,  100, 'g', 'taco', true),
  ('Presunto cozido',                 122,17.4,   1.7,   5.0,  100, 'g', 'taco', true),
  ('Peito de peru defumado',          109,20.0,   1.2,   2.5,  100, 'g', 'taco', true),
  ('Fígado bovino refogado',          175,26.5,   3.9,   5.8,  100, 'g', 'taco', true),
  ('Bacon frito',                     541,22.7,   0.1,  49.3,  100, 'g', 'taco', true),

  -- ── PEIXES E FRUTOS DO MAR ─────────────────────────────────
  ('Tilápia grelhada',                 96,21.0,   0.0,   1.4,  100, 'g', 'taco', true),
  ('Salmão grelhado',                 196,27.0,   0.0,   9.5,  100, 'g', 'taco', true),
  ('Atum em conserva (água)',         132,28.2,   0.0,   1.8,  100, 'g', 'taco', true),
  ('Sardinha em conserva (óleo)',     208,24.2,   0.0,  12.2,  100, 'g', 'taco', true),
  ('Camarão cozido',                   90,19.4,   0.0,   1.2,  100, 'g', 'taco', true),
  ('Filé de merluza grelhado',         76,16.8,   0.0,   0.9,  100, 'g', 'taco', true),
  ('Bacalhau cozido',                 123,28.3,   0.0,   0.7,  100, 'g', 'taco', true),

  -- ── OVOS ──────────────────────────────────────────────────
  ('Ovo inteiro cozido',              146,13.0,   0.6,   9.5,  100, 'g', 'taco', true),
  ('Clara de ovo cozida',              52,11.1,   0.7,   0.2,  100, 'g', 'taco', true),

  -- ── LATICÍNIOS ────────────────────────────────────────────
  ('Leite integral',                   61, 3.2,   4.8,   3.2,  100, 'ml','taco', true),
  ('Leite desnatado',                  35, 3.4,   5.0,   0.1,  100, 'ml','taco', true),
  ('Iogurte natural integral',         71, 3.9,   5.9,   3.3,  100, 'g', 'taco', true),
  ('Iogurte natural desnatado',        45, 4.3,   6.2,   0.2,  100, 'g', 'taco', true),
  ('Iogurte grego integral',           97, 9.0,   3.6,   5.0,  100, 'g', 'taco', true),
  ('Queijo minas frescal',            264,17.4,   3.0,  20.2,  100, 'g', 'taco', true),
  ('Queijo mussarela',                342,22.2,   3.7,  26.7,  100, 'g', 'taco', true),
  ('Queijo parmesão',                 452,35.6,   4.0,  33.3,  100, 'g', 'taco', true),
  ('Queijo coalho',                   310,22.0,   2.0,  24.0,  100, 'g', 'taco', true),
  ('Requeijão cremoso',               263,10.8,   2.1,  23.6,  100, 'g', 'taco', true),
  ('Queijo cottage',                   98,11.1,   3.4,   4.3,  100, 'g', 'taco', true),
  ('Manteiga',                        726, 0.7,   0.1,  80.8,  100, 'g', 'taco', true),
  ('Leite condensado',                329, 7.9,  54.9,   8.7,  100, 'g', 'taco', true),
  ('Creme de leite',                  326, 2.1,   3.2,  33.8,  100, 'g', 'taco', true),

  -- ── FRUTAS ────────────────────────────────────────────────
  ('Banana nanica',                    92, 1.3,  23.8,   0.1,  100, 'g', 'taco', true),
  ('Banana-prata',                     98, 1.3,  25.9,   0.1,  100, 'g', 'taco', true),
  ('Maçã fuji',                        56, 0.3,  15.2,   0.2,  100, 'g', 'taco', true),
  ('Laranja pera',                     37, 1.0,   8.9,   0.1,  100, 'g', 'taco', true),
  ('Mamão formosa',                    45, 0.5,  11.8,   0.1,  100, 'g', 'taco', true),
  ('Manga Tommy',                      59, 0.8,  14.9,   0.2,  100, 'g', 'taco', true),
  ('Melancia',                         33, 0.8,   7.8,   0.2,  100, 'g', 'taco', true),
  ('Melão',                            29, 0.9,   6.8,   0.1,  100, 'g', 'taco', true),
  ('Uva itália',                       69, 0.9,  17.5,   0.1,  100, 'g', 'taco', true),
  ('Morango',                          30, 0.7,   7.1,   0.3,  100, 'g', 'taco', true),
  ('Abacaxi',                          48, 0.9,  12.3,   0.1,  100, 'g', 'taco', true),
  ('Goiaba vermelha',                  54, 2.3,  10.7,   0.9,  100, 'g', 'taco', true),
  ('Caju',                             43, 1.3,   9.0,   0.4,  100, 'g', 'taco', true),
  ('Açaí (polpa)',                     58, 1.5,   6.0,   3.5,  100, 'g', 'taco', true),
  ('Abacate',                          96, 1.2,   6.0,   8.4,  100, 'g', 'taco', true),
  ('Maracujá (polpa)',                 68, 2.4,  13.7,   0.7,  100, 'g', 'taco', true),
  ('Kiwi',                             61, 1.1,  14.6,   0.6,  100, 'g', 'taco', true),
  ('Pêra',                             55, 0.5,  14.3,   0.1,  100, 'g', 'taco', true),
  ('Limão',                            30, 1.0,   7.2,   0.3,  100, 'g', 'taco', true),
  ('Caqui',                            66, 0.7,  17.0,   0.2,  100, 'g', 'taco', true),

  -- ── VERDURAS E LEGUMES ────────────────────────────────────
  ('Alface',                           11, 1.3,   1.7,   0.2,  100, 'g', 'taco', true),
  ('Tomate',                           15, 1.1,   3.1,   0.2,  100, 'g', 'taco', true),
  ('Cenoura cozida',                   41, 0.8,   9.3,   0.2,  100, 'g', 'taco', true),
  ('Brócolis cozido',                  34, 3.4,   4.5,   0.5,  100, 'g', 'taco', true),
  ('Couve-flor cozida',                22, 2.2,   3.5,   0.2,  100, 'g', 'taco', true),
  ('Espinafre cozido',                 26, 2.9,   3.5,   0.5,  100, 'g', 'taco', true),
  ('Abóbora cozida',                   26, 1.0,   6.5,   0.1,  100, 'g', 'taco', true),
  ('Chuchu cozido',                    18, 0.5,   4.3,   0.1,  100, 'g', 'taco', true),
  ('Abobrinha cozida',                 16, 1.2,   2.8,   0.2,  100, 'g', 'taco', true),
  ('Berinjela cozida',                 21, 0.8,   4.8,   0.2,  100, 'g', 'taco', true),
  ('Pimentão verde',                   21, 0.9,   4.4,   0.2,  100, 'g', 'taco', true),
  ('Pepino',                           13, 0.6,   2.7,   0.1,  100, 'g', 'taco', true),
  ('Beterraba cozida',                 39, 1.9,   8.4,   0.1,  100, 'g', 'taco', true),
  ('Couve-manteiga refogada',          30, 3.0,   4.5,   0.6,  100, 'g', 'taco', true),
  ('Repolho cozido',                   18, 1.4,   3.4,   0.1,  100, 'g', 'taco', true),
  ('Alho',                            133, 6.1,  28.8,   0.1,  100, 'g', 'taco', true),
  ('Cebola',                           40, 1.2,   9.5,   0.2,  100, 'g', 'taco', true),
  ('Quiabo cozido',                    29, 2.1,   5.5,   0.3,  100, 'g', 'taco', true),
  ('Jiló cozido',                      27, 1.4,   5.7,   0.2,  100, 'g', 'taco', true),
  ('Vagem cozida',                     27, 1.9,   5.4,   0.1,  100, 'g', 'taco', true),

  -- ── TUBÉRCULOS E RAÍZES ───────────────────────────────────
  ('Batata inglesa cozida',            52, 1.2,  11.9,   0.1,  100, 'g', 'taco', true),
  ('Batata-doce cozida',               77, 0.6,  18.4,   0.1,  100, 'g', 'taco', true),
  ('Mandioca cozida',                 125, 0.6,  30.1,   0.3,  100, 'g', 'taco', true),
  ('Mandioquinha cozida',              88, 1.0,  21.2,   0.1,  100, 'g', 'taco', true),
  ('Inhame cozido',                    94, 2.2,  21.9,   0.2,  100, 'g', 'taco', true),
  ('Cará cozido',                      95, 1.8,  22.7,   0.2,  100, 'g', 'taco', true),

  -- ── ÓLEOS E GORDURAS ──────────────────────────────────────
  ('Óleo de soja',                    884, 0.0,   0.0, 100.0,  100, 'ml','taco', true),
  ('Óleo de oliva extra virgem',      884, 0.0,   0.0, 100.0,  100, 'ml','taco', true),
  ('Óleo de coco',                    884, 0.0,   0.0, 100.0,  100, 'ml','taco', true),
  ('Azeite de dendê',                 884, 0.0,   0.0, 100.0,  100, 'ml','taco', true),

  -- ── PÃES, MASSAS E BISCOITOS ──────────────────────────────
  ('Pão francês',                     300, 8.0,  58.0,   3.1,  100, 'g', 'taco', true),
  ('Pão de forma integral',           253, 9.4,  46.3,   3.4,  100, 'g', 'taco', true),
  ('Pão de queijo',                   289, 6.3,  38.3,  12.2,  100, 'g', 'taco', true),
  ('Biscoito água e sal',             433, 7.9,  65.0,  15.6,  100, 'g', 'taco', true),
  ('Biscoito cream cracker',          440, 9.5,  63.7,  15.9,  100, 'g', 'taco', true),
  ('Tapioca (polvilho hidratado)',     358, 0.5,  87.8,   0.3,  100, 'g', 'taco', true),
  ('Bolo simples',                    333, 5.0,  54.0,  11.0,  100, 'g', 'taco', true),
  ('Granola',                         440, 9.0,  63.0,  17.0,  100, 'g', 'taco', true),
  ('Cereal matinal (flocos)',         374, 7.0,  83.0,   1.4,  100, 'g', 'taco', true),
  ('Pipoca (sem gordura)',            375,11.7,  73.6,   4.3,  100, 'g', 'taco', true),

  -- ── OLEAGINOSAS E SEMENTES ────────────────────────────────
  ('Amendoim torrado',                567,26.2,  16.1,  46.1,  100, 'g', 'taco', true),
  ('Castanha-de-caju torrada',        570,18.5,  29.1,  46.4,  100, 'g', 'taco', true),
  ('Castanha-do-pará',                643,14.3,  15.1,  63.6,  100, 'g', 'taco', true),
  ('Nozes',                           620,14.0,  14.0,  60.0,  100, 'g', 'taco', true),
  ('Amêndoas',                        579,21.2,  21.7,  49.4,  100, 'g', 'taco', true),
  ('Chia',                            490,16.5,  42.1,  30.7,  100, 'g', 'taco', true),
  ('Linhaça',                         534,18.3,  28.9,  42.2,  100, 'g', 'taco', true),

  -- ── PROTEÍNAS E PASTAS ────────────────────────────────────
  ('Pasta de amendoim',               598,25.1,  19.6,  49.4,  100, 'g', 'taco', true),
  ('Whey protein concentrado',        370,75.0,  10.0,   5.0,  100, 'g', 'taco', true),

  -- ── BEBIDAS ───────────────────────────────────────────────
  ('Suco de laranja natural',          45, 0.7,  10.6,   0.1,  100, 'ml','taco', true),
  ('Água de coco',                     19, 0.7,   3.7,   0.2,  100, 'ml','taco', true),
  ('Leite de soja',                    44, 3.4,   3.5,   2.0,  100, 'ml','taco', true),
  ('Café preto',                        2, 0.3,   0.3,   0.0,  100, 'ml','taco', true),

  -- ── MOLHOS, CONDIMENTOS E AÇÚCARES ───────────────────────
  ('Maionese',                        659, 1.6,   4.7,  70.8,  100, 'g', 'taco', true),
  ('Ketchup',                          96, 1.5,  22.5,   0.4,  100, 'g', 'taco', true),
  ('Molho de tomate',                  41, 1.7,   7.9,   0.6,  100, 'g', 'taco', true),
  ('Açúcar refinado',                 387, 0.0,  99.9,   0.0,  100, 'g', 'taco', true),
  ('Mel',                             309, 0.3,  84.0,   0.0,  100, 'g', 'taco', true),

  -- ── CHOCOLATES ────────────────────────────────────────────
  ('Chocolate ao leite',              550, 7.5,  58.0,  32.0,  100, 'g', 'taco', true),
  ('Chocolate meio amargo',           500, 6.5,  54.0,  30.0,  100, 'g', 'taco', true),

  -- ── PRATOS TÍPICOS BRASILEIROS ────────────────────────────
  ('Feijoada',                        152, 9.1,  10.8,   7.8,  100, 'g', 'taco', true),
  ('Arroz com feijão',                 98, 4.1,  18.5,   0.9,  100, 'g', 'taco', true),
  ('Coxinha de frango',               280, 9.5,  28.0,  14.5,  100, 'g', 'taco', true),
  ('Brigadeiro',                      395, 4.5,  59.0,  16.0,  100, 'g', 'taco', true),
  ('Paçoca de amendoim',              482,13.0,  60.0,  22.0,  100, 'g', 'taco', true),
  ('Queijo coalho grelhado',          310,22.0,   2.0,  24.0,  100, 'g', 'taco', true),
  ('Tapioca com queijo',              195, 7.0,  32.0,   4.5,  100, 'g', 'taco', true),
  ('Batata frita',                    544, 5.8,  47.4,  37.0,  100, 'g', 'taco', true),
  ('Hambúrguer bovino grelhado',      272,21.4,   0.0,  20.3,  100, 'g', 'taco', true),
  ('Vatapá',                          188, 9.5,  15.0,  10.5,  100, 'g', 'taco', true),
  ('Moqueca de peixe',                128,14.0,   5.0,   6.5,  100, 'g', 'taco', true),
  ('Acarajé',                         370,10.5,  32.0,  23.0,  100, 'g', 'taco', true),
  ('Pão de mel',                      350, 5.5,  61.0,   9.5,  100, 'g', 'taco', true),
  ('Romã',                             68, 1.0,  17.2,   0.3,  100, 'g', 'taco', true)
) AS t(name, calories, protein_g, carbs_g, fat_g, serving_size_g, serving_unit, source, is_verified)
WHERE NOT EXISTS (
  SELECT 1 FROM public.foods WHERE source = 'taco'
);
