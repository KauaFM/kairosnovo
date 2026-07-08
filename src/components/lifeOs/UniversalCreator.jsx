// =============================================================
// ORVAX — UniversalCreator v2 (profissional)
// Modal único pra criar QUALQUER coisa: tarefa, hábito, meta
// (com subtipos ricos: viagem, reserva, investimento, peso, etc.),
// evento, reunião, lembrete, pagamento.
// =============================================================
import React, { useEffect, useMemo, useState } from 'react';
import {
  X, Plus, Loader2, CheckSquare, Repeat, Target, Calendar, Bell,
  CreditCard, Plane, PiggyBank, TrendingUp, Scale, Dumbbell,
  BookOpen, Heart, Home, Briefcase
} from 'lucide-react';
import {
  createTask, createHabit, createUniversalEvent, listLifeAspects,
} from '../../services/lifeOs';
import { supabase } from '../../lib/supabase';
import { toLocalDateStr } from '../../utils/dateUtils';

const KINDS = [
  { k: 'task',     label: 'Tarefa',   Icon: CheckSquare, color: '#22c55e' },
  { k: 'habit',    label: 'Hábito',   Icon: Repeat,      color: '#8b5cf6' },
  { k: 'goal',     label: 'Meta',     Icon: Target,      color: '#f97316' },
  { k: 'event',    label: 'Evento',   Icon: Calendar,    color: '#3b82f6' },
  { k: 'meeting',  label: 'Reunião',  Icon: Calendar,    color: '#06b6d4' },
  { k: 'reminder', label: 'Lembrete', Icon: Bell,        color: '#f59e0b' },
  { k: 'payment',  label: 'Pagamento',Icon: CreditCard,  color: '#ef4444' },
];

// Templates ricos de meta — usuário escolhe um e ja vem pre-configurado
const GOAL_TEMPLATES = [
  { id: 'savings_trip',    label: 'Viagem',             Icon: Plane,       color: '#3b82f6', aspect: 'finance', unit: 'BRL', goal_type: 'savings',    placeholder: 'Ex: Viagem final do ano' },
  { id: 'emergency_fund',  label: 'Reserva Emergência', Icon: PiggyBank,   color: '#22c55e', aspect: 'finance', unit: 'BRL', goal_type: 'savings',    placeholder: 'Ex: 6 meses de reserva' },
  { id: 'invest',          label: 'Investimento',       Icon: TrendingUp,  color: '#84cc16', aspect: 'finance', unit: 'BRL', goal_type: 'invest',     placeholder: 'Ex: Aportar 50k em ações' },
  { id: 'debt_payoff',     label: 'Quitar Dívida',      Icon: CreditCard,  color: '#ef4444', aspect: 'finance', unit: 'BRL', goal_type: 'debt',       placeholder: 'Ex: Quitar cartão' },
  { id: 'weight',          label: 'Peso',               Icon: Scale,       color: '#f97316', aspect: 'body',    unit: 'kg',  goal_type: 'measure',    placeholder: 'Ex: Atingir 75kg' },
  { id: 'workout',         label: 'Treinos',            Icon: Dumbbell,    color: '#f97316', aspect: 'body',    unit: 'sessões', goal_type: 'count', placeholder: 'Ex: 120 treinos em 2026' },
  { id: 'study',           label: 'Estudo',             Icon: BookOpen,    color: '#8b5cf6', aspect: 'studies', unit: 'horas', goal_type: 'count',  placeholder: 'Ex: 300h de curso técnico' },
  { id: 'reading',         label: 'Leitura',            Icon: BookOpen,    color: '#8b5cf6', aspect: 'studies', unit: 'livros', goal_type: 'count', placeholder: 'Ex: Ler 12 livros' },
  { id: 'career',          label: 'Carreira',           Icon: Briefcase,   color: '#3b82f6', aspect: 'career',  unit: '%',   goal_type: 'milestone',  placeholder: 'Ex: Promoção para sênior' },
  { id: 'health',          label: 'Saúde',              Icon: Heart,       color: '#ef4444', aspect: 'health',  unit: '%',   goal_type: 'milestone',  placeholder: 'Ex: Check-up completo' },
  { id: 'home_project',    label: 'Projeto Casa',       Icon: Home,        color: '#64748b', aspect: 'home',    unit: '%',   goal_type: 'milestone',  placeholder: 'Ex: Reforma cozinha' },
  { id: 'custom',          label: 'Personalizada',      Icon: Target,      color: '#f97316', aspect: 'productivity', unit: '%', goal_type: 'milestone', placeholder: 'Nome da meta...' },
];

const fmtInput = (v) => v === '' || v == null ? '' : String(v);

export default function UniversalCreator({ open, onClose, onCreated, defaultAspect }) {
  const [kind, setKind] = useState('task');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [aspect, setAspect] = useState(defaultAspect || 'productivity');
  const [aspects, setAspects] = useState([]);
  const [date, setDate] = useState(toLocalDateStr(new Date()));
  const [time, setTime] = useState('09:00');
  const [location, setLocation] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Estado específico pra metas
  const [goalTemplate, setGoalTemplate] = useState('custom');
  const [targetValue, setTargetValue] = useState('');
  const [currentValue, setCurrentValue] = useState('');
  const [unit, setUnit] = useState('%');
  const [priority, setPriority] = useState('normal');

  const tpl = useMemo(() => GOAL_TEMPLATES.find(t => t.id === goalTemplate) || GOAL_TEMPLATES[GOAL_TEMPLATES.length-1], [goalTemplate]);

  useEffect(() => {
    if (open) listLifeAspects().then(setAspects).catch(() => {});
  }, [open]);

  useEffect(() => { if (defaultAspect) setAspect(defaultAspect); }, [defaultAspect]);

  // Quando escolhe um template de meta, aplica defaults
  useEffect(() => {
    if (kind !== 'goal') return;
    setAspect(tpl.aspect);
    setUnit(tpl.unit);
  }, [goalTemplate, kind]);

  if (!open) return null;

  const reset = () => {
    setTitle(''); setDescription(''); setLocation('');
    setTargetValue(''); setCurrentValue('');
    setError(null);
  };

  const handleSave = async () => {
    if (!title.trim()) { setError('Título é obrigatório'); return; }
    if (kind === 'goal' && tpl.goal_type !== 'milestone' && !targetValue) {
      setError('Informe o valor-alvo (ex: 5000, 75, 12)');
      return;
    }
    setSaving(true); setError(null);
    try {
      const pillarMap = { finance:'financas', career:'profissao', health:'saude', body:'corpo',
        nutrition:'nutricao', studies:'estudos', productivity:'disciplina' };
      const pillar = pillarMap[aspect] || 'disciplina';

      if (kind === 'task') {
        await createTask({ title, description, scheduled_date: date, pillar });
      } else if (kind === 'habit') {
        await createHabit({ title, pillar });
      } else if (kind === 'goal') {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Não autenticado');
        const row = {
          user_id: user.id,
          title,
          description: description || null,
          deadline: date || null,
          progress: 0,
          status: 'active',
          goal_type: tpl.goal_type,
          target_value: targetValue ? Number(targetValue) : null,
          current_value: currentValue ? Number(currentValue) : 0,
          unit,
          aspect_key: aspect,
          category: aspect,
          priority,
          metadata: { template: tpl.id, template_label: tpl.label },
        };
        const { error: gerr } = await supabase.from('goals').insert(row);
        if (gerr) throw gerr;
      } else {
        const starts = new Date(`${date}T${time}:00`);
        await createUniversalEvent({
          title, description, aspect_key: aspect,
          event_type: kind,
          starts_at: starts.toISOString(),
          location, all_day: false,
          remind_before_min: kind === 'reminder' ? 15 : null,
        });
      }
      onCreated?.();
      reset();
      onClose();
    } catch (e) {
      console.error('UniversalCreator:', e);
      setError(e?.message || 'Erro ao criar');
    } finally { setSaving(false); }
  };

  const needsTime  = ['event', 'meeting', 'reminder', 'payment'].includes(kind);
  const needsDate  = kind !== 'habit';
  const needsPlace = ['event', 'meeting'].includes(kind);
  const isGoal     = kind === 'goal';

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-[428px] max-h-[92vh] overflow-y-auto rounded-t-2xl border-t border-x p-5 pb-8 animate-in slide-in-from-bottom-8 duration-300"
        style={{ backgroundColor: 'var(--bg-color)', borderColor: 'var(--border-color)', scrollbarWidth: 'none' }}
      >
        {/* Drag handle */}
        <div className="w-10 h-1 rounded-full bg-current opacity-20 mx-auto mb-4" />

        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-sm font-bold tracking-wider">CRIAR</h2>
            <span className="text-[9px] font-mono opacity-40 tracking-widest">O QUE VOCÊ QUER REGISTRAR?</span>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center opacity-40 hover:opacity-100 transition-opacity"
            style={{ backgroundColor: 'var(--glass-bg)' }}>
            <X size={16} />
          </button>
        </div>

        {/* Tipos — grid 4x2 */}
        <div className="grid grid-cols-4 gap-1.5 mb-5">
          {KINDS.map(({ k, label, Icon, color }) => (
            <button key={k} onClick={() => setKind(k)}
              className="flex flex-col items-center gap-1.5 py-2.5 rounded-xl border transition-all active:scale-95"
              style={{
                borderColor: kind === k ? color : 'var(--border-color)',
                backgroundColor: kind === k ? `${color}12` : 'var(--glass-bg)',
                color: kind === k ? color : 'inherit',
                boxShadow: kind === k ? `0 0 12px ${color}30` : 'none',
              }}>
              <Icon size={15} />
              <span className="text-[8px] font-mono tracking-wider font-bold">{label.toUpperCase()}</span>
            </button>
          ))}
        </div>

        {/* Sub-tipos de meta */}
        {isGoal && (
          <div className="mb-4">
            <label className="text-[9px] font-mono opacity-50 tracking-wider block mb-2">TIPO DE META</label>
            <div className="grid grid-cols-3 gap-1.5">
              {GOAL_TEMPLATES.map(t => {
                const I = t.Icon;
                const sel = goalTemplate === t.id;
                return (
                  <button key={t.id} onClick={() => setGoalTemplate(t.id)}
                    className="flex flex-col items-center gap-1 py-2 rounded-lg border transition-all active:scale-95"
                    style={{
                      borderColor: sel ? t.color : 'var(--border-color)',
                      backgroundColor: sel ? `${t.color}15` : 'var(--glass-bg)',
                      color: sel ? t.color : 'inherit',
                    }}>
                    <I size={14} />
                    <span className="text-[8px] font-mono tracking-wider">{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Título */}
        <label className="text-[9px] font-mono opacity-50 tracking-wider block mb-1.5">TÍTULO</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder={isGoal ? tpl.placeholder : 'Título...'}
          className="w-full text-[12px] bg-transparent border rounded-lg px-3 py-2.5 mb-3 outline-none focus:border-current transition-all"
          style={{ borderColor: 'var(--border-color)', color: 'var(--text-main)' }} />

        {/* Valor alvo (meta não-milestone) */}
        {isGoal && tpl.goal_type !== 'milestone' && (
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="col-span-2">
              <label className="text-[9px] font-mono opacity-50 tracking-wider block mb-1.5">VALOR ALVO</label>
              <input type="number" inputMode="decimal"
                value={fmtInput(targetValue)}
                onChange={(e) => setTargetValue(e.target.value)}
                placeholder={tpl.unit === 'BRL' ? 'Ex: 8000' : 'Ex: 12'}
                className="w-full text-[14px] font-mono font-bold bg-transparent border rounded-lg px-3 py-2.5 outline-none focus:border-current"
                style={{ borderColor: 'var(--border-color)', color: tpl.color }} />
            </div>
            <div>
              <label className="text-[9px] font-mono opacity-50 tracking-wider block mb-1.5">UNIDADE</label>
              <input value={unit} onChange={(e) => setUnit(e.target.value)}
                className="w-full text-[12px] font-mono bg-transparent border rounded-lg px-2 py-2.5 outline-none text-center"
                style={{ borderColor: 'var(--border-color)' }} />
            </div>
          </div>
        )}

        {/* Valor atual (opcional) */}
        {isGoal && tpl.goal_type !== 'milestone' && (
          <div className="mb-3">
            <label className="text-[9px] font-mono opacity-50 tracking-wider block mb-1.5">JÁ TENHO HOJE (opcional)</label>
            <input type="number" inputMode="decimal"
              value={fmtInput(currentValue)}
              onChange={(e) => setCurrentValue(e.target.value)}
              placeholder="0"
              className="w-full text-[12px] font-mono bg-transparent border rounded-lg px-3 py-2 outline-none"
              style={{ borderColor: 'var(--border-color)' }} />
          </div>
        )}

        {/* Prioridade (só meta) */}
        {isGoal && (
          <div className="mb-3">
            <label className="text-[9px] font-mono opacity-50 tracking-wider block mb-1.5">PRIORIDADE</label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { k: 'low',    label: 'BAIXA',  c: '#64748b' },
                { k: 'normal', label: 'NORMAL', c: '#3b82f6' },
                { k: 'high',   label: 'ALTA',   c: '#ef4444' },
              ].map(p => (
                <button key={p.k} onClick={() => setPriority(p.k)}
                  className="py-2 rounded-lg border text-[10px] font-mono font-bold transition-all active:scale-95"
                  style={{
                    borderColor: priority === p.k ? p.c : 'var(--border-color)',
                    backgroundColor: priority === p.k ? `${p.c}15` : 'transparent',
                    color: priority === p.k ? p.c : 'inherit',
                  }}>{p.label}</button>
              ))}
            </div>
          </div>
        )}

        {/* Aspecto */}
        <label className="text-[9px] font-mono opacity-50 tracking-wider block mb-1.5">ASPECTO DA VIDA</label>
        <select value={aspect} onChange={(e) => setAspect(e.target.value)}
          className="w-full text-[11px] font-mono bg-transparent border rounded-lg px-3 py-2.5 mb-3 outline-none"
          style={{ borderColor: 'var(--border-color)', color: 'var(--text-main)' }}>
          {aspects.map(a => (
            <option key={a.key} value={a.key}>{a.label}</option>
          ))}
        </select>

        {/* Descrição */}
        <label className="text-[9px] font-mono opacity-50 tracking-wider block mb-1.5">DESCRIÇÃO</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)}
          placeholder="Detalhes (opcional)..."
          rows={2}
          className="w-full text-[11px] bg-transparent border rounded-lg px-3 py-2 mb-3 outline-none resize-none"
          style={{ borderColor: 'var(--border-color)', color: 'var(--text-main)' }} />

        {/* Data e hora */}
        <div className="flex gap-2 mb-3">
          {needsDate && (
            <div className="flex-1">
              <label className="text-[9px] font-mono opacity-50 tracking-wider block mb-1.5">
                {kind === 'goal' ? 'PRAZO' : 'DATA'}
              </label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className="w-full text-[11px] font-mono bg-transparent border rounded-lg px-3 py-2.5 outline-none"
                style={{ borderColor: 'var(--border-color)', color: 'var(--text-main)' }} />
            </div>
          )}
          {needsTime && (
            <div className="flex-1">
              <label className="text-[9px] font-mono opacity-50 tracking-wider block mb-1.5">HORA</label>
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)}
                className="w-full text-[11px] font-mono bg-transparent border rounded-lg px-3 py-2.5 outline-none"
                style={{ borderColor: 'var(--border-color)', color: 'var(--text-main)' }} />
            </div>
          )}
        </div>

        {needsPlace && (
          <input value={location} onChange={(e) => setLocation(e.target.value)}
            placeholder="Local (opcional)..."
            className="w-full text-[11px] bg-transparent border rounded-lg px-3 py-2.5 mb-3 outline-none"
            style={{ borderColor: 'var(--border-color)', color: 'var(--text-main)' }} />
        )}

        {error && (
          <p className="text-[10px] font-mono text-red-400 text-center px-2 py-2 mb-3 rounded-lg border border-red-400/30 bg-red-400/10">
            {error}
          </p>
        )}

        <button onClick={handleSave} disabled={saving}
          className="w-full py-3.5 rounded-xl font-bold text-[12px] tracking-wider transition-all disabled:opacity-30 flex items-center justify-center gap-2 active:scale-[0.98]"
          style={{ backgroundColor: 'var(--text-main)', color: 'var(--bg-color)' }}>
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          {saving ? 'CRIANDO...' : 'CRIAR'}
        </button>
      </div>
    </div>
  );
}
