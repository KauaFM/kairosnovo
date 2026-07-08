// =============================================================
// ORVAX · AchievementsAutoMount — wire-up zero-config.
//
// Plug-and-play: dropa <AchievementsAutoMount /> em qualquer canto
// do App e o sistema todo passa a funcionar automaticamente:
//
//   1. Busca XP real via getDashboard() (RPC do Supabase)
//   2. Sincroniza em tempo real (subscribeToXpLog)
//   3. Quando o user cruza um threshold, mostra EvolutionCardOverlay
//   4. Após o "Guardar carta", oferece acesso à coleção (AchievementsPage)
//
// Não modifica nenhum dos componentes existentes do app.
// =============================================================
import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Award, ChevronRight, X } from 'lucide-react';
import { useRankUnlock } from '../hooks/useRankUnlock';
import { EvolutionCardOverlay } from './EvolutionCardOverlay';
import { AchievementsPage } from './AchievementsPage';

// Imports do app real · seguros pq são services públicos já usados em Dossier
// eslint-disable-next-line @typescript-eslint/no-var-requires
type Dashboard = { xp_total?: number };
type DbModule = {
  getDashboard:  () => Promise<Dashboard | null>;
  getProfile:    () => Promise<{ xp?: number } | null>;
};
type RealtimeModule = {
  useRealtimeSync: () => {
    subscribeToXpLog?: (cb: () => void) => (() => void) | void;
  };
};

// Resolução estática — esses caminhos relativos são estáveis.
// Se algum dia mudarem, ajustar aqui é a única manutenção.
import * as DbModuleResolved from '../../../services/db';
import * as RealtimeResolved from '../../../hooks/useRealtimeSync';

const Db = DbModuleResolved as unknown as DbModule;
const Realtime = RealtimeResolved as unknown as RealtimeModule;

/**
 * Hook interno · faz o fetch do XP real e mantém sincronizado
 * via subscribe (realtime). Spelhado do padrão de Dossier.jsx.
 */
function useUserXp(): number {
  const [xp, setXp] = useState<number>(0);
  const realtime = Realtime.useRealtimeSync?.();

  const fetchXp = useCallback(async () => {
    try {
      const dash = await Db.getDashboard?.();
      const profile = !dash ? await Db.getProfile?.() : null;
      const xpVal = (dash?.xp_total ?? profile?.xp ?? 0) as number;
      setXp(xpVal);
    } catch {
      // sem auth ou rede caída · mantém 0
    }
  }, []);

  useEffect(() => {
    fetchXp();
    if (!realtime?.subscribeToXpLog) return;
    const unsub = realtime.subscribeToXpLog(() => fetchXp());
    return () => { if (typeof unsub === 'function') unsub(); };
  }, [fetchXp, realtime]);

  return xp;
}

/**
 * Botão flutuante (FAB) que aparece após guardar uma carta · leva à coleção.
 * Só aparece por ~6s e some · o user pode dispensar a qualquer hora.
 */
function CollectionInvite({
  visible, onOpen, onDismiss,
}: { visible: boolean; onOpen: () => void; onDismiss: () => void }) {
  // Auto-dismiss em 7s
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(onDismiss, 7000);
    return () => clearTimeout(t);
  }, [visible, onDismiss]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed left-1/2 -translate-x-1/2 z-[180] pointer-events-auto"
          style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 11rem)' }}
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          transition={{ duration: 0.4, ease: 'backOut' }}
        >
          <div className="flex items-stretch gap-1 rounded-full
            bg-zinc-900/95 dark:bg-zinc-100/95 backdrop-blur-sm
            border border-white/10 dark:border-zinc-300
            shadow-xl shadow-emerald-500/20">
            <button
              type="button"
              onClick={onOpen}
              className="flex items-center gap-2 pl-4 pr-3 py-2.5 rounded-full
                text-white dark:text-zinc-900
                hover:bg-white/5 dark:hover:bg-black/5 transition-colors"
            >
              <Award size={14} className="text-emerald-400 dark:text-emerald-600" />
              <span className="text-[11px] font-mono font-bold tracking-[0.2em] uppercase">
                Ver coleção
              </span>
              <ChevronRight size={12} className="opacity-60" />
            </button>
            <button
              type="button"
              onClick={onDismiss}
              className="px-2 text-zinc-500 hover:text-white dark:hover:text-zinc-900 transition-colors"
              aria-label="Dispensar"
            >
              <X size={12} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

/**
 * AchievementsPage como overlay full-screen · usado quando user clica "Ver coleção".
 * Encapsula o fechamento via overlay portal.
 */
function CollectionOverlay({
  open, currentXp, unlockedMap, onClose,
}: {
  open: boolean;
  currentXp: number;
  unlockedMap: Record<string, string>;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[170] bg-zinc-50 dark:bg-zinc-950 overflow-y-auto"
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ duration: 0.32, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <AchievementsPage
            currentXp={currentXp}
            unlockedMap={unlockedMap}
            onBack={onClose}
          />
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

// =============================================================
// Componente principal · zero props · plug-and-play
// =============================================================
export function AchievementsAutoMount() {
  const xp = useUserXp();
  const { pendingRank, unlockedMap, markSeen } = useRankUnlock(xp);
  const [showInvite,     setShowInvite]     = useState(false);
  const [showCollection, setShowCollection] = useState(false);

  const handleSave = () => {
    markSeen();
    // pequeno delay pra a overlay sair antes do invite entrar
    setTimeout(() => setShowInvite(true), 350);
  };

  const handleDismiss = () => {
    markSeen();
  };

  return (
    <>
      {pendingRank && (
        <EvolutionCardOverlay
          rank={pendingRank}
          open={!!pendingRank}
          onSave={handleSave}
          onDismiss={handleDismiss}
        />
      )}

      <CollectionInvite
        visible={showInvite}
        onOpen={() => { setShowInvite(false); setShowCollection(true); }}
        onDismiss={() => setShowInvite(false)}
      />

      <CollectionOverlay
        open={showCollection}
        currentXp={xp}
        unlockedMap={unlockedMap}
        onClose={() => setShowCollection(false)}
      />
    </>
  );
}
