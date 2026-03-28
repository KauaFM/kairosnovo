require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log("--- MODULOS ---");
    const { data: modulos } = await supabase.from('modulos').select('*');
    console.log(JSON.stringify(modulos, null, 2));

    console.log("\n--- REGISTROS DINAMICOS (limit 5) ---");
    const { data: registros } = await supabase.from('registros_dinamicos').select('*, modulos(nome_modulo)').limit(5);
    console.log(JSON.stringify(registros, null, 2));
}

main();
