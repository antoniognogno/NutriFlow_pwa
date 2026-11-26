'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  Check,
  Copy,
  Flame,
  GlassWater,
  Pencil,
  Plus,
  Search,
  Settings2,
  Trash2,
  Utensils,
  X,
  Zap,
} from 'lucide-react'
import { toast } from 'sonner'
import { getWeeklyWorkoutGoal } from '@/app/components/dashboard/home/progressUtils'
import { focusAndScrollToElement } from '@/lib/focusScroll'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { offlineDatabase } from '@/features/offline/database'
import { queueAndSync, removeOutboxItem } from '@/features/offline/useOfflineSync'
import { NutritionHistoryReportCard } from '@/features/reports/NutritionHistoryReportCard'
import { validateSafeUserText } from '@/lib/authSecurity'
import {
  mergeRemoteAndCachedMeals,
  readCachedMeals,
  removeCachedMeal,
  saveCachedMeals,
  upsertCachedMeal,
} from './mealOfflineCache'
import { readBodyProfile } from '@/features/routine/profileGoalsStore'
import { createClient } from '@/lib/supabase/client'
import {
  aggregateMealTotals,
  computeMacroGoals,
  DEFAULT_PRESETS,
  macroPercent,
  type MealLogItem as MealLog,
} from './nutritionUtils'
import {
  type OpenFoodProduct,
  scaleNutrientsForGrams,
  searchOpenFoodFacts,
} from './openFoodFacts'

export function NutritionView() {
  const supabase = createClient()
  const [userId, setUserId] = useState<string | null>(null)
  const [meals, setMeals] = useState<MealLog[]>(() => readCachedMeals())
  const [isLoading, setIsLoading] = useState(() => readCachedMeals().length === 0)
  const [showCustomForm, setShowCustomForm] = useState(false)
  const [mealName, setMealName] = useState('')
  const [calories, setCalories] = useState('')
  const [protein, setProtein] = useState('')
  const [carbs, setCarbs] = useState('')
  const [fats, setFats] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // Personalized TDEE & macro goals synced with Settings BodyProfile
  const [goalsRevision, setGoalsRevision] = useState(0)
  const goals = useMemo(() => {
    void goalsRevision
    return computeMacroGoals(readBodyProfile(), getWeeklyWorkoutGoal())
  }, [goalsRevision])

  // OpenFoodFacts search
  const [foodQuery, setFoodQuery] = useState('')
  const [foodGrams, setFoodGrams] = useState('100')
  const [foodResults, setFoodResults] = useState<OpenFoodProduct[]>([])
  const [isSearchingFood, setIsSearchingFood] = useState(false)

  // Inline edit state for today's logged meals
  const [editingMealId, setEditingMealId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState({
    meal_name: '',
    calories: '',
    protein_g: '',
    carbs_g: '',
    fats_g: '',
  })

  const mealNameInputRef = useRef<HTMLInputElement>(null)

  const loadMeals = useCallback(async () => {
    const cached = readCachedMeals()
    if (cached.length > 0) {
      setMeals(cached)
      setIsLoading(false)
    }

    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError) throw authError
    const user = session?.user
    if (!user) return
    setUserId(user.id)

    if (!navigator.onLine) {
      setMeals(readCachedMeals())
      setIsLoading(false)
      return
    }

    const start = new Date()
    start.setHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setDate(end.getDate() + 1)

    const [remoteRes, pendingOutbox] = await Promise.all([
      supabase
        .from('meal_logs')
        .select('id, user_id, meal_name, description, calories, protein_g, carbs_g, fats_g, logged_at')
        .eq('user_id', user.id)
        .gte('logged_at', start.toISOString())
        .lt('logged_at', end.toISOString())
        .order('logged_at', { ascending: false }),
      offlineDatabase.outbox.where('userId').equals(user.id).toArray(),
    ])

    if (remoteRes.error) {
      setMeals(readCachedMeals())
      setIsLoading(false)
      return
    }

    const pendingUpsertIds = new Set(
      pendingOutbox
        .filter(item => item.table === 'meal_logs')
        .map(item => item.payload.id),
    )
    const pendingDeleteIds = new Set(
      pendingOutbox
        .filter(item => item.table === 'meal_logs_delete')
        .map(item => item.payload.id),
    )

    const merged = mergeRemoteAndCachedMeals(
      (remoteRes.data ?? []) as MealLog[],
      readCachedMeals(),
      pendingUpsertIds,
      pendingDeleteIds,
    )
    saveCachedMeals(merged)
    setMeals(merged)
    setIsLoading(false)
  }, [supabase])

  useEffect(() => {
    void loadMeals().catch(error => {
      console.error('Impossibile caricare i pasti di oggi:', error)
      toast.error('Impossibile caricare i pasti di oggi.')
      setIsLoading(false)
    })
    const syncGoalsAndMeals = () => {
      setGoalsRevision(r => r + 1)
      void loadMeals().catch(() => undefined)
    }
    window.addEventListener('nutriflow:data-updated', syncGoalsAndMeals)
    return () => window.removeEventListener('nutriflow:data-updated', syncGoalsAndMeals)
  }, [loadMeals])

  const totals = useMemo(() => aggregateMealTotals(meals), [meals])

  const logMeal = async (payload: Omit<MealLog, 'id' | 'user_id' | 'logged_at'>) => {
    if (!userId || isSaving) return
    setIsSaving(true)
    const record: MealLog = {
      id: crypto.randomUUID(),
      user_id: userId,
      ...payload,
      logged_at: new Date().toISOString(),
    }

    try {
      const updatedMeals = upsertCachedMeal(record)
      setMeals(updatedMeals)
      await queueAndSync({
        id: `meal_logs:${record.id}`,
        userId,
        table: 'meal_logs',
        conflictTarget: 'id',
        payload: record,
      })
      toast.success(`${record.meal_name} registrato (${record.calories} kcal).`)
    } catch (error) {
      console.error('Errore salvataggio pasto:', error)
      toast.error('Impossibile registrare il pasto.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!mealName.trim()) return
    const check = validateSafeUserText(mealName, 'Nome pasto', 80)
    if (!check.ok) {
      toast.error(check.error)
      return
    }
    await logMeal({
      meal_name: check.value,
      description: 'Inserimento rapido',
      calories: Math.max(0, Number.parseInt(calories || '0', 10) || 0),
      protein_g: Math.max(0, Number.parseFloat(protein || '0') || 0),
      carbs_g: Math.max(0, Number.parseFloat(carbs || '0') || 0),
      fats_g: Math.max(0, Number.parseFloat(fats || '0') || 0),
    })
    setMealName('')
    setCalories('')
    setProtein('')
    setCarbs('')
    setFats('')
    setFoodQuery('')
    setFoodResults([])
    setShowCustomForm(false)
  }

  const handleSearchOpenFood = async () => {
    if (foodQuery.trim().length < 2 || isSearchingFood) return
    setIsSearchingFood(true)
    try {
      const results = await searchOpenFoodFacts(foodQuery)
      setFoodResults(results)
      if (results.length === 0) {
        toast.info('Nessun alimento trovato su OpenFoodFacts.')
      }
    } catch {
      toast.error('Ricerca OpenFoodFacts non disponibile offline.')
    } finally {
      setIsSearchingFood(false)
    }
  }

  const applyFoodProduct = (item: OpenFoodProduct) => {
    const grams = Math.max(1, Number.parseFloat(foodGrams || '100') || 100)
    const scaled = scaleNutrientsForGrams(item, grams)
    setMealName(`${item.name} (${grams}g)`)
    setCalories(String(scaled.calories))
    setProtein(String(scaled.protein_g))
    setCarbs(String(scaled.carbs_g))
    setFats(String(scaled.fats_g))
    setFoodResults([])
    toast.success(`Compilato ${item.name} per ${grams}g`)
  }

  const handleCopyYesterdayMeals = async () => {
    if (!userId || isSaving) return
    if (!navigator.onLine) {
      toast.error('Copia pasti di ieri non disponibile offline.')
      return
    }
    setIsSaving(true)
    try {
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      const yesterdayStart = new Date(todayStart)
      yesterdayStart.setDate(yesterdayStart.getDate() - 1)

      const { data, error } = await supabase
        .from('meal_logs')
        .select('meal_name, description, calories, protein_g, carbs_g, fats_g')
        .eq('user_id', userId)
        .gte('logged_at', yesterdayStart.toISOString())
        .lt('logged_at', todayStart.toISOString())

      if (error) throw error
      if (!data || data.length === 0) {
        toast.info('Nessun pasto registrato ieri da copiare.')
        return
      }

      const cloned: MealLog[] = []
      for (const row of data) {
        const record: MealLog = {
          id: crypto.randomUUID(),
          user_id: userId,
          meal_name: row.meal_name,
          description: row.description || 'Copiato da ieri',
          calories: row.calories,
          protein_g: row.protein_g,
          carbs_g: row.carbs_g,
          fats_g: row.fats_g,
          logged_at: new Date().toISOString(),
        }
        await queueAndSync({
          id: `meal_logs:${record.id}`,
          userId,
          table: 'meal_logs',
          conflictTarget: 'id',
          payload: record,
        })
        cloned.push(record)
      }

      setMeals(prev => {
        const next = [...cloned, ...prev]
        saveCachedMeals(next)
        return next
      })
      toast.success(`Copiati ${cloned.length} pasti da ieri!`)
    } catch (error) {
      console.error('Errore copia pasti di ieri:', error)
      toast.error('Impossibile copiare i pasti di ieri.')
    } finally {
      setIsSaving(false)
    }
  }

  const startEditMeal = (meal: MealLog) => {
    setEditingMealId(meal.id)
    setEditDraft({
      meal_name: meal.meal_name,
      calories: String(meal.calories),
      protein_g: String(meal.protein_g),
      carbs_g: String(meal.carbs_g),
      fats_g: String(meal.fats_g),
    })
  }

  const saveEditMeal = async (meal: MealLog) => {
    if (!userId || isSaving) return
    const check = validateSafeUserText(editDraft.meal_name, 'Nome pasto', 80)
    if (!check.ok) {
      toast.error(check.error)
      return
    }
    const updated: MealLog = {
      ...meal,
      meal_name: check.value || meal.meal_name,
      calories: Math.max(0, Number.parseInt(editDraft.calories || '0', 10) || 0),
      protein_g: Math.max(0, Number.parseFloat(editDraft.protein_g || '0') || 0),
      carbs_g: Math.max(0, Number.parseFloat(editDraft.carbs_g || '0') || 0),
      fats_g: Math.max(0, Number.parseFloat(editDraft.fats_g || '0') || 0),
    }

    setMeals(upsertCachedMeal(updated))
    setEditingMealId(null)
    try {
      await queueAndSync({
        id: `meal_logs:${meal.id}`,
        userId,
        table: 'meal_logs',
        conflictTarget: 'id',
        payload: updated,
      })
      toast.success('Pasto aggiornato.')
    } catch {
      toast.error('Impossibile aggiornare il pasto.')
    }
  }

  const deleteMeal = async (meal: MealLog) => {
    if (!userId) return
    setMeals(removeCachedMeal(meal.id))
    await removeOutboxItem(`meal_logs:${meal.id}`)

    const queueMealDelete = async () => {
      await queueAndSync({
        id: `meal_logs_delete:${meal.id}`,
        userId,
        table: 'meal_logs_delete',
        payload: { id: meal.id },
      })
    }

    if (!navigator.onLine) {
      await queueMealDelete()
      toast.success(`"${meal.meal_name}" eliminato offline.`)
      return
    }

    const { error } = await supabase
      .from('meal_logs')
      .delete()
      .eq('id', meal.id)
      .eq('user_id', userId)
    if (error) {
      await queueMealDelete()
      toast.success(`"${meal.meal_name}" eliminato in locale (in coda sync).`)
      return
    }
    toast.success(`"${meal.meal_name}" eliminato.`)
  }

  const goalModeLabel =
    goals.goalMode === 'cut'
      ? 'Definizione'
      : goals.goalMode === 'bulk'
        ? 'Massa'
        : 'Mantenimento'

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Nutrizione</h1>
          <p className="text-xs text-muted-foreground sm:text-sm">
            Macro personalizzati, OpenFoodFacts e preset in 1 tap
          </p>
        </div>
        <Button
          size="sm"
          className="h-11 rounded-xl bg-emerald-600 px-4 text-white hover:bg-emerald-500"
          onClick={() => {
            const next = !showCustomForm
            setShowCustomForm(next)
            if (next) setTimeout(() => focusAndScrollToElement(mealNameInputRef.current), 20)
          }}
        >
          <Plus className="mr-1.5 size-4" />
          Pasto
        </Button>
      </header>

      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" className="h-11 rounded-xl text-xs font-medium" asChild>
          <Link href="/dashboard/nutrition">
            <Utensils className="mr-1.5 size-4" />
            Pasti & Macro
          </Link>
        </Button>
        <Button variant="outline" className="h-11 rounded-xl text-xs font-medium" asChild>
          <Link href="/dashboard/water">
            <GlassWater className="mr-1.5 size-4" />
            Acqua
          </Link>
        </Button>
      </div>

      <Card data-tour="nutrition-summary">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Flame className="size-4 text-primary" />
                Bilancio di oggi
              </CardTitle>
              <CardDescription className="mt-0.5 text-xs">
                {goals.isPersonalized ? (
                  <span className="font-medium text-emerald-400">
                    Target {goalModeLabel} · TDEE stimato {goals.tdee} kcal
                  </span>
                ) : (
                  <Link href="/dashboard/settings" className="inline-flex items-center gap-1 text-primary hover:underline">
                    <Settings2 className="size-3" />
                    Inserisci peso/altezza in Impostazioni per TDEE reale
                  </Link>
                )}
              </CardDescription>
            </div>
            <span className="font-mono text-lg font-bold">
              {totals.calories} <span className="text-xs font-normal text-muted-foreground">/ {goals.calories} kcal</span>
            </span>
          </div>
          <Progress value={macroPercent(totals.calories, goals.calories)} className="h-2.5" />
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-3 pt-1">
          {[
            { label: 'Proteine', value: totals.protein_g, goal: goals.protein_g },
            { label: 'Carbo', value: totals.carbs_g, goal: goals.carbs_g },
            { label: 'Grassi', value: totals.fats_g, goal: goals.fats_g },
          ].map(macro => (
            <div key={macro.label} className="space-y-1.5 rounded-xl bg-muted/40 p-2.5">
              <p className="text-[11px] text-muted-foreground">{macro.label}</p>
              <p className="font-mono text-sm font-bold">
                {Math.round(macro.value)}g
                <span className="text-[11px] font-normal text-muted-foreground"> / {macro.goal}g</span>
              </p>
              <Progress value={macroPercent(macro.value, macro.goal)} className="h-1.5" />
            </div>
          ))}
        </CardContent>
      </Card>

      {showCustomForm && (
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Nuovo pasto o ricerca alimento</CardTitle>
            <CardDescription className="text-xs">
              Cerca un alimento su OpenFoodFacts o compila i valori a mano
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2 rounded-xl border border-border/70 bg-muted/30 p-2.5">
              <div className="grid grid-cols-[minmax(0,1fr)_4.5rem_auto] gap-1.5">
                <Input
                  aria-label="Cerca alimento su OpenFoodFacts"
                  placeholder="Cerca (es. Yogurt Greco, Avena)"
                  value={foodQuery}
                  onChange={e => setFoodQuery(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      void handleSearchOpenFood()
                    }
                  }}
                  className="h-9 min-w-0 text-xs"
                />
                <Input
                  aria-label="Grammi"
                  type="number"
                  inputMode="numeric"
                  min="1"
                  value={foodGrams}
                  onChange={e => setFoodGrams(e.target.value)}
                  placeholder="g"
                  className="h-9 text-center font-mono text-xs"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={isSearchingFood || foodQuery.trim().length < 2}
                  className="h-9 shrink-0 rounded-xl px-2.5 text-xs"
                  onClick={() => void handleSearchOpenFood()}
                >
                  <Search className="size-3.5" />
                </Button>
              </div>

              {foodResults.length > 0 && (
                <div className="space-y-1">
                  {foodResults.map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => applyFoodProduct(item)}
                      className="flex w-full items-center justify-between gap-2 rounded-lg border border-emerald-500/40 bg-emerald-200 px-2.5 py-1.5 text-left text-xs font-medium text-slate-950 transition-colors hover:bg-emerald-300"
                    >
                      <span className="min-w-0 truncate">
                        <strong>{item.name}</strong>
                        {item.brand ? ` · ${item.brand}` : ''}
                      </span>
                      <span className="shrink-0 font-mono text-[11px] font-bold">
                        {item.kcalPer100g} kcal/100g
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <form onSubmit={e => void handleCustomSubmit(e)} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="meal-name">Nome pasto</Label>
                <Input
                  ref={mealNameInputRef}
                  id="meal-name"
                  placeholder="Es. Pasta al tonno"
                  value={mealName}
                  onChange={e => setMealName(e.target.value)}
                  required
                  className="h-11"
                />
              </div>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                <div className="space-y-1">
                  <Label htmlFor="meal-kcal" className="text-xs">Kcal</Label>
                  <Input id="meal-kcal" type="number" inputMode="numeric" min="0" value={calories} onChange={e => setCalories(e.target.value)} className="h-11" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="meal-p" className="text-xs">Prot (g)</Label>
                  <Input id="meal-p" type="number" inputMode="decimal" min="0" step="0.5" value={protein} onChange={e => setProtein(e.target.value)} className="h-11" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="meal-c" className="text-xs">Carb (g)</Label>
                  <Input id="meal-c" type="number" inputMode="decimal" min="0" step="0.5" value={carbs} onChange={e => setCarbs(e.target.value)} className="h-11" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="meal-f" className="text-xs">Grassi (g)</Label>
                  <Input id="meal-f" type="number" inputMode="decimal" min="0" step="0.5" value={fats} onChange={e => setFats(e.target.value)} className="h-11" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" className="h-11 flex-1" onClick={() => setShowCustomForm(false)}>
                  Annulla
                </Button>
                <Button type="submit" className="h-11 flex-1 bg-emerald-600 text-white hover:bg-emerald-500" disabled={isSaving || !userId}>
                  Salva
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <section aria-labelledby="presets-heading" className="space-y-2">
        <div className="flex items-center gap-1.5 text-sm font-semibold">
          <Zap className="size-4 text-primary" />
          <h2 id="presets-heading">Preset in 1 tap</h2>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {DEFAULT_PRESETS.map(preset => (
            <Button
              key={preset.id}
              variant="outline"
              disabled={!userId || isSaving}
              className="h-auto justify-between rounded-xl px-3.5 py-3 text-left"
              onClick={() => void logMeal({
                meal_name: preset.name,
                description: 'Preset 1-tap',
                calories: preset.calories,
                protein_g: preset.protein_g,
                carbs_g: preset.carbs_g,
                fats_g: preset.fats_g,
              })}
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{preset.name}</p>
                <p className="text-xs text-muted-foreground">
                  {preset.protein_g}P · {preset.carbs_g}C · {preset.fats_g}F
                </p>
              </div>
              <span className="ml-2 shrink-0 font-mono text-xs font-semibold text-primary">
                +{preset.calories} kcal
              </span>
            </Button>
          ))}
        </div>
      </section>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base">Pasti registrati oggi</CardTitle>
              <CardDescription>{meals.length} voci</CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!userId || isSaving}
              className="h-8 rounded-xl border-primary/35 bg-primary/10 px-2.5 text-xs text-primary hover:bg-primary/20"
              onClick={() => void handleCopyYesterdayMeals()}
            >
              <Copy className="mr-1.5 size-3.5" />
              Copia ieri
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Caricamento...</p>
          ) : meals.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Nessun pasto registrato oggi. Usa un preset qui sopra o copia da ieri.
            </p>
          ) : (
            meals.map(meal =>
              editingMealId === meal.id ? (
                <div key={meal.id} className="space-y-2 rounded-xl border border-primary/35 bg-muted/40 p-2.5">
                  <Input
                    aria-label="Modifica nome pasto"
                    value={editDraft.meal_name}
                    onChange={e => setEditDraft(d => ({ ...d, meal_name: e.target.value }))}
                    className="h-9 text-sm"
                  />
                  <div className="grid grid-cols-4 gap-1.5">
                    <Input
                      aria-label="Kcal"
                      type="number"
                      value={editDraft.calories}
                      onChange={e => setEditDraft(d => ({ ...d, calories: e.target.value }))}
                      placeholder="kcal"
                      className="h-8 px-1.5 text-center font-mono text-xs"
                    />
                    <Input
                      aria-label="Proteine"
                      type="number"
                      value={editDraft.protein_g}
                      onChange={e => setEditDraft(d => ({ ...d, protein_g: e.target.value }))}
                      placeholder="P"
                      className="h-8 px-1.5 text-center font-mono text-xs"
                    />
                    <Input
                      aria-label="Carboidrati"
                      type="number"
                      value={editDraft.carbs_g}
                      onChange={e => setEditDraft(d => ({ ...d, carbs_g: e.target.value }))}
                      placeholder="C"
                      className="h-8 px-1.5 text-center font-mono text-xs"
                    />
                    <Input
                      aria-label="Grassi"
                      type="number"
                      value={editDraft.fats_g}
                      onChange={e => setEditDraft(d => ({ ...d, fats_g: e.target.value }))}
                      placeholder="F"
                      className="h-8 px-1.5 text-center font-mono text-xs"
                    />
                  </div>
                  <div className="flex justify-end gap-1.5">
                    <Button type="button" variant="ghost" size="sm" className="h-8 rounded-lg px-2.5 text-xs" onClick={() => setEditingMealId(null)}>
                      <X className="mr-1 size-3.5" />
                      Annulla
                    </Button>
                    <Button type="button" size="sm" className="h-8 rounded-lg bg-emerald-600 px-2.5 text-xs text-white hover:bg-emerald-500" onClick={() => void saveEditMeal(meal)}>
                      <Check className="mr-1 size-3.5" />
                      Salva
                    </Button>
                  </div>
                </div>
              ) : (
                <div key={meal.id} className="flex items-center justify-between gap-2 rounded-xl bg-muted/40 px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{meal.meal_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {Math.round(meal.protein_g)}P · {Math.round(meal.carbs_g)}C · {Math.round(meal.fats_g)}F ·{' '}
                      <strong className="font-mono text-foreground">{meal.calories} kcal</strong>
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Modifica ${meal.meal_name}`}
                      className="size-8 rounded-lg text-primary hover:bg-primary/15"
                      onClick={() => startEditMeal(meal)}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Elimina ${meal.meal_name}`}
                      className="size-8 rounded-lg text-red-400 hover:bg-red-500/15 hover:text-red-300"
                      onClick={() => void deleteMeal(meal)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              ),
            )
          )}
        </CardContent>
      </Card>

      <NutritionHistoryReportCard
        userId={userId}
        calorieGoal={goals.calories}
        todayMealsCount={meals.length}
      />
    </div>
  )
}
