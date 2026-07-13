// ============================================================
// ORVAX — LanguageContext (i18n leve, sem dependência)
// Fornece: lang ('pt'|'en'), setLang, toggle e t(chave, vars).
// Persiste a escolha em localStorage e ajusta <html lang>.
// ============================================================

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { translations } from './translations';

const LanguageContext = createContext(null);
const STORAGE_KEY = 'orvax_lang';

const getInitialLang = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'pt' || saved === 'en') return saved;
    // primeiro acesso: segue o idioma do navegador (en → inglês, resto → pt)
    const nav = (navigator.language || 'pt').toLowerCase();
    return nav.startsWith('en') ? 'en' : 'pt';
  } catch {
    return 'pt';
  }
};

const applyHtmlLang = (l) => {
  try { document.documentElement.lang = l === 'en' ? 'en' : 'pt-BR'; } catch { /* ssr-safe */ }
};

export const LanguageProvider = ({ children }) => {
  const [lang, setLangState] = useState(getInitialLang);

  const setLang = useCallback((l) => {
    const next = l === 'en' ? 'en' : 'pt';
    setLangState(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* ignore */ }
    applyHtmlLang(next);
  }, []);

  const toggle = useCallback(() => {
    setLangState((prev) => {
      const next = prev === 'pt' ? 'en' : 'pt';
      try { localStorage.setItem(STORAGE_KEY, next); } catch { /* ignore */ }
      applyHtmlLang(next);
      return next;
    });
  }, []);

  // t('secao.chave', { var }) — busca por caminho pontuado, com fallback pt → chave.
  const t = useCallback((key, vars) => {
    if (!key) return '';
    const path = String(key).split('.');
    const dig = (obj) => path.reduce((o, k) => (o == null ? undefined : o[k]), obj);
    let val = dig(translations[lang]);
    if (val == null) val = dig(translations.pt);
    if (val == null) return key; // chave ainda não traduzida → mostra a chave (visível no dev)
    if (vars && typeof val === 'string') {
      val = val.replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? String(vars[k]) : `{${k}}`));
    }
    return val;
  }, [lang]);

  const value = useMemo(() => ({ lang, setLang, toggle, t }), [lang, setLang, toggle, t]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

// Hook. Fora do provider, devolve um fallback seguro (pt, t = identidade).
export const useLang = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) return { lang: 'pt', setLang: () => {}, toggle: () => {}, t: (k) => k };
  return ctx;
};
