// ============================================================
// ORVAX — Banner de conexão
// Aparece quando o dispositivo fica sem internet. Antes o app
// só girava/ficava vazio sem explicar (audit P11).
// ============================================================
import React, { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { useLang } from '../i18n/LanguageContext';

export default function OfflineBanner() {
  const { t } = useLang();
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  if (online) return null;

  return (
    <div
      className="fixed left-0 right-0 z-[9999] flex items-center justify-center gap-2 py-2 bg-red-600 text-white text-[11px] font-mono font-bold tracking-wide"
      style={{ top: 'env(safe-area-inset-top, 0px)' }}
      role="status"
    >
      <WifiOff size={13} />
      {t('common.offline')}
    </div>
  );
}
