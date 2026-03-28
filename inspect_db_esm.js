import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vnwehvaymxvkmibcikvi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZud2VodmF5bXh2a21pYmNpa3ZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5MjE2MTIsImV4cCI6MjA4NzQ5NzYxMn0.yCCiaShTqbFo3NxJVIgv9vba4MI2b4uC23TWRbP9L-E';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const { data: modulos, error } = await supabase.from('modulos').select('nome_modulo');
    if (error) {
        console.error(error);
    } else {
        modulos.forEach(m => console.log(`MODULO: [${m.nome_modulo}]`));
    }
}

main();
