// ============================================================
// ORVAX FitCal — Motor de metas nutricionais (VITALIS · N1)
//
// Mifflin-St Jeor → TDEE → ajuste por objetivo → macros.
//
// GUARD-RAILS DE SEGURANÇA (não remover):
//  · piso calórico: 1200 kcal (F) / 1500 kcal (M) — abaixo disso é
//    risco real de saúde e é onde apps de dieta causam dano;
//  · déficit máximo de 25% do TDEE (perda sustentável);
//  · gordura mínima 0,8 g/kg (essencial/hormonal);
//  · proteína por PESO (1,6-2,0 g/kg), não % fixa — preserva massa
//    magra no déficit.
// O app faz ESTIMATIVAS educacionais, não prescrição.
// ============================================================

const ACTIVITY_FACTORS = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

// Proteína (g/kg de peso corporal) por objetivo
const PROTEIN_PER_KG = {
  lose_weight: 2.0,
  maintain: 1.6,
  gain_muscle: 1.8,
};

const CALORIE_FLOOR = { male: 1500, female: 1200 };
const DEFICIT_MAX_PCT = 0.25;
const SURPLUS_PCT = 0.12;
const FAT_MIN_PER_KG = 0.8;

export function calcBMR(weightKg, heightCm, age, gender) {
  if (gender === 'male') {
    return 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  }
  return 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
}

export function calcTDEE(bmr, activityLevel) {
  return Math.round(bmr * (ACTIVITY_FACTORS[activityLevel] || 1.55));
}

/**
 * Calorias diárias COM guard-rails.
 * @returns {{ calories:number, floored:boolean }} floored = o piso de
 *   segurança elevou a meta (o VITALIS explica isso ao usuário).
 */
export function calcDailyCalories(tdee, goal, gender = 'female') {
  let target = tdee;
  if (goal === 'lose_weight') target = Math.round(tdee * (1 - DEFICIT_MAX_PCT));
  else if (goal === 'gain_muscle') target = Math.round(tdee * (1 + SURPLUS_PCT));

  const floor = CALORIE_FLOOR[gender] ?? CALORIE_FLOOR.female;
  if (target < floor) return { calories: floor, floored: true };
  return { calories: target, floored: false };
}

/**
 * Macros ancorados no PESO (não em % arbitrária):
 * proteína por objetivo · gordura ≥ 0,8 g/kg · carbo = o restante.
 */
export function calcMacros(dailyCalories, weightKg, goal = 'maintain') {
  const w = Math.max(35, Number(weightKg) || 70);
  const protein_g = Math.round(w * (PROTEIN_PER_KG[goal] ?? 1.6));

  const fatFromPct = (dailyCalories * 0.27) / 9;
  const fat_g = Math.round(Math.max(w * FAT_MIN_PER_KG, fatFromPct));

  const usedKcal = protein_g * 4 + fat_g * 9;
  const carbs_g = Math.max(50, Math.round((dailyCalories - usedKcal) / 4));

  return { protein_g, carbs_g, fat_g };
}

export function calcAge(birthDate) {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

/** Água sugerida: 35 ml/kg (passo de 100 ml, entre 1,5 L e 4 L). */
export function calcWater(weightKg) {
  const ml = Math.round(((Number(weightKg) || 70) * 35) / 100) * 100;
  return Math.min(4000, Math.max(1500, ml));
}

/** Gera o plano completo a partir dos dados do perfil. */
export function generatePlan(data) {
  const { weight_kg, height_cm, birth_date, gender, goal, activity_level } = data;
  const age = calcAge(birth_date);
  const bmr = Math.round(calcBMR(weight_kg, height_cm, age, gender));
  const tdee = calcTDEE(bmr, activity_level);
  const { calories: daily_calories, floored } = calcDailyCalories(tdee, goal, gender);
  const macros = calcMacros(daily_calories, weight_kg, goal);

  return {
    daily_calories,
    bmr,
    tdee,
    water_ml: calcWater(weight_kg),
    weight_kg,
    goal,
    activity_level,
    safety_floor: floored,
    source: 'auto',
    ...macros,
  };
}

export const ACTIVITY_LEVELS = [
  { value: 'sedentary', label: 'Sedentário', desc: 'Pouco ou nenhum exercício' },
  { value: 'light', label: 'Leve', desc: '1-3 dias/semana' },
  { value: 'moderate', label: 'Moderado', desc: '3-5 dias/semana' },
  { value: 'active', label: 'Ativo', desc: '6-7 dias/semana' },
  { value: 'very_active', label: 'Muito Ativo', desc: 'Exercício intenso diário' },
];

export const GOALS = [
  { value: 'lose_weight', label: 'Emagrecer', desc: 'Déficit seguro e sustentável' },
  { value: 'maintain', label: 'Manter Peso', desc: 'Equilíbrio no TDEE' },
  { value: 'gain_muscle', label: 'Ganhar Massa', desc: 'Superávit controlado' },
];
