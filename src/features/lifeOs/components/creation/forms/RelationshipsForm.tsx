// =============================================================
// ORVAX · RelationshipsForm — Relacionamentos
// Interagiu · tempo família/amigos · qualidade · presente vs distraído
// =============================================================
import React, { useState, useMemo } from 'react';
import { Users, Heart, Sparkles, Smartphone } from 'lucide-react';
import { YearProjection } from './shared/YearProjection';
import { SubmitBar } from './shared/SubmitBar';
import { Slider } from './shared/Slider';

const T_STRONG = 'text-zinc-900 dark:text-zinc-50';
const T_NORMAL = 'text-zinc-700 dark:text-zinc-200';
const T_LABEL  = 'text-zinc-500 dark:text-zinc-400';
const T_MUTED  = 'text-zinc-400 dark:text-zinc-500';

const TIME_PILLS: { value: number; label: string }[] = [
  { value: 0,   label: '0' },
  { value: 15,  label: '15m' },
  { value: 30,  label: '30m' },
  { value: 60,  label: '1h' },
  { value: 120, label: '2h+' },
];

interface Props {
  onSubmit: (data: Record<string, unknown>, xp: number) => void;
}

export default function RelationshipsForm({ onSubmit }: Props) {
  const [meaningful, setMeaningful] = useState<boolean | null>(null);
  const [familyMin,  setFamilyMin]  = useState<number | null>(null);
  const [friendsMin, setFriendsMin] = useState<number | null>(null);
  const [quality,    setQuality]    = useState(7);
  const [present,    setPresent]    = useState<'presente' | 'distraido' | null>(null);

  const valid = meaningful !== null && present !== null;
  const totalSocialMin = (familyMin || 0) + (friendsMin || 0);

  const xp = useMemo(() => {
    let total = 15;
    if (meaningful)             total += 20;
    if (totalSocialMin >= 60)   total += 15;
    if (quality >= 8)           total += 15;
    if (present === 'presente') total += 30;
    return total;
  }, [meaningful, totalSocialMin, quality, present]);

  const projection = useMemo(() => {
    if (present === 'presente' && quality >= 7 && meaningful) {
      return {
        intent: 'positive' as const,
        text: 'Vínculos profundos compostos. Em 1 ano, as pessoas certas ao seu redor se aprofundam — e a solidão deixa de ser tema.',
      };
    }
    if (present === 'distraido') {
      return {
        intent: 'warning' as const,
        text: 'Tempo presente fisicamente, ausente mentalmente vira distância afetiva. Em 1 ano você pode estar cercado e ainda assim sozinho.',
      };
    }
    return {
      intent: 'neutral' as const,
      text: 'Cada interação consciente registra um padrão. A consciência diária do "como" você está com as pessoas é metade do trabalho relacional.',
    };
  }, [present, quality, meaningful]);

  const submit = () => {
    if (!valid) return;
    onSubmit(
      {
        meaningful_interaction: meaningful,
        family_min:  familyMin ?? 0,
        friends_min: friendsMin ?? 0,
        quality,
        attention_mode: present,
      },
      xp,
    );
  };

  return (
    <div className="space-y-5">
      <Section icon={<Heart size={13} className="text-emerald-500" />} label="Interagiu com alguém importante hoje?">
        <YesNoRow value={meaningful} onChange={setMeaningful} />
      </Section>

      <Section icon={<Users size={13} className="text-emerald-500" />} label="Tempo com família">
        <TimePicker value={familyMin} onChange={setFamilyMin} />
      </Section>

      <Section icon={<Users size={13} className="text-emerald-500" />} label="Tempo com amigos">
        <TimePicker value={friendsMin} onChange={setFriendsMin} />
      </Section>

      <Section icon={<Sparkles size={13} className="text-emerald-500" />} label="Qualidade da interação">
        <div className="flex items-center justify-between mb-1">
          <span className={`text-[10px] font-mono tracking-wider ${T_MUTED}`}>0 · vazio</span>
          <span className={`text-[18px] font-mono font-bold tabular-nums ${T_STRONG}`}>
            {quality}<span className={T_MUTED}>/10</span>
          </span>
          <span className={`text-[10px] font-mono tracking-wider ${quality >= 8 ? 'text-emerald-500 font-bold' : T_MUTED}`}>
            10 · profundo
          </span>
        </div>
        <Slider value={quality} onChange={setQuality} min={0} max={10} />
      </Section>

      <Section icon={<Smartphone size={13} className="text-emerald-500" />} label="Foi presente ou distraído?">
        <div className="grid grid-cols-2 gap-2">
          <ChoiceCard
            active={present === 'presente'}
            onClick={() => setPresent('presente')}
            label="Presente"
            sub="Sem celular · escutando"
            tone="emerald"
          />
          <ChoiceCard
            active={present === 'distraido'}
            onClick={() => setPresent('distraido')}
            label="Distraído"
            sub="Mente em outra · half-attention"
            tone="amber"
          />
        </div>
      </Section>

      <YearProjection text={projection.text} intent={projection.intent} />

      <SubmitBar
        disabled={!valid}
        xpPreview={xp}
        onSubmit={submit}
        bonus={
          present === 'presente' && quality >= 8
            ? 'Atenção total · +30 bônus presença'
            : undefined
        }
      />
    </div>
  );
}

// helpers
function Section({
  icon, label, children,
}: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={`flex items-center gap-1.5 text-[10px] font-mono tracking-widest uppercase ${T_LABEL} mb-2`}>
        {icon}{label}
      </label>
      {children}
    </div>
  );
}

function YesNoRow({
  value, onChange,
}: { value: boolean | null; onChange: (v: boolean) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <button
        type="button"
        onClick={() => onChange(false)}
        className={[
          'h-11 rounded-xl border text-[12px] font-bold tracking-wide transition-all',
          value === false
            ? 'bg-zinc-200 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200'
            : `bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 ${T_NORMAL} hover:border-emerald-500/40`,
        ].join(' ')}
      >Não</button>
      <button
        type="button"
        onClick={() => onChange(true)}
        className={[
          'h-11 rounded-xl border text-[12px] font-bold tracking-wide transition-all',
          value === true
            ? 'bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/30'
            : `bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 ${T_NORMAL} hover:border-emerald-500/40`,
        ].join(' ')}
      >Sim</button>
    </div>
  );
}

function TimePicker({
  value, onChange,
}: { value: number | null; onChange: (v: number) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {TIME_PILLS.map((t) => {
        const active = value === t.value;
        return (
          <button
            key={t.value}
            type="button"
            onClick={() => onChange(t.value)}
            className={[
              'h-9 px-3.5 rounded-full text-[12px] font-semibold tabular-nums transition-all',
              active
                ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/30'
                : `bg-zinc-100 dark:bg-zinc-800 ${T_NORMAL} hover:bg-zinc-200 dark:hover:bg-zinc-700`,
            ].join(' ')}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

function ChoiceCard({
  active, onClick, label, sub, tone,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  sub: string;
  tone: 'emerald' | 'amber';
}) {
  const activeCls = tone === 'emerald'
    ? 'bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/30'
    : 'bg-amber-500 border-amber-500 text-white shadow-md shadow-amber-500/30';
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'h-[68px] px-3 rounded-2xl border text-left transition-all',
        active
          ? activeCls
          : `bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 ${T_NORMAL} hover:border-${tone}-500/40 hover:-translate-y-0.5`,
      ].join(' ')}
    >
      <p className="text-[12px] font-bold leading-tight">{label}</p>
      <p className={[
        'text-[10px] mt-0.5 leading-snug',
        active ? 'opacity-90' : T_MUTED,
      ].join(' ')}>{sub}</p>
    </button>
  );
}
