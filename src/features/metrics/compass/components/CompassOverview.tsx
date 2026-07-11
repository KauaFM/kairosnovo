import React, { useState, useEffect } from 'react';
import { useCompassGlobal } from '../hooks/useCompassData';
import { Loader2, TrendingUp, TrendingDown, Activity, Heart, Brain, Wallet, Briefcase, Users, Zap, Compass, Crosshair, Coffee, Sunrise, UtensilsCrossed, User, Trash2 } from 'lucide-react';
import { RadarGlobal } from '../viz/RadarGlobal';
import { Sparkline } from '../viz/Sparkline';
import { COMPASS_PILLARS, type CompassPillarSlug } from '../pillars';
import { buildPillarData } from '../adapters/pillarDataAdapter';
import type { PillarData } from '../types';

interface CompassOverviewProps {
  onOpenPillar: (slug: CompassPillarSlug) => void;
  onOpenCreation?: () => void;
}

// ── CUSTOM COMPONENTS (PREMIUM TACTICAL AESTHETIC) ──

const Card = ({ children, className = '', style = {} }: { children: React.ReactNode, className?: string, style?: React.CSSProperties }) => (
  <div
    className={`relative overflow-hidden rounded-[24px] border border-zinc-200/50 dark:border-zinc-800/60 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.02)] transition-all duration-300 hover:shadow-[0_12px_48px_rgba(0,0,0,0.04)] hover:border-zinc-300/50 dark:hover:border-zinc-700/60 ${className}`}
    style={style}
  >
    <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-zinc-400/20 dark:border-zinc-600/30 rounded-tl-lg" />
    <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-zinc-400/20 dark:border-zinc-600/30 rounded-br-lg" />
    {children}
  </div>
);

const SectionHeader = ({ title, subtitle }: { title: string, subtitle?: string }) => (
  <div className="mb-10 flex flex-col items-center text-center px-4">
    <div className="flex items-center gap-3 mb-3 w-full">
      <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-zinc-200 dark:to-zinc-700" />
      <h2 className="text-[11px] font-mono tracking-[0.4em] text-zinc-500 dark:text-zinc-400 uppercase font-bold whitespace-nowrap">
        {title}
      </h2>
      <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-zinc-200 dark:to-zinc-700" />
    </div>
    {subtitle && (
      <p className="text-[11px] text-zinc-400 font-mono uppercase tracking-[0.15em] font-bold opacity-60">
        {subtitle}
      </p>
    )}
  </div>
);

const getPillarIcon = (slug: string) => {
  const iconProps = { className: "w-3.5 h-3.5", strokeWidth: 2.2 };
  switch (slug) {
    case 'health': return <Heart {...iconProps} />;
    case 'mind': return <Brain {...iconProps} />;
    case 'finance': return <Wallet {...iconProps} />;
    case 'career': return <Briefcase {...iconProps} />;
    case 'relationships': return <Users {...iconProps} />;
    case 'goals': return <Crosshair {...iconProps} />;
    case 'leisure': return <Coffee {...iconProps} />;
    case 'habits': return <Activity {...iconProps} />;
    case 'nutrition': return <UtensilsCrossed {...iconProps} />;
    case 'learning': return <Brain {...iconProps} />;
    case 'internal': return <Sunrise {...iconProps} />;
    case 'identity': return <User {...iconProps} />;
    default: return <Compass {...iconProps} />;
  }
};

const getPillarUnit = (slug: string) => {
  // Finança em R$, Metas em % (progresso médio), pilares comportamentais em "pts" (check-ins).
  if (slug === 'finance') return 'R$';
  if (slug === 'goals') return '%';
  return 'pts';
};

// Helper for responsive font sizing that never overflows
const formatPillarScore = (score: number, unit: string) => {
  if (unit === 'R$') {
    return score.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return score.toLocaleString('pt-BR');
};

const getScoreFontSize = (scoreStr: string, unit: string) => {
  const len = scoreStr.length;
  if (unit === 'R$') {
    if (len > 12) return 'text-[1rem]';
    if (len > 9) return 'text-[1.25rem]';
    if (len > 7) return 'text-[1.5rem]';
    return 'text-[1.85rem]';
  }
  if (len > 6) return 'text-[1.5rem]';
  if (len > 4) return 'text-[1.8rem]';
  return 'text-[2.25rem]';
};

// ── MAIN COMPONENT ──

export function CompassOverview({ onOpenPillar, onOpenCreation }: CompassOverviewProps) {
  const { data: m, loading } = useCompassGlobal();
  const [pillarCards, setPillarCards] = useState<{ slug: CompassPillarSlug; data: PillarData }[]>([]);

  useEffect(() => {
    const fetchCards = async () => {
      const results = await Promise.all(
        COMPASS_PILLARS.map(async (p) => ({
          slug: p.slug as CompassPillarSlug,
          data: await buildPillarData(p.slug as CompassPillarSlug),
        }))
      );
      setPillarCards(results);
    };
    fetchCards();
  }, []);

  const handleWipe = async () => {
    if (confirm('ATENÇÃO: Isso irá apagar ABSOLUTAMENTE TUDO (XP, Cofre, Metas, Hábitos e Telemetria). Deseja continuar com o RESET TOTAL?')) {
      const { wipeEntireSystem } = await import('../../../../services/seedVisualization');
      const res = await wipeEntireSystem();
      if (res.success) {
        localStorage.clear();
        sessionStorage.clear();
        alert('Sistema resetado para o estado zero.');
        window.location.reload();
      } else {
        alert('Erro ao resetar: ' + res.error);
      }
    }
  };

  if (loading || !m || pillarCards.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F8F9FA] dark:bg-zinc-950">
        <Loader2 className="animate-spin text-zinc-300 dark:text-zinc-600" size={24} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-zinc-900 dark:text-zinc-100 pb-32 font-sans selection:bg-zinc-200 overflow-x-hidden">

      <div className="fixed top-[-15%] left-[-15%] w-[50%] h-[50%] bg-zinc-200/30 dark:bg-zinc-800/20 blur-[140px] pointer-events-none rounded-full" />
      <div className="fixed bottom-[-15%] right-[-15%] w-[50%] h-[50%] bg-zinc-200/30 dark:bg-zinc-800/20 blur-[140px] pointer-events-none rounded-full" />

      <div className="max-w-[480px] mx-auto px-4 pt-10 space-y-6 relative z-10">
        
        <SectionHeader 
          title="Terminal Compass" 
          subtitle="Sincronização Vital · OS" 
        />

        {/* TOP CARDS */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4 flex flex-col justify-between min-h-[130px]">
            <div className="flex items-center justify-between opacity-30">
              <span className="text-[8px] font-mono tracking-[0.2em] uppercase font-bold">XP TOTAL</span>
              <Activity size={10} />
            </div>
            <div className="mt-2 mb-1">
              <span className="text-3xl font-extrabold tracking-tighter text-zinc-900 dark:text-white">{m.xpTotal}</span>
              <span className="text-[9px] font-mono text-zinc-400 font-bold ml-1">XP</span>
            </div>
            <div className="text-[8px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-100/50 dark:border-emerald-900/40 w-fit">
              +{m.xpWeek} SEMANA
            </div>
          </Card>

          <Card className="p-4 flex flex-col justify-between min-h-[130px]">
            <div className="flex items-center justify-between opacity-30">
              <span className="text-[8px] font-mono tracking-[0.2em] uppercase font-bold">CONSISTÊNCIA</span>
              <Zap size={10} />
            </div>
            <div className="mt-2 mb-1">
              <span className="text-3xl font-extrabold tracking-tighter text-zinc-900 dark:text-white">{m.consistency}</span>
              <span className="text-sm font-bold text-zinc-300 dark:text-zinc-600 ml-1">%</span>
            </div>
            <div className="mt-auto h-1 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full">
              <div className="h-full bg-zinc-900 dark:bg-white rounded-full" style={{ width: `${m.consistency}%` }} />
            </div>
          </Card>
        </div>

        {/* RADAR CHART CARD - Matching Image 2 Aesthetic */}
        <Card className="flex flex-col items-center pt-10 pb-12 px-1 bg-white/60 dark:bg-zinc-900/50">
          <div className="flex flex-col items-center gap-2 mb-8">
            <h2 className="text-[10px] font-bold text-zinc-400 tracking-[0.4em] uppercase">
              Mapa de Equilíbrio
            </h2>
            
            <div className="flex items-center gap-8 mt-2">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#10B981] shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                <span className="text-[9px] font-bold text-zinc-900 dark:text-zinc-100 tracking-widest uppercase">Atual</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-[1px] border-t-2 border-dashed border-zinc-300 dark:border-zinc-600" />
                <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 tracking-widest uppercase">Semana Passada</span>
              </div>
            </div>
          </div>
          
          <div className="w-full aspect-square relative flex items-center justify-center">
            <RadarGlobal axes={m.balance} size={500} />
          </div>
        </Card>

        {/* PILLARS GRID */}
        <div className="pt-2">
          <div className="flex items-center gap-3 mb-6 px-1">
             <h3 className="text-[9px] font-mono tracking-[0.4em] text-zinc-400 dark:text-zinc-500 uppercase font-bold whitespace-nowrap">Dimensões</h3>
             <div className="h-[0.5px] flex-1 bg-zinc-200 dark:bg-zinc-800" />
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            {pillarCards.map(({ slug, data: d }) => {
              const unit = getPillarUnit(slug);
              const isPositive = d.delta7 >= 0;
              const spark = (d.sparkline && d.sparkline.length > 0) ? d.sparkline : [];
              const scoreStr = formatPillarScore(d.score, unit);
              const scoreFontSize = getScoreFontSize(scoreStr, unit);

              return (
                <button
                  key={slug}
                  onClick={() => onOpenPillar(slug)}
                  className="group relative overflow-hidden bg-white dark:bg-zinc-900/60 rounded-[24px] p-4 border border-zinc-200/50 dark:border-zinc-800/60 shadow-sm flex flex-col items-center text-center transition-all duration-300 hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-xl hover:-translate-y-1 active:scale-[0.98] min-h-[170px]"
                >
                  <div className="flex flex-col items-center gap-2 mb-4 w-full">
                    <div className="w-8 h-8 rounded-xl border border-zinc-50 dark:border-zinc-800 flex items-center justify-center text-zinc-400 dark:text-zinc-500 bg-zinc-50/30 dark:bg-zinc-800/30 group-hover:bg-zinc-900 dark:group-hover:bg-white group-hover:text-white dark:group-hover:text-zinc-900 transition-colors">
                      {getPillarIcon(slug)}
                    </div>
                    <span className="text-[9px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.2em] px-1 leading-tight">
                      {d.config.name}
                    </span>
                  </div>
                  
                  <div className="mt-auto w-full">
                    <div className="flex flex-col items-center justify-center mb-1">
                      <div className="flex items-baseline gap-0.5 max-w-full">
                        {unit === 'R$' && <span className="text-[10px] font-bold text-zinc-400">R$</span>}
                        <span className={`${scoreFontSize} font-extrabold tracking-tighter text-zinc-900 dark:text-white leading-none`}>
                          {scoreStr}
                        </span>
                        {unit !== 'R$' && <span className="text-[10px] font-bold text-zinc-400 ml-0.5">{unit}</span>}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-center min-h-[16px]">
                      {d.hasRealData && d.delta7 !== 0 ? (
                        <div className={`flex items-center gap-0.5 px-1 rounded text-[8px] font-bold ${isPositive ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40' : 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40'}`}>
                          {isPositive ? '↗' : '↘'} {Math.abs(d.delta7)}%
                        </div>
                      ) : (
                        <span className="text-[8px] font-mono text-zinc-200 dark:text-zinc-700 uppercase tracking-widest font-bold">
                          {slug === 'finance' ? 'sync' : 'log'}
                        </span>
                      )}
                    </div>
                  </div>

                  {spark.length > 0 && (
                    <div className="w-full h-6 mt-3 opacity-10 group-hover:opacity-30 transition-all duration-500">
                      <Sparkline data={spark} height={24} color="#18181b" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* FOOTER & SYSTEM COMMANDS */}
        <div className="pt-20 pb-32 flex flex-col items-center gap-8">
          
          {/* HIGH-VISIBILITY RESET CARD - Smaller & Urgent */}
          <div className="w-full max-w-[240px] p-1 rounded-[24px] bg-gradient-to-b from-zinc-100 dark:from-zinc-800/40 to-transparent">
            <button
              onClick={handleWipe}
              className="w-full bg-white dark:bg-zinc-900 rounded-[20px] py-4 px-4 flex flex-col items-center gap-2 border border-zinc-200 dark:border-zinc-800 shadow-sm transition-all hover:shadow-lg hover:border-red-200 dark:hover:border-red-900/60 active:scale-[0.98] group"
            >
              <div className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-950/40 flex items-center justify-center text-red-500 shadow-sm">
                <Trash2 size={16} />
              </div>
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-[10px] font-bold text-red-600 dark:text-red-400 tracking-[0.1em] uppercase">Reset Total</span>
                <span className="text-[8px] font-bold text-zinc-400 dark:text-zinc-500 uppercase opacity-60">Apagar todo o histórico do OS</span>
              </div>
            </button>
          </div>

          <div className="flex flex-col items-center gap-2 pt-8">
            <div className="h-[1px] w-8 bg-zinc-200 dark:bg-zinc-800 mb-2" />
            <span className="text-[9px] font-bold tracking-[0.4em] text-zinc-300 dark:text-zinc-600 uppercase">
              Kairos Intelligence System
            </span>
            <span className="text-[7px] font-mono text-zinc-200 dark:text-zinc-700 uppercase tracking-widest">
              Terminal Compass // OS v4.0.2
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
