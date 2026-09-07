import React from 'react';
import { ChevronLeft, TrendingUp, TrendingDown, CheckCircle2, Target, BarChart3, Clock } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import type { PillarData } from '../types';
import { EmptyState } from './EmptyState';
import { CountUp } from '../viz/CountUp';
import { YearHeatmap } from '../viz/YearHeatmap';
import { MultiYearLine } from '../viz/MultiYearLine';
import { useLang } from '../../../../i18n/LanguageContext';

interface Props {
  data: PillarData;
  onBack: () => void;
  hideNav?: boolean;
}

// ── CUSTOM UI COMPONENTS ──

const Card = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={`bg-white dark:bg-zinc-900 rounded-[24px] p-5 border border-slate-100 dark:border-zinc-800 shadow-[0_2px_12px_rgba(0,0,0,0.02)] dark:shadow-none ${className}`}>
    {children}
  </div>
);

const InsightBox = ({ text, type = 'neutral' }: { text: string, type?: 'alert' | 'positive' | 'neutral' }) => {
  const colors = {
    alert: 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-100 dark:border-red-900/50',
    positive: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-100 dark:border-emerald-900/50',
    neutral: 'bg-slate-50 dark:bg-zinc-800/40 text-slate-600 dark:text-zinc-400 border-slate-100 dark:border-zinc-800',
  };
  return (
    <div className={`p-4 rounded-2xl border ${colors[type]} mt-6 max-w-sm mx-auto`}>
      <p className="text-[13px] font-semibold leading-relaxed text-center">{text}</p>
    </div>
  );
};

// ── REAL DATA VISUALIZATIONS (RECHARTS & CSS GRID) ──

const RealLineChart = ({ data, color }: { data: any[], color: string }) => {
  if (!data || data.length === 0) return <div className="h-32 bg-slate-50 dark:bg-zinc-800/40 rounded-xl" />;
  
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
  if (!data || data.length === 0) return <div className="h-32 bg-slate-50 dark:bg-zinc-800/40 rounded-xl" />;
  
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
            <span className="text-xs font-semibold text-slate-600 dark:text-zinc-400">{p.name}</span>
            <span className="text-xs font-bold text-slate-900 dark:text-zinc-100 ml-auto">
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
  if (!data || data.length === 0) return <div className="h-24 bg-slate-50 dark:bg-zinc-800/40 rounded-xl" />;
  
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
      <div className="flex justify-between text-[10px] font-semibold text-slate-400 dark:text-zinc-500 mt-2 uppercase tracking-wider">
        <span>00h</span>
        <span>12h</span>
        <span>23h</span>
      </div>
    </div>
  );
};

// Estatística inline, sem moldura própria — mora dentro de outro
// cartão. Um cartão dentro de outro cartão vira caixa em caixa, e
// nas referências os números de apoio são sempre soltos.
const MiniStat = ({ rotulo, valor, nota }: { rotulo: string; valor: string; nota?: string }) => (
  <div className="flex flex-col">
    <span className="text-[7px] font-mono uppercase tracking-[0.18em] text-slate-400 dark:text-zinc-600 font-bold">{rotulo}</span>
    <div className="flex items-baseline gap-1 mt-0.5">
      <span className="text-[16px] font-extrabold tracking-tight text-slate-900 dark:text-zinc-100 leading-none">{valor}</span>
      {nota && <span className="text-[8px] font-mono text-slate-400 dark:text-zinc-600">{nota}</span>}
    </div>
  </div>
);

// Recorte de apoio da faixa do hero. Rótulo pequeno, valor curto —
// se o texto do eixo for longo, trunca em vez de quebrar o cartão.
const MiniKpi = ({ rotulo, valor, nota }: { rotulo: string; valor: string; nota?: string }) => (
  <div className="rounded-2xl border border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 px-3 py-2.5 text-center">
    <span className="block text-[7px] font-mono uppercase tracking-[0.18em] text-slate-400 dark:text-zinc-600 font-bold mb-1">{rotulo}</span>
    <span className="block text-[11px] font-bold text-slate-800 dark:text-zinc-200 truncate leading-tight">{valor}</span>
    {nota && <span className="block text-[9px] font-mono text-slate-400 dark:text-zinc-600 mt-0.5">{nota}</span>}
  </div>
);

const HorizontalRanking = ({ items, color, isFinance }: { items: {label: string, value: number, raw?: string}[], color: string, isFinance?: boolean }) => (
  <div className="flex flex-col gap-4 mt-4">
    {items.map((item, i) => (
      <div key={i} className="flex flex-col gap-2">
        <div className="flex justify-between text-xs font-semibold">
          <span className="text-slate-600 dark:text-zinc-400">{item.label}</span>
          <span className="text-slate-900 dark:text-zinc-100">{item.raw ? item.raw : `${item.value}/100`}</span>
        </div>
        <div className="w-full h-2 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${Math.min(100, item.value)}%`, backgroundColor: color }} />
        </div>
      </div>
    ))}
  </div>
);

// ── MAIN COMPONENT ──

export function PillarLayered({ data, onBack, hideNav }: Props) {
  const { t } = useLang();
  if (data.isEmpty) {
    return (
      <div className={`bg-[#F8FAFC] dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 relative ${hideNav ? 'h-full' : 'min-h-screen'}`}>
        {!hideNav && (
          <button onClick={onBack} className="absolute top-6 left-5 z-50 p-3 text-slate-500 dark:text-zinc-400 bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 shadow-sm rounded-full hover:scale-105 transition-transform">
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        <div className="flex flex-col h-[60vh] justify-center">
          <EmptyState pillarName={data.config.name} cta={hideNav ? undefined : t('common.back')} onAction={hideNav ? undefined : onBack} />
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

  // Melhor e pior eixo do pilar, e quantos dias tiveram registro nos
  // ultimos 90. Sao derivados do que ja vem em `data` — nenhuma
  // consulta nova.
  const eixos = [...(data.axesNow || [])].sort((a, b) => b.value - a.value);
  const melhorEixo = eixos[0] || null;
  const piorEixo = eixos.length > 1 ? eixos[eixos.length - 1] : null;
  const diasAtivos = (data.yearDensity || []).slice(-90).filter((d) => (d.count || 0) > 0).length;
  const diasAtivosAno = (data.yearDensity || []).filter((d) => (d.count || 0) > 0).length;
  const picoDensidade = (data.yearDensity || []).reduce((mx, d) => Math.max(mx, d.count || 0), 0);
  const label1 = isFinance ? t('compass.income') : t('compass.productive');
  const label2 = isFinance ? t('compass.expense') : t('compass.distraction');
  const color2 = isFinance ? '#ef4444' : '#94a3b8';

  const donutData = [
    { name: label1, value: data.productiveHours || 0 },
    { name: label2, value: data.distractionHours || 0 }
  ].filter(d => d.value > 0);
  const donutColors = [color, color2];

  return (
    <div className={`bg-[#F8FAFC] dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 font-sans selection:bg-cyan-100 ${hideNav ? 'pb-10 pt-4 rounded-[32px] overflow-hidden shadow-inner' : 'min-h-screen pb-32'}`}>
      
      {/* NAVEGAÇÃO */}
      {!hideNav && (
        <button 
          onClick={onBack} 
          className="fixed top-6 left-5 z-50 p-3 text-slate-600 dark:text-zinc-400 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border border-slate-100 dark:border-zinc-800 shadow-sm rounded-full hover:bg-white dark:hover:bg-zinc-800 hover:text-slate-900 dark:hover:text-zinc-100 hover:-translate-x-1 transition-all"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}

      {/* 1. HERO — número + os indicadores que o contextualizam.
          Antes era um número de 120px sozinho no meio da tela: bonito,
          mas para saber se aquilo era bom ou ruim era preciso rolar
          até algum gráfico. Agora o número vem acompanhado do que o
          qualifica — variação, melhor eixo e consistência — na mesma
          dobra, como nas referências de painel. */}
      <section className={`${hideNav ? 'pb-6 px-5 max-w-xl mx-auto' : 'pt-24 pb-6 px-5 max-w-xl mx-auto'}`}>
        <div className="flex flex-col items-center text-center">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
            <h1 className="text-xs font-bold text-slate-500 dark:text-zinc-500 uppercase tracking-widest">{data.config.name}</h1>
          </div>

          <div className="flex items-start justify-center">
            {isFinance && <span className="text-2xl font-bold text-slate-400 dark:text-zinc-500 mt-3 mr-1.5">R$</span>}
            <span
              className="font-bold tracking-tighter leading-none text-slate-900 dark:text-zinc-100"
              style={{
                fontSize:
                  Math.abs(data.score) >= 1_000_000_000 ? '34px' :
                    Math.abs(data.score) >= 1_000_000 ? '46px' :
                      Math.abs(data.score) > 999 ? '58px' : '76px'
              }}
            >
              <CountUp value={data.score} isFinance={isFinance} />
            </span>
          </div>

          <div className={`mt-4 inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-[11px] font-bold ${data.delta7 >= 0 ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400' : 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400'}`}>
            {data.delta7 >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {data.delta7 >= 0 ? '+' : ''}{data.delta7}% vs semana
          </div>

          <InsightBox text={data.truth || data.todayInsight} type={insightType} />
        </div>

        {/* Faixa de apoio: os três recortes que respondem "e daí?" */}
        {(melhorEixo || piorEixo) && (
          <div className="grid grid-cols-3 gap-2 mt-6">
            <MiniKpi rotulo="Mais forte" valor={melhorEixo?.label ?? '—'} nota={melhorEixo ? `${Math.round(melhorEixo.value)}` : undefined} />
            <MiniKpi rotulo="Mais fraco" valor={piorEixo?.label ?? '—'} nota={piorEixo ? `${Math.round(piorEixo.value)}` : undefined} />
            <MiniKpi rotulo="Dias ativos" valor={String(diasAtivos)} nota="90d" />
          </div>
        )}
      </section>

      {/* 2. CONTEXTO E PADRÕES OCULTOS - DADOS REAIS */}
      <section className="max-w-xl mx-auto px-5 space-y-6">
        
        {/* CICLO DE VIDA (12 MESES) */}
        {data.evolutionYear && data.evolutionYear.length > 0 && (
          <Card>
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-200 tracking-tight">{t('compass.lifeCycle')}</h3>
                <p className="text-xs font-medium text-slate-400 dark:text-zinc-500 mt-0.5">{t('compass.lifeCycleSub')}</p>
              </div>
              <TrendingUp className="w-4 h-4 text-slate-300 dark:text-zinc-600" />
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
                <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-200 tracking-tight">{t('compass.density')}</h3>
                <p className="text-xs font-medium text-slate-400 dark:text-zinc-500 mt-0.5">{t('compass.densitySub')}</p>
              </div>
              <BarChart3 className="w-4 h-4 text-slate-300 dark:text-zinc-600" />
            </div>
            {/* A intensidade era BINÁRIA (`d.count ? 0.8 : 0`): um dia
                com 5 registros ficava idêntico a um dia com 1, e o
                heatmap virava um liga-desliga. A informação já estava
                no dado, só era descartada no desenho. Agora escala
                pelo maior dia do período — assim os picos aparecem. */}
            <YearHeatmap cells={data.yearDensity.map(d => ({
              day: new Date(d.date).getTime(),
              intensity: picoDensidade > 0 ? Math.min(1, (d.count || 0) / picoDensidade) : 0
            }))} />

            {/* Números que o quadriculado sozinho não dá: sem eles a
                pessoa vê a textura mas não sabe a dimensão dela. */}
            <div className="flex items-center gap-5 mt-4 pt-4 border-t border-slate-100 dark:border-zinc-800">
              <MiniStat rotulo="Dias ativos" valor={String(diasAtivosAno)} nota="365d" />
              <MiniStat rotulo="Melhor dia" valor={String(picoDensidade)} nota="registros" />
              <MiniStat rotulo="Taxa" valor={`${Math.round((diasAtivosAno / 365) * 100)}%`} />
            </div>
          </Card>
        )}

        {/* EVOLUÇÃO 30D (DETALHE RECENTE) */}
        {data.evolution30 && data.evolution30.length > 0 && (
          <Card>
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-200 tracking-tight">{t('compass.microTrend')}</h3>
                <p className="text-xs font-medium text-slate-400 dark:text-zinc-500 mt-0.5">{t('compass.microTrendSub')}</p>
              </div>
              <Clock className="w-4 h-4 text-slate-300 dark:text-zinc-600" />
            </div>
            <RealLineChart data={data.evolution30} color={color} />
          </Card>
        )}

        {/* Era `grid-cols-1 md:grid-cols-2`: como o app tem 428px de
            largura máxima, o breakpoint md (768px) NUNCA disparava —
            os dois cartões sempre ficaram empilhados, e a intenção de
            colocá-los lado a lado nunca aconteceu na prática.

            Em vez de forçar duas colunas num espaço que não comporta
            um donut, cada um assumiu o formato que serve: o donut fica
            inteiro (precisa da largura) e a consistência virou uma
            faixa horizontal — número grande à esquerda, leitura à
            direita, como os cartões de KPI das referências. */}
        <Card className="p-5">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-200 tracking-tight">{isFinance ? t('compass.cashPeriod') : t('compass.dailyTime')}</h3>
            <p className="text-xs font-medium text-slate-400 dark:text-zinc-500 mt-0.5">{isFinance ? t('compass.allocCash') : t('compass.allocFocus')}</p>
          </div>
          {donutData.length > 0 ? (
            <RealDonutChart data={donutData} colors={donutColors} isFinance={isFinance} />
          ) : (
            <div className="h-28 flex items-center justify-center text-xs text-slate-400 dark:text-zinc-500">{isFinance ? t('compass.noTransactions') : t('compass.noFocusToday')}</div>
          )}
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-4">
            <div className="shrink-0">
              <span className="block text-[7px] font-mono uppercase tracking-[0.18em] text-slate-400 dark:text-zinc-600 font-bold mb-1">
                {isFinance ? t('compass.weeklyBalance') : t('compass.consistency7d')}
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-[34px] font-extrabold tracking-tighter text-slate-900 dark:text-zinc-100 leading-none">
                  {isFinance && data.weekConsistency < 0 ? '-' : ''}{isFinance ? 'R$ ' : ''}
                  {isFinance ? Math.abs(data.weekConsistency || 0).toLocaleString('pt-BR') : data.weekConsistency || 0}
                </span>
                {!isFinance && <span className="text-[11px] font-bold text-slate-400 dark:text-zinc-600">/100</span>}
              </div>
            </div>
            <p className="flex-1 text-[11.5px] font-medium text-slate-500 dark:text-zinc-500 leading-relaxed border-l border-slate-100 dark:border-zinc-800 pl-4">
              {data.weekInsight || t('compass.noActivityWeek')}
            </p>
          </div>
        </Card>

        {/* EIXOS INTERNOS (RANKING REAL) */}
        {data.axesNow && data.axesNow.length > 0 && (
          <Card>
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-200 tracking-tight">{t('compass.pillarAxes')}</h3>
              <p className="text-xs font-medium text-slate-400 dark:text-zinc-500 mt-0.5">{t('compass.pillarAxesSub')}</p>
            </div>
            <HorizontalRanking items={data.axesNow} color={color} isFinance={isFinance} />
          </Card>
        )}

        {/* MAPA DE EXECUÇÃO (HORÁRIO) */}
        {data.weekHeat && data.weekHeat.length > 0 && (
          <Card>
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-200 tracking-tight">{t('compass.circadian')}</h3>
                <p className="text-xs font-medium text-slate-400 dark:text-zinc-500 mt-0.5">{t('compass.circadianSub')}</p>
              </div>
              <Clock className="w-4 h-4 text-slate-300 dark:text-zinc-600" />
            </div>
            <RealHeatmap data={data.weekHeat} color={color} />
          </Card>
        )}

        {/* 3. SOLUÇÃO (AÇÕES REAIS DA IA) */}
        {data.actions && data.actions.length > 0 && (
          <div className="pt-4">
            <h3 className="text-xs font-bold text-slate-500 dark:text-zinc-500 uppercase tracking-widest mb-4 px-2">{t('compass.progressVectors')}</h3>
            <Card className="border-l-4" style={{ borderLeftColor: color }}>
              <div className="flex flex-col gap-4">
                {data.actions.map((act, i) => (
                  <div key={i} className="flex items-start gap-4 p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/40 hover:bg-white dark:hover:bg-zinc-800 border border-transparent hover:border-slate-100 dark:hover:border-zinc-700 transition-colors cursor-pointer group">
                    <div className="w-5 h-5 mt-0.5 rounded-full border-2 border-slate-300 dark:border-zinc-700 group-hover:border-slate-500 dark:group-hover:border-zinc-500 flex items-center justify-center transition-colors shrink-0">
                      <div className="w-2.5 h-2.5 bg-slate-500 dark:bg-zinc-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 dark:text-zinc-200 mb-1 leading-snug">{act.title}</h4>
                      <p className="text-xs font-medium text-slate-500 dark:text-zinc-500 leading-relaxed">{act.why}</p>
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
