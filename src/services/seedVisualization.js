import { supabase } from '../lib/supabase';
import { toLocalDateStr } from '../utils/dateUtils';
import { COMPASS_PILLARS } from '../features/metrics/compass/pillars';

/**
 * Script de Geração de Dados de Amostragem (Visualização)
 * Este script injeta dados reais nas tabelas do Supabase para os últimos 7 dias,
 * permitindo que o usuário visualize o sistema em funcionamento imediatamente.
 */

export async function seedWeekVisualization() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    console.error('Usuário não autenticado. Impossível gerar dados.');
    return { error: 'Not authenticated' };
  }

  const userId = session.user.id;
  const today = new Date();
  
  console.log('Iniciando geração de dados para visualização (7 dias)...');

  try {
    // 1. Gerar Histórico de Telemetria (Scores dos Pilares)
    const telemetryRows = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = toLocalDateStr(date);

      COMPASS_PILLARS.forEach(pillar => {
        // Gera scores com tendência levemente ascendente
        const baseScore = 60 + (7 - i) * 3; 
        const randomVar = Math.floor(Math.random() * 15) - 5;
        const score = Math.min(98, Math.max(20, baseScore + randomVar));

        telemetryRows.push({
          user_id: userId,
          metric_key: pillar.slug,
          score,
          recorded_date: dateStr
        });

        // Gera scores para os sub-eixos
        pillar.axes.forEach(axis => {
          telemetryRows.push({
            user_id: userId,
            metric_key: `${pillar.slug}_${axis.key}`,
            score: Math.min(100, Math.max(10, score + (Math.random() * 20 - 10))),
            recorded_date: dateStr
          });
        });
      });
    }

    // Upsert telemetry
    const { error: telError } = await supabase
      .from('telemetry_history')
      .upsert(telemetryRows, { onConflict: 'user_id,metric_key,recorded_date' });
    
    if (telError) throw telError;
    console.log('✔ Telemetria (Scores) gerada.');

    // 2. Gerar Daily Activity (Heatmaps e Streaks)
    const activityRows = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = toLocalDateStr(date);

      activityRows.push({
        user_id: userId,
        activity_date: dateStr,
        tasks_completed: Math.floor(Math.random() * 5) + 3,
        tasks_total: 8,
        focus_minutes: Math.floor(Math.random() * 120) + 60,
        xp_earned: Math.floor(Math.random() * 200) + 100,
        active: true
      });
    }

    const { error: actError } = await supabase
      .from('daily_activity')
      .upsert(activityRows, { onConflict: 'user_id,activity_date' });

    if (actError) throw actError;
    console.log('✔ Atividade Diária gerada.');

    // 3. Gerar Daily Metrics (Consolidação de Dashboard)
    const metricsRows = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = toLocalDateStr(date);
      
      metricsRows.push({
        user_id: userId,
        day: dateStr,
        xp_gained: Math.floor(Math.random() * 200) + 100,
        disciplina: Math.floor(Math.random() * 5),
        consistencia: Math.floor(Math.random() * 5),
        foco: Math.floor(Math.random() * 5),
        energia: Math.floor(Math.random() * 5),
        evolucao: Math.floor(Math.random() * 5),
        tasks_done: Math.floor(Math.random() * 5),
        habits_done: Math.floor(Math.random() * 5)
      });
    }

    const { error: metError } = await supabase
      .from('daily_metrics')
      .upsert(metricsRows, { onConflict: 'user_id,day' });

    if (metError) throw metError;
    console.log('✔ Métricas Consolidadas geradas.');

    // 4. Gerar Transações Financeiras (Amostra de Fluxo)
    const transactions = [];
    const types = ['in', 'out'];
    const categories = ['Alimentação', 'Trabalho', 'Lazer', 'Assinatura', 'Investimento'];
    
    for (let i = 0; i < 15; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - Math.floor(Math.random() * 7));
      const type = Math.random() > 0.7 ? 'in' : 'out';
      
      transactions.push({
        user_id: userId,
        amount: type === 'in' ? (Math.random() * 2000 + 1000) : (Math.random() * 300 + 20),
        type,
        category: categories[Math.floor(Math.random() * categories.length)],
        description: type === 'in' ? 'Recebimento' : 'Compra teste',
        date: toLocalDateStr(date)
      });
    }

    const { error: transError } = await supabase
      .from('transactions')
      .insert(transactions);
    
    // We don't upsert transactions as they don't have a unique constraint on date alone
    if (transError) console.warn('Aviso: Erro ao gerar transações (podem ser duplicadas), mas ignorado.');
    console.log('🚀 Geração concluída com sucesso! Atualize a página.');
    return { success: true };

  } catch (err) {
    console.error('Erro crítico na geração de dados:', err);
    return { error: err.message };
  }
}

/**
 * Script de Limpeza Total do Sistema
 * Remove absolutamente TODOS os dados do usuário em todas as tabelas.
 */
export async function wipeEntireSystem() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { error: 'Not authenticated' };

  const userId = session.user.id;
  console.log('Iniciando limpeza profunda do sistema (Wipe)...');

  try {
    console.log('--- WIPE LOG START ---');
    
    // Lista de tabelas e colunas de identificação (EXTENDIDA para todos os módulos)
    const tables = [
      { name: 'telemetry_history', col: 'user_id' },
      { name: 'telemetry_metrics', col: 'user_id' },
      { name: 'daily_activity', col: 'user_id' },
      { name: 'daily_metrics', col: 'user_id' },
      { name: 'daily_stats', col: 'user_id' },
      { name: 'transactions', col: 'user_id' },
      { name: 'orvax_agenda', col: 'user_id' },
      { name: 'habits', col: 'user_id' },
      { name: 'habit_logs', col: 'user_id' },
      { name: 'goals', col: 'user_id' },
      { name: 'financial_goals', col: 'user_id' },
      { name: 'tasks', col: 'user_id' },
      { name: 'universal_events', col: 'user_id' },
      { name: 'user_notes', col: 'user_id' },
      { name: 'focus_sessions', col: 'user_id' },
      { name: 'xp_log', col: 'user_id' },
      { name: 'user_achievements', col: 'user_id' },
      { name: 'media_vault', col: 'user_id' },
      { name: 'dashboard', col: 'user_id' },
      { name: 'meal_entries', col: 'user_id' },
      { name: 'water_logs', col: 'user_id' },
      { name: 'weight_logs', col: 'user_id' },
      { name: 'nutrition_plans', col: 'user_id' },
      { name: 'workouts', col: 'user_id' },
      { name: 'challenge_members', col: 'user_id' }
    ];

    console.log('--- EXECUTING DELETIONS ---');
    const deletePromises = tables.map(t => 
      supabase.from(t.name).delete().eq(t.col, userId).then(r => {
        if (r.error) console.warn(`⚠ Table ${t.name} (maybe doesn't exist):`, r.error.message);
        else console.log(`✅ Table ${t.name} cleared.`);
        return r;
      })
    );

    // Special case for friendships
    const friendshipPromise = supabase.from('friendships').delete()
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

    // Profile Reset (ABSOLUTO)
    const profilePromise = supabase.from('profiles').update({ 
      xp: 0, 
      weekly_xp: 0, 
      level: 1, 
      streak_days: 0,
      total_tasks_completed: 0, 
      total_focus_minutes: 0,
      rank_index: 0,
      k_index: 0,
      avatar_url: null, 
      selected_mentor: 'atlas',
      updated_at: new Date().toISOString()
    }).eq('id', userId);

    const results = await Promise.all([...deletePromises, friendshipPromise, profilePromise]);

    // VERIFICATION STEP: Make sure critical tables and profile are actually reset
    console.log('--- VERIFYING CLEAN STATE ---');
    
    // Check Profile XP
    const { data: profCheck } = await supabase.from('profiles').select('xp, rank_index').eq('id', userId).single();
    if (profCheck && (profCheck.xp > 0 || profCheck.rank_index > 0)) {
      console.warn('⚠ Profile XP still exists! Forcing retry...');
      await supabase.from('profiles').update({ xp: 0, rank_index: 0, weekly_xp: 0 }).eq('id', userId);
    } else {
      console.log('✨ Profile XP verified at 0.');
    }

    for (const t of ['telemetry_history', 'xp_log', 'daily_metrics']) {
      const { count } = await supabase.from(t).select('*', { count: 'exact', head: true }).eq('user_id', userId);
      if (count && count > 0) {
        console.warn(`⚠ WARNING: ${t} still has ${count} records! Retrying delete...`);
        await supabase.from(t).delete().eq('user_id', userId);
      } else {
        console.log(`✨ ${t} verified empty.`);
      }
    }

    console.log('--- WIPE LOG END ---');
    console.log('✔ Sistema resetado com sucesso total.');
    return { success: true };
  } catch (err) {
    console.error('Erro crítico na limpeza:', err);
    return { error: err.message };
  }
}

// Manter o nome antigo para compatibilidade se necessário, mas apontando para a limpeza total
export const clearAllTelemetryData = wipeEntireSystem;
