import React, { useState } from 'react';
import { Lock, Check, Camera, Utensils, Droplets, TrendingUp, Sparkles, ShieldCheck } from 'lucide-react';
import { ScrollContainer, OrvaxHeader } from '../../../components/BaseLayout';

const ACCENT = '#22c55e';

const FEATURES = [
  { icon: Camera, title: 'Scanner IA', desc: 'Fotografe a refeição e a IA calcula calorias e macros' },
  { icon: Utensils, title: 'Diário alimentar', desc: 'Registro por refeição com base de alimentos brasileiros' },
  { icon: TrendingUp, title: 'Metas & macros', desc: 'Calorias, proteína, carbo e gordura acompanhados por dia' },
  { icon: Droplets, title: 'Hidratação & progresso', desc: 'Água, peso e evolução ao longo do tempo' },
];

const FitCalPaywall = ({ theme, toggleTheme, onUpgrade }) => {
  const [notice, setNotice] = useState(false);

  const handleUpgrade = () => {
    if (onUpgrade) { onUpgrade(); return; }
    setNotice(true);
  };

  return (
    <div className="relative w-full h-full">
      <ScrollContainer>
        <OrvaxHeader theme={theme} toggleTheme={toggleTheme} minimal />

        <div className="pb-32 flex flex-col items-center text-center" style={{ color: 'var(--text-main)' }}>

          {/* Emblema de bloqueio */}
          <div className="relative mt-6 mb-6">
            <div className="w-24 h-24 rounded-[28px] border flex items-center justify-center relative overflow-hidden"
              style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--glass-bg)', boxShadow: `0 0 40px ${ACCENT}22` }}>
              <div className="absolute inset-0" style={{ background: `radial-gradient(circle at 50% 40%, ${ACCENT}22, transparent 65%)` }} />
              <Lock size={34} strokeWidth={1.4} className="relative z-10" style={{ color: ACCENT }} />
            </div>
          </div>

          {/* Título */}
          <span className="text-[9px] font-mono tracking-[0.4em] uppercase opacity-30 mb-2 flex items-center gap-1.5">
            <Sparkles size={10} style={{ color: ACCENT }} /> Recurso Premium
          </span>
          <h1 className="text-[26px] font-outfit font-black tracking-tight leading-tight max-w-[300px]">Rastreador Nutricional</h1>
          <p className="text-[12px] font-space opacity-55 max-w-[300px] leading-relaxed mt-3">
            O módulo completo de nutrição é liberado com o plano premium. Desbloqueie e assuma o controle da sua alimentação.
          </p>

          {/* Lista de recursos */}
          <div className="w-full max-w-[340px] mt-8 space-y-2.5 px-2">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-center gap-3 p-3.5 rounded-2xl border text-left"
                style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--glass-bg)' }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ border: `1px solid ${ACCENT}33`, backgroundColor: `${ACCENT}0D` }}>
                  <Icon size={15} style={{ color: ACCENT }} />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[11px] font-bold block leading-tight">{title}</span>
                  <span className="text-[9px] font-mono opacity-40 leading-snug block mt-0.5">{desc}</span>
                </div>
                <Check size={14} className="shrink-0 opacity-40" style={{ color: ACCENT }} />
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="w-full max-w-[340px] px-2 mt-8">
            <button
              onClick={handleUpgrade}
              className="w-full py-4 rounded-2xl font-outfit font-black text-[11px] tracking-wider uppercase flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              style={{ backgroundColor: ACCENT, color: '#000', boxShadow: `0 10px 30px ${ACCENT}40` }}
            >
              <Lock size={15} /> Desbloquear Rastreador Nutricional
            </button>

            {notice && (
              <div className="mt-4 p-3 rounded-xl border text-[10px] font-mono opacity-70 flex items-center gap-2 justify-center"
                style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--glass-bg)' }}>
                <ShieldCheck size={13} style={{ color: ACCENT }} />
                Pagamento em integração. Em breve você poderá desbloquear por aqui.
              </div>
            )}

            <p className="text-[8px] font-mono opacity-25 tracking-[0.15em] uppercase mt-4">
              Acesso vitalício ao módulo · pagamento único
            </p>
          </div>
        </div>
      </ScrollContainer>
    </div>
  );
};

export default FitCalPaywall;
