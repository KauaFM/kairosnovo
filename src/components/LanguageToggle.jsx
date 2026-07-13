// ============================================================
// ORVAX — LanguageToggle
// Botão PT/EN. Mostra o idioma para o qual vai trocar.
// variant: 'glass' (sobre fundo escuro, ex: Login) | 'default' (temático).
// ============================================================

import React from 'react';
import { Languages } from 'lucide-react';
import { useLang } from '../i18n/LanguageContext';

const LanguageToggle = ({ variant = 'default', className = '' }) => {
  const { lang, toggle } = useLang();
  const next = lang === 'pt' ? 'EN' : 'PT';

  const glass = variant === 'glass';
  const style = glass
    ? { borderColor: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.9)' }
    : { borderColor: 'var(--border-color)', color: 'var(--text-main)', backgroundColor: 'var(--glass-bg)' };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={lang === 'pt' ? 'Switch to English' : 'Mudar para Português'}
      className={`flex items-center gap-1.5 h-9 px-3 rounded-xl border text-[10px] font-mono font-bold uppercase tracking-widest transition-all hover:opacity-100 opacity-80 active:scale-95 ${className}`}
      style={style}
    >
      <Languages size={13} strokeWidth={2} />
      {next}
    </button>
  );
};

export default LanguageToggle;
