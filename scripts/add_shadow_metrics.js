import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function addShadowMetrics() {
    const { data: modulos } = await supabase.from('modulos').select('id').eq('nome_modulo', 'Telemetria');
    if (!modulos || modulos.length === 0) return;
    const telemetryId = modulos[0].id;

    await supabase.from('registros_dinamicos').insert([
        {
            modulo_id: telemetryId,
            dados: {
                id: 'Cortisol',
                tipo: 'SHADOW_METRIC',
                title: 'CORTISOL SÉRICO',
                description: 'BIO-MARCADOR DE STRESS',
                value: '22',
                unit: 'mcg/dL',
                status: 'CRÍTICO',
                ordem: 20
            }
        },
        {
            modulo_id: telemetryId,
            dados: {
                id: 'Dopamina',
                tipo: 'SHADOW_METRIC',
                title: 'DOPAMINE DRAIN',
                description: 'FADIGA DO RECEPTOR',
                value: '68',
                unit: '%',
                status: 'ATENÇÃO',
                ordem: 21
            }
        }
    ]);
    console.log("Shadow metrics seeded!");
}

addShadowMetrics();
