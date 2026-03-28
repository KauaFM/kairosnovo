// Script que corrige todos os bugs nos tools do n8n
// Execute: node scripts/fix-n8n-tools.js

const fs = require('fs');
const path = require('path');

const BASE = 'C:/Users/kkfel/OneDrive/\u00c1rea de Trabalho/kairosnovo';
const jsonPath = path.join(BASE, 'n8n/orvax-agent-v2.json');
const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

const fixes = {};

// ── node-026: consultar_transacoes (URL com userId literal) ──
fixes['node-026'] = `const userId = $('Montar Contexto do Usuário').item.json.user_id;
const today = new Date().toISOString().split('T')[0];
const url = process.env.SUPABASE_URL + '/rest/v1/transactions?user_id=eq.' + userId + '&select=id,description,amount,type,category,date&order=date.desc&limit=30';
const r = await fetch(url, {method:'GET',headers:{'apikey':process.env.SUPABASE_KEY,'Authorization':'Bearer '+process.env.SUPABASE_KEY}});
const data = await r.json();
return JSON.stringify(data);`;

// ── node-028: consultar_metas_financeiras (URL com userId literal) ──
fixes['node-028'] = `const userId = $('Montar Contexto do Usuário').item.json.user_id;
const url = process.env.SUPABASE_URL + '/rest/v1/financial_goals?user_id=eq.' + userId + '&status=eq.ativa&select=id,name,target_amount,current_amount,deadline&order=created_at.desc';
const r = await fetch(url, {method:'GET',headers:{'apikey':process.env.SUPABASE_KEY,'Authorization':'Bearer '+process.env.SUPABASE_KEY}});
const data = await r.json();
return JSON.stringify(data);`;

// ── node-030: consultar_tarefas (URL com userId literal) ──
fixes['node-030'] = `const userId = $('Montar Contexto do Usuário').item.json.user_id;
const url = process.env.SUPABASE_URL + '/rest/v1/tasks?user_id=eq.' + userId + '&select=id,title,description,state,scheduled_date,priority&order=scheduled_date.desc&limit=20';
const r = await fetch(url, {method:'GET',headers:{'apikey':process.env.SUPABASE_KEY,'Authorization':'Bearer '+process.env.SUPABASE_KEY}});
const data = await r.json();
return JSON.stringify(data);`;

// ── node-035: consultar_metas (URL com userId literal) ──
fixes['node-035'] = `const userId = $('Montar Contexto do Usuário').item.json.user_id;
const url = process.env.SUPABASE_URL + '/rest/v1/goals?user_id=eq.' + userId + '&status=eq.ativo&select=id,title,description,progress,target_date,category&order=created_at.desc';
const r = await fetch(url, {method:'GET',headers:{'apikey':process.env.SUPABASE_KEY,'Authorization':'Bearer '+process.env.SUPABASE_KEY}});
const data = await r.json();
return JSON.stringify(data);`;

// ── node-038: consultar_agua_hoje (URL com userId e today literal) ──
fixes['node-038'] = `const userId = $('Montar Contexto do Usuário').item.json.user_id;
const today = new Date().toISOString().split('T')[0];
const url = process.env.SUPABASE_URL + '/rest/v1/water_logs?user_id=eq.' + userId + '&log_date=eq.' + today + '&select=amount_ml,logged_at&order=logged_at.desc';
const r = await fetch(url, {method:'GET',headers:{'apikey':process.env.SUPABASE_KEY,'Authorization':'Bearer '+process.env.SUPABASE_KEY}});
const data = await r.json();
const total = Array.isArray(data) ? data.reduce((s, x) => s + (x.amount_ml || 0), 0) : 0;
return JSON.stringify({registros: data, total_ml: total});`;

// ── node-040: consultar_peso_recente (URL com userId literal) ──
fixes['node-040'] = `const userId = $('Montar Contexto do Usuário').item.json.user_id;
const url = process.env.SUPABASE_URL + '/rest/v1/weight_logs?user_id=eq.' + userId + '&select=weight_kg,log_date,notes&order=log_date.desc&limit=10';
const r = await fetch(url, {method:'GET',headers:{'apikey':process.env.SUPABASE_KEY,'Authorization':'Bearer '+process.env.SUPABASE_KEY}});
const data = await r.json();
return JSON.stringify(data);`;

// ── node-041: registrar_treino (workouts → orvax_workouts) ──
fixes['node-041'] = `const userId = $('Montar Contexto do Usuário').item.json.user_id;
const now = new Date().toISOString();
const title = $fromAI('title', 'Nome do treino', 'string');
const description = $fromAI('description', 'Descricao', 'string');
const duration_min = $fromAI('duration_min', 'Minutos', 'number');
const activity_type = $fromAI('activity_type', 'gym/run/yoga/cycling/swim/walk/other', 'string');
const url = process.env.SUPABASE_URL + '/rest/v1/orvax_workouts';
const r = await fetch(url, {method:'POST',headers:{'apikey':process.env.SUPABASE_KEY,'Authorization':'Bearer '+process.env.SUPABASE_KEY,'Content-Type':'application/json','Prefer':'return=representation'},body:JSON.stringify({user_id:userId,title,description:description||'',duration_min:Number(duration_min),activity_type:activity_type||'gym',created_at:now})});
const data = await r.json();
return JSON.stringify(data);`;

// ── node-042: consultar_treinos (workouts → orvax_workouts + URL literal) ──
fixes['node-042'] = `const userId = $('Montar Contexto do Usuário').item.json.user_id;
const url = process.env.SUPABASE_URL + '/rest/v1/orvax_workouts?user_id=eq.' + userId + '&select=id,title,duration_min,activity_type,created_at&order=created_at.desc&limit=10';
const r = await fetch(url, {method:'GET',headers:{'apikey':process.env.SUPABASE_KEY,'Authorization':'Bearer '+process.env.SUPABASE_KEY}});
const data = await r.json();
return JSON.stringify(data);`;

// ── node-044: consultar_refeicoes_hoje (URL com userId e today literal) ──
fixes['node-044'] = `const userId = $('Montar Contexto do Usuário').item.json.user_id;
const today = new Date().toISOString().split('T')[0];
const url = process.env.SUPABASE_URL + '/rest/v1/meal_entries?user_id=eq.' + userId + '&log_date=eq.' + today + '&select=meal_type,food_name,calories,protein_g,carbs_g,fat_g&order=created_at.desc';
const r = await fetch(url, {method:'GET',headers:{'apikey':process.env.SUPABASE_KEY,'Authorization':'Bearer '+process.env.SUPABASE_KEY}});
const data = await r.json();
return JSON.stringify(data);`;

// ── node-046: consultar_habitos (URL com userId literal) ──
fixes['node-046'] = `const userId = $('Montar Contexto do Usuário').item.json.user_id;
const today = new Date().toISOString().split('T')[0];
const url = process.env.SUPABASE_URL + '/rest/v1/orvax_habitos?user_id=eq.' + userId + '&completed_date=eq.' + today + '&select=habit_name,note,created_at&order=created_at.desc';
const r = await fetch(url, {method:'GET',headers:{'apikey':process.env.SUPABASE_KEY,'Authorization':'Bearer '+process.env.SUPABASE_KEY}});
const data = await r.json();
return JSON.stringify(data);`;

// ── node-047: registrar_foco (colunas erradas: planned_minutes/status→duration_minutes/completed) ──
fixes['node-047'] = `const userId = $('Montar Contexto do Usuário').item.json.user_id;
const now = new Date().toISOString();
const duration_min = $fromAI('duration_min', 'Minutos de foco', 'number');
const activity = $fromAI('activity', 'Atividade realizada durante o foco', 'string');
const url = process.env.SUPABASE_URL + '/rest/v1/focus_sessions';
const r = await fetch(url, {method:'POST',headers:{'apikey':process.env.SUPABASE_KEY,'Authorization':'Bearer '+process.env.SUPABASE_KEY,'Content-Type':'application/json','Prefer':'return=representation'},body:JSON.stringify({user_id:userId,duration_minutes:Number(duration_min),actual_minutes:Number(duration_min),activity:activity||'',completed:true,started_at:now,ended_at:now})});
const data = await r.json();
return JSON.stringify(data);`;

// ── node-048: consultar_foco_hoje (colunas erradas + URL literal) ──
fixes['node-048'] = `const userId = $('Montar Contexto do Usuário').item.json.user_id;
const today = new Date().toISOString().split('T')[0];
const url = process.env.SUPABASE_URL + '/rest/v1/focus_sessions?user_id=eq.' + userId + '&started_at=gte.' + today + 'T00:00:00Z&select=duration_minutes,actual_minutes,activity,completed,started_at&order=started_at.desc';
const r = await fetch(url, {method:'GET',headers:{'apikey':process.env.SUPABASE_KEY,'Authorization':'Bearer '+process.env.SUPABASE_KEY}});
const data = await r.json();
return JSON.stringify(data);`;

// ── node-050: consultar_notas (URL com userId literal) ──
fixes['node-050'] = `const userId = $('Montar Contexto do Usuário').item.json.user_id;
const url = process.env.SUPABASE_URL + '/rest/v1/user_notes?user_id=eq.' + userId + '&select=id,title,content,created_at&order=created_at.desc&limit=10';
const r = await fetch(url, {method:'GET',headers:{'apikey':process.env.SUPABASE_KEY,'Authorization':'Bearer '+process.env.SUPABASE_KEY}});
const data = await r.json();
return JSON.stringify(data);`;

// ── node-053: consultar_perfil (URL com userId literal) ──
fixes['node-053'] = `const userId = $('Montar Contexto do Usuário').item.json.user_id;
const url = process.env.SUPABASE_URL + '/rest/v1/profiles?id=eq.' + userId + '&select=full_name,streak_days,xp,level,selected_mentor,total_tasks_completed,total_focus_minutes';
const r = await fetch(url, {method:'GET',headers:{'apikey':process.env.SUPABASE_KEY,'Authorization':'Bearer '+process.env.SUPABASE_KEY}});
const data = await r.json();
return JSON.stringify(Array.isArray(data) ? data[0] : data);`;

// ── node-054: consultar_telemetria (URL com userId literal) ──
fixes['node-054'] = `const userId = $('Montar Contexto do Usuário').item.json.user_id;
const url = process.env.SUPABASE_URL + '/rest/v1/telemetry_metrics?user_id=eq.' + userId + '&select=name,score,category&order=name.asc';
const r = await fetch(url, {method:'GET',headers:{'apikey':process.env.SUPABASE_KEY,'Authorization':'Bearer '+process.env.SUPABASE_KEY}});
const data = await r.json();
return JSON.stringify(data);`;

// ── node-055: consultar_conquistas (URL literal + xp_reward não points) ──
fixes['node-055'] = `const userId = $('Montar Contexto do Usuário').item.json.user_id;
const url = process.env.SUPABASE_URL + '/rest/v1/user_achievements?user_id=eq.' + userId + '&select=*,achievements(title,description,icon,xp_reward)&order=unlocked_at.desc';
const r = await fetch(url, {method:'GET',headers:{'apikey':process.env.SUPABASE_KEY,'Authorization':'Bearer '+process.env.SUPABASE_KEY}});
const data = await r.json();
return JSON.stringify(data);`;

// ── node-058: consultar_stats_hoje (coluna date→activity_date + URL literal) ──
fixes['node-058'] = `const userId = $('Montar Contexto do Usuário').item.json.user_id;
const today = new Date().toISOString().split('T')[0];
const url = process.env.SUPABASE_URL + '/rest/v1/daily_activity?user_id=eq.' + userId + '&activity_date=eq.' + today + '&select=activity_date,tasks_completed,tasks_total,focus_minutes,xp_earned';
const r = await fetch(url, {method:'GET',headers:{'apikey':process.env.SUPABASE_KEY,'Authorization':'Bearer '+process.env.SUPABASE_KEY}});
const data = await r.json();
return JSON.stringify(Array.isArray(data) ? (data[0] || {tasks_completed:0,focus_minutes:0,xp_earned:0}) : data);`;

// ── node-059: consultar_atividade_semana (coluna date→activity_date + URL literal) ──
fixes['node-059'] = `const userId = $('Montar Contexto do Usuário').item.json.user_id;
const d = new Date(); d.setDate(d.getDate() - 6);
const weekAgo = d.toISOString().split('T')[0];
const today = new Date().toISOString().split('T')[0];
const url = process.env.SUPABASE_URL + '/rest/v1/daily_activity?user_id=eq.' + userId + '&activity_date=gte.' + weekAgo + '&activity_date=lte.' + today + '&select=activity_date,tasks_completed,focus_minutes,active&order=activity_date.asc';
const r = await fetch(url, {method:'GET',headers:{'apikey':process.env.SUPABASE_KEY,'Authorization':'Bearer '+process.env.SUPABASE_KEY}});
const data = await r.json();
return JSON.stringify(data);`;

// ── node-060: consultar_resumo_financeiro (URL literal + adicionar summary calculado) ──
fixes['node-060'] = `const userId = $('Montar Contexto do Usuário').item.json.user_id;
const url = process.env.SUPABASE_URL + '/rest/v1/transactions?user_id=eq.' + userId + '&select=amount,type,category,date&order=date.desc&limit=100';
const r = await fetch(url, {method:'GET',headers:{'apikey':process.env.SUPABASE_KEY,'Authorization':'Bearer '+process.env.SUPABASE_KEY}});
const data = await r.json();
const txs = Array.isArray(data) ? data : [];
const income = txs.filter(t => t.type === 'in').reduce((s, t) => s + Math.abs(parseFloat(t.amount)||0), 0);
const expense = txs.filter(t => t.type === 'out').reduce((s, t) => s + Math.abs(parseFloat(t.amount)||0), 0);
return JSON.stringify({receitas: income.toFixed(2), despesas: expense.toFixed(2), saldo: (income - expense).toFixed(2), ultimas_transacoes: txs.slice(0,10)});`;

// ── node-061: consultar_foco_total_hoje (status→completed BOOLEAN + URL errada) ──
fixes['node-061'] = `const userId = $('Montar Contexto do Usuário').item.json.user_id;
const today = new Date().toISOString().split('T')[0];
const url = process.env.SUPABASE_URL + '/rest/v1/focus_sessions?user_id=eq.' + userId + '&completed=eq.true&started_at=gte.' + today + 'T00:00:00Z&select=actual_minutes,duration_minutes';
const r = await fetch(url, {method:'GET',headers:{'apikey':process.env.SUPABASE_KEY,'Authorization':'Bearer '+process.env.SUPABASE_KEY}});
const data = await r.json();
const total = Array.isArray(data) ? data.reduce((s, x) => s + (x.actual_minutes || x.duration_minutes || 0), 0) : 0;
return JSON.stringify({total_minutos: total, total_horas: (total/60).toFixed(1)});`;

// ── node-062: registrar_pontos (xp_events não existe → usar RPC) ──
fixes['node-062'] = `const userId = $('Montar Contexto do Usuário').item.json.user_id;
const points = $fromAI('points', 'Quantidade de pontos/XP a adicionar', 'number');
const reason = $fromAI('reason', 'Motivo da pontuacao', 'string');
const url = process.env.SUPABASE_URL + '/rest/v1/rpc/add_xp_and_update_streak';
const r = await fetch(url, {
  method: 'POST',
  headers: {'apikey': process.env.SUPABASE_KEY, 'Authorization': 'Bearer ' + process.env.SUPABASE_KEY, 'Content-Type': 'application/json'},
  body: JSON.stringify({p_user_id: userId, p_xp_amount: Number(points), p_reason: reason || 'Acao completada'})
});
const data = await r.json();
return JSON.stringify(data);`;

// ── node-064: atualizar_config_app (profiles → app_settings) ──
fixes['node-064'] = `const userId = $('Montar Contexto do Usuário').item.json.user_id;
const key = $fromAI('key', 'Chave: active_tabs, daily_mission ou theme_color', 'string');
const value = $fromAI('value', 'Valor. Para active_tabs use JSON array: ["nexus","vault","telemetry"]', 'string');
const body = {};
try {
  body[key] = (key === 'active_tabs') ? JSON.parse(value) : value;
} catch(e) {
  body[key] = value;
}
const url = process.env.SUPABASE_URL + '/rest/v1/app_settings?user_id=eq.' + userId;
const r = await fetch(url, {
  method: 'PATCH',
  headers: {'apikey': process.env.SUPABASE_KEY, 'Authorization': 'Bearer ' + process.env.SUPABASE_KEY, 'Content-Type': 'application/json', 'Prefer': 'return=representation'},
  body: JSON.stringify(body)
});
return JSON.stringify(await r.json());`;

// Aplicar correções
let changed = 0;
data.nodes.forEach(n => {
  if (fixes[n.id]) {
    n.parameters.jsCode = fixes[n.id];
    changed++;
    console.log('✓ Corrigido: ' + n.name + ' (' + n.id + ')');
  }
});

fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
console.log('\n✅ ' + changed + '/' + Object.keys(fixes).length + ' nodes corrigidos');
console.log('📁 Arquivo salvo: ' + jsonPath);
