import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, Camera, Utensils, Droplets, TrendingUp } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { getEntitlement, tierHasFeature } from '../../../services/entitlements';
import { useLang } from '../../../i18n/LanguageContext';
import FitCalHome from './FitCalHome';
import FeatureLocked from '../../../components/FeatureLocked';

// Gate do Rastreador Nutricional (recurso do plano Completo).
// O app NÃO vende: se o plano não inclui, mostra o FeatureLocked
// (preview + "te enviamos o link por e-mail"). Fonte: profiles.plan.
const FitCalGate = (props) => {
  const { t } = useLang();
  const [status, setStatus] = useState('loading'); // loading | locked | unlocked

  const check = useCallback(async () => {
    try {
      const { tier } = await getEntitlement();
      setStatus(tierHasFeature(tier, 'fitcal') ? 'unlocked' : 'locked');
    } catch (err) {
      console.error('[FitCalGate] falha ao checar acesso:', err);
      setStatus('locked');
    }
  }, []);

  useEffect(() => { check(); }, [check]);

  // Realtime: quando o webhook (pós-compra na LP) atualiza plan/is_premium,
  // libera na hora, sem precisar reabrir o app.
  useEffect(() => {
    let channel;
    let alive = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !alive) return;
      channel = supabase
        .channel(`fitcal-access-${session.user.id}`)
        .on('postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${session.user.id}` },
          () => { check(); }
        )
        .subscribe();
    })();
    return () => { alive = false; if (channel) channel.unsubscribe(); };
  }, [check]);

  if (status === 'loading') {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center" style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-main)' }}>
        <Loader2 size={22} className="animate-spin opacity-30 mb-3" />
        <span className="text-[8px] font-mono opacity-25 tracking-[0.3em] uppercase">verificando acesso</span>
      </div>
    );
  }

  if (status === 'locked') {
    return (
      <FeatureLocked
        feature="fitcal"
        tier="completo"
        theme={props.theme}
        toggleTheme={props.toggleTheme}
        badge={t('fitcalPaywall.badge')}
        title={t('fitcalPaywall.title')}
        subtitle={t('fitcalPaywall.subtitle')}
        features={[
          { icon: Camera, title: t('fitcalPaywall.features.scanner.title'), desc: t('fitcalPaywall.features.scanner.desc') },
          { icon: Utensils, title: t('fitcalPaywall.features.diary.title'), desc: t('fitcalPaywall.features.diary.desc') },
          { icon: TrendingUp, title: t('fitcalPaywall.features.macros.title'), desc: t('fitcalPaywall.features.macros.desc') },
          { icon: Droplets, title: t('fitcalPaywall.features.hydration.title'), desc: t('fitcalPaywall.features.hydration.desc') },
        ]}
      />
    );
  }

  return <FitCalHome {...props} />;
};

export default FitCalGate;
