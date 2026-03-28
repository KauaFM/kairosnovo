import React, { useState, useEffect } from 'react';
import { Utensils, Camera, Search, TrendingUp, Flame, Plus, Loader2 } from 'lucide-react';
import { ScrollContainer, OrvaxHeader } from '../../../components/BaseLayout';
import { supabase } from '../../../lib/supabase';
import { useFoodDiary } from '../hooks/useFoodDiary';
import { useNutritionPlan } from '../hooks/useNutritionPlan';
import { useStreak } from '../hooks/useStreak';
import { useWater } from '../hooks/useWeight';
import { addWater, deleteLastWater } from '../services/weightService';
import { updateStreak } from '../services/streakService';
import { deleteMealEntry, updateCalorieGoal, updateWaterGoal } from '../services/foodService';
import { saveAIResults } from '../services/aiService';
import CalorieSummary from '../components/CalorieSummary';
import MacroBar from '../components/MacroBar';
import FoodDiary from '../components/FoodDiary';
import WaterTracker from '../components/WaterTracker';
import StreakBadge from '../components/StreakBadge';
import AddMealModal from '../components/AddMealModal';
import FoodScanner from '../components/FoodScanner';
import ProgressPage from './ProgressPage';

const FitCalHome = ({ theme, toggleTheme, onModalChange }) => {
  const { entries, totals, loading: diaryLoading, refresh: refreshDiary } = useFoodDiary();
  const { plan, loading: planLoading, refresh: refreshPlan } = useNutritionPlan();
  const { streak, refresh: refreshStreak } = useStreak();
  const { totalMl, refresh: refreshWater } = useWater();

  const [view, setView] = useState('home');
  const [showAddMeal, setShowAddMeal] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [activeMealType, setActiveMealType] = useState('lunch');
  const [userId, setUserId] = useState(null);
  const [showFab, setShowFab] = useState(false);
  const [localCalorieGoal, setLocalCalorieGoal] = useState(null);
  const [localWaterGoal, setLocalWaterGoal] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setUserId(session.user.id);
    });
  }, []);

  const handleAddMeal = (mealType) => {
    setActiveMealType(mealType);
    setShowAddMeal(true);
    setShowFab(false);
    onModalChange?.(true);
  };

  const handleDeleteEntry = async (entryId) => {
    await deleteMealEntry(entryId);
    refreshDiary();
  };

  const handleMealAdded = async () => {
    refreshDiary();
    if (userId) {
      await updateStreak(userId);
      refreshStreak();
    }
  };

  const handleWaterAdd = async (ml) => {
    if (!userId) return;
    await addWater(userId, ml);
    refreshWater();
  };

  const handleWaterGoalChange = async (newGoal) => {
    setLocalWaterGoal(newGoal); // atualiza UI imediatamente
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await updateWaterGoal(session.user.id, newGoal);
    refreshPlan();
  };

  const handleWaterRemove = async () => {
    if (!userId) return;
    await deleteLastWater(userId);
    refreshWater();
  };

  const handleScanResult = async (items, mealType, photoUrl) => {
    if (!userId) return;
    await saveAIResults(userId, items, mealType, photoUrl);
    refreshDiary();
    await updateStreak(userId);
    refreshStreak();
  };

  const calorieGoal = localCalorieGoal ?? plan?.daily_calories ?? 2000;

  // Sync local goals when plan loads
  useEffect(() => {
    if (plan?.daily_calories) setLocalCalorieGoal(plan.daily_calories);
  }, [plan?.daily_calories]);

  useEffect(() => {
    if (plan?.water_ml) setLocalWaterGoal(plan.water_ml);
  }, [plan?.water_ml]);

  const handleGoalChange = async (newGoal) => {
    setLocalCalorieGoal(newGoal); // atualiza a UI imediatamente
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await updateCalorieGoal(session.user.id, newGoal);
    refreshPlan();
  };

  // Sub-views
  if (view === 'progress') {
    return (
      <div className="relative w-full h-full">
        <ScrollContainer>
          <OrvaxHeader theme={theme} toggleTheme={toggleTheme} minimal />
          <ProgressPage onBack={() => setView('home')} />
        </ScrollContainer>
      </div>
    );
  }

  const isLoading = diaryLoading || planLoading;

  return (
    <div className="relative w-full h-full">
      <ScrollContainer>
        <OrvaxHeader theme={theme} toggleTheme={toggleTheme} />

        {/* Title */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Utensils size={16} className="text-[#22c55e]" />
              <h2 className="text-xs font-bold tracking-[0.2em] uppercase opacity-60">FitCal</h2>
            </div>
            <p className="text-[10px] font-mono opacity-30 tracking-wider">RASTREADOR NUTRICIONAL INTELIGENTE</p>
          </div>
          <StreakBadge days={streak.streak_days || 0} points={streak.total_points || 0} />
        </div>

        {isLoading ? (
          <div className="text-center py-16">
            <Loader2 size={24} className="animate-spin mx-auto opacity-30 mb-3" />
            <span className="text-[10px] font-mono opacity-40 tracking-wider">CARREGANDO DADOS...</span>
          </div>
        ) : (
          <>
            {/* Calorie ring */}
            <CalorieSummary consumed={totals.calories} goal={calorieGoal} onGoalChange={handleGoalChange} />

            {/* Macro bars */}
            <div className="space-y-2 mb-5">
              <MacroBar label="Proteina" current={totals.protein_g} goal={plan?.protein_g || 120} color="#00B4D8" />
              <MacroBar label="Carbs" current={totals.carbs_g} goal={plan?.carbs_g || 250} color="#F59E0B" />
              <MacroBar label="Gordura" current={totals.fat_g} goal={plan?.fat_g || 65} color="#EF4444" />
            </div>

            {/* Water tracker */}
            <div className="mb-5">
              <WaterTracker totalMl={totalMl} goalMl={localWaterGoal ?? plan?.water_ml ?? 2000} onAdd={handleWaterAdd} onRemove={handleWaterRemove} onGoalChange={handleWaterGoalChange} />
            </div>

            {/* Quick actions */}
            <div className="flex gap-2 mb-5">
              <button
                onClick={() => setView('progress')}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-sm border transition-all hover:border-[#22c55e]/30"
                style={{ backgroundColor: 'var(--glass-bg)', borderColor: 'var(--border-color)' }}
              >
                <TrendingUp size={14} className="text-[#22c55e]" />
                <span className="text-[10px] font-mono font-bold tracking-wider">PROGRESSO</span>
              </button>
            </div>

            {/* Food diary */}
            <div className="mb-5">
              <h3 className="text-[10px] font-mono font-bold tracking-wider opacity-60 mb-3">DIARIO ALIMENTAR</h3>
              <FoodDiary entries={entries} onAddMeal={handleAddMeal} onDeleteEntry={handleDeleteEntry} />
            </div>
          </>
        )}
      </ScrollContainer>

      {/* FAB */}
      <div className="fixed bottom-24 right-1/2 translate-x-[180px] z-40">
        {showFab && (
          <div className="absolute bottom-14 right-0 space-y-2 mb-2">
            <button
              onClick={() => { setShowScanner(true); setShowFab(false); onModalChange?.(true); }}
              className="flex items-center gap-2 px-3 py-2 rounded-sm border whitespace-nowrap transition-all"
              style={{ backgroundColor: 'var(--bg-color)', borderColor: 'var(--border-color)', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}
            >
              <Camera size={14} className="text-[#a855f7]" />
              <span className="text-[10px] font-mono font-bold">SCANNER IA</span>
            </button>
            <button
              onClick={() => handleAddMeal('lunch')}
              className="flex items-center gap-2 px-3 py-2 rounded-sm border whitespace-nowrap transition-all"
              style={{ backgroundColor: 'var(--bg-color)', borderColor: 'var(--border-color)', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}
            >
              <Search size={14} className="text-[#3b82f6]" />
              <span className="text-[10px] font-mono font-bold">BUSCAR ALIMENTO</span>
            </button>
          </div>
        )}
        <button
          onClick={() => setShowFab(!showFab)}
          className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110 active:scale-95 ${showFab ? 'rotate-45' : ''}`}
          style={{ backgroundColor: '#22c55e', color: '#000', boxShadow: '0 0 20px rgba(34,197,94,0.4)' }}
        >
          <Plus size={22} strokeWidth={2.5} />
        </button>
      </div>

      {/* Modals */}
      <AddMealModal
        open={showAddMeal}
        mealType={activeMealType}
        onClose={() => { setShowAddMeal(false); onModalChange?.(false); }}
        onAdded={handleMealAdded}
      />

      {showScanner && userId && (
        <FoodScanner
          userId={userId}
          mealType={activeMealType}
          onResult={handleScanResult}
          onClose={() => { setShowScanner(false); onModalChange?.(false); }}
        />
      )}
    </div>
  );
};

export default FitCalHome;
