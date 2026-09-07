import React, { useState, useEffect } from 'react';
import { useCompassGlobal } from '../hooks/useCompassData';
import { Loader2, Activity, Heart, Brain, Wallet, Briefcase, Users, Compass, Crosshair, Coffee, Sunrise, UtensilsCrossed, User } from 'lucide-react';
import { RadarGlobal } from '../viz/RadarGlobal';
import { YearHeatmap } from '../viz/YearHeatmap';
import { COMPASS_PILLARS, type CompassPillarSlug } from '../pillars';
import { buildPillarData } from '../adapters/pillarDataAdapter';
import { CouncilCard } from './CouncilCard';
import type { PillarData } from '../types';
import { useLang } from '../../../../i18n/LanguageContext';

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

// Indicador compacto da faixa do topo. Número grande, rótulo pequeno,
// e um detalhe opcional (variação ou barra) — nada além disso: numa
// faixa de quatro, qualquer enfeite vira ruído.
const Kpi = ({ rotulo, valor, sufixo, nota, barra }: { rotulo: string; valor: number; sufixo?: string; nota?: string | null; barra?: number }) => (
  <div className="rounded-[18px] border border-zinc-200/50 dark:border-zinc-800/60 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl px-2.5 py-3 flex flex-col items-center">
    <span className="text-[7px] font-mono tracking-[0.15em] uppercase font-bold opacity-30 mb-1.5 text-center leading-tight">{rotulo}</span>
    <div className="flex items-baseline gap-0.5">
      <span className="text-[19px] font-extrabold tracking-tighter text-zinc-900 dark:text-white leading-none">{valor}</span>
      {sufixo && <span className="text-[8px] font-bold text-zinc-400">{sufixo}</span>}
    </div>
    {nota && <span className="text-[8px] font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-1">{nota}</span>}
    {barra !== undefined && (
      <div className="w-full h-[3px] rounded-full bg-zinc-100 dark:bg-zinc-800 mt-2 overflow-hidden">
        <div className="h-full rounded-full bg-zinc-900 dark:bg-white" style={{ width: `${barra}%` }} />
      </div>
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

// ── MAIN COMPONENT ──

export function CompassOverview({ onOpenPillar, onOpenCreation }: CompassOverviewProps) {
  const { t } = useLang();
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

  // handleWipe (RESET TOTAL) foi movido para Dossiê → Conta → Zona de
  // perigo (audit P13). Não mais exposto na tela principal do Compass.

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
          subtitle={t('compass.vitalSync')} 
        />

        {/* ─── FAIXA DE INDICADORES ─────────────────────────────
            Eram dois cartões grandes com dois números. Viraram quatro
            indicadores densos numa faixa só: o mesmo espaço passa a
            responder "como estou" de relance, e sobra altura para o
            que precisa de área (radar e heatmap). */}
        <div className="grid grid-cols-4 gap-2">
          <Kpi rotulo={t('compass.xpTotal')} valor={m.xpTotal} sufixo="XP" nota={m.xpWeek > 0 ? `+${m.xpWeek}` : null} />
          <Kpi rotulo={t('compass.consistency')} valor={m.consistency} sufixo="%" barra={m.consistency} />
          <Kpi rotulo="Sequência" valor={m.streak} sufixo="d" />
          <Kpi rotulo="Score" valor={Math.round(m.scoreAvg)} nota={m.delta7 !== 0 ? `${m.delta7 > 0 ? '↗' : '↘'}${Math.abs(m.delta7)}` : null} />
        </div>

        {/* ─── CONSTÂNCIA NO ANO ────────────────────────────────
            Este heatmap e os dados dele (yearMap) já existiam no
            projeto e NUNCA eram renderizados. Consistência é um
            comportamento ao longo do tempo — um quadriculado de um ano
            mostra isso de um jeito que a porcentagem sozinha não
            consegue: dá para ver ONDE você falhou, não só quanto. */}
        {m.yearMap?.length > 0 && (
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[9px] font-mono tracking-[0.28em] uppercase font-bold opacity-40">
                Constância
              </span>
              <span className="text-[9px] font-mono uppercase tracking-wider opacity-30">
                {m.activeDays} dias ativos
              </span>
            </div>
            <YearHeatmap cells={m.yearMap} />
          </Card>
        )}

        {/* RADAR CHART CARD - Matching Image 2 Aesthetic */}
        <Card className="flex flex-col items-center pt-10 pb-12 px-1 bg-white/60 dark:bg-zinc-900/50">
          <div className="flex flex-col items-center gap-2 mb-8">
            <h2 className="text-[10px] font-bold text-zinc-400 tracking-[0.4em] uppercase">
              {t('compass.balanceMap')}
            </h2>
            
            <div className="flex items-center gap-8 mt-2">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#10B981] shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                <span className="text-[9px] font-bold text-zinc-900 dark:text-zinc-100 tracking-widest uppercase">{t('compass.current')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-[1px] border-t-2 border-dashed border-zinc-300 dark:border-zinc-600" />
                <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 tracking-widest uppercase">{t('compass.lastWeek')}</span>
              </div>
            </div>
          </div>
          
          <div className="w-full aspect-square relative flex items-center justify-center">
            <RadarGlobal axes={m.balance} size={500} />
          </div>
        </Card>

        {/* CONSELHO DE IAs (VERITAS F5) */}
        <CouncilCard />

        {/* PILLARS GRID */}
        <div className="pt-2">
          <div className="flex items-center gap-3 mb-6 px-1">
             <h3 className="text-[9px] font-mono tracking-[0.4em] text-zinc-400 dark:text-zinc-500 uppercase font-bold whitespace-nowrap">{t('compass.dimensions')}</h3>
             <div className="h-[0.5px] flex-1 bg-zinc-200 dark:bg-zinc-800" />
          </div>
          
          {/* Eram 12 cartões em grade de 2 colunas: seis fileiras de
              rolagem, e comparar duas dimensões exigia procurar. Como
              LINHAS, as 12 cabem quase de uma vez e a leitura é
              vertical — o olho desce a coluna de números e enxerga
              quem está para trás sem precisar caçar.

              Cada linha mantém tudo que o cartão tinha: ícone, nome,
              número, variação e a tendência (agora como barra, que
              compara melhor entre linhas do que 12 sparklines soltas). */}
          <Card className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
            {pillarCards.map(({ slug, data: d }) => {
              const unit = getPillarUnit(slug);
              const isPositive = d.delta7 >= 0;
              const scoreStr = formatPillarScore(d.score, unit);
              // Barra proporcional: score de 0-100 nos pilares
              // comportamentais; nos outros só marca presença de dado.
              const pct = unit === 'pts' || unit === '%'
                ? Math.max(0, Math.min(100, d.score))
                : (d.hasRealData ? 100 : 0);

              return (
                <button
                  key={slug}
                  onClick={() => onOpenPillar(slug)}
                  className="group w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/40 border-zinc-100 dark:border-zinc-800/60"
                >
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-zinc-400 dark:text-zinc-500 bg-zinc-50 dark:bg-zinc-800/50 group-hover:bg-zinc-900 dark:group-hover:bg-white group-hover:text-white dark:group-hover:text-zinc-900 transition-colors">
                    {getPillarIcon(slug)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2 mb-1.5">
                      <span className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 truncate">
                        {d.config.name}
                      </span>
                      <div className="flex items-baseline gap-1 shrink-0">
                        {unit === 'R$' && <span className="text-[9px] font-bold text-zinc-400">R$</span>}
                        <span className="text-[14px] font-extrabold tracking-tight text-zinc-900 dark:text-white leading-none">
                          {scoreStr}
                        </span>
                        {unit !== 'R$' && <span className="text-[9px] font-bold text-zinc-400">{unit}</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                        <div className="h-full rounded-full bg-zinc-900 dark:bg-white transition-all duration-700"
                          style={{ width: `${pct}%`, opacity: d.hasRealData ? 0.75 : 0.15 }} />
                      </div>
                      <span className="text-[8px] font-mono font-bold shrink-0 w-[34px] text-right"
                        style={{ color: d.hasRealData && d.delta7 !== 0 ? undefined : 'transparent' }}>
                        {d.hasRealData && d.delta7 !== 0 ? (
                          <span className={isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>
                            {isPositive ? '↗' : '↘'}{Math.abs(d.delta7)}%
                          </span>
                        ) : '—'}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </Card>
        </div>

        {/* FOOTER & SYSTEM COMMANDS */}
        {/* RESET TOTAL removido daqui (audit P13: bomba de 1 toque na tela
            principal). Agora vive em Dossiê → Conta → Zona de perigo, com
            confirmação forte. */}
        <div className="pt-20 pb-32 flex flex-col items-center gap-8">
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
