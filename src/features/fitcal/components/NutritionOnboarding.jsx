// ============================================================
// ORVAX FitCal — Onboarding nutricional (VITALIS · N1)
// 3 passos → gera as METAS REAIS (Mifflin-St Jeor + guard-rails).
// Antes a meta era digitada na mão e nunca havia plano no banco.
// ============================================================
import React, { useState, useMemo } from 'react';
import {
  ChevronLeft, ChevronRight, Loader2, Check, Target, Activity,
  Utensils, ShieldCheck, Flame, X,
} from 'lucide-react';
import {
  saveNutritionSetup, DIET_TYPES, COMMON_ALLERGIES, COMMON_DISLIKES,
} from '../services/nutritionProfile';
import { generatePlan, ACTIVITY_LEVELS, GOALS } from '../utils/tdeeCalc';

const ACCENT = '#22c55e';

const chip = (on) =>
  `px-3 py-2 rounded-xl border text-[10px] font-mono font-bold uppercase tracking-wide transition-all active:scale-95 ${
    on ? 'bg-neutral-900 dark:bg-white text-white dark:text-black border-transparent'
       : 'bg-transparent border-neutral-200 dark:border-white/10 text-neutral-500 dark:text-white/40'}`;

const field = 'w-full rounded-xl px-3 py-3 text-[13px] font-mono outline-none border bg-transparent';

export default function NutritionOnboarding({ initial = {}, onDone, onClose }) {
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const [f, setF] = useState({
    weight_kg: initial.weightKg || '',
    height_cm: initial.profile?.height_cm || '',
    birth_date: initial.profile?.birth_date || '',
    gender: initial.profile?.gender || 'male',
    goal: initial.profile?.goal || 'lose_weight',
    activity_level: initial.profile?.activity_level || 'moderate',
    diet_type: initial.preferences?.diet_type || 'onivoro',
    allergies: initial.preferences?.allergies || [],
    dislikes: initial.preferences?.dislikes || [],
    meals_per_day: initial.preferences?.meals_per_day ?? 4,
    cooks_at_home: initial.preferences?.cooks_at_home || 'as_vezes',
    eats_out_freq: initial.preferences?.eats_out_freq || 'as_vezes',
    budget_level: initial.preferences?.budget_level || 'medio',
  });
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const toggle = (k, v) => setF((p) => ({
    ...p, [k]: p[k].includes(v) ? p[k].filter((x) => x !== v) : [...p[k], v],
  }));

  const step0Ok = f.weight_kg > 20 && f.height_cm > 100 && !!f.birth_date;

  // Prévia do plano (mostra o resultado antes de salvar)
  const preview = useMemo(() => {
    if (!step0Ok) return null;
    try {
      return generatePlan({
        weight_kg: Number(f.weight_kg), height_cm: Number(f.height_cm),
        birth_date: f.birth_date, gender: f.gender, goal: f.goal,
        activity_level: f.activity_level,
      });
    } catch { return null; }
  }, [f.weight_kg, f.height_cm, f.birth_date, f.gender, f.goal, f.activity_level, step0Ok]);

  const finish = async () => {
    setBusy(true); setErr('');
    try {
      const plan = await saveNutritionSetup({
        ...f,
        weight_kg: Number(f.weight_kg),
        height_cm: Number(f.height_cm),
      });
      onDone?.(plan);
    } catch (e) {
      setErr(e?.message || 'Não foi possível salvar. Tente de novo.');
      setBusy(false);
    }
  };

  const Label = ({ children }) => (
    <p className="text-[9px] font-mono font-bold uppercase tracking-widest opacity-40 mb-2">{children}</p>
  );

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto"
      style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-main)' }}>
      <div className="w-full max-w-[428px] mx-auto px-6 pb-28"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1.25rem)' }}>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ border: `1px solid ${ACCENT}44`, backgroundColor: `${ACCENT}0D` }}>
              <Target size={16} style={{ color: ACCENT }} />
            </div>
            <div>
              <h1 className="text-[13px] font-outfit font-black uppercase tracking-[0.15em]">Suas metas</h1>
              <p className="text-[8px] font-mono opacity-30 uppercase tracking-widest mt-0.5">Passo {step + 1} de 3</p>
            </div>
          </div>
          {onClose && (
            <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center border"
              style={{ borderColor: 'var(--border-color)' }} aria-label="Fechar"><X size={15} /></button>
          )}
        </div>

        <div className="flex gap-1.5 mb-7">
          {[0, 1, 2].map((n) => (
            <div key={n} className="h-[3px] flex-1 rounded-full transition-all"
              style={{ backgroundColor: n <= step ? ACCENT : 'var(--border-color)' }} />
          ))}
        </div>

        {/* ── Passo 1: corpo ── */}
        {step === 0 && (
          <div className="space-y-5 animate-in fade-in duration-300">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Peso (kg)</Label>
                <input type="number" inputMode="decimal" value={f.weight_kg}
                  onChange={(e) => set('weight_kg', e.target.value)} placeholder="70"
                  className={field} style={{ borderColor: 'var(--border-color)', color: 'var(--text-main)' }} />
              </div>
              <div>
                <Label>Altura (cm)</Label>
                <input type="number" inputMode="numeric" value={f.height_cm}
                  onChange={(e) => set('height_cm', e.target.value)} placeholder="175"
                  className={field} style={{ borderColor: 'var(--border-color)', color: 'var(--text-main)' }} />
              </div>
            </div>
            <div>
              <Label>Data de nascimento</Label>
              <input type="date" value={f.birth_date} onChange={(e) => set('birth_date', e.target.value)}
                className={field} style={{ borderColor: 'var(--border-color)', color: 'var(--text-main)' }} />
            </div>
            <div>
              <Label>Sexo biológico (para o cálculo metabólico)</Label>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => set('gender', 'male')} className={chip(f.gender === 'male')}>Masculino</button>
                <button onClick={() => set('gender', 'female')} className={chip(f.gender === 'female')}>Feminino</button>
              </div>
            </div>
          </div>
        )}

        {/* ── Passo 2: objetivo + atividade ── */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div>
              <Label>Seu objetivo</Label>
              <div className="space-y-2">
                {GOALS.map((g) => (
                  <button key={g.value} onClick={() => set('goal', g.value)}
                    className="w-full flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-all active:scale-[0.99]"
                    style={{
                      borderColor: f.goal === g.value ? ACCENT : 'var(--border-color)',
                      backgroundColor: f.goal === g.value ? `${ACCENT}0D` : 'transparent',
                    }}>
                    <Flame size={15} style={{ color: f.goal === g.value ? ACCENT : undefined }}
                      className={f.goal === g.value ? '' : 'opacity-30'} />
                    <div className="flex-1">
                      <p className="text-[12px] font-bold">{g.label}</p>
                      <p className="text-[9px] font-mono opacity-40 mt-0.5">{g.desc}</p>
                    </div>
                    {f.goal === g.value && <Check size={14} style={{ color: ACCENT }} />}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>Nível de atividade</Label>
              <div className="space-y-2">
                {ACTIVITY_LEVELS.map((a) => (
                  <button key={a.value} onClick={() => set('activity_level', a.value)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all active:scale-[0.99]"
                    style={{
                      borderColor: f.activity_level === a.value ? ACCENT : 'var(--border-color)',
                      backgroundColor: f.activity_level === a.value ? `${ACCENT}0D` : 'transparent',
                    }}>
                    <Activity size={14} className={f.activity_level === a.value ? '' : 'opacity-30'}
                      style={{ color: f.activity_level === a.value ? ACCENT : undefined }} />
                    <div className="flex-1">
                      <p className="text-[11px] font-bold">{a.label}</p>
                      <p className="text-[9px] font-mono opacity-40">{a.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Passo 3: preferências ── */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div>
              <Label>Padrão alimentar</Label>
              <div className="flex flex-wrap gap-2">
                {DIET_TYPES.map((d) => (
                  <button key={d.value} onClick={() => set('diet_type', d.value)} className={chip(f.diet_type === d.value)}>
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>Alergias / intolerâncias</Label>
              <div className="flex flex-wrap gap-2">
                {COMMON_ALLERGIES.map((a) => (
                  <button key={a} onClick={() => toggle('allergies', a)} className={chip(f.allergies.includes(a))}>{a}</button>
                ))}
              </div>
            </div>
            <div>
              <Label>Não gosto de comer</Label>
              <div className="flex flex-wrap gap-2">
                {COMMON_DISLIKES.map((d) => (
                  <button key={d} onClick={() => toggle('dislikes', d)} className={chip(f.dislikes.includes(d))}>{d}</button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Refeições/dia</Label>
                <div className="flex gap-2">
                  {[3, 4, 5, 6].map((n) => (
                    <button key={n} onClick={() => set('meals_per_day', n)} className={chip(f.meals_per_day === n)}>{n}</button>
                  ))}
                </div>
              </div>
              <div>
                <Label>Come fora</Label>
                <div className="flex gap-2">
                  {[['raramente', 'Raro'], ['as_vezes', 'Às vezes'], ['diario', 'Diário']].map(([v, l]) => (
                    <button key={v} onClick={() => set('eats_out_freq', v)} className={chip(f.eats_out_freq === v)}>{l}</button>
                  ))}
                </div>
              </div>
            </div>

            {/* Prévia das metas */}
            {preview && (
              <div className="rounded-2xl border p-4" style={{ borderColor: `${ACCENT}44`, backgroundColor: `${ACCENT}0A` }}>
                <div className="flex items-center gap-2 mb-3">
                  <Utensils size={13} style={{ color: ACCENT }} />
                  <p className="text-[9px] font-mono font-bold uppercase tracking-widest" style={{ color: ACCENT }}>
                    Suas metas diárias
                  </p>
                </div>
                <div className="flex items-baseline gap-1.5 mb-3">
                  <span className="text-[30px] font-outfit font-black tabular-nums">{preview.daily_calories}</span>
                  <span className="text-[11px] font-mono opacity-40">kcal/dia</span>
                </div>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {[['Proteína', preview.protein_g], ['Carbo', preview.carbs_g], ['Gordura', preview.fat_g]].map(([l, v]) => (
                    <div key={l} className="rounded-xl border p-2.5 text-center" style={{ borderColor: 'var(--border-color)' }}>
                      <p className="text-[15px] font-outfit font-black tabular-nums">{v}g</p>
                      <p className="text-[8px] font-mono opacity-40 uppercase tracking-wider mt-0.5">{l}</p>
                    </div>
                  ))}
                </div>
                <p className="text-[8px] font-mono opacity-30 leading-relaxed">
                  Metabolismo basal {preview.bmr} · gasto estimado {preview.tdee} kcal · água {preview.water_ml} ml
                </p>
                {preview.safety_floor && (
                  <div className="flex items-start gap-2 mt-3 pt-3 border-t" style={{ borderColor: 'var(--border-color)' }}>
                    <ShieldCheck size={13} className="shrink-0 mt-0.5" style={{ color: ACCENT }} />
                    <p className="text-[9px] font-mono opacity-60 leading-relaxed">
                      Ajustamos sua meta para o mínimo seguro. Comer abaixo disso prejudica mais do que ajuda.
                    </p>
                  </div>
                )}
              </div>
            )}

            <p className="text-[8px] font-mono opacity-25 leading-relaxed text-center px-2">
              Estimativas educacionais baseadas na fórmula Mifflin-St Jeor. Não substituem
              acompanhamento de nutricionista ou médico.
            </p>
          </div>
        )}

        {err && (
          <div className="mt-4 p-3 rounded-xl border text-[10px] font-mono text-center"
            style={{ borderColor: '#ef444455', backgroundColor: '#ef44440D', color: '#ef4444' }}>{err}</div>
        )}

        {/* Navegação */}
        <div className="flex gap-2 mt-8">
          {step > 0 && (
            <button onClick={() => setStep((s) => s - 1)}
              className="px-5 py-3.5 rounded-2xl border font-mono text-[11px] font-bold uppercase tracking-widest"
              style={{ borderColor: 'var(--border-color)' }}>
              <ChevronLeft size={14} />
            </button>
          )}
          {step < 2 ? (
            <button onClick={() => setStep((s) => s + 1)} disabled={step === 0 && !step0Ok}
              className="flex-1 py-3.5 rounded-2xl font-outfit font-black text-[11px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 disabled:opacity-30 transition-all active:scale-[0.98]"
              style={{ backgroundColor: ACCENT, color: '#000' }}>
              Continuar <ChevronRight size={14} />
            </button>
          ) : (
            <button onClick={finish} disabled={busy || !preview}
              className="flex-1 py-3.5 rounded-2xl font-outfit font-black text-[11px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 disabled:opacity-30 transition-all active:scale-[0.98]"
              style={{ backgroundColor: ACCENT, color: '#000' }}>
              {busy ? <Loader2 size={15} className="animate-spin" /> : <>Ativar metas <Check size={14} strokeWidth={3} /></>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
