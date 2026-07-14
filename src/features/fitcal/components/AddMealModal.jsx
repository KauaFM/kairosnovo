import React, { useState } from 'react';
import { X, Search, Plus, Loader2 } from 'lucide-react';
import { searchFoods, logFood, logExternalFood } from '../services/foodServiceV2';
import { useLang } from '../../../i18n/LanguageContext';

const AddMealModal = ({ open, mealType, onClose, onAdded }) => {
  const { t } = useLang();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedFood, setSelectedFood] = useState(null);
  const [quantity, setQuantity] = useState('100');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState(null);

  if (!open) return null;

  const MEAL_LABELS = { breakfast: t('fitcal.meals.breakfast'), lunch: t('fitcal.meals.lunch'), dinner: t('fitcal.meals.dinner'), snack: t('fitcal.meals.snack') };

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const data = await searchFoods(query.trim());
      setResults(data);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setSearching(false);
    }
  };

  const handleAdd = async () => {
    if (!selectedFood || !quantity) return;
    setAdding(true);
    setError(null);
    try {
      const grams = parseFloat(quantity);
      if (selectedFood.id) {
        // Já está no catálogo
        await logFood({ foodId: selectedFood.id, mealType, grams, source: 'search' });
      } else {
        // Externo (OpenFoodFacts) — importa e loga em 1 passo
        await logExternalFood({ ext: selectedFood, mealType, grams, source: 'search' });
      }
      onAdded?.();
      onClose();
    } catch (err) {
      console.error('Add meal error:', err);
      setError(err?.message || JSON.stringify(err) || t('fitcal.unknownError'));
    } finally {
      setAdding(false);
    }
  };

  // V2: searchFoods retorna calories_100g/protein_100g/carbs_100g/fat_100g
  const calcPreview = () => {
    if (!selectedFood || !quantity) return null;
    const ratio = parseFloat(quantity) / 100;
    const cal = selectedFood.calories_100g ?? selectedFood.calories ?? 0;
    const p   = selectedFood.protein_100g  ?? selectedFood.protein_g ?? 0;
    const c   = selectedFood.carbs_100g    ?? selectedFood.carbs_g   ?? 0;
    const f   = selectedFood.fat_100g      ?? selectedFood.fat_g     ?? 0;
    return {
      calories: Math.round(cal * ratio),
      protein: (p * ratio).toFixed(1),
      carbs: (c * ratio).toFixed(1),
      fat: (f * ratio).toFixed(1),
    };
  };

  const preview = calcPreview();

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-[428px] max-h-[80vh] overflow-y-auto rounded-t-xl border-t border-x p-5 pb-8"
        style={{ backgroundColor: 'var(--bg-color)', borderColor: 'var(--border-color)', scrollbarWidth: 'none' }}>

        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold tracking-wider">{t('fitcal.addFood')}</h2>
            <span className="text-[9px] font-mono opacity-40 tracking-widest">{MEAL_LABELS[mealType] || mealType}</span>
          </div>
          <button onClick={onClose} className="opacity-40 hover:opacity-100 transition-opacity">
            <X size={20} />
          </button>
        </div>

        {/* Search */}
        {!selectedFood && (
          <>
            <div className="flex gap-2 mb-4">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder={t('fitcal.searchFoodPh')}
                className="flex-1 text-[12px] font-mono bg-transparent border rounded-sm px-3 py-2.5 outline-none transition-all focus:border-[#22c55e]/50"
                style={{ borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
              />
              <button
                onClick={handleSearch}
                disabled={searching}
                className="px-3 rounded-sm transition-all"
                style={{ backgroundColor: 'var(--text-main)', color: 'var(--bg-color)' }}
              >
                {searching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              </button>
            </div>

            {/* Results */}
            <div className="space-y-1 max-h-60 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
              {results.map((food, i) => (
                <button
                  key={food.id ?? `${food.name}-${i}`}
                  onClick={() => setSelectedFood(food)}
                  className="w-full text-left flex items-center justify-between px-3 py-2.5 rounded-sm border transition-all hover:border-[#22c55e]/30"
                  style={{ backgroundColor: 'var(--glass-bg)', borderColor: 'var(--border-color)' }}
                >
                  <div className="min-w-0 flex-1">
                    <span className="text-[11px] font-bold block truncate">
                      {food.name}
                      {food.verified && <span className="ml-1 text-[#22c55e]">✓</span>}
                    </span>
                    <span className="text-[9px] font-mono opacity-40">
                      {food.brand && `${food.brand} · `}
                      {food.default_portion_label || '100g'} · {t('fitcal.per100g')}
                    </span>
                  </div>
                  <div className="text-right ml-2">
                    <span className="text-[11px] font-bold font-mono">{Math.round(food.calories_100g ?? food.calories ?? 0)}</span>
                    <span className="text-[8px] font-mono opacity-40 block">KCAL</span>
                  </div>
                </button>
              ))}
              {results.length === 0 && query && !searching && (
                <p className="text-center py-4 text-[10px] font-mono opacity-40">{t('fitcal.noResults')}</p>
              )}
            </div>
          </>
        )}

        {/* Quantity selector */}
        {selectedFood && (
          <div className="space-y-4">
            <div className="px-3 py-3 rounded-sm border" style={{ backgroundColor: 'var(--glass-bg)', borderColor: 'var(--border-color)' }}>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[12px] font-bold block">{selectedFood.name}</span>
                  <span className="text-[9px] font-mono opacity-40">{selectedFood.brand}</span>
                </div>
                <button onClick={() => setSelectedFood(null)} className="text-[9px] font-mono opacity-40 hover:opacity-100">{t('fitcal.change')}</button>
              </div>
            </div>

            <div>
              <label className="text-[9px] font-mono opacity-50 tracking-wider block mb-1.5">{t('fitcal.quantityG')}</label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full text-[14px] font-mono font-bold bg-transparent border rounded-sm px-3 py-2.5 outline-none text-center transition-all focus:border-[#22c55e]/50"
                style={{ borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
              />
              {/* Quick quantities */}
              <div className="flex gap-2 mt-2">
                {['50', '100', '150', '200', '300'].map((q) => (
                  <button
                    key={q}
                    onClick={() => setQuantity(q)}
                    className={`flex-1 py-1.5 rounded-sm text-[10px] font-mono border transition-all ${quantity === q ? 'border-[#22c55e]/40 text-[#22c55e]' : 'opacity-40'}`}
                    style={{
                      backgroundColor: quantity === q ? 'rgba(34,197,94,0.08)' : 'transparent',
                      borderColor: quantity === q ? 'rgba(34,197,94,0.3)' : 'var(--border-color)',
                    }}
                  >
                    {q}g
                  </button>
                ))}
              </div>
            </div>

            {/* Macro preview */}
            {preview && (
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'KCAL', value: preview.calories, color: '#22c55e' },
                  { label: 'PROT', value: `${preview.protein}g`, color: '#00B4D8' },
                  { label: 'CARB', value: `${preview.carbs}g`, color: '#F59E0B' },
                  { label: t('fitcal.fatMacro'), value: `${preview.fat}g`, color: '#EF4444' },
                ].map((m) => (
                  <div key={m.label} className="text-center p-2 rounded-sm border" style={{ backgroundColor: 'var(--glass-bg)', borderColor: 'var(--border-color)' }}>
                    <span className="text-[13px] font-bold font-mono block" style={{ color: m.color }}>{m.value}</span>
                    <span className="text-[8px] font-mono opacity-40 tracking-wider">{m.label}</span>
                  </div>
                ))}
              </div>
            )}

            {error && (
              <p className="text-[10px] font-mono text-red-400 text-center px-2 py-1 rounded border border-red-400/30 bg-red-400/10">
                {error}
              </p>
            )}

            <button
              onClick={handleAdd}
              disabled={adding || !quantity}
              className="w-full py-3 rounded-sm font-bold text-[12px] tracking-wider transition-all disabled:opacity-30 flex items-center justify-center gap-2"
              style={{ backgroundColor: 'var(--text-main)', color: 'var(--bg-color)' }}
            >
              <Plus size={14} />
              {adding ? t('fitcal.adding') : t('fitcal.add')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AddMealModal;
