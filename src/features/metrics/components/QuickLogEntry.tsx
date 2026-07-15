import { useState, useCallback } from 'react';
import { useLang } from '../../../i18n/LanguageContext';
import { EN_AUDIT } from '../../../i18n/auditDomainsEn';
import {
  X, Brain, Dumbbell, Users, Zap, Heart, TrendingUp,
  Briefcase, Sparkles, Check, Loader2, ChevronUp,
  ChevronDown, MessageSquare
} from 'lucide-react';
import type { DomainKey } from '../types/metrics.types';

/* ═══════════════════════════════════════════════════════════ */
/*  QUICK LOG ENTRY V2 — Auditoria de Vida Baseada em Fatos   */
/*  Protocolo de Verificação de Performance (Anti-Genérico)   */
/* ═══════════════════════════════════════════════════════════ */

interface QuickLogEntryProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (scores: Record<DomainKey, number>) => Promise<void>;
}

interface LogCheckpoint {
  label: string;
  weight: number;
}

interface DomainAudit {
  key: DomainKey;
  label: string;
  icon: typeof Brain;
  hint: string;
  checkpoints: LogCheckpoint[];
}

const AUDIT_DOMAINS: DomainAudit[] = [
  { 
    key: 'mind', label: 'Mente', icon: Brain, hint: 'Cognição e Estudo',
    checkpoints: [
      { label: 'Flow State (1h+)', weight: 4 },
      { label: 'Estudo/Leitura Realizada', weight: 3 },
      { label: 'Zero Redes Sociais Inúteis', weight: 3 }
    ]
  },
  { 
    key: 'body', label: 'Corpo', icon: Dumbbell, hint: 'Fisiologia',
    checkpoints: [
      { label: 'Treino de Alta Intensidade', weight: 4 },
      { label: 'Nutrição 100% Limpa', weight: 3 },
      { label: 'Sono 7h+ (Qualidade)', weight: 3 }
    ]
  },
  { 
    key: 'productivity', label: 'Execução', icon: Zap, hint: 'Output e Foco',
    checkpoints: [
      { label: 'Tarefas Críticas Finalizadas', weight: 4 },
      { label: 'Zero Procrastinação', weight: 3 },
      { label: 'Agenda Cumprida', weight: 3 }
    ]
  },
  { 
    key: 'wellbeing', label: 'Bem-Estar', icon: Heart, hint: 'Energia Vital',
    checkpoints: [
      { label: 'Nível de Estresse Controlado', weight: 4 },
      { label: 'Momentos de Lazer Real', weight: 3 },
      { label: 'Presença e Mindfulness', weight: 3 }
    ]
  },
  { 
    key: 'career', label: 'Carreira', icon: Briefcase, hint: 'Impacto Profissional',
    checkpoints: [
      { label: 'Trabalho de Alto Impacto', weight: 4 },
      { label: 'Avanço em Projetos Longos', weight: 3 },
      { label: 'Networking/Conexões Úteis', weight: 3 }
    ]
  },
  { 
    key: 'growth', label: 'Evolução', icon: TrendingUp, hint: 'Auto-domínio',
    checkpoints: [
      { label: 'Hábitos Angulares Batidos', weight: 4 },
      { label: 'Novo Aprendizado Prático', weight: 3 },
      { label: 'Superação de Limites', weight: 3 }
    ]
  },
  { 
    key: 'relationships', label: 'Social', icon: Users, hint: 'Conexões Reais',
    checkpoints: [
      { label: 'Tempo de Qualidade (Presencial)', weight: 4 },
      { label: 'Comunicação Clara e Honesta', weight: 3 },
      { label: 'Contribuição/Suporte a Outros', weight: 3 }
    ]
  },
  { 
    key: 'spirituality', label: 'Sentido', icon: Sparkles, hint: 'Propósito',
    checkpoints: [
      { label: 'Alinhamento com Valores', weight: 4 },
      { label: 'Prática Meditativa/Reflexão', weight: 3 },
      { label: 'Sentimento de Gratidão/Paz', weight: 3 }
    ]
  },
];

export function QuickLogEntry({ isOpen, onClose, onSubmit }: QuickLogEntryProps) {
  const { t, lang } = useLang();
  const dl = (d: any, f: string) => (lang === 'en' && EN_AUDIT[d.key]) ? EN_AUDIT[d.key][f] : d[f];
  const [activeChecks, setActiveChecks] = useState<Record<string, boolean>>({});
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [expandedPillar, setExpandedPillar] = useState<DomainKey | null>(null);

  const toggleCheck = (domainKey: string, checkIndex: number) => {
    const checkId = `${domainKey}-${checkIndex}`;
    setActiveChecks(prev => ({ ...prev, [checkId]: !prev[checkId] }));
  };

  const calculateDomainScore = (domain: DomainAudit) => {
    let score = 0;
    domain.checkpoints.forEach((cp, i) => {
      if (activeChecks[`${domain.key}-${i}`]) {
        score += cp.weight;
      }
    });
    return score; // Max 10
  };

  const calculateGlobalAvg = () => {
    const total = AUDIT_DOMAINS.reduce((acc, domain) => acc + calculateDomainScore(domain), 0);
    return Math.round((total / AUDIT_DOMAINS.length) * 10) / 10;
  };

  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);
    const finalScores: Record<string, number> = {};
    AUDIT_DOMAINS.forEach(domain => {
      finalScores[domain.key] = calculateDomainScore(domain);
    });

    try {
      await onSubmit(finalScores as Record<DomainKey, number>);
      setSubmitted(true);
      setTimeout(() => {
        onClose();
        setSubmitted(false);
        setActiveChecks({});
        setNote('');
      }, 1500);
    } catch {
      setIsSubmitting(false);
    }
  }, [activeChecks, onSubmit, onClose]);

  if (!isOpen) return null;

  const globalAvg = calculateGlobalAvg();

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div
        className="absolute inset-0 bg-black/60 dark:bg-black/90"
        style={{ backdropFilter: 'blur(12px)' }}
        onClick={onClose}
      />

      <div
        className="relative z-10 w-full max-w-[428px] rounded-t-[32px] border-t border-x border-neutral-200 dark:border-white/[0.08] bg-white dark:bg-[#080809] shadow-2xl overflow-hidden"
        style={{ maxHeight: '92vh' }}
      >
        {/* Header Fixo */}
        <div className="sticky top-0 z-30 bg-white/80 dark:bg-[#080809]/80 backdrop-blur-md pt-4 pb-4 px-6 border-b border-neutral-100 dark:border-white/[0.04]">
          <div className="mx-auto mb-4 h-[4px] w-12 rounded-full bg-neutral-200 dark:bg-white/10" />
          
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h2 className="text-[13px] font-outfit font-black uppercase tracking-[0.2em] text-neutral-800 dark:text-white/80">
                  Protocolo Diário
                </h2>
                <div className="px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-white/5 text-[8px] font-mono text-neutral-400 dark:text-white/30">
                  {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                </div>
              </div>
              <p className="text-[9px] font-mono text-neutral-400 dark:text-white/20 mt-1 uppercase tracking-widest">{t('quickLog.title')}</p>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex flex-col items-end">
                <span className="text-[20px] font-outfit font-black text-neutral-900 dark:text-white tabular-nums leading-none">
                  {globalAvg}
                </span>
                <span className="text-[7px] font-mono text-neutral-400 dark:text-white/20 uppercase tracking-tighter">{t('quickLog.globalImpact')}</span>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center bg-neutral-100 dark:bg-white/5 text-neutral-400">
                <X size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Conteúdo com Scroll */}
        <div className="px-5 pt-6 pb-32 space-y-3 overflow-y-auto" style={{ maxHeight: 'calc(92vh - 100px)' }}>
          
          {AUDIT_DOMAINS.map((domain) => {
            const Icon = domain.icon;
            const score = calculateDomainScore(domain);
            const isExpanded = expandedPillar === domain.key;
            
            return (
              <div 
                key={domain.key}
                className={`rounded-2xl border transition-all duration-300 ${
                  isExpanded 
                  ? 'border-neutral-300 dark:border-white/20 bg-neutral-50 dark:bg-white/[0.03]' 
                  : 'border-neutral-100 dark:border-white/[0.04] bg-transparent'
                }`}
              >
                <button 
                  onClick={() => setExpandedPillar(isExpanded ? null : domain.key)}
                  className="w-full flex items-center justify-between p-4 text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                      score > 0 ? 'bg-neutral-900 dark:bg-white text-white dark:text-black' : 'bg-neutral-100 dark:bg-white/5 text-neutral-400'
                    }`}>
                      <Icon size={18} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[11px] font-outfit font-bold uppercase tracking-wider dark:text-white/90">{dl(domain, 'label')}</span>
                      <span className="text-[8px] font-mono text-neutral-400 dark:text-white/25 uppercase tracking-tight">{dl(domain, 'hint')}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-end">
                      <span className={`text-[16px] font-outfit font-black ${score > 0 ? 'dark:text-white' : 'text-neutral-300 dark:text-white/10'}`}>
                        {score}/10
                      </span>
                    </div>
                    {isExpanded ? <ChevronUp size={14} className="opacity-20" /> : <ChevronDown size={14} className="opacity-20" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 pt-1 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex flex-col gap-2">
                      {domain.checkpoints.map((cp, idx) => {
                        const isChecked = activeChecks[`${domain.key}-${idx}`];
                        return (
                          <button
                            key={idx}
                            onClick={() => toggleCheck(domain.key, idx)}
                            className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                              isChecked 
                              ? 'bg-neutral-900 dark:bg-white border-transparent' 
                              : 'bg-white dark:bg-black/20 border-neutral-200 dark:border-white/10'
                            }`}
                          >
                            <span className={`text-[10px] font-mono font-bold uppercase tracking-wide ${
                              isChecked ? 'text-white dark:text-black' : 'text-neutral-500 dark:text-white/40'
                            }`}>
                              {(lang === 'en' && EN_AUDIT[domain.key]) ? EN_AUDIT[domain.key].cp[idx] : cp.label}
                            </span>
                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                              isChecked ? 'bg-white dark:bg-black border-transparent' : 'border-neutral-300 dark:border-white/20'
                            }`}>
                              {isChecked && <Check size={10} className="text-black dark:text-white" strokeWidth={4} />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Campo de Contexto */}
          <div className="pt-4 px-1">
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare size={12} className="text-neutral-400" />
              <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-neutral-500">{t('quickLog.mentalNote')}</span>
            </div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t('quickLog.notePh')}
              className="w-full bg-neutral-100 dark:bg-white/5 border border-transparent focus:border-neutral-300 dark:focus:border-white/10 rounded-2xl p-4 text-[12px] outline-none transition-all resize-none min-h-[100px] dark:text-white/80"
            />
          </div>
        </div>

        {/* Botão de Ação Fixo no Bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white dark:from-[#080809] via-white/90 dark:via-[#080809]/90 to-transparent pt-10">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || globalAvg === 0}
            className="w-full h-14 rounded-2xl bg-neutral-900 dark:bg-white text-white dark:text-black font-outfit font-black text-[12px] uppercase tracking-[0.25em] shadow-xl transition-all active:scale-[0.98] disabled:opacity-20 flex items-center justify-center gap-3"
          >
            {isSubmitting ? (
              <Loader2 size={18} className="animate-spin" />
            ) : submitted ? (
              <>
                <Check size={18} strokeWidth={3} />
                {t('quickLog.registered')}
              </>
            ) : (
              <>
                {t('quickLog.finish')}
              </>
            )}
          </button>
        </div>

        {/* Success Overlay */}
        {submitted && (
          <div className="absolute inset-0 z-[100] bg-white dark:bg-[#080809] flex flex-col items-center justify-center animate-in fade-in duration-500">
             <div className="w-20 h-20 rounded-[32px] bg-neutral-900 dark:bg-white flex items-center justify-center mb-6 shadow-2xl">
                <Check size={32} className="text-white dark:text-black" strokeWidth={3} />
             </div>
             <h3 className="text-lg font-outfit font-black uppercase tracking-widest dark:text-white">{t('quickLog.audited')}</h3>
             <p className="text-xs font-mono text-neutral-400 dark:text-white/20 mt-2">{t('quickLog.syncing')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
