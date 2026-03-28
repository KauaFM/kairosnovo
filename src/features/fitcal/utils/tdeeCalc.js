const ACTIVITY_FACTORS = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

const GOAL_ADJUST = {
  lose_weight: -500,
  maintain: 0,
  gain_muscle: 300,
};

export function calcBMR(weightKg, heightCm, age, gender) {
  if (gender === 'male') {
    return 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  }
  return 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
}

export function calcTDEE(bmr, activityLevel) {
  return Math.round(bmr * (ACTIVITY_FACTORS[activityLevel] || 1.55));
}

export function calcDailyCalories(tdee, goal) {
  return tdee + (GOAL_ADJUST[goal] || 0);
}

export function calcMacros(dailyCalories) {
  return {
    protein_g: Math.round((dailyCalories * 0.25) / 4),
    carbs_g: Math.round((dailyCalories * 0.45) / 4),
    fat_g: Math.round((dailyCalories * 0.30) / 9),
  };
}

export function calcAge(birthDate) {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export function generatePlan(data) {
  const { weight_kg, height_cm, birth_date, gender, goal, activity_level } = data;
  const age = calcAge(birth_date);
  const bmr = Math.round(calcBMR(weight_kg, height_cm, age, gender));
  const tdee = calcTDEE(bmr, activity_level);
  const daily_calories = calcDailyCalories(tdee, goal);
  const macros = calcMacros(daily_calories);

  return {
    daily_calories,
    bmr,
    tdee,
    water_ml: 2000,
    weight_kg,
    ...macros,
  };
}

export const ACTIVITY_LEVELS = [
  { value: 'sedentary', label: 'Sedentario', desc: 'Pouco ou nenhum exercicio' },
  { value: 'light', label: 'Leve', desc: '1-3 dias/semana' },
  { value: 'moderate', label: 'Moderado', desc: '3-5 dias/semana' },
  { value: 'active', label: 'Ativo', desc: '6-7 dias/semana' },
  { value: 'very_active', label: 'Muito Ativo', desc: 'Exercicio intenso diario' },
];

export const GOALS = [
  { value: 'lose_weight', label: 'Emagrecer', desc: '-500 kcal/dia' },
  { value: 'maintain', label: 'Manter Peso', desc: 'TDEE equilibrado' },
  { value: 'gain_muscle', label: 'Ganhar Massa', desc: '+300 kcal/dia' },
];
