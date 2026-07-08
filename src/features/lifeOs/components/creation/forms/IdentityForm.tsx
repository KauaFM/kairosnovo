// =============================================================
// ORVAX · IdentityForm — Check de Identidade diário.
// "Quem você quer se tornar?" + "Agiu como essa pessoa hoje?"
// O statement de identidade persiste em localStorage (cross-session).
// =============================================================
import React, { useState, useEffect, useMemo } from 'react';
import { Target, Check, X, Edit3, Sparkles } from 'lucide-react';
import { YearProjection } from './shared/YearProjection';

const T_STRONG = 'text-zinc-900 dark:text-zinc-50';
const T_NORMAL = 'text-zinc-700 dark:text-zinc-200';
const T_LABEL  = 'text-zinc-500 dark:text-zinc-400';
const T_MUTED  = 'text-zinc-400 dark:text-zinc-500';

const IDENTITY_KEY = 'orvax_identity_statement';

interface Props {
  onSubmit: (data: Record<string, unknown>, xp: number) => void;
}

export default function IdentityForm({ onSubmit }: Props) {
  const [identity,   setIdentity]   = useState('');
  const [editing,    setEditing]    = useState(true);
  const [coherent,   setCoherent]   = useState<boolean | null>(null);
  const [reflection, setReflection] = useState('');

  // load persisted statement
  useEffect(() => {
    try {
      const saved = localStorage.getItem(IDENTITY_KEY);
      if (saved && saved.trim()) {
        setIdentity(saved);
        setEditing(false);
      }
    } catch { /* localStorage indisponível */ }
  }, []);

  // persist on save
  const saveIdentity = () => {
    if (!identity.trim()) return;
    try { localStorage.setItem(IDENTITY_KEY, identity.trim()); } catch { /* ignore */ }
    setEditing(false);
  };

  const valid =
    identity.trim().length >= 10 &&
    coherent !== null &&
    (coherent === true || reflection.trim().length > 0);

  // XP engine
  const xp = useMemo(() => {
    if (coherent === true) return 60;
    if (coherent === false && reflection.trim().length > 0) return 30; // honestidade conta
    return 0;
  }, [coherent, reflection]);

  // Projection
  const projection = useMemo(() => {
    if (coherent === true) {
      return {
        intent: 'positive' as const,
        text: 'Você terá colapsado a distância entre quem você é e quem você queria ser. Sua identidade vira terreno sólido — não aspiração.',
      };
    }
    if (coherent === false && reflection.trim()) {
      return {
        intent: 'neutral' as const,
        text: 'A consciência diária do desvio é metade do trabalho. Em 1 ano você terá identificado e dissolvido seus padrões mais ruidosos.',
      };
    }
    return {
      intent: 'neutral' as const,
      text: 'Sua identidade ainda é ficção até você executar como ela. Cada check honesto encurta a distância entre presente e futuro.',
    };
  }, [coherent, reflection]);

  const submit = () => {
    if (!valid) return;
    onSubmit(
      {
        identity_statement: identity.trim(),
        was_coherent:       coherent,
        reflection:         reflection.trim() || null,
      },
      xp,
    );
  };

  return (
    <div className="space-y-6">
      {/* 1 · Identity statement (persisted) */}
      <div className={[
        'rounded-2xl border p-4',
        'bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/30 dark:to-zinc-900',
        'border-emerald-200 dark:border-emerald-900/40',
      ].join(' ')}>
        <div className="flex items-center gap-2 mb-2">
          <Target size={13} className="text-emerald-600 dark:text-emerald-400" />
          <p className={`text-[10px] font-mono tracking-widest uppercase text-emerald-700 dark:text-emerald-300 font-semibold`}>
            Quem você quer se tornar?
          </p>
          {!editing && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className={`ml-auto flex items-center gap-1 text-[10px] font-mono ${T_LABEL}
                hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors`}
              aria-label="Editar identidade"
            >
              <Edit3 size={11} /> editar
            </button>
          )}
        </div>

        {editing ? (
          <>
            <textarea
              value={identity}
              onChange={(e) => setIdentity(e.target.value.slice(0, 280))}
              rows={3}
              placeholder="Disciplinado, em paz, financeiramente livre, presente com a família, em forma e sempre estudando..."
              className={[
                'w-full bg-white/60 dark:bg-black/20 outline-none p-3 rounded-xl resize-none',
                'border border-emerald-200 dark:border-emerald-900/50',
                'focus:border-emerald-500 dark:focus:border-emerald-500',
                'text-[13px] leading-relaxed',
                T_STRONG,
                'placeholder:text-zinc-400 dark:placeholder:text-zinc-500 placeholder:font-normal',
                'transition-colors',
              ].join(' ')}
            />
            <div className="mt-2 flex items-center justify-between">
              <span className={`text-[9px] font-mono ${T_MUTED}`}>
                {identity.length}/280 · salvo no dispositivo
              </span>
              <button
                type="button"
                onClick={saveIdentity}
                disabled={identity.trim().length < 10}
                className={[
                  'h-7 px-3 rounded-lg text-[11px] font-bold transition-all',
                  identity.trim().length >= 10
                    ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                    : `bg-zinc-200 dark:bg-zinc-800 ${T_MUTED} cursor-not-allowed`,
                ].join(' ')}
              >
                <Check size={11} className="inline -mt-0.5 mr-0.5" /> Salvar
              </button>
            </div>
          </>
        ) : (
          <p className={`text-[14px] leading-relaxed font-medium ${T_STRONG} italic`}>
            "{identity}"
          </p>
        )}
      </div>

      {/* 2 · Foi coerente hoje? */}
      <div>
        <label className={`block text-[10px] font-mono tracking-widest uppercase ${T_LABEL} mb-3`}>
          Hoje você agiu como essa pessoa?
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setCoherent(true)}
            className={[
              'h-20 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all',
              coherent === true
                ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                : `bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 ${T_NORMAL}
                   hover:border-emerald-500/50 hover:-translate-y-0.5`,
            ].join(' ')}
          >
            <Check size={20} strokeWidth={2.4} />
            <span className="text-[11px] font-bold tracking-wider uppercase">Sim, fui</span>
          </button>
          <button
            type="button"
            onClick={() => setCoherent(false)}
            className={[
              'h-20 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all',
              coherent === false
                ? 'bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-500/30'
                : `bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 ${T_NORMAL}
                   hover:border-amber-500/50 hover:-translate-y-0.5`,
            ].join(' ')}
          >
            <X size={20} strokeWidth={2.4} />
            <span className="text-[11px] font-bold tracking-wider uppercase">Não fui</span>
          </button>
        </div>
      </div>

      {/* 3 · Reflexão (só se 'não') */}
      {coherent === false && (
        <div>
          <label className={`block text-[10px] font-mono tracking-widest uppercase ${T_LABEL} mb-2`}>
            Onde não foi coerente?
          </label>
          <textarea
            value={reflection}
            onChange={(e) => setReflection(e.target.value.slice(0, 400))}
            rows={3}
            autoFocus
            placeholder="Cedi à preguiça depois do almoço · perdi 2h em redes · explodi em discussão à toa..."
            className={[
              'w-full bg-transparent border outline-none p-3 rounded-2xl resize-none',
              'border-zinc-200 dark:border-zinc-800',
              'focus:border-amber-500 dark:focus:border-amber-500',
              'text-[13px] leading-relaxed',
              T_STRONG,
              'placeholder:text-zinc-400 dark:placeholder:text-zinc-500',
              'transition-colors',
            ].join(' ')}
          />
          <p className={`mt-1 text-[9px] font-mono ${T_MUTED}`}>
            {reflection.length}/400 · honestidade vale +30 XP
          </p>
        </div>
      )}

      {/* 4 · Coerente, mas opcional reflection extra */}
      {coherent === true && (
        <div className={[
          'rounded-2xl border p-3 flex items-start gap-3',
          'bg-emerald-50 dark:bg-emerald-950/20',
          'border-emerald-200 dark:border-emerald-900/40',
        ].join(' ')}>
          <Sparkles size={13} className="text-emerald-500 mt-0.5 shrink-0" />
          <p className={`text-[11.5px] leading-relaxed text-emerald-800 dark:text-emerald-200`}>
            Sólido. Cada dia coerente vira tijolo. <strong>Streak de coerência</strong> é
            o ativo mais raro do sistema.
          </p>
        </div>
      )}

      <YearProjection text={projection.text} intent={projection.intent} />

      <SubmitBar
        disabled={!valid}
        xpPreview={xp}
        onSubmit={submit}
        bonus={
          coherent === true ? 'Identidade ativa · +60 XP' :
          coherent === false && reflection.trim() ? 'Honestidade contabilizada · +30 XP' :
          undefined
        }
      />
    </div>
  );
}

function SubmitBar({
  disabled, xpPreview, onSubmit, bonus,
}: {
  disabled: boolean;
  xpPreview: number;
  onSubmit: () => void;
  bonus?: string;
}) {
  return (
    <div className="pt-2 sticky bottom-0 -mx-5 px-5 py-3
      bg-gradient-to-t from-white via-white to-white/0
      dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-900/0">
      <button
        type="button"
        disabled={disabled}
        onClick={onSubmit}
        className={[
          'w-full h-12 rounded-2xl flex items-center justify-center gap-2',
          'text-[13px] font-bold tracking-wide uppercase',
          'transition-all duration-200',
          disabled
            ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed'
            : 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 hover:bg-emerald-600 active:scale-[0.98]',
        ].join(' ')}
      >
        <Check size={15} strokeWidth={2.6} />
        Registrar Check
        <span className={[
          'ml-2 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold tabular-nums',
          disabled ? 'bg-zinc-100 dark:bg-zinc-700/50 text-zinc-400' : 'bg-white/20 text-white',
        ].join(' ')}>
          +{xpPreview} XP
        </span>
      </button>
      {bonus && !disabled && (
        <p className="mt-2 text-center text-[10px] font-mono tracking-widest uppercase text-emerald-500">
          ✦ {bonus}
        </p>
      )}
    </div>
  );
}
