export function calcNutritionForQuantity(food, quantityG) {
  const ratio = quantityG / (food.serving_size_g || 100);
  return {
    calories: +(food.calories * ratio).toFixed(2),
    protein_g: +(food.protein_g * ratio).toFixed(2),
    carbs_g: +(food.carbs_g * ratio).toFixed(2),
    fat_g: +(food.fat_g * ratio).toFixed(2),
  };
}

export function calcDailyTotals(entries) {
  const flat = Object.values(entries).flat();
  return flat.reduce(
    (acc, e) => ({
      calories: acc.calories + (e.calories ?? 0),
      protein_g: acc.protein_g + (e.protein_g ?? 0),
      carbs_g: acc.carbs_g + (e.carbs_g ?? 0),
      fat_g: acc.fat_g + (e.fat_g ?? 0),
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
  );
}

export function calcRemainingCalories(consumed, goal) {
  return Math.max(0, goal - consumed);
}

export function calcMacroPercentage(current, goal) {
  if (!goal || goal === 0) return 0;
  return Math.min((current / goal) * 100, 100);
}

export const MEAL_TYPES = [
  { value: 'breakfast', label: 'Cafe da Manha', icon: '☕', time: '07:00' },
  { value: 'lunch', label: 'Almoco', icon: '🍽️', time: '12:00' },
  { value: 'dinner', label: 'Jantar', icon: '🌙', time: '19:00' },
  { value: 'snack', label: 'Lanche', icon: '🍎', time: '15:00' },
];
