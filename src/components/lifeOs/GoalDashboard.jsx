// =============================================================
// ORVAX — GoalDashboard
// Dashboard completo por meta individual (estilo Power-BI).
// Mostra: hero card, gauge circular, projeção ao prazo, histórico
// em linha (checkpoints), velocidade (ritmo/semana), previsão,
// logging rápido de progresso, sub-ações.
// =============================================================
import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, Plus, Calendar, Clock, TrendingUp, TrendingDown,
  Minus, Target, Zap, AlertTriangle, CheckCircle2, Plane, PiggyBank,
  CreditCard, Scale, Dumbbell, BookOpen, Briefcase, Heart, Home
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

const TEMPLATE_ICON = {
  savings_trip: Plane, emergency_fund: PiggyBank, invest: TrendingUp,
  debt_payoff: CreditCard, weight: Scale, workout: Dumbbell,
  study: BookOpen, reading: BookOpen, career: Briefcase, health: Heart,
  home_project: Home, custom: Target,
};

const fmtBRL = (n) => (Number(n) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtNum = (n, unit) => {
  const v = Number(n) || 0;
  if (unit === 'BRL') return fmtBRL(v);
  return `${v.toLocaleString('pt-BR')}${unit ? ' ' + unit : ''}`;
};

// --- Circular gauge --------------------------------------------
function CircularGauge({ percent = 0, size = 180, stroke = 12, color = '#22c55e' }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, percent));
  const offset = c - (pct / 100) * c;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block">
      <circle cx={size/2} cy={size/2} r={r} fill="none"
        stroke="var(--border-color)" strokeWidth={stroke} opacity="0.3" />
      <circle cx={size/2} cy={size/2} r={r} fill="none"
        stroke={color} strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={offset}
        transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{ transition: 'stroke-dashoffset 0.8s ease-out' }} />
      <text x={size/2} y={size/2 - 6} textAnchor="middle" dominantBaseline="middle"
        fontSize="36" fontWeight="700" fill="currentColor" fontFamily="monospace">
        {Math.round(pct)}
      </text>
      <text x={size/2} y={size/2 + 22} textAnchor="middle" dominantBaseline="middle"
        fontSize="10" fill="currentColor" opacity="0.5" fontFamily="monospace" letterSpacing="2">
        % COMPLETO
      </text>
    </svg>
  );
}

// --- Line chart (checkpoints) ----------------------------------
function LineChart({ points = [], target = 0, color = '#22c55e', height = 140 }) {
  if (!points.length) {
    return <div className="text-[10px] font-mono opacity-40 py-8 text-center">Sem registros ainda. Adicione o primeiro checkpoint pra ver a evolução.</div>;
  }
  const values = points.map(p => p.value);
  const maxV = Math.max(target, ...values) || 1;
  const w = 320;
  const stepX = w / Math.max(points.length - 1, 1);
  const yOf = (v) => height - (v / maxV) * (height - 20) - 10;
  const line = points.map((p, i) => `${i * stepX},${yOf(p.value)}`).join(' ');
  const area = `0,${height} ${line} ${w},${height}`;
  const targetY = yOf(target);
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" preserveAspectRatio="none">
      {/* grid */}
      {[0.25, 0.5, 0.75].map(f => (
        <line key={f} x1="0" x2={w} y1={height * f} y2={height * f}
          stroke="var(--border-color)" strokeWidth="0.5" opacity="0.3" />
      ))}
      {/* target line */}
      {target > 0 && (
        <g>
          <line x1="0" x2={w} y1={targetY} y2={targetY}
            stroke={color} strokeDasharray="3 3" strokeWidth="0.8" opacity="0.4" />
          <text x={w - 4} y={targetY - 3} textAnchor="end" fontSize="7"
            fill={color} fontFamily="monospace" opacity="0.7">ALVO</text>
        </g>
      )}
      {/* area */}
      <polygon points={area} fill={color} opacity="0.15" />
      {/* line */}
      <polyline points={line} fill="none" stroke={color} strokeWidth="1.5"
        vectorEffect="non-scaling-stroke" />
      {/* dots */}
      {points.map((p, i) => (
        <circle key={i} cx={i * stepX} cy={yOf(p.value)} r="2.5" fill={color} />
      ))}
    </svg>
  );
}

// --- Projeção (curva teórica até o prazo) ---------------------
function projectETA(current, target, started, deadline, points) {
  if (!target || target <= 0) return null;
  const today = new Date();
  const start = started ? new Date(started) : today;
  const end = deadline ? new Date(deadline) : null;
  if (points.length < 2 && !end) return null;

  // Velocidade em unidade/dia
  let velocity = 0;
  if (points.length >= 2) {
    const first = points[0];
    const last = points[points.length - 1];
    const daysElapsed = Math.max(1, (new Date(last.logged_at) - new Date(first.logged_at)) / (1000*60*60*24));
    velocity = (last.value - first.value) / daysElapsed;
  } else {
    const daysElapsed = Math.max(1, (today - start) / (1000*60*60*24));
    velocity = current / daysElapsed;
  }

  const remaining = target - current;
  const daysNeeded = velocity > 0 ? Math.ceil(remaining / velocity) : null;
  const projectedEnd = daysNeeded != null ? new Date(today.getTime() + daysNeeded*86400000) : null;

  let status = 'on_track';
  if (end) {
    const daysToDeadline = Math.ceil((end - today) / 86400000);
    if (daysToDeadline < 0) status = 'overdue';
    else if (!daysNeeded) status = 'no_velocity';
    else if (daysNeeded > daysToDeadline + 7) status = 'behind';
    else if (daysNeeded < daysToDeadline - 7) status = 'ahead';
  }

  return { velocity, daysNeeded, projectedEnd, status };
}

// --- Main ------------------------------------------------------
export default function GoalDashboard({ goalId, color = '#f97316', onBack }) {
  const [goal, setGoal] = useState(null);
  const [checkpoints, setCheckpoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [logOpen, setLogOpen] = useState(false);
  const [logValue, setLogValue] = useState('');
  const [logNote, setLogNote] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [{ data: g }, { data: cps }] = await Promise.all([
        supabase.from('goals').select('*').eq('id', goalId).single(),
        supabase.from('goal_checkpoints').select('*')
          .eq('goal_id', goalId).order('logged_at', { ascending: true }),
      ]);
      setGoal(g || null);
      setCheckpoints(cps || []);
    } catch (e) { console.error('GoalDashboard:', e); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (goalId) load(); }, [goalId]);

  const Icon = useMemo(() => {
    if (!goal) return Target;
    const tpl = goal.metadata?.template;
    return TEMPLATE_ICON[tpl] || Target;
  }, [goal]);

  const percent = useMemo(() => {
    if (!goal) return 0;
    if (goal.target_value && goal.target_value > 0) {
      return Math.min(100, Math.round(((goal.current_value || 0) / goal.target_value) * 100));
    }
    return goal.progress || 0;
  }, [goal]);

  const eta = useMemo(() => {
    if (!goal) return null;
    return projectETA(
      goal.current_value || 0,
      goal.target_value || 0,
      goal.started_at,
      goal.deadline,
      checkpoints
    );
  }, [goal, checkpoints]);

  const daysToDeadline = useMemo(() => {
    if (!goal?.deadline) return null;
    return Math.ceil((new Date(goal.deadline) - new Date()) / 86400000);
  }, [goal]);

  const weeklyPace = useMemo(() => {
    if (!eta?.velocity) return 0;
    return Math.round(eta.velocity * 7 * 100) / 100;
  }, [eta]);

  const logCheckpoint = async () => {
    if (!logValue) return;
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');
      const { error } = await supabase.from('goal_checkpoints').insert({
        user_id: user.id,
        goal_id: goalId,
        value: Number(logValue),
        note: logNote || null,
      });
      if (error) throw error;
      setLogValue(''); setLogNote(''); setLogOpen(false);
      await load();
    } catch (e) {
      console.error('logCheckpoint:', e);
      alert(e.message);
    } finally { setSaving(false); }
  };

  const markComplete = async () => {
    if (!goal) return;
    await supabase.from('goals').update({
      status: 'completed', progress: 100,
      current_value: goal.target_value || goal.current_value,
    }).eq('id', goalId);
    await load();
  };

  if (!goalId) return null;
  if (loading) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center" style={{ backgroundColor: 'var(--bg-color)' }}>
        <p className="text-[10px] font-mono opacity-40">Carregando meta…</p>
      </div>
    );
  }
  if (!goal) {
    return (
      <div className="fixed inset-0 z-[60] overflow-y-auto" style={{ backgroundColor: 'var(--bg-color)' }}>
        <button onClick={onBack} className="p-4 opacity-60"><ArrowLeft size={18} /></button>
        <p className="text-center text-[11px] opacity-60">Meta não encontrada.</p>
      </div>
    );
  }

  const unit = goal.unit || '';
  const isMilestone = !goal.target_value;
  const statusMeta = {
    on_track:    { label: 'NO RITMO',         c: '#22c55e', Icon: CheckCircle2 },
    ahead:       { label: 'ADIANTADO',        c: '#06b6d4', Icon: TrendingUp },
    behind:      { label: 'RITMO INSUFICIENTE', c: '#f59e0b', Icon: TrendingDown },
    overdue:     { label: 'VENCIDA',          c: '#ef4444', Icon: AlertTriangle },
    no_velocity: { label: 'SEM DADOS',        c: '#64748b', Icon: Minus },
  };
  const st = eta ? (statusMeta[eta.status] || statusMeta.no_velocity) : statusMeta.no_velocity;
  const StatusIcon = st.Icon;

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto" style={{ backgroundColor: 'var(--bg-color)' }}>
      {/* Header */}
      <header className="sticky top-0 z-10 border-b backdrop-blur-md px-4 py-3 flex items-center gap-3"
        style={{ backgroundColor: 'var(--bg-color)ee', borderColor: 'var(--border-color)' }}>
        <button onClick={onBack} className="w-8 h-8 rounded-full flex items-center justify-center opacity-60 hover:opacity-100"
          style={{ backgroundColor: 'var(--glass-bg)' }}>
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1 min-w-0">
          <span className="text-[8px] font-mono opacity-40 tracking-widest">META · {(goal.aspect_key || 'geral').toUpperCase()}</span>
          <h1 className="text-sm font-bold tracking-wider truncate">{goal.title}</h1>
        </div>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${color}20`, color }}>
          <Icon size={18} />
        </div>
      </header>

      <div className="p-4 space-y-4 pb-28">
        {/* HERO — gauge circular */}
        <section className="rounded-2xl border p-6 flex flex-col items-center"
          style={{ backgroundColor: 'var(--glass-bg)', borderColor: 'var(--border-color)', color }}>
          <CircularGauge percent={percent} color={color} />
          {!isMilestone && (
            <div className="mt-4 text-center">
              <p className="text-[11px] font-mono opacity-50">
                <span className="font-bold" style={{ color }}>{fmtNum(goal.current_value, unit)}</span>
                <span className="opacity-60"> / {fmtNum(goal.target_value, unit)}</span>
              </p>
              {eta?.daysNeeded != null && (
                <p className="text-[9px] font-mono opacity-40 mt-1 tracking-wider">
                  {eta.daysNeeded > 0
                    ? `CHEGA EM ~${eta.daysNeeded} DIAS NO RITMO ATUAL`
                    : 'META ATINGIDA'}
                </p>
              )}
            </div>
          )}
          {/* Status pill */}
          <div className="mt-4 flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-mono font-bold tracking-wider"
            style={{ borderColor: st.c, color: st.c, backgroundColor: `${st.c}10` }}>
            <StatusIcon size={12} />
            {st.label}
          </div>
        </section>

        {/* KPIs em 4 colunas */}
        <div className="grid grid-cols-2 gap-2">
          <Kpi label="PRAZO" Icon={Calendar}
            value={goal.deadline ? new Date(goal.deadline).toLocaleDateString('pt-BR') : '—'}
            sub={daysToDeadline != null ? (daysToDeadline > 0 ? `${daysToDeadline} dias` : 'vencido') : ''}
            color={color} />
          <Kpi label="RITMO SEMANAL" Icon={Zap}
            value={weeklyPace ? fmtNum(weeklyPace, unit) : '—'}
            sub="por semana"
            color={color} />
          <Kpi label="CHECKPOINTS" Icon={Target}
            value={checkpoints.length}
            sub="registros"
            color={color} />
          <Kpi label="PREVISÃO" Icon={Clock}
            value={eta?.projectedEnd ? new Date(eta.projectedEnd).toLocaleDateString('pt-BR') : '—'}
            sub={eta?.projectedEnd ? 'data estimada' : 'falta histórico'}
            color={color} />
        </div>

        {/* Evolução — line chart */}
        <section className="rounded-2xl border p-4"
          style={{ backgroundColor: 'var(--glass-bg)', borderColor: 'var(--border-color)' }}>
          <div className="flex justify-between items-baseline mb-3">
            <span className="text-[9px] font-mono opacity-50 tracking-wider">EVOLUÇÃO</span>
            <span className="text-[9px] font-mono opacity-40">{checkpoints.length} pontos</span>
          </div>
          <LineChart
            points={checkpoints.map(c => ({ value: c.value, logged_at: c.logged_at }))}
            target={goal.target_value || 0}
            color={color}
          />
        </section>

        {/* Histórico compacto */}
        {checkpoints.length > 0 && (
          <section>
            <h3 className="text-[9px] font-mono opacity-50 tracking-wider mb-2">HISTÓRICO</h3>
            <div className="space-y-1.5">
              {[...checkpoints].reverse().slice(0, 10).map(c => (
                <div key={c.id} className="flex items-center justify-between p-3 rounded-xl border"
                  style={{ backgroundColor: 'var(--glass-bg)', borderColor: 'var(--border-color)' }}>
                  <div className="min-w-0">
                    <span className="text-[11px] font-bold font-mono" style={{ color }}>
                      {fmtNum(c.value, unit)}
                    </span>
                    {c.note && <p className="text-[9px] opacity-60 truncate">{c.note}</p>}
                  </div>
                  <span className="text-[9px] font-mono opacity-40 shrink-0">
                    {new Date(c.logged_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Descrição */}
        {goal.description && (
          <section className="rounded-2xl border p-4"
            style={{ backgroundColor: 'var(--glass-bg)', borderColor: 'var(--border-color)' }}>
            <h3 className="text-[9px] font-mono opacity-50 tracking-wider mb-2">SOBRE</h3>
            <p className="text-[11px] opacity-80 leading-relaxed">{goal.description}</p>
          </section>
        )}
      </div>

      {/* Bottom action bar */}
      <div className="fixed bottom-0 left-0 right-0 z-20 px-4 py-3 border-t backdrop-blur-xl flex gap-2 max-w-[428px] mx-auto"
        style={{ backgroundColor: 'var(--bg-color)ee', borderColor: 'var(--border-color)' }}>
        {!isMilestone && (
          <button onClick={() => setLogOpen(true)}
            className="flex-1 py-3 rounded-xl font-bold text-[11px] tracking-wider flex items-center justify-center gap-2"
            style={{ backgroundColor: color, color: 'white' }}>
            <Plus size={14} /> REGISTRAR PROGRESSO
          </button>
        )}
        {isMilestone && goal.status !== 'completed' && (
          <button onClick={markComplete}
            className="flex-1 py-3 rounded-xl font-bold text-[11px] tracking-wider flex items-center justify-center gap-2"
            style={{ backgroundColor: color, color: 'white' }}>
            <CheckCircle2 size={14} /> MARCAR COMO CONCLUÍDA
          </button>
        )}
      </div>

      {/* Log modal */}
      {logOpen && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center animate-in fade-in duration-200"
          onClick={() => setLogOpen(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-[428px] rounded-t-2xl border-t border-x p-5 pb-8 animate-in slide-in-from-bottom-8 duration-300"
            style={{ backgroundColor: 'var(--bg-color)', borderColor: 'var(--border-color)' }}>
            <div className="w-10 h-1 rounded-full bg-current opacity-20 mx-auto mb-4" />
            <h3 className="text-sm font-bold tracking-wider mb-4">REGISTRAR PROGRESSO</h3>

            <label className="text-[9px] font-mono opacity-50 tracking-wider block mb-1.5">
              NOVO VALOR {unit && `(${unit})`}
            </label>
            <input type="number" inputMode="decimal" autoFocus
              value={logValue} onChange={(e) => setLogValue(e.target.value)}
              placeholder={fmtNum(goal.current_value, unit)}
              className="w-full text-[20px] font-mono font-bold bg-transparent border rounded-xl px-3 py-3 mb-3 outline-none text-center"
              style={{ borderColor: 'var(--border-color)', color }} />

            <label className="text-[9px] font-mono opacity-50 tracking-wider block mb-1.5">NOTA (opcional)</label>
            <input value={logNote} onChange={(e) => setLogNote(e.target.value)}
              placeholder="Ex: Economizei do 13o"
              className="w-full text-[11px] bg-transparent border rounded-xl px-3 py-2.5 mb-4 outline-none"
              style={{ borderColor: 'var(--border-color)', color: 'var(--text-main)' }} />

            <button onClick={logCheckpoint} disabled={saving || !logValue}
              className="w-full py-3 rounded-xl font-bold text-[12px] tracking-wider disabled:opacity-30 active:scale-[0.98]"
              style={{ backgroundColor: 'var(--text-main)', color: 'var(--bg-color)' }}>
              {saving ? 'SALVANDO...' : 'SALVAR CHECKPOINT'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Kpi({ label, Icon, value, sub, color }) {
  return (
    <div className="rounded-xl border p-3"
      style={{ backgroundColor: 'var(--glass-bg)', borderColor: 'var(--border-color)' }}>
      <div className="flex items-center gap-1.5 opacity-50 mb-1.5">
        <Icon size={10} />
        <span className="text-[8px] font-mono tracking-wider">{label}</span>
      </div>
      <p className="text-[15px] font-bold font-mono leading-tight" style={{ color }}>{value}</p>
      {sub && <span className="text-[9px] font-mono opacity-40 block mt-0.5">{sub}</span>}
    </div>
  );
}
