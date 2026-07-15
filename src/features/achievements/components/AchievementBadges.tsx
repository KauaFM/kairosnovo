// =============================================================
// ORVAX · AchievementBadges — conquistas REAIS (tabela achievements).
//
// Antes esses badges eram buscados (getAllAchievements) e nunca exibidos.
// Aqui viram uma coleção agrupada por categoria, com estado
// desbloqueado/bloqueado, XP de recompensa e detalhe em bottom-sheet.
//
// Usa as CSS vars do app (--bg-color/--text-main/--border-color/--glass-bg)
// → renderiza certo nos dois temas (não depende do `dark:` do Tailwind).
// =============================================================
import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLang } from '../../../i18n/LanguageContext';
import { Lock, Check, Trophy, X, Sparkles } from 'lucide-react';

export interface AchievementItem {
  id: string;
  title: string;
  description: string;
  icon: string;            // emoji
  category: string;        // geral | streak | xp | focus | financial
  xp_reward: number;
  unlocked: boolean;
  unlocked_at: string | null;
}

interface Props {
  achievements: AchievementItem[];
}

const ACCENT = '#10B981';

const CATEGORY_META: Record<string, { label: string; order: number }> = {
  geral:     { label: 'Geral',       order: 1 },
  streak:    { label: 'Sequência',   order: 2 },
  xp:        { label: 'Experiência', order: 3 },
  focus:     { label: 'Foco',        order: 4 },
  financial: { label: 'Financeiro',  order: 5 },
};

function fmtDate(iso: string | null): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return ''; }
}

// ─── Tile individual ────────────────────────────────────────────
function BadgeTile({ a, index, onSelect }: { a: AchievementItem; index: number; onSelect: (a: AchievementItem) => void }) {
  return (
    <motion.button
      type="button"
      onClick={() => onSelect(a)}
      initial={{ opacity: 0, y: 10, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.03, duration: 0.35, ease: 'easeOut' }}
      whileTap={{ scale: 0.94 }}
      className="relative flex flex-col items-center justify-center gap-1.5 p-3 min-h-[116px] rounded-2xl border overflow-hidden transition-colors"
      style={{
        borderColor: a.unlocked ? `${ACCENT}55` : 'var(--border-color)',
        borderStyle: a.unlocked ? 'solid' : 'dashed',
        background: a.unlocked ? `linear-gradient(160deg, ${ACCENT}16, var(--glass-bg) 72%)` : 'var(--glass-bg)',
        boxShadow: a.unlocked ? `0 0 18px ${ACCENT}22` : 'none',
      }}
      aria-label={a.unlocked ? `Conquista: ${a.title}` : `Conquista bloqueada: ${a.title}`}
    >
      {/* Shine sutil nos desbloqueados */}
      {a.unlocked && (
        <motion.span
          className="absolute inset-0 pointer-events-none"
          style={{ background: `linear-gradient(120deg, transparent 40%, ${ACCENT}1f 50%, transparent 60%)` }}
          animate={{ x: ['-120%', '120%'] }}
          transition={{ duration: 2.6, repeat: Infinity, repeatDelay: 3.5, ease: 'easeInOut' }}
        />
      )}

      {/* Selo de conquistado · canto */}
      {a.unlocked && (
        <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center" style={{ backgroundColor: ACCENT }}>
          <Check size={9} strokeWidth={4} className="text-white" />
        </span>
      )}

      {/* Emoji */}
      <span
        className="text-[28px] leading-none"
        style={a.unlocked ? undefined : { filter: 'grayscale(1)', opacity: 0.3 }}
      >
        {a.icon}
      </span>

      {/* Título */}
      <span
        className="text-[8.5px] font-mono font-bold uppercase tracking-wider text-center leading-tight line-clamp-2"
        style={{ color: 'var(--text-main)', opacity: a.unlocked ? 0.85 : 0.35 }}
      >
        {a.title}
      </span>

      {/* Status pill */}
      {a.unlocked ? (
        <span className="text-[7px] font-mono font-bold uppercase tracking-wider"
          style={{ color: ACCENT }}>
          {a.xp_reward > 0 ? `+${a.xp_reward} XP` : t('achievements.unlocked')}
        </span>
      ) : (
        <span className="flex items-center gap-1 text-[7px] font-mono uppercase tracking-wider opacity-25"
          style={{ color: 'var(--text-main)' }}>
          <Lock size={8} strokeWidth={2.5} />
          {a.xp_reward > 0 ? `${a.xp_reward} XP` : t('achievements.locked')}
        </span>
      )}
    </motion.button>
  );
}

// ─── Componente principal ───────────────────────────────────────
export function AchievementBadges({ achievements }: Props) {
  const { t } = useLang();
  const [selected, setSelected] = useState<AchievementItem | null>(null);

  const groups = useMemo(() => {
    const byCat: Record<string, AchievementItem[]> = {};
    for (const a of achievements) {
      const key = CATEGORY_META[a.category] ? a.category : 'geral';
      (byCat[key] ||= []).push(a);
    }
    return Object.entries(byCat)
      .sort((x, y) => (CATEGORY_META[x[0]]?.order ?? 99) - (CATEGORY_META[y[0]]?.order ?? 99));
  }, [achievements]);

  if (!achievements.length) {
    return (
      <div className="text-center py-10 opacity-40">
        <Trophy size={22} className="mx-auto mb-3 opacity-40" />
        <p className="text-[10px] font-mono tracking-widest uppercase">{t('achievements.empty')}</p>
        <p className="text-[9px] font-mono opacity-60 mt-1">{t('achievements.emptySub')}</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-5">
        {groups.map(([cat, items]) => {
          const done = items.filter(i => i.unlocked).length;
          return (
            <div key={cat}>
              <div className="flex items-center justify-between mb-2.5 px-0.5">
                <span className="text-[9px] font-mono font-bold tracking-[0.28em] uppercase opacity-45">
                  {t('achievements.cats.' + cat)}
                </span>
                <span className="text-[8px] font-mono tabular-nums opacity-30">{done}/{items.length}</span>
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                {items.map((a, i) => (
                  <BadgeTile key={a.id} a={a} index={i} onSelect={setSelected} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom-sheet de detalhe */}
      <AnimatePresence>
        {selected && (
          <motion.div
            className="fixed inset-0 z-[90] flex items-end justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelected(null)}
          >
            <div className="absolute inset-0" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
            <motion.div
              className="relative w-full max-w-[428px] rounded-t-[28px] border-t border-x p-6 pb-10"
              style={{ backgroundColor: 'var(--bg-color)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
              initial={{ y: 60 }}
              animate={{ y: 0 }}
              exit={{ y: 80 }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-10 h-1 rounded-full mx-auto mb-5 opacity-20" style={{ backgroundColor: 'var(--text-main)' }} />
              <button onClick={() => setSelected(null)} className="absolute top-5 right-5 opacity-40 hover:opacity-100 transition-opacity">
                <X size={18} />
              </button>

              <div className="flex flex-col items-center text-center">
                <div
                  className="w-20 h-20 rounded-3xl flex items-center justify-center mb-4 border"
                  style={{
                    borderColor: selected.unlocked ? `${ACCENT}55` : 'var(--border-color)',
                    backgroundColor: 'var(--glass-bg)',
                    boxShadow: selected.unlocked ? `0 0 30px ${ACCENT}30` : 'none',
                  }}
                >
                  <span className="text-[40px] leading-none"
                    style={selected.unlocked ? undefined : { filter: 'grayscale(1)', opacity: 0.4 }}>
                    {selected.icon}
                  </span>
                </div>

                <h3 className="text-[16px] font-outfit font-black uppercase tracking-wide">{selected.title}</h3>
                <p className="text-[11px] font-mono opacity-50 mt-2 leading-relaxed max-w-[280px]">{selected.description}</p>

                <div className="flex items-center gap-3 mt-5">
                  {selected.xp_reward > 0 && (
                    <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[9px] font-mono font-bold uppercase tracking-wider"
                      style={{ borderColor: `${ACCENT}40`, color: ACCENT }}>
                      <Sparkles size={11} /> +{selected.xp_reward} XP
                    </span>
                  )}
                  <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[9px] font-mono font-bold uppercase tracking-wider"
                    style={selected.unlocked
                      ? { borderColor: `${ACCENT}40`, color: ACCENT }
                      : { borderColor: 'var(--border-color)', opacity: 0.5 }}>
                    {selected.unlocked ? <><Check size={11} strokeWidth={3} /> Desbloqueada</> : <><Lock size={11} /> Bloqueada</>}
                  </span>
                </div>

                {selected.unlocked && selected.unlocked_at && (
                  <p className="text-[8px] font-mono uppercase tracking-[0.2em] opacity-30 mt-4">
                    conquistada em {fmtDate(selected.unlocked_at)}
                  </p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default AchievementBadges;
