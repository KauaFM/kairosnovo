// Estado do setup nutricional (perfil + peso + preferências + plano).
// Usado pelo FitCal (banner de configuração) e pelo VITALIS (contexto).
import { useState, useEffect, useCallback } from 'react';
import { getNutritionSetup } from '../services/nutritionProfile';

export function useNutritionSetup() {
  const [setup, setSetup] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setSetup(await getNutritionSetup());
    } catch (e) {
      console.error('useNutritionSetup:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { setup, loading, refresh, needsOnboarding: !!setup?.needsOnboarding };
}
