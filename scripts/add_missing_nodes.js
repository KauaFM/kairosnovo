import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function addMissingNodes() {
    // 1. Get Telemetry Module ID
    const { data: modulos } = await supabase
        .from('modulos')
        .select('id')
        .eq('nome_modulo', 'Telemetria');

    if (!modulos || modulos.length === 0) {
        console.error("Telemetry module not found");
        return;
    }

    const telemetryId = modulos[0].id;

    // 2. Insert missing Expansion Nodes
    const { data, error } = await supabase
        .from('registros_dinamicos')
        .insert([
            {
                modulo_id: telemetryId,
                dados: {
                    id: 'Digital',
                    tipo: 'EXPANSION_NODE',
                    title: 'DIGITAL',
                    subtitle: 'ALGORITMO DE ATIVOS',
                    state: 'PROCESSANDO',
                    score: 55,
                    trend: '-4.2%',
                    trendDir: 'down',
                    history: [40, 45, 50, 60, 58, 56, 55],
                    subMetrics: [
                        { label: 'Otimização Fluxo', value: '42', unit: '%' },
                        { label: 'Neural Delay', value: '180', unit: 'ms' }
                    ],
                    factors: {
                        pos: ['Filtros Limpos', 'Sincronia VPN'],
                        crit: ['Alta Latência', 'Fuga de Cache']
                    },
                    ordem: 10
                }
            },
            {
                modulo_id: telemetryId,
                dados: {
                    id: 'Social',
                    tipo: 'EXPANSION_NODE',
                    title: 'SOCIAL',
                    subtitle: 'REDE DE INFLUÊNCIA',
                    state: 'EXPANDINDO',
                    score: 65,
                    trend: '+8.1%',
                    trendDir: 'up',
                    history: [50, 52, 55, 58, 60, 62, 65],
                    subMetrics: [
                        { label: 'Alcance Orgânico', value: '1.2k', unit: 'nodes' },
                        { label: 'Trust Index', value: '0.82', unit: 'k' }
                    ],
                    factors: {
                        pos: ['Novas Alianças', 'Feedback Positivo'],
                        crit: ['Baixa Frequência', 'Ruído na Comunica']
                    },
                    ordem: 11
                }
            },
            {
                modulo_id: telemetryId,
                dados: {
                    id: 'Espiritual',
                    tipo: 'EXPANSION_NODE',
                    title: 'ESPIRITUAL',
                    subtitle: 'EQUILÍBRIO INTERNO',
                    state: 'CENTRADO',
                    score: 90,
                    trend: '+1.5%',
                    trendDir: 'up',
                    history: [85, 86, 88, 89, 90, 89, 90],
                    subMetrics: [
                        { label: 'Deep Focus', value: '45', unit: 'min/d' },
                        { label: 'Consistência', value: '98', unit: '%' }
                    ],
                    factors: {
                        pos: ['Meditação Diária', 'Stoic Framework'],
                        crit: ['Dissonância Cognitiva']
                    },
                    ordem: 12
                }
            },
            {
                modulo_id: telemetryId,
                dados: {
                    id: 'Skills',
                    tipo: 'EXPANSION_NODE',
                    title: 'SKILLS',
                    subtitle: 'FRAMEWORK DE KNOWLEDGE',
                    state: 'UPGRADING',
                    score: 72,
                    trend: '+5.0%',
                    trendDir: 'up',
                    history: [60, 62, 65, 68, 70, 71, 72],
                    subMetrics: [
                        { label: 'Novos Ativos', value: '3', unit: 'units' },
                        { label: 'Masterização', value: '18', unit: '%' }
                    ],
                    factors: {
                        pos: ['Leitura Ativa', 'Prática Deliberada'],
                        crit: ['Procrastinação']
                    },
                    ordem: 13
                }
            }
        ]);

    if (error) {
        console.error("Error seeding nodes:", error);
    } else {
        console.log("Missing nodes seeded successfully!");
    }
}

addMissingNodes();
