import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://vnwehvaymxvkmibcikvi.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZud2VodmF5bXh2a21pYmNpa3ZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5MjE2MTIsImV4cCI6MjA4NzQ5NzYxMn0.yCCiaShTqbFo3NxJVIgv9vba4MI2b4uC23TWRbP9L-E';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
