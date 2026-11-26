import type { BodyProfile } from '@/features/routine/profileGoalsStore'

export type MealLogItem = {
  id: string
  user_id: string
  meal_name: string
  description: string
  calories: number
  protein_g: number
  carbs_g: number
  fats_g: number
  logged_at: string
}

export type MealPreset = {
  id: string
  name: string
  calories: number
  protein_g: number
  carbs_g: number
  fats_g: number
}

export const DEFAULT_PRESETS: MealPreset[] = [
  { id: 'whey-banana', name: 'Shake Whey + Banana', calories: 230, protein_g: 28, carbs_g: 26, fats_g: 2 },
  { id: 'yogurt-avena', name: 'Yogurt Greco + Avena', calories: 360, protein_g: 26, carbs_g: 42, fats_g: 8 },
  { id: 'pollo-riso', name: 'Pollo + Riso Basmati', calories: 580, protein_g: 48, carbs_g: 68, fats_g: 10 },
  { id: 'uova-pane', name: 'Uova + Pane Integrale', calories: 410, protein_g: 24, carbs_g: 34, fats_g: 18 },
]

export const DAILY_GOALS = {
  calories: 2400,
  protein_g: 165,
  carbs_g: 260,
  fats_g: 75,
}

export type GoalMode = 'cut' | 'bulk' | 'maintain'

export interface MacroGoals {
  calories: number
  protein_g: number
  carbs_g: number
  fats_g: number
  bmr: number
  tdee: number
  goalMode: GoalMode
  isPersonalized: boolean
}

export function computeMacroGoals(
  profile: BodyProfile,
  weeklyWorkouts: number = 4,
): MacroGoals {
  if (!profile.weightKg || !profile.heightCm) {
    return {
      ...DAILY_GOALS,
      bmr: 1750,
      tdee: DAILY_GOALS.calories,
      goalMode: 'maintain',
      isPersonalized: false,
    }
  }

  const age = profile.age ?? 25
  const sexOffset = profile.sex === 'f' ? -161 : 5
  const bmr = Math.round(10 * profile.weightKg + 6.25 * profile.heightCm - 5 * age + sexOffset)
  const activityFactor = weeklyWorkouts >= 5 ? 1.7 : weeklyWorkouts >= 3 ? 1.55 : 1.375
  const tdee = Math.round(bmr * activityFactor)

  let goalMode: GoalMode = 'maintain'
  let targetCalories = tdee
  let proteinPerKg = 1.8

  if (profile.targetWeightKg !== null) {
    const diff = profile.targetWeightKg - profile.weightKg
    if (diff < -0.3) {
      goalMode = 'cut'
      targetCalories = Math.max(1400, tdee - 350)
      proteinPerKg = 2.0
    } else if (diff > 0.3) {
      goalMode = 'bulk'
      targetCalories = tdee + 250
      proteinPerKg = 1.9
    }
  }

  const protein_g = Math.round(profile.weightKg * proteinPerKg)
  const fats_g = Math.round((targetCalories * 0.27) / 9)
  const remainingKcal = Math.max(200, targetCalories - protein_g * 4 - fats_g * 9)
  const carbs_g = Math.round(remainingKcal / 4)

  return {
    calories: targetCalories,
    protein_g,
    carbs_g,
    fats_g,
    bmr,
    tdee,
    goalMode,
    isPersonalized: true,
  }
}

export function aggregateMealTotals(meals: Pick<MealLogItem, 'calories' | 'protein_g' | 'carbs_g' | 'fats_g'>[]) {
  return meals.reduce(
    (acc, meal) => ({
      calories: acc.calories + Number(meal.calories || 0),
      protein_g: acc.protein_g + Number(meal.protein_g || 0),
      carbs_g: acc.carbs_g + Number(meal.carbs_g || 0),
      fats_g: acc.fats_g + Number(meal.fats_g || 0),
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fats_g: 0 },
  )
}

export function macroPercent(value: number, goal: number): number {
  if (goal <= 0) return 0
  return Math.min(100, Math.max(0, (value / goal) * 100))
}
