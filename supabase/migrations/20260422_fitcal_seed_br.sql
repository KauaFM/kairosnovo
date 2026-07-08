-- =============================================================
-- ORVAX — FITCAL Seed Brasil (TACO + USDA + comuns no Brasil)
-- 250+ alimentos curados, todos por 100g, com porção padrão.
-- Fonte: TACO 4ª ed (UNICAMP), USDA FoodData Central, OpenFoodFacts.
-- =============================================================

CREATE OR REPLACE FUNCTION public._seed_food(
    p_name TEXT, p_category TEXT,
    p_kcal NUMERIC, p_prot NUMERIC, p_carbs NUMERIC, p_fat NUMERIC,
    p_fiber NUMERIC DEFAULT NULL, p_sodium_mg NUMERIC DEFAULT NULL,
    p_portion_label TEXT DEFAULT '100g', p_portion_grams NUMERIC DEFAULT 100
) RETURNS UUID
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE v_id UUID;
BEGIN
    INSERT INTO foods_v2 (name, category, kind, source, locale, verified)
    VALUES (p_name, p_category, 'generic', 'taco', 'pt-BR', TRUE)
    ON CONFLICT DO NOTHING RETURNING id INTO v_id;

    IF v_id IS NULL THEN
        SELECT id INTO v_id FROM foods_v2
         WHERE name = p_name AND source = 'taco' AND brand IS NULL LIMIT 1;
    END IF;
    IF v_id IS NULL THEN RETURN NULL; END IF;

    INSERT INTO food_nutrients (food_id, nutrient, amount, unit) VALUES
        (v_id, 'calories',  p_kcal,  'kcal'),
        (v_id, 'protein_g', p_prot,  'g'),
        (v_id, 'carbs_g',   p_carbs, 'g'),
        (v_id, 'fat_g',     p_fat,   'g')
    ON CONFLICT (food_id, nutrient) DO UPDATE SET amount = EXCLUDED.amount;

    IF p_fiber IS NOT NULL THEN
        INSERT INTO food_nutrients (food_id, nutrient, amount, unit)
        VALUES (v_id, 'fiber_g', p_fiber, 'g')
        ON CONFLICT (food_id, nutrient) DO UPDATE SET amount = EXCLUDED.amount;
    END IF;
    IF p_sodium_mg IS NOT NULL THEN
        INSERT INTO food_nutrients (food_id, nutrient, amount, unit)
        VALUES (v_id, 'sodium_mg', p_sodium_mg, 'mg')
        ON CONFLICT (food_id, nutrient) DO UPDATE SET amount = EXCLUDED.amount;
    END IF;

    INSERT INTO food_portions (food_id, label, grams, is_default)
    VALUES (v_id, p_portion_label, p_portion_grams, TRUE)
    ON CONFLICT DO NOTHING;
    RETURN v_id;
END;
$$;

-- ═══ CEREAIS / GRÃOS / MASSAS ═══════════════════════════════
SELECT public._seed_food('Arroz branco cozido',           'graos',   128, 2.5, 28.1, 0.2, 1.6, 1, '1 xícara (160g)', 160);
SELECT public._seed_food('Arroz integral cozido',         'graos',   124, 2.6, 25.8, 1.0, 2.7, 1, '1 xícara (150g)', 150);
SELECT public._seed_food('Arroz parboilizado cozido',     'graos',   135, 2.8, 28.9, 0.3, 1.7, 2, '1 xícara (160g)', 160);
SELECT public._seed_food('Arroz à grega',                 'graos',   174, 2.9, 25.0, 7.0, 1.5, 350, '1 porção (150g)', 150);
SELECT public._seed_food('Risoto de queijo',              'graos',   175, 5.0, 22.0, 7.5, 0.8, 380, '1 porção (150g)', 150);
SELECT public._seed_food('Feijão preto cozido',           'graos',    77, 4.5, 14.0, 0.5, 8.4, 2, '1 concha (120g)', 120);
SELECT public._seed_food('Feijão carioca cozido',         'graos',    76, 4.8, 13.6, 0.5, 8.5, 2, '1 concha (120g)', 120);
SELECT public._seed_food('Feijão fradinho cozido',        'graos',   100, 6.5, 18.0, 0.5, 6.0, 2, '1 concha (120g)', 120);
SELECT public._seed_food('Feijão branco cozido',          'graos',   139, 9.7, 25.1, 0.6, 8.4, 6, '1 concha (120g)', 120);
SELECT public._seed_food('Feijoada completa',             'pratos',  117, 7.4, 10.0, 5.7, 4.8, 470, '1 concha (150g)', 150);
SELECT public._seed_food('Lentilha cozida',               'graos',   116, 9.0, 20.0, 0.4, 7.9, 2, '1 concha (120g)', 120);
SELECT public._seed_food('Grão de bico cozido',           'graos',   164, 8.9, 27.4, 2.6, 7.6, 7, '1 xícara (160g)', 160);
SELECT public._seed_food('Soja cozida',                   'graos',   173, 16.6, 9.9, 9.0, 6.0, 1, '1 xícara (170g)', 170);
SELECT public._seed_food('Ervilha cozida',                'graos',    81, 5.4, 14.5, 0.4, 5.5, 3, '1 xícara (160g)', 160);
SELECT public._seed_food('Macarrão cozido',               'massas',  158, 5.8, 30.9, 0.9, 1.8, 1, '1 xícara (140g)', 140);
SELECT public._seed_food('Macarrão integral cozido',      'massas',  124, 5.3, 26.5, 1.1, 4.5, 4, '1 xícara (140g)', 140);
SELECT public._seed_food('Espaguete à bolonhesa',         'pratos',  140, 7.0, 18.0, 4.5, 1.8, 350, '1 prato (200g)', 200);
SELECT public._seed_food('Lasanha à bolonhesa',           'pratos',  185, 9.0, 18.0, 9.0, 1.5, 420, '1 fatia (200g)', 200);
SELECT public._seed_food('Nhoque de batata',              'massas',  165, 4.3, 32.5, 1.2, 1.6, 480, '1 prato (200g)', 200);

-- ═══ PÃES / FARINHAS ════════════════════════════════════════
SELECT public._seed_food('Pão francês',                   'paes',    300, 8.3, 58.6, 3.1, 2.3, 643, '1 unidade (50g)', 50);
SELECT public._seed_food('Pão de forma branco',           'paes',    265, 9.4, 50.0, 3.2, 2.3, 491, '1 fatia (25g)', 25);
SELECT public._seed_food('Pão integral',                  'paes',    253, 9.4, 43.9, 3.7, 6.9, 506, '1 fatia (25g)', 25);
SELECT public._seed_food('Pão de centeio',                'paes',    259, 8.5, 48.3, 3.3, 5.8, 603, '1 fatia (30g)', 30);
SELECT public._seed_food('Pão sírio',                     'paes',    275, 9.0, 55.7, 1.2, 2.2, 537, '1 unidade (60g)', 60);
SELECT public._seed_food('Torrada salgada',               'paes',    410, 11.0, 73.0, 8.0, 4.0, 600, '2 unidades (16g)', 16);
SELECT public._seed_food('Croissant',                     'paes',    406, 8.2, 45.8, 21.0, 2.6, 467, '1 unidade (60g)', 60);
SELECT public._seed_food('Bolacha água e sal',            'biscoitos',432, 11.4, 73.6, 9.4, 2.9, 821, '4 unidades (30g)', 30);
SELECT public._seed_food('Bolacha maizena',               'biscoitos',443, 7.5, 75.6, 11.8, 1.7, 230, '4 unidades (30g)', 30);
SELECT public._seed_food('Bolacha recheada chocolate',    'biscoitos',472, 5.5, 70.0, 18.5, 2.2, 380, '3 unidades (30g)', 30);
SELECT public._seed_food('Farinha de trigo',              'farinhas',360, 9.8, 75.1, 1.4, 2.3, 1, '1 col sopa (15g)', 15);
SELECT public._seed_food('Farinha de mandioca',           'farinhas',365, 1.2, 87.9, 0.3, 6.4, 6, '1 col sopa (15g)', 15);
SELECT public._seed_food('Farinha de milho',              'farinhas',351, 7.2, 79.1, 1.5, 5.5, 9, '1 col sopa (15g)', 15);
SELECT public._seed_food('Aveia em flocos',               'cereais', 394, 13.9, 66.6, 8.5, 9.1, 5, '3 col sopa (30g)', 30);
SELECT public._seed_food('Granola tradicional',           'cereais', 471, 10.5, 64.8, 19.3, 6.0, 60, '3 col sopa (30g)', 30);
SELECT public._seed_food('Tapioca',                       'cereais', 240, 0.0, 59.0, 0.2, 0.7, 1, '1 unidade (80g)', 80);
SELECT public._seed_food('Quinoa cozida',                 'cereais', 120, 4.4, 21.3, 1.9, 2.8, 7, '1 xícara (185g)', 185);
SELECT public._seed_food('Cuscuz de milho',               'cereais', 125, 2.8, 26.5, 0.5, 0.6, 4, '1 fatia (100g)', 100);
SELECT public._seed_food('Cuscuz marroquino',             'cereais', 112, 3.8, 23.2, 0.2, 1.4, 5, '1 xícara (160g)', 160);
SELECT public._seed_food('Polenta cozida',                'cereais',  72, 1.5, 16.2, 0.3, 0.6, 4, '1 fatia (100g)', 100);

-- ═══ CARNES BOVINAS ═════════════════════════════════════════
SELECT public._seed_food('Contrafilé grelhado',           'carnes',  271, 30.0, 0.0, 16.0, 0.0, 60, '1 bife (120g)', 120);
SELECT public._seed_food('Alcatra grelhada',              'carnes',  211, 32.4, 0.0, 8.3, 0.0, 60, '1 bife (120g)', 120);
SELECT public._seed_food('Picanha grelhada',              'carnes',  289, 26.7, 0.0, 19.7, 0.0, 60, '1 fatia (120g)', 120);
SELECT public._seed_food('Maminha grelhada',              'carnes',  219, 28.0, 0.0, 11.0, 0.0, 65, '1 fatia (120g)', 120);
SELECT public._seed_food('Filé mignon grelhado',          'carnes',  220, 32.0, 0.0, 9.5, 0.0, 55, '1 bife (120g)', 120);
SELECT public._seed_food('Carne moída patinho',           'carnes',  219, 21.0, 0.0, 14.5, 0.0, 57, '1 porção (100g)', 100);
SELECT public._seed_food('Carne moída acém',              'carnes',  240, 19.0, 0.0, 17.5, 0.0, 60, '1 porção (100g)', 100);
SELECT public._seed_food('Costela bovina assada',         'carnes',  401, 26.0, 0.0, 33.0, 0.0, 65, '1 porção (150g)', 150);
SELECT public._seed_food('Cupim assado',                  'carnes',  328, 22.0, 0.0, 27.0, 0.0, 58, '1 porção (120g)', 120);
SELECT public._seed_food('Fígado bovino grelhado',        'carnes',  183, 26.2, 5.1, 5.5, 0.0, 105, '1 porção (100g)', 100);
SELECT public._seed_food('Bife à parmegiana',             'pratos',  274, 20.0, 16.0, 14.5, 1.0, 470, '1 porção (200g)', 200);
SELECT public._seed_food('Estrogonofe de carne',          'pratos',  207, 13.5, 6.0, 14.5, 0.5, 380, '1 porção (200g)', 200);

-- ═══ AVES ═══════════════════════════════════════════════════
SELECT public._seed_food('Peito de frango grelhado',      'carnes',  159, 31.5, 0.0, 3.2, 0.0, 74, '1 filé (100g)', 100);
SELECT public._seed_food('Peito de frango cozido',        'carnes',  145, 30.5, 0.0, 2.8, 0.0, 65, '1 porção (100g)', 100);
SELECT public._seed_food('Peito de frango desfiado',      'carnes',  141, 27.0, 0.0, 3.0, 0.0, 60, '1 porção (100g)', 100);
SELECT public._seed_food('Coxa de frango assada',         'carnes',  215, 26.9, 0.0, 11.0, 0.0, 90, '1 unidade (80g)', 80);
SELECT public._seed_food('Sobrecoxa de frango assada',    'carnes',  232, 25.5, 0.0, 14.0, 0.0, 87, '1 unidade (110g)', 110);
SELECT public._seed_food('Asa de frango assada',          'carnes',  246, 22.6, 0.0, 17.0, 0.0, 95, '1 unidade (40g)', 40);
SELECT public._seed_food('Frango à passarinho',           'carnes',  280, 25.0, 1.5, 19.0, 0.0, 380, '1 porção (150g)', 150);
SELECT public._seed_food('Estrogonofe de frango',         'pratos',  189, 14.0, 6.0, 12.0, 0.5, 360, '1 porção (200g)', 200);
SELECT public._seed_food('Frango grelhado empanado',      'carnes',  237, 22.0, 12.0, 11.5, 0.6, 420, '1 filé (150g)', 150);
SELECT public._seed_food('Peito de peru defumado',        'frios',   104, 17.0, 1.5, 3.0, 0.0, 1100, '2 fatias (40g)', 40);
SELECT public._seed_food('Peru assado',                   'carnes',  189, 28.6, 0.0, 7.4, 0.0, 70, '1 fatia (100g)', 100);

-- ═══ SUÍNO ══════════════════════════════════════════════════
SELECT public._seed_food('Lombo suíno assado',            'carnes',  210, 28.0, 0.0, 11.0, 0.0, 55, '1 fatia (100g)', 100);
SELECT public._seed_food('Pernil suíno assado',           'carnes',  255, 26.0, 0.0, 16.5, 0.0, 60, '1 fatia (120g)', 120);
SELECT public._seed_food('Bacon frito',                   'carnes',  541, 37.0, 1.4, 41.8, 0.0, 1717, '2 fatias (20g)', 20);
SELECT public._seed_food('Linguiça toscana grelhada',     'carnes',  259, 17.5, 1.0, 20.6, 0.0, 870, '1 unidade (100g)', 100);
SELECT public._seed_food('Linguiça calabresa',            'carnes',  306, 16.0, 1.5, 27.0, 0.0, 1500, '1 porção (100g)', 100);
SELECT public._seed_food('Salsicha de frango',            'frios',   195, 14.0, 6.0, 13.0, 0.0, 1130, '2 unidades (90g)', 90);
SELECT public._seed_food('Salsicha hot dog',              'frios',   258, 12.0, 5.0, 22.0, 0.0, 1100, '2 unidades (90g)', 90);
SELECT public._seed_food('Presunto cozido',               'frios',   124, 18.0, 1.5, 5.0, 0.0, 950, '2 fatias (30g)', 30);
SELECT public._seed_food('Mortadela',                     'frios',   311, 11.0, 5.0, 28.0, 0.0, 1170, '2 fatias (30g)', 30);
SELECT public._seed_food('Salame',                        'frios',   336, 23.0, 2.0, 27.0, 0.0, 1740, '4 fatias (30g)', 30);

-- ═══ PESCADOS ═══════════════════════════════════════════════
SELECT public._seed_food('Salmão grelhado',               'pescados',208, 22.5, 0.0, 13.4, 0.0, 59, '1 filé (120g)', 120);
SELECT public._seed_food('Salmão defumado',               'pescados',117, 18.3, 0.0, 4.3, 0.0, 1880, '2 fatias (40g)', 40);
SELECT public._seed_food('Atum em conserva',              'pescados',116, 26.0, 0.0, 1.0, 0.0, 380, '1 lata (170g)', 170);
SELECT public._seed_food('Atum fresco grelhado',          'pescados',184, 30.0, 0.0, 6.3, 0.0, 50, '1 filé (120g)', 120);
SELECT public._seed_food('Tilápia grelhada',              'pescados',128, 26.2, 0.0, 2.7, 0.0, 56, '1 filé (120g)', 120);
SELECT public._seed_food('Sardinha em conserva',          'pescados',208, 24.0, 0.0, 11.5, 0.0, 307, '1 lata (125g)', 125);
SELECT public._seed_food('Sardinha grelhada',             'pescados',164, 19.0, 0.0, 9.5, 0.0, 80, '1 unidade (50g)', 50);
SELECT public._seed_food('Pescada grelhada',              'pescados',103, 21.0, 0.0, 1.8, 0.0, 95, '1 filé (120g)', 120);
SELECT public._seed_food('Bacalhau cozido',               'pescados',135, 29.0, 0.0, 1.0, 0.0, 6800, '1 porção (100g)', 100);
SELECT public._seed_food('Camarão cozido',                'frutos_mar',99, 20.9, 0.2, 1.7, 0.0, 224, '1 porção (100g)', 100);
SELECT public._seed_food('Lula grelhada',                 'frutos_mar',92, 15.6, 3.1, 1.4, 0.0, 44, '1 porção (100g)', 100);
SELECT public._seed_food('Polvo cozido',                  'frutos_mar',164, 30.0, 4.4, 2.1, 0.0, 460, '1 porção (100g)', 100);

-- ═══ OVOS ═══════════════════════════════════════════════════
SELECT public._seed_food('Ovo cozido',                    'ovos',    155, 13.0, 1.1, 11.0, 0.0, 124, '1 unidade (50g)', 50);
SELECT public._seed_food('Ovo frito',                     'ovos',    196, 13.6, 0.8, 14.8, 0.0, 207, '1 unidade (46g)', 46);
SELECT public._seed_food('Ovo mexido',                    'ovos',    166, 11.0, 1.5, 12.5, 0.0, 145, '2 unidades (100g)', 100);
SELECT public._seed_food('Omelete simples',               'ovos',    154, 10.5, 1.0, 12.0, 0.0, 165, '1 unidade (100g)', 100);
SELECT public._seed_food('Clara de ovo',                  'ovos',     52, 11.0, 0.7, 0.2, 0.0, 166, '1 unidade (30g)', 30);
SELECT public._seed_food('Gema de ovo',                   'ovos',    353, 16.4, 3.6, 30.0, 0.0, 51, '1 unidade (17g)', 17);
SELECT public._seed_food('Ovo de codorna cozido',         'ovos',    158, 13.1, 0.4, 11.1, 0.0, 141, '3 unidades (30g)', 30);

-- ═══ LATICÍNIOS ═════════════════════════════════════════════
SELECT public._seed_food('Leite integral',                'laticinios', 61, 2.9, 4.3, 3.5, 0.0, 40, '1 copo (200ml)', 200);
SELECT public._seed_food('Leite semi desnatado',          'laticinios', 47, 3.1, 4.7, 1.6, 0.0, 41, '1 copo (200ml)', 200);
SELECT public._seed_food('Leite desnatado',               'laticinios', 35, 3.4, 5.0, 0.2, 0.0, 42, '1 copo (200ml)', 200);
SELECT public._seed_food('Leite condensado',              'laticinios',327, 7.8, 55.5, 8.7, 0.0, 130, '1 col sopa (20g)', 20);
SELECT public._seed_food('Creme de leite',                'laticinios',195, 2.4, 3.5, 19.5, 0.0, 50, '1 col sopa (15g)', 15);
SELECT public._seed_food('Iogurte natural integral',      'laticinios', 59, 3.5, 4.7, 3.1, 0.0, 40, '1 pote (170g)', 170);
SELECT public._seed_food('Iogurte natural desnatado',     'laticinios', 41, 4.3, 5.9, 0.1, 0.0, 46, '1 pote (170g)', 170);
SELECT public._seed_food('Iogurte grego',                 'laticinios',133, 5.7, 14.6, 6.0, 0.0, 38, '1 pote (130g)', 130);
SELECT public._seed_food('Iogurte de morango',            'laticinios', 86, 3.0, 13.0, 2.5, 0.0, 50, '1 pote (170g)', 170);
SELECT public._seed_food('Queijo mussarela',              'laticinios',299, 22.3, 3.0, 22.0, 0.0, 557, '1 fatia (20g)', 20);
SELECT public._seed_food('Queijo prato',                  'laticinios',360, 22.7, 1.9, 29.1, 0.0, 712, '1 fatia (20g)', 20);
SELECT public._seed_food('Queijo minas frescal',          'laticinios',240, 17.4, 3.2, 17.8, 0.0, 346, '1 fatia (30g)', 30);
SELECT public._seed_food('Queijo minas padrão',           'laticinios',329, 25.9, 3.0, 24.0, 0.0, 578, '1 fatia (30g)', 30);
SELECT public._seed_food('Queijo cottage',                'laticinios', 98, 11.1, 3.4, 4.3, 0.0, 364, '1 porção (100g)', 100);
SELECT public._seed_food('Queijo ricota',                 'laticinios',140, 11.3, 3.3, 9.5, 0.0, 84, '1 fatia (30g)', 30);
SELECT public._seed_food('Queijo parmesão ralado',        'laticinios',453, 35.7, 3.4, 32.8, 0.0, 1696, '1 col sopa (10g)', 10);
SELECT public._seed_food('Queijo cheddar',                'laticinios',403, 22.9, 3.1, 33.1, 0.0, 621, '1 fatia (20g)', 20);
SELECT public._seed_food('Requeijão cremoso',             'laticinios',257, 9.6, 3.2, 22.8, 0.0, 486, '1 col sopa (15g)', 15);
SELECT public._seed_food('Cream cheese',                  'laticinios',252, 5.5, 4.0, 24.0, 0.0, 357, '1 col sopa (15g)', 15);
SELECT public._seed_food('Manteiga',                      'gorduras',  726, 0.6, 0.1, 82.4, 0.0, 579, '1 col chá (5g)', 5);
SELECT public._seed_food('Margarina vegetal',             'gorduras',  596, 0.7, 0.7, 65.0, 0.0, 660, '1 col chá (5g)', 5);

-- ═══ SUPLEMENTOS ════════════════════════════════════════════
SELECT public._seed_food('Whey Protein concentrado',      'suplementos',400, 80.0, 5.0, 5.0, 0.0, 200, '1 scoop (30g)', 30);
SELECT public._seed_food('Whey Protein isolado',          'suplementos',373, 90.0, 1.0, 0.5, 0.0, 180, '1 scoop (30g)', 30);
SELECT public._seed_food('Albumina',                      'suplementos',358, 80.0, 5.0, 0.0, 0.0, 1080, '1 scoop (30g)', 30);
SELECT public._seed_food('Caseína',                       'suplementos',360, 78.0, 6.0, 1.0, 0.0, 200, '1 scoop (30g)', 30);
SELECT public._seed_food('Hipercalórico',                 'suplementos',388, 16.0, 78.0, 1.5, 1.0, 100, '1 scoop (50g)', 50);
SELECT public._seed_food('Creatina monohidratada',        'suplementos',  0, 0.0, 0.0, 0.0, 0.0, 0, '1 scoop (5g)', 5);
SELECT public._seed_food('BCAA em pó',                    'suplementos',360, 90.0, 0.0, 0.0, 0.0, 0, '1 scoop (10g)', 10);
SELECT public._seed_food('Maltodextrina',                 'suplementos',380, 0.0, 95.0, 0.0, 0.0, 5, '1 scoop (30g)', 30);
SELECT public._seed_food('Pasta de amendoim',             'suplementos',589, 25.0, 19.6, 50.4, 8.0, 17, '1 col sopa (16g)', 16);
SELECT public._seed_food('Barra de proteína (média)',     'suplementos',360, 30.0, 30.0, 11.0, 5.0, 250, '1 unidade (60g)', 60);

-- ═══ VERDURAS ═══════════════════════════════════════════════
SELECT public._seed_food('Alface',                        'verduras', 15, 1.4, 2.4, 0.2, 2.3, 9, '1 folha (10g)', 10);
SELECT public._seed_food('Alface americana',              'verduras', 14, 0.9, 3.0, 0.1, 1.2, 10, '1 folha (10g)', 10);
SELECT public._seed_food('Rúcula',                        'verduras', 25, 2.6, 3.7, 0.7, 1.6, 27, '1 porção (30g)', 30);
SELECT public._seed_food('Agrião',                        'verduras', 17, 2.4, 1.5, 0.4, 2.1, 7, '1 porção (30g)', 30);
SELECT public._seed_food('Espinafre cozido',              'verduras', 23, 2.9, 3.6, 0.4, 2.2, 70, '1 porção (50g)', 50);
SELECT public._seed_food('Couve refogada',                'verduras', 90, 2.9, 12.0, 4.5, 5.4, 32, '1 porção (50g)', 50);
SELECT public._seed_food('Couve crua',                    'verduras', 27, 2.9, 4.3, 0.5, 3.0, 9, '1 porção (50g)', 50);
SELECT public._seed_food('Brócolis cozido',               'verduras', 25, 2.1, 4.0, 0.4, 3.4, 4, '1 porção (100g)', 100);
SELECT public._seed_food('Couve flor cozida',             'verduras', 22, 1.7, 4.4, 0.2, 2.1, 9, '1 porção (100g)', 100);
SELECT public._seed_food('Repolho cru',                   'verduras', 24, 1.4, 5.4, 0.1, 1.9, 4, '1 porção (50g)', 50);
SELECT public._seed_food('Tomate',                        'verduras', 15, 1.1, 3.1, 0.2, 1.2, 4, '1 unidade (80g)', 80);
SELECT public._seed_food('Tomate cereja',                 'verduras', 18, 0.9, 3.9, 0.2, 1.2, 5, '1 porção (50g)', 50);
SELECT public._seed_food('Pepino',                        'verduras', 10, 0.9, 1.4, 0.1, 1.0, 1, '1 unidade (130g)', 130);
SELECT public._seed_food('Cenoura crua',                  'verduras', 34, 1.3, 7.7, 0.2, 3.2, 65, '1 unidade (75g)', 75);
SELECT public._seed_food('Cenoura cozida',                'verduras', 29, 0.8, 6.7, 0.2, 2.6, 68, '1 porção (75g)', 75);
SELECT public._seed_food('Beterraba cozida',              'verduras', 32, 1.3, 7.2, 0.1, 1.9, 36, '1 porção (75g)', 75);
SELECT public._seed_food('Beterraba crua ralada',         'verduras', 49, 1.9, 11.1, 0.1, 3.4, 33, '1 porção (75g)', 75);
SELECT public._seed_food('Cebola',                        'verduras', 39, 1.7, 8.9, 0.0, 2.2, 4, '1 unidade (70g)', 70);
SELECT public._seed_food('Alho',                          'verduras',113, 7.0, 23.9, 0.2, 4.3, 8, '1 dente (3g)', 3);
SELECT public._seed_food('Abobrinha cozida',              'verduras', 12, 1.0, 2.3, 0.2, 1.4, 2, '1 porção (100g)', 100);
SELECT public._seed_food('Abóbora cozida',                'verduras', 24, 1.5, 4.7, 0.5, 2.5, 1, '1 porção (100g)', 100);
SELECT public._seed_food('Berinjela cozida',              'verduras', 24, 1.0, 5.8, 0.1, 3.3, 2, '1 porção (100g)', 100);
SELECT public._seed_food('Pimentão verde',                'verduras', 21, 1.2, 4.9, 0.2, 2.6, 2, '1 unidade (130g)', 130);
SELECT public._seed_food('Pimentão vermelho',             'verduras', 31, 1.0, 6.0, 0.3, 2.1, 4, '1 unidade (130g)', 130);
SELECT public._seed_food('Vagem cozida',                  'verduras', 24, 1.5, 5.0, 0.2, 2.4, 6, '1 porção (100g)', 100);
SELECT public._seed_food('Quiabo cozido',                 'verduras', 30, 1.9, 6.4, 0.2, 4.0, 4, '1 porção (100g)', 100);
SELECT public._seed_food('Chuchu cozido',                 'verduras', 18, 0.9, 4.1, 0.1, 1.4, 1, '1 porção (100g)', 100);
SELECT public._seed_food('Milho verde cozido',            'verduras', 98, 3.4, 21.7, 1.3, 3.9, 14, '1 espiga (100g)', 100);
SELECT public._seed_food('Milho verde em conserva',       'verduras', 81, 2.5, 17.0, 1.0, 1.8, 285, '1 porção (80g)', 80);
SELECT public._seed_food('Cogumelo champignon',           'verduras', 22, 3.1, 3.3, 0.3, 1.0, 5, '1 porção (50g)', 50);
SELECT public._seed_food('Palmito em conserva',           'verduras', 27, 2.0, 4.8, 0.3, 2.6, 425, '1 porção (50g)', 50);
SELECT public._seed_food('Azeitona verde',                'verduras',145, 1.0, 3.8, 15.3, 3.3, 1556, '5 unidades (15g)', 15);
SELECT public._seed_food('Azeitona preta',                'verduras',135, 1.0, 6.3, 10.7, 3.2, 735, '5 unidades (15g)', 15);

-- ═══ TUBÉRCULOS ═════════════════════════════════════════════
SELECT public._seed_food('Batata inglesa cozida',         'tuberculos', 52, 1.2, 11.9, 0.1, 1.3, 2, '1 unidade (100g)', 100);
SELECT public._seed_food('Batata inglesa frita',          'tuberculos',312, 3.4, 41.0, 15.0, 3.8, 210, '1 porção (100g)', 100);
SELECT public._seed_food('Purê de batata',                'tuberculos',103, 1.9, 17.0, 3.0, 1.0, 280, '1 porção (100g)', 100);
SELECT public._seed_food('Batata doce cozida',            'tuberculos', 77, 0.6, 18.4, 0.1, 2.2, 9, '1 unidade (120g)', 120);
SELECT public._seed_food('Batata doce assada',            'tuberculos', 90, 2.0, 20.7, 0.1, 3.3, 9, '1 unidade (120g)', 120);
SELECT public._seed_food('Mandioca cozida',               'tuberculos',125, 0.6, 30.1, 0.3, 1.6, 2, '1 porção (100g)', 100);
SELECT public._seed_food('Mandioca frita',                'tuberculos',257, 1.2, 36.0, 12.0, 1.8, 250, '1 porção (100g)', 100);
SELECT public._seed_food('Inhame cozido',                 'tuberculos', 97, 2.0, 23.2, 0.2, 1.5, 9, '1 porção (100g)', 100);
SELECT public._seed_food('Cará cozido',                   'tuberculos', 99, 1.8, 23.5, 0.1, 1.5, 9, '1 porção (100g)', 100);
SELECT public._seed_food('Aipim/Macaxeira cozida',        'tuberculos',125, 0.6, 30.0, 0.3, 1.6, 2, '1 porção (100g)', 100);

-- ═══ FRUTAS ═════════════════════════════════════════════════
SELECT public._seed_food('Banana prata',                  'frutas',     98, 1.3, 26.0, 0.1, 2.0, 0, '1 unidade (85g)', 85);
SELECT public._seed_food('Banana nanica',                 'frutas',     87, 1.4, 22.8, 0.1, 2.0, 0, '1 unidade (90g)', 90);
SELECT public._seed_food('Banana da terra',               'frutas',    128, 1.4, 33.5, 0.1, 1.8, 1, '1 unidade (120g)', 120);
SELECT public._seed_food('Maçã',                          'frutas',     56, 0.3, 15.2, 0.0, 1.3, 1, '1 unidade (150g)', 150);
SELECT public._seed_food('Maçã verde',                    'frutas',     53, 0.4, 14.0, 0.2, 2.4, 1, '1 unidade (150g)', 150);
SELECT public._seed_food('Pera',                          'frutas',     53, 0.3, 14.1, 0.0, 3.0, 1, '1 unidade (170g)', 170);
SELECT public._seed_food('Laranja pera',                  'frutas',     37, 1.0, 8.9, 0.1, 0.8, 0, '1 unidade (130g)', 130);
SELECT public._seed_food('Laranja lima',                  'frutas',     32, 0.7, 8.7, 0.1, 1.1, 0, '1 unidade (130g)', 130);
SELECT public._seed_food('Tangerina/mexerica',            'frutas',     37, 0.8, 9.6, 0.1, 0.9, 1, '1 unidade (135g)', 135);
SELECT public._seed_food('Limão',                         'frutas',     22, 1.1, 11.1, 0.3, 1.2, 1, '1 unidade (60g)', 60);
SELECT public._seed_food('Mamão papaya',                  'frutas',     40, 0.5, 10.4, 0.1, 1.0, 3, '1 fatia (100g)', 100);
SELECT public._seed_food('Mamão formosa',                 'frutas',     45, 0.8, 11.6, 0.1, 1.8, 3, '1 fatia (100g)', 100);
SELECT public._seed_food('Abacaxi',                       'frutas',     48, 0.9, 12.3, 0.1, 1.0, 1, '1 fatia (80g)', 80);
SELECT public._seed_food('Manga',                         'frutas',     64, 0.4, 16.7, 0.2, 2.1, 1, '1 unidade (200g)', 200);
SELECT public._seed_food('Melancia',                      'frutas',     33, 0.9, 8.1, 0.2, 0.1, 2, '1 fatia (200g)', 200);
SELECT public._seed_food('Melão',                         'frutas',     29, 0.7, 7.5, 0.1, 0.3, 11, '1 fatia (150g)', 150);
SELECT public._seed_food('Uva',                           'frutas',     53, 0.8, 13.6, 0.2, 0.9, 1, '1 cacho (100g)', 100);
SELECT public._seed_food('Morango',                       'frutas',     30, 0.9, 6.8, 0.3, 1.7, 1, '1 porção (100g)', 100);
SELECT public._seed_food('Mirtilo (blueberry)',           'frutas',     57, 0.7, 14.5, 0.3, 2.4, 1, '1 porção (100g)', 100);
SELECT public._seed_food('Framboesa',                     'frutas',     52, 1.2, 11.9, 0.7, 6.5, 1, '1 porção (100g)', 100);
SELECT public._seed_food('Amora',                         'frutas',     43, 1.4, 9.6, 0.5, 5.3, 1, '1 porção (100g)', 100);
SELECT public._seed_food('Kiwi',                          'frutas',     61, 1.1, 14.7, 0.5, 3.0, 3, '1 unidade (75g)', 75);
SELECT public._seed_food('Abacate',                       'frutas',     96, 1.2, 6.0, 8.4, 6.3, 2, '1 porção (100g)', 100);
SELECT public._seed_food('Coco fresco',                   'frutas',    406, 3.7, 9.8, 42.0, 5.4, 22, '1 porção (50g)', 50);
SELECT public._seed_food('Goiaba',                        'frutas',     54, 1.1, 13.0, 0.4, 6.2, 3, '1 unidade (170g)', 170);
SELECT public._seed_food('Caju',                          'frutas',     46, 0.8, 10.8, 0.6, 1.7, 4, '1 unidade (50g)', 50);
SELECT public._seed_food('Maracujá',                      'frutas',     97, 2.2, 23.4, 0.7, 10.4, 28, '1 unidade (90g)', 90);
SELECT public._seed_food('Pêssego',                       'frutas',     36, 0.8, 9.5, 0.1, 1.4, 1, '1 unidade (100g)', 100);
SELECT public._seed_food('Ameixa fresca',                 'frutas',     53, 0.8, 13.9, 0.6, 2.4, 0, '1 unidade (75g)', 75);
SELECT public._seed_food('Ameixa seca',                   'frutas',    240, 2.2, 63.9, 0.4, 7.1, 2, '5 unidades (40g)', 40);
SELECT public._seed_food('Uva passa',                     'frutas',    299, 3.1, 79.2, 0.5, 3.7, 11, '1 porção (30g)', 30);
SELECT public._seed_food('Damasco seco',                  'frutas',    241, 3.4, 62.6, 0.5, 7.3, 10, '5 unidades (35g)', 35);
SELECT public._seed_food('Tâmara',                        'frutas',    282, 2.5, 75.0, 0.4, 8.0, 2, '3 unidades (24g)', 24);
SELECT public._seed_food('Açaí polpa',                    'frutas',     58, 0.8, 6.2, 3.9, 2.6, 7, '1 porção (100g)', 100);
SELECT public._seed_food('Açaí com guaraná',              'frutas',    140, 1.0, 25.0, 4.0, 2.0, 12, '1 porção (200g)', 200);

-- ═══ OLEAGINOSAS ════════════════════════════════════════════
SELECT public._seed_food('Castanha do Pará',              'oleaginosas',699, 14.5, 15.1, 63.5, 7.9, 2, '3 unidades (15g)', 15);
SELECT public._seed_food('Castanha de caju',              'oleaginosas',570, 18.5, 29.1, 46.3, 3.7, 16, '1 porção (30g)', 30);
SELECT public._seed_food('Amendoim torrado',              'oleaginosas',544, 22.5, 20.3, 43.9, 8.0, 5, '1 porção (30g)', 30);
SELECT public._seed_food('Amendoim cru',                  'oleaginosas',567, 25.8, 16.1, 49.2, 8.5, 18, '1 porção (30g)', 30);
SELECT public._seed_food('Amêndoa',                       'oleaginosas',581, 18.6, 19.5, 47.3, 11.6, 1, '1 porção (30g)', 30);
SELECT public._seed_food('Noz',                           'oleaginosas',654, 14.0, 13.7, 65.2, 6.4, 2, '1 porção (30g)', 30);
SELECT public._seed_food('Avelã',                         'oleaginosas',628, 15.0, 16.7, 60.8, 9.7, 0, '1 porção (30g)', 30);
SELECT public._seed_food('Pistache',                      'oleaginosas',557, 20.6, 27.2, 44.4, 10.6, 1, '1 porção (30g)', 30);
SELECT public._seed_food('Macadâmia',                     'oleaginosas',718, 7.9, 13.8, 75.8, 8.6, 5, '1 porção (30g)', 30);
SELECT public._seed_food('Semente de chia',               'sementes',   486, 16.5, 42.1, 30.7, 34.4, 16, '1 col sopa (12g)', 12);
SELECT public._seed_food('Semente de linhaça',            'sementes',   534, 18.3, 28.9, 42.2, 27.3, 30, '1 col sopa (10g)', 10);
SELECT public._seed_food('Semente de girassol',           'sementes',   584, 20.8, 20.0, 51.5, 8.6, 9, '1 porção (30g)', 30);
SELECT public._seed_food('Semente de abóbora',            'sementes',   559, 30.2, 10.7, 49.0, 6.0, 7, '1 porção (30g)', 30);
SELECT public._seed_food('Coco ralado',                   'sementes',   660, 7.0, 24.0, 65.0, 17.0, 22, '1 col sopa (10g)', 10);

-- ═══ GORDURAS / ÓLEOS ══════════════════════════════════════
SELECT public._seed_food('Azeite de oliva',               'gorduras', 884, 0.0, 0.0, 100.0, 0.0, 2, '1 col sopa (13g)', 13);
SELECT public._seed_food('Óleo de soja',                  'gorduras', 884, 0.0, 0.0, 100.0, 0.0, 0, '1 col sopa (13g)', 13);
SELECT public._seed_food('Óleo de coco',                  'gorduras', 862, 0.0, 0.0, 99.1, 0.0, 0, '1 col sopa (13g)', 13);
SELECT public._seed_food('Óleo de canola',                'gorduras', 884, 0.0, 0.0, 100.0, 0.0, 0, '1 col sopa (13g)', 13);
SELECT public._seed_food('Óleo de girassol',              'gorduras', 884, 0.0, 0.0, 100.0, 0.0, 0, '1 col sopa (13g)', 13);
SELECT public._seed_food('Banha de porco',                'gorduras', 902, 0.0, 0.0, 100.0, 0.0, 0, '1 col sopa (13g)', 13);
SELECT public._seed_food('Maionese tradicional',          'gorduras', 680, 1.1, 2.5, 73.0, 0.0, 627, '1 col sopa (15g)', 15);
SELECT public._seed_food('Maionese light',                'gorduras', 350, 1.0, 8.0, 35.0, 0.0, 580, '1 col sopa (15g)', 15);

-- ═══ AÇÚCARES / ADOÇANTES / DOCES ══════════════════════════
SELECT public._seed_food('Açúcar refinado',               'acucares', 387, 0.0, 99.9, 0.0, 0.0, 1, '1 col sopa (12g)', 12);
SELECT public._seed_food('Açúcar mascavo',                'acucares', 369, 0.0, 95.5, 0.0, 0.0, 39, '1 col sopa (12g)', 12);
SELECT public._seed_food('Açúcar demerara',               'acucares', 387, 0.0, 99.4, 0.0, 0.0, 4, '1 col sopa (12g)', 12);
SELECT public._seed_food('Mel',                           'acucares', 309, 0.4, 84.0, 0.0, 0.4, 8, '1 col sopa (21g)', 21);
SELECT public._seed_food('Melado',                        'acucares', 297, 0.8, 76.6, 0.1, 0.0, 105, '1 col sopa (20g)', 20);
SELECT public._seed_food('Stévia em pó',                  'acucares',   0, 0.0, 0.0, 0.0, 0.0, 0, '1 sachê (0.8g)', 1);
SELECT public._seed_food('Adoçante sucralose',            'acucares',   0, 0.0, 0.0, 0.0, 0.0, 0, '5 gotas (0.5g)', 1);
SELECT public._seed_food('Chocolate ao leite',            'doces',    547, 7.3, 59.4, 30.0, 1.5, 84, '1 barra (30g)', 30);
SELECT public._seed_food('Chocolate amargo 70%',          'doces',    598, 7.8, 45.9, 42.6, 10.9, 24, '1 quadradinho (10g)', 10);
SELECT public._seed_food('Chocolate branco',              'doces',    539, 5.9, 59.2, 32.1, 0.2, 90, '1 barra (30g)', 30);
SELECT public._seed_food('Bombom de chocolate',           'doces',    520, 7.0, 60.0, 28.0, 2.0, 80, '1 unidade (15g)', 15);
SELECT public._seed_food('Brigadeiro',                    'doces',    385, 4.5, 62.0, 13.0, 1.0, 80, '1 unidade (25g)', 25);
SELECT public._seed_food('Beijinho',                      'doces',    410, 4.0, 65.0, 14.0, 0.5, 70, '1 unidade (25g)', 25);
SELECT public._seed_food('Pudim de leite condensado',     'doces',    220, 6.5, 35.0, 6.5, 0.0, 90, '1 fatia (100g)', 100);
SELECT public._seed_food('Mousse de chocolate',           'doces',    275, 5.0, 32.0, 14.0, 1.5, 80, '1 porção (100g)', 100);
SELECT public._seed_food('Bolo simples',                  'doces',    320, 6.0, 50.0, 11.0, 1.0, 280, '1 fatia (60g)', 60);
SELECT public._seed_food('Bolo de chocolate',             'doces',    370, 5.0, 55.0, 14.5, 1.5, 290, '1 fatia (80g)', 80);
SELECT public._seed_food('Sorvete de creme',              'doces',    207, 3.5, 24.0, 11.0, 0.4, 80, '1 bola (60g)', 60);
SELECT public._seed_food('Sorvete de chocolate',          'doces',    216, 3.8, 28.2, 11.0, 1.2, 75, '1 bola (60g)', 60);
SELECT public._seed_food('Picolé de fruta',               'doces',     65, 0.3, 16.0, 0.0, 0.0, 5, '1 unidade (60g)', 60);
SELECT public._seed_food('Doce de leite',                 'doces',    315, 6.8, 56.0, 7.5, 0.0, 130, '1 col sopa (20g)', 20);
SELECT public._seed_food('Geleia de morango',             'doces',    278, 0.4, 68.9, 0.1, 1.1, 32, '1 col sopa (20g)', 20);
SELECT public._seed_food('Nutella / creme avelã',         'doces',    546, 6.4, 57.5, 31.5, 3.4, 45, '1 col sopa (15g)', 15);

-- ═══ BEBIDAS ════════════════════════════════════════════════
SELECT public._seed_food('Água',                          'bebidas',    0, 0.0, 0.0, 0.0, 0.0, 5, '1 copo (200ml)', 200);
SELECT public._seed_food('Café preto sem açúcar',         'bebidas',    2, 0.3, 0.3, 0.0, 0.0, 1, '1 xícara (50ml)', 50);
SELECT public._seed_food('Café com açúcar',               'bebidas',   30, 0.3, 7.5, 0.0, 0.0, 1, '1 xícara (50ml)', 50);
SELECT public._seed_food('Café com leite',                'bebidas',   45, 2.0, 5.5, 1.7, 0.0, 25, '1 xícara (200ml)', 200);
SELECT public._seed_food('Cappuccino',                    'bebidas',   55, 2.4, 7.0, 2.0, 0.0, 30, '1 xícara (200ml)', 200);
SELECT public._seed_food('Chá preto sem açúcar',          'bebidas',    1, 0.0, 0.3, 0.0, 0.0, 3, '1 xícara (200ml)', 200);
SELECT public._seed_food('Chá verde',                     'bebidas',    1, 0.2, 0.0, 0.0, 0.0, 1, '1 xícara (200ml)', 200);
SELECT public._seed_food('Chá mate gelado',               'bebidas',   34, 0.0, 8.5, 0.0, 0.0, 30, '1 copo (200ml)', 200);
SELECT public._seed_food('Suco de laranja natural',       'bebidas',   37, 0.7, 8.7, 0.1, 0.4, 1, '1 copo (200ml)', 200);
SELECT public._seed_food('Suco de uva integral',          'bebidas',   60, 0.4, 14.8, 0.1, 0.0, 5, '1 copo (200ml)', 200);
SELECT public._seed_food('Suco de maracujá',              'bebidas',   63, 0.4, 15.4, 0.0, 0.0, 6, '1 copo (200ml)', 200);
SELECT public._seed_food('Suco de manga',                 'bebidas',   54, 0.4, 13.5, 0.2, 0.4, 3, '1 copo (200ml)', 200);
SELECT public._seed_food('Vitamina de banana',            'bebidas',  103, 3.5, 16.0, 3.0, 0.9, 35, '1 copo (250ml)', 250);
SELECT public._seed_food('Refrigerante cola',             'bebidas',   43, 0.0, 11.0, 0.0, 0.0, 4, '1 lata (350ml)', 350);
SELECT public._seed_food('Refrigerante cola zero',        'bebidas',    0, 0.0, 0.0, 0.0, 0.0, 12, '1 lata (350ml)', 350);
SELECT public._seed_food('Refrigerante guaraná',          'bebidas',   42, 0.0, 10.5, 0.0, 0.0, 3, '1 lata (350ml)', 350);
SELECT public._seed_food('Refrigerante laranja',          'bebidas',   46, 0.0, 11.5, 0.0, 0.0, 4, '1 lata (350ml)', 350);
SELECT public._seed_food('Energético tradicional',        'bebidas',   45, 0.0, 11.3, 0.0, 0.0, 105, '1 lata (250ml)', 250);
SELECT public._seed_food('Cerveja pilsen',                'bebidas',   43, 0.5, 3.6, 0.0, 0.0, 4, '1 lata (350ml)', 350);
SELECT public._seed_food('Cerveja IPA',                   'bebidas',   65, 0.6, 6.1, 0.0, 0.0, 5, '1 long neck (355ml)', 355);
SELECT public._seed_food('Vinho tinto',                   'bebidas',   85, 0.1, 2.6, 0.0, 0.0, 4, '1 taça (150ml)', 150);
SELECT public._seed_food('Vinho branco',                  'bebidas',   82, 0.1, 2.6, 0.0, 0.0, 5, '1 taça (150ml)', 150);
SELECT public._seed_food('Cachaça',                       'bebidas',  231, 0.0, 0.0, 0.0, 0.0, 1, '1 dose (50ml)', 50);
SELECT public._seed_food('Vodka',                         'bebidas',  231, 0.0, 0.0, 0.0, 0.0, 1, '1 dose (50ml)', 50);
SELECT public._seed_food('Whisky',                        'bebidas',  250, 0.0, 0.0, 0.0, 0.0, 0, '1 dose (50ml)', 50);
SELECT public._seed_food('Caipirinha',                    'bebidas',  155, 0.1, 12.0, 0.0, 0.2, 1, '1 copo (200ml)', 200);

-- ═══ FAST FOOD / SALGADOS BRASILEIROS ══════════════════════
SELECT public._seed_food('Coxinha de frango',             'salgados', 270, 7.5, 23.0, 16.0, 0.9, 380, '1 unidade (80g)', 80);
SELECT public._seed_food('Pão de queijo',                 'salgados', 308, 5.0, 36.0, 15.0, 0.4, 330, '1 unidade (30g)', 30);
SELECT public._seed_food('Pastel de carne',               'salgados', 404, 8.6, 34.0, 25.0, 1.8, 260, '1 unidade (60g)', 60);
SELECT public._seed_food('Pastel de queijo',              'salgados', 410, 9.0, 35.0, 25.0, 1.5, 320, '1 unidade (60g)', 60);
SELECT public._seed_food('Empada de frango',              'salgados', 320, 7.5, 30.0, 18.0, 1.2, 380, '1 unidade (60g)', 60);
SELECT public._seed_food('Esfiha de carne',               'salgados', 240, 9.0, 28.0, 9.5, 1.2, 360, '1 unidade (60g)', 60);
SELECT public._seed_food('Quibe frito',                   'salgados', 320, 12.0, 28.0, 17.0, 2.0, 350, '1 unidade (50g)', 50);
SELECT public._seed_food('Bolinho de bacalhau',           'salgados', 290, 10.0, 18.0, 19.0, 0.8, 410, '1 unidade (40g)', 40);
SELECT public._seed_food('Pizza mussarela (fatia)',       'salgados', 266, 11.4, 33.0, 10.0, 2.2, 640, '1 fatia (100g)', 100);
SELECT public._seed_food('Pizza calabresa',               'salgados', 282, 13.0, 30.0, 12.0, 2.5, 760, '1 fatia (100g)', 100);
SELECT public._seed_food('Pizza portuguesa',              'salgados', 258, 13.5, 27.0, 11.0, 2.0, 700, '1 fatia (100g)', 100);
SELECT public._seed_food('Pizza marguerita',              'salgados', 250, 11.0, 30.0, 9.5, 2.0, 580, '1 fatia (100g)', 100);
SELECT public._seed_food('Hambúrguer caseiro',            'salgados', 295, 17.0, 24.0, 14.0, 1.5, 496, '1 unidade (120g)', 120);
SELECT public._seed_food('Big Mac',                       'salgados', 257, 13.0, 21.5, 13.5, 1.5, 450, '1 sanduíche (215g)', 215);
SELECT public._seed_food('Cheeseburger',                  'salgados', 290, 14.5, 26.0, 14.5, 1.0, 545, '1 unidade (120g)', 120);
SELECT public._seed_food('X-Salada',                      'salgados', 245, 12.0, 22.0, 12.0, 1.5, 480, '1 unidade (200g)', 200);
SELECT public._seed_food('X-Tudo',                        'salgados', 290, 13.5, 22.0, 16.5, 1.5, 530, '1 unidade (250g)', 250);
SELECT public._seed_food('Cachorro quente completo',      'salgados', 250, 9.0, 28.0, 11.0, 1.5, 720, '1 unidade (180g)', 180);
SELECT public._seed_food('Misto quente',                  'salgados', 280, 12.0, 27.0, 13.0, 1.2, 730, '1 unidade (100g)', 100);
SELECT public._seed_food('Sanduíche natural frango',      'salgados', 215, 11.0, 25.0, 7.5, 2.0, 380, '1 unidade (130g)', 130);
SELECT public._seed_food('Açaí na tigela',                'doces',    210, 2.0, 32.0, 8.5, 3.5, 18, '1 porção (300g)', 300);
SELECT public._seed_food('Tapioca com queijo',            'salgados', 280, 8.0, 38.0, 11.0, 1.0, 280, '1 unidade (100g)', 100);
SELECT public._seed_food('Tapioca com frango',            'salgados', 250, 14.0, 33.0, 6.5, 1.0, 350, '1 unidade (130g)', 130);
SELECT public._seed_food('Crepe de queijo',               'salgados', 285, 9.5, 31.0, 13.5, 1.0, 460, '1 unidade (130g)', 130);

-- ═══ MOLHOS / CONDIMENTOS ══════════════════════════════════
SELECT public._seed_food('Ketchup',                       'molhos',   112, 1.7, 27.4, 0.1, 0.3, 980, '1 col sopa (15g)', 15);
SELECT public._seed_food('Mostarda',                      'molhos',    66, 4.4, 5.3, 4.0, 3.3, 1135, '1 col sopa (15g)', 15);
SELECT public._seed_food('Molho barbecue',                'molhos',   172, 0.8, 40.8, 0.6, 0.9, 1027, '1 col sopa (17g)', 17);
SELECT public._seed_food('Molho de tomate',               'molhos',    35, 1.6, 6.6, 0.6, 1.6, 470, '1 porção (60g)', 60);
SELECT public._seed_food('Molho branco',                  'molhos',   120, 3.0, 8.0, 8.5, 0.0, 380, '1 porção (60g)', 60);
SELECT public._seed_food('Molho shoyu',                   'molhos',    53, 8.1, 4.9, 0.0, 0.8, 5493, '1 col sopa (15g)', 15);
SELECT public._seed_food('Molho pesto',                   'molhos',   430, 4.8, 4.0, 44.0, 1.5, 480, '1 col sopa (15g)', 15);
SELECT public._seed_food('Vinagre',                       'molhos',    18, 0.0, 0.0, 0.0, 0.0, 5, '1 col sopa (15g)', 15);
SELECT public._seed_food('Sal',                           'molhos',     0, 0.0, 0.0, 0.0, 0.0, 38758, '1 pitada (1g)', 1);

-- ═══ LIMPA HELPER ══════════════════════════════════════════
DROP FUNCTION IF EXISTS public._seed_food(TEXT,TEXT,NUMERIC,NUMERIC,NUMERIC,NUMERIC,NUMERIC,NUMERIC,TEXT,NUMERIC);
