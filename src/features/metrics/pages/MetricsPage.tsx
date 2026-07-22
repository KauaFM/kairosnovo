import { useState, useCallback, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { RitualRegistrarDia } from '../components/RitualRegistrarDia';
import { ErrorBoundary } from '../../../components/ErrorBoundary';
import { OrvaxHeader, ScrollContainer } from '../../../components/BaseLayout';
import { useLang } from '../../../i18n/LanguageContext';

// ── Compass v1 — new metrics system ──
import { CompassOverview } from '../compass/components/CompassOverview';
import { PillarLayered } from '../compass/components/PillarLayered';
import { useCompassPillar } from '../compass/hooks/useCompassData';
import type { CompassPillarSlug } from '../compass/pillars';

// ── Preserved modules ──
import { CreationHub } from '../../lifeOs/components/creation/CreationHub';
import { Plus, ClipboardList } from 'lucide-react';

interface MetricsPageProps {
  theme: string;
  toggleTheme: () => void;
  onModalChange?: (isOpen: boolean) => void;
}

const pageVariants = {
  initial: { opacity: 0, x: 40 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -40 },
};

export default function MetricsPage({ theme, toggleTheme, onModalChange }: MetricsPageProps) {
  const { t } = useLang();
  const [logModal, setLogModal] = useState(false);
  const [activePillar, setActivePillar] = useState<CompassPillarSlug | null>(null);
  const [creatorOpen, setCreatorOpen] = useState(false);

  // Compass pillar data (loaded when a pillar is opened)
  const { data: pillarData } = useCompassPillar(activePillar);

  const anyOverlayOpen = !!(logModal || creatorOpen || activePillar);

  useEffect(() => {
    onModalChange?.(anyOverlayOpen);
  }, [anyOverlayOpen, onModalChange]);

  const updateLogModal = useCallback((open: boolean) => setLogModal(open), []);
  const openPillar = useCallback((slug: CompassPillarSlug) => setActivePillar(slug), []);
  const closePillar = useCallback(() => setActivePillar(null), []);

  return (
    <ErrorBoundary fallbackTitle={t('lo.metricsErr')}>
      {/* Fundo pontilhado · cobre a aba inteira. Cores seguem o tema
          (inline style não aceita dark: do Tailwind, então usamos o prop). */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundColor: theme === 'dark' ? '#09090b' : '#F8F9FA',
          backgroundImage: `radial-gradient(circle, ${theme === 'dark' ? '#27272a' : '#cbd5e1'} 0.8px, transparent 0.8px)`,
          backgroundSize: '20px 20px',
        }}
      />
      <OrvaxHeader theme={theme} toggleTheme={toggleTheme} minimal />
      <ScrollContainer>
        <AnimatePresence mode="wait">
          <motion.div
            key="overview"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <div className="min-h-screen text-zinc-900 dark:text-white pb-20">
              <CompassOverview
                onOpenPillar={openPillar}
                onOpenCreation={() => setCreatorOpen(true)}
              />
            </div>
          </motion.div>
        </AnimatePresence>
      </ScrollContainer>

      {/* ── Ritual "Registrar Dia" (VERITAS F3 — substitui o QuickLogEntry) ── */}
      <RitualRegistrarDia
        isOpen={logModal}
        onClose={() => updateLogModal(false)}
      />

      {/* ── Pillar Deep Dive Overlay (Compass PillarLayered) ── */}
      {activePillar && pillarData && (
        <div
          className="fixed inset-0 z-[55] overflow-y-auto"
          style={{
            backgroundColor: 'var(--bg-color)',
            animation: 'compass-slide-up 0.3s ease-out',
          }}
        >
          <ErrorBoundary fallbackTitle={t('lo.moduleErr', { p: activePillar })}>
            <PillarLayered data={pillarData} onBack={closePillar} />
          </ErrorBoundary>
        </div>
      )}

      {/* ── FAB cluster (CRIAR + REGISTRAR DIA) ──
          Fica no canto. Some quando qualquer overlay está aberto.
          Posição muito acima do dock (bottom-8 + ~60px): 160px+ limpo. */}
      <div
        className={[
          'fixed right-4 z-[55] flex flex-col items-end gap-2 transition-all duration-300',
          anyOverlayOpen ? 'opacity-0 pointer-events-none translate-y-4' : 'opacity-100',
        ].join(' ')}
        style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 6.5rem)' }}
      >
        {/* Secondary: Registrar dia — rótulo visível em hover / sempre em mobile */}
        <button
          onClick={() => updateLogModal(true)}
          className="group flex items-center gap-2 h-11 pr-3 pl-3 rounded-full bg-white/95 dark:bg-zinc-900/95 text-zinc-800 dark:text-zinc-100 border border-zinc-300 dark:border-white/15 shadow-md backdrop-blur-sm transition-all hover:scale-[1.03] active:scale-95"
          aria-label={t('lo.logDayAria')}
        >
          <ClipboardList size={15} />
          <span className="text-[10px] font-mono font-bold tracking-wider uppercase">{t('compass.logDay')}</span>
        </button>

        {/* Primary: Criar algo novo */}
        <button
          onClick={() => setCreatorOpen(true)}
          className="group flex items-center gap-2 h-14 pr-5 pl-4 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border border-white/10 shadow-xl transition-all hover:scale-[1.04] active:scale-95"
          aria-label={t('lo.createNewAria')}
        >
          <div className="w-7 h-7 rounded-full flex items-center justify-center bg-white/15 dark:bg-zinc-900/15">
            <Plus size={20} strokeWidth={2.4} />
          </div>
          <span className="text-[11px] font-mono font-bold tracking-[0.18em] uppercase">{t('compass.create')}</span>
        </button>
      </div>

      <CreationHub
        open={creatorOpen}
        onClose={() => setCreatorOpen(false)}
        onCreated={() => { /* realtime atualiza os cards */ }}
      />
    </ErrorBoundary>
  );
}
