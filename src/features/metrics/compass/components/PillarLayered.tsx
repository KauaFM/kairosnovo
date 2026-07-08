import React from 'react';
import { ChevronLeft, TrendingUp, TrendingDown, CheckCircle2, Target, BarChart3, Clock } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import type { PillarData } from '../types';
import { EmptyState } from './EmptyState';
import { CountUp } from '../viz/CountUp';
import { YearHeatmap } from '../viz/YearHeatmap';
import { MultiYearLine } from '../viz/MultiYearLine';

interface Props {
  data: PillarData;
  onBack: () => void;
  hideNav?: boolean;
}

// ── CUSTOM UI COMPONENTS ──

const Card = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={`bg-white rounded-[24px] p-6 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)] ${className}`}>
    {children}
  </div>
);

const InsightBox = ({ text, type = 'neutral' }: { text: string, type?: 'alert' | 'positive' | 'neutral' }) => {
  const colors = {
    alert: 'bg-red-50 text-red-700 border-red-100',
    positive: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    neutral: 'bg-slate-50 text-slate-600 border-slate-100',
  };
  return (
    <div className={`p-4 rounded-2xl border ${colors[type]} mt-6 max-w-sm mx-auto`}>
      <p className="text-[13px] font-semibold leading-relaxed text-center">{text}</p>
    </div>
  );
};

// ── REAL DATA VISUALIZATIONS (RECHARTS & CSS GRID) ──

const RealLineChart = ({ data, color }: { data: any[], color: string }) => {
  if (!data || data.length === 0) return <div className="h-32 bg-slate-50 rounded-xl" />;
  
  // Custom Dot to highlight the last point (Premium Rule)
  const CustomDot = (props: any) => {
    const { cx, cy, index } = props;
    if (index === data.length - 1) {
      return (
        <circle cx={cx} cy={cy} r={4} fill={color} stroke="white" strokeWidth={2} />
      );
    }
    return null;
  };

  return (
    <div className="w-full h-40 mt-4">
      <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
        <LineChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke={color} 
            strokeWidth={3} 
            dot={<CustomDot />} 
            isAnimationActive={true}
            animationDuration={1500}
            animationEasing="ease-out"
          />
          <Tooltip 
            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
            itemStyle={{ color: '#0f172a', fontWeight: 'bold' }}
            labelStyle={{ display: 'none' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

const RealDonutChart = ({ data, colors, isFinance }: { data: any[], colors: string[], isFinance?: boolean }) => {
  if (!data || data.length === 0) return <div className="h-32 bg-slate-50 rounded-xl" />;
  
  return (
    <div className="flex items-center gap-4">
      <div className="w-32 h-32 relative">
        <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
          <PieChart>
            <Pie
              data={data}
              innerRadius={40}
              outerRadius={56}
              paddingAngle={2}
              dataKey="value"
              stroke="none"
              isAnimationActive={true}
              animationDuration={1000}
              animationEasing="ease-out"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-col gap-3">
        {data.map((p, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colors[i % colors.length] }} />
            <span className="text-xs font-semibold text-slate-600">{p.name}</span>
            <span className="text-xs font-bold text-slate-900 ml-auto">
              {isFinance ? `R$ ${p.value.toLocaleString('pt-BR')}` : `${p.value}h`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Heatmap using real data.weekHeat
const RealHeatmap = ({ data, color }: { data: any[], color: string }) => {
  if (!data || data.length === 0) return <div className="h-24 bg-slate-50 rounded-xl" />;
  
  // Create a 7x24 grid
  return (
    <div className="mt-4">
      <div className="grid grid-cols-24 gap-[2px] w-full" style={{ gridTemplateColumns: 'repeat(24, minmax(0, 1fr))' }}>
        {data.map((cell, i) => (
          <div 
            key={i} 
            className="w-full aspect-square rounded-[2px]" 
            style={{ 
              backgroundColor: color, 
              opacity: cell.intensity === 0 ? 0.05 : 0.2 + (cell.intensity * 0.8),
            }} 
          />
        ))}
      </div>
      <div className="flex justify-between text-[10px] font-semibold text-slate-400 mt-2 uppercase tracking-wider">
        <span>00h</span>
        <span>12h</span>
        <span>23h</span>
      </div>
    </div>
  );
};

const HorizontalRanking = ({ items, color, isFinance }: { items: {label: string, value: number, raw?: string}[], color: string, isFinance?: boolean }) => (
  <div className="flex flex-col gap-4 mt-4">
    {items.map((item, i) => (
      <div key={i} className="flex flex-col gap-2">
        <div className="flex justify-between text-xs font-semibold">
          <span className="text-slate-600">{item.label}</span>
          <span className="text-slate-900">{item.raw ? item.raw : `${item.value}/100`}</span>
        </div>
        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${Math.min(100, item.value)}%`, backgroundColor: color }} />
        </div>
      </div>
    ))}
  </div>
);

// ── MAIN COMPONENT ──

export function PillarLayered({ data, onBack, hideNav }: Props) {
  if (data.isEmpty) {
    return (
      <div className={`bg-[#F8FAFC] text-slate-900 relative ${hideNav ? 'h-full' : 'min-h-screen'}`}>
        {!hideNav && (
          <button onClick={onBack} className="absolute top-6 left-5 z-50 p-3 text-slate-500 bg-white border border-slate-100 shadow-sm rounded-full hover:scale-105 transition-transform">
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        <div className="flex flex-col h-[60vh] justify-center">
          <EmptyState pillarName={data.config.name} cta={hideNav ? undefined : "Voltar"} onAction={hideNav ? undefined : onBack} />
        </div>
      </div>
    );
  }

  // Pillar Base Color (using specific or fallback)
  let color = '#0ea5e9'; // default cyan
  if (data.config.slug === 'health') color = '#10b981'; // emerald
  else if (data.config.slug === 'finance') color = '#eab308'; // yellow
  else if (data.config.slug === 'relationships') color = '#f43f5e'; // rose
  else if (data.config.slug === 'career') color = '#3b82f6'; // blue
  else if (data.config.slug === 'mind') color = '#06b6d4'; // cyan
  else if (data.config.slug === 'goals') color = '#8b5cf6'; // violet
  else if (data.config.slug === 'habits') color = '#f97316'; // orange
  else if (data.config.slug === 'nutrition') color = '#10b981'; // emerald
  else if (data.config.slug === 'learning') color = '#6366f1'; // indigo
  else if (data.config.slug === 'internal') color = '#f43f5e'; // rose
  else if (data.config.slug === 'leisure') color = '#eab308'; // yellow
  else if (data.config.slug === 'identity') color = '#18181b'; // zinc/black

  const isAlert = data.status === 'critico';
  const insightType = isAlert ? 'alert' : (data.delta7 > 5 ? 'positive' : 'neutral');

  // Prepare Real Donut Data
  const isFinance = data.config.slug === 'finance';
  const label1 = isFinance ? 'Receita' : 'Produtivo';
  const label2 = isFinance ? 'Gasto' : 'Distração';
  const color2 = isFinance ? '#ef4444' : '#94a3b8';

  const donutData = [
    { name: label1, value: data.productiveHours || 0 },
    { name: label2, value: data.distractionHours || 0 }
  ].filter(d => d.value > 0);
  const donutColors = [color, color2];

  return (
    <div className={`bg-[#F8FAFC] text-slate-900 font-sans selection:bg-cyan-100 ${hideNav ? 'pb-10 pt-4 rounded-[32px] overflow-hidden shadow-inner' : 'min-h-screen pb-32'}`}>
      
      {/* NAVEGAÇÃO */}
      {!hideNav && (
        <button 
          onClick={onBack} 
          className="fixed top-6 left-5 z-50 p-3 text-slate-600 bg-white/90 backdrop-blur-md border border-slate-100 shadow-sm rounded-full hover:bg-white hover:text-slate-900 hover:-translate-x-1 transition-all"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}

      {/* 1. HERO (ESTADO) - DADOS REAIS */}
      <section className={`${hideNav ? 'pb-8 px-5 max-w-xl mx-auto' : 'pt-24 pb-8 px-5 max-w-xl mx-auto'}`}>
        <div className="flex flex-col items-center text-center">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
            <h1 className="text-xs font-bold text-slate-500 uppercase tracking-widest">{data.config.name}</h1>
          </div>
          
          <div className="flex items-start justify-center">
            {isFinance && <span className="text-4xl font-bold text-slate-400 mt-4 mr-2">R$</span>}
            <span 
              className="font-bold tracking-tighter leading-none text-slate-900" 
              style={{ 
                fontSize: 
                  Math.abs(data.score) >= 1_000_000_000 ? '40px' :
                  Math.abs(data.score) >= 1_000_000 ? '60px' :
                  Math.abs(data.score) > 999 ? '80px' : '120px' 
              }}
            >
              <CountUp value={data.score} isFinance={isFinance} />
            </span>
          </div>

          <div className={`mt-6 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold ${data.delta7 >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
            {data.delta7 >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            {data.delta7 >= 0 ? '+' : ''}{data.delta7}% vs semana
          </div>

          <InsightBox text={data.truth || data.todayInsight} type={insightType} />
        </div>
      </section>

      {/* 2. CONTEXTO E PADRÕES OCULTOS - DADOS REAIS */}
      <section className="max-w-xl mx-auto px-5 space-y-6">
        
        {/* CICLO DE VIDA (12 MESES) */}
        {data.evolutionYear && data.evolutionYear.length > 0 && (
          <Card>
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-sm font-bold text-slate-800 tracking-tight">Ciclo de Vida (12 Meses)</h3>
                <p className="text-xs font-medium text-slate-400 mt-0.5">Visão macro de evolução anual</p>
              </div>
              <TrendingUp className="w-4 h-4 text-slate-300" />
            </div>
            <div className="mt-6 h-[160px] w-full">
              <MultiYearLine data={data.evolutionYear.map(p => {
                const parts = (p.day || '').split('-');
                let year = Number(parts[0]);
                if (isNaN(year) || year < 1900) {
                  year = new Date().getFullYear();
                }
                return {
                  label: p.day,
                  value: p.value,
                  year: year
                };
              })} />
            </div>
          </Card>
        )}

        {/* DENSIDADE DE EXECUÇÃO (365 DIAS - ESTILO GITHUB) */}
        {data.yearDensity && data.yearDensity.length > 0 && (
          <Card>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800 tracking-tight">Densidade de Execução</h3>
                <p className="text-xs font-medium text-slate-400 mt-0.5">Consistência nos últimos 365 dias</p>
              </div>
              <BarChart3 className="w-4 h-4 text-slate-300" />
            </div>
            <YearHeatmap cells={data.yearDensity.map(d => ({
              day: new Date(d.date).getTime(),
              intensity: d.count ? 0.8 : 0
            }))} />
          </Card>
        )}

        {/* EVOLUÇÃO 30D (DETALHE RECENTE) */}
        {data.evolution30 && data.evolution30.length > 0 && (
          <Card>
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-sm font-bold text-slate-800 tracking-tight">Micro-tendência (30D)</h3>
                <p className="text-xs font-medium text-slate-400 mt-0.5">Oscilação diária recente</p>
              </div>
              <Clock className="w-4 h-4 text-slate-300" />
            </div>
            <RealLineChart data={data.evolution30} color={color} />
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* DISTRIBUIÇÃO DE TEMPO (DONUT COM RECHARTS) */}
          <Card>
            <div>
              <h3 className="text-sm font-bold text-slate-800 tracking-tight">{isFinance ? 'Caixa do Período' : 'Tempo Diário'}</h3>
              <p className="text-xs font-medium text-slate-400 mt-0.5">{isFinance ? 'Alocação (Receita vs Gasto)' : 'Alocação (Foco vs Desvio)'}</p>
            </div>
            <div className="mt-4">
              {donutData.length > 0 ? (
                <RealDonutChart data={donutData} colors={donutColors} isFinance={isFinance} />
              ) : (
                <div className="h-32 flex items-center justify-center text-xs text-slate-400">{isFinance ? 'Sem transações.' : 'Sem dados de foco hoje.'}</div>
              )}
            </div>
          </Card>

          {/* CONSISTÊNCIA / HIGHLIGHT */}
          <Card className="flex flex-col justify-center">
            <h3 className="text-sm font-bold text-slate-800 tracking-tight mb-4">{isFinance ? 'Balanço Semanal' : 'Consistência 7D'}</h3>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-5xl font-bold tracking-tighter text-slate-900">
                {isFinance && data.weekConsistency < 0 ? '-' : ''}{isFinance ? 'R$ ' : ''}
                {isFinance ? Math.abs(data.weekConsistency || 0).toLocaleString('pt-BR') : data.weekConsistency || 0}
              </span>
              <span className="text-sm font-semibold text-slate-400">{isFinance ? '' : '/100'}</span>
            </div>
            <p className="text-xs font-medium text-slate-500 leading-relaxed">{data.weekInsight || 'Nenhuma atividade registrada na semana.'}</p>
          </Card>
        </div>

        {/* EIXOS INTERNOS (RANKING REAL) */}
        {data.axesNow && data.axesNow.length > 0 && (
          <Card>
            <div>
              <h3 className="text-sm font-bold text-slate-800 tracking-tight">Eixos do Pilar</h3>
              <p className="text-xs font-medium text-slate-400 mt-0.5">Performance detalhada por área</p>
            </div>
            <HorizontalRanking items={data.axesNow} color={color} isFinance={isFinance} />
          </Card>
        )}

        {/* MAPA DE EXECUÇÃO (HORÁRIO) */}
        {data.weekHeat && data.weekHeat.length > 0 && (
          <Card>
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-sm font-bold text-slate-800 tracking-tight">Padrão Circadiano (7D)</h3>
                <p className="text-xs font-medium text-slate-400 mt-0.5">Intensidade por hora do dia</p>
              </div>
              <Clock className="w-4 h-4 text-slate-300" />
            </div>
            <RealHeatmap data={data.weekHeat} color={color} />
          </Card>
        )}

        {/* 3. SOLUÇÃO (AÇÕES REAIS DA IA) */}
        {data.actions && data.actions.length > 0 && (
          <div className="pt-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 px-2">Vetores de Progresso</h3>
            <Card className="border-l-4" style={{ borderLeftColor: color }}>
              <div className="flex flex-col gap-4">
                {data.actions.map((act, i) => (
                  <div key={i} className="flex items-start gap-4 p-3 rounded-xl bg-slate-50 hover:bg-white border border-transparent hover:border-slate-100 transition-colors cursor-pointer group">
                    <div className="w-5 h-5 mt-0.5 rounded-full border-2 border-slate-300 group-hover:border-slate-500 flex items-center justify-center transition-colors shrink-0">
                      <div className="w-2.5 h-2.5 bg-slate-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 mb-1 leading-snug">{act.title}</h4>
                      <p className="text-xs font-medium text-slate-500 leading-relaxed">{act.why}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

      </section>

    </div>
  );
}
