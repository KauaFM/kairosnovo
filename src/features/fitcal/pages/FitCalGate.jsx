import React, { useState, useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import FitCalHome from './FitCalHome';
import FitCalPaywall from './FitCalPaywall';

// Gate de acesso ao módulo Rastreador Nutricional (recurso premium).
// Libera só quando profiles.is_premium = true. Caso contrário, mostra o paywall.
const FitCalGate = (props) => {
  const [status, setStatus] = useState('loading'); // loading | locked | unlocked

  const check = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setStatus('locked'); return; }
      const { data } = await supabase
        .from('profiles')
        .select('is_premium')
        .eq('id', session.user.id)
        .maybeSingle();
      setStatus(data?.is_premium ? 'unlocked' : 'locked');
    } catch (err) {
      console.error('[FitCalGate] falha ao checar acesso:', err);
      setStatus('locked');
    }
  }, []);

  useEffect(() => { check(); }, [check]);

  // Realtime: se o acesso for concedido (pagamento/admin), libera na hora.
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
          (payload) => { setStatus(payload.new?.is_premium ? 'unlocked' : 'locked'); }
        )
        .subscribe();
    })();
    return () => { alive = false; if (channel) channel.unsubscribe(); };
  }, []);

  if (status === 'loading') {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center" style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-main)' }}>
        <Loader2 size={22} className="animate-spin opacity-30 mb-3" />
        <span className="text-[8px] font-mono opacity-25 tracking-[0.3em] uppercase">verificando acesso</span>
      </div>
    );
  }

  if (status === 'locked') {
    return <FitCalPaywall theme={props.theme} toggleTheme={props.toggleTheme} />;
  }

  return <FitCalHome {...props} />;
};

export default FitCalGate;
