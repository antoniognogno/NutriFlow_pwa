'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Check,
  Compass,
  Download,
  Droplets,
  Dumbbell,
  LogOut,
  Moon,
  RefreshCw,
  Ruler,
  Scale,
  SlidersHorizontal,
  Sun,
  Target,
  User,
  X,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { toast } from 'sonner'
import { NutriFlowLogo } from '@/components/NutriFlowLogo'
import { ProfileAvatar } from '@/components/ProfileAvatar'
import { AvatarCustomizer } from '@/features/profile/AvatarCustomizer'
import {
  readProfileAvatar,
  saveProfileAvatar,
  type ProfileAvatarConfig,
} from '@/features/profile/avatarStore'
import { validateSafeUserText } from '@/lib/authSecurity'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { APP_BUILD_ID, APP_VERSION } from '@/config/appVersion'
import { siteConfig } from '@/config/attributes'
import {
  evaluateRestartRequirement,
  type RemoteVersionInfo,
  type RestartEvaluation,
  type UpdateStage,
} from '@/features/updates/appUpdateUtils'
import { UpdateProgressModal } from '@/features/updates/UpdateProgressModal'
import { createClient } from '@/lib/supabase/client'
import { offlineDatabase } from '@/features/offline/database'
import { queueAndSync } from '@/features/offline/useOfflineSync'
import {
  readCachedWaterState,
  saveCachedWaterState,
} from '@/features/nutrition/waterOfflineCache'
import { readHabitLogs, readHabits } from '@/features/routine/habitStore'
import {
  computeBmi,
  readBodyProfile,
  readCachedProfileSettings,
  saveBodyProfile,
  saveCachedProfileSettings,
} from '@/features/routine/profileGoalsStore'
import { readWeightLogs, upsertWeightEntry } from '@/features/routine/weightStore'
import { readTrashItems } from '@/features/trash/trashStore'
import { requestAppTourStart } from '@/features/tour/tourStore'
import { getWeeklyWorkoutGoal, saveWeeklyWorkoutGoal } from '@/app/components/dashboard/home/progressUtils'

const WATER_GOAL_OPTIONS = [2000, 2500, 3000, 3500] as const
const WORKOUT_GOAL_OPTIONS = [3, 4, 5, 6] as const
const DIET_STYLE_OPTIONS = [
  { value: 'none', label: 'Non specificato' },
  { value: 'omnivore', label: 'Onnivoro / Bilanciata' },
  { value: 'Iperproteica', label: 'Iperproteica (Fitness)' },
  { value: 'Mediterranea', label: 'Mediterranea' },
  { value: 'Vegetariana', label: 'Vegetariana' },
  { value: 'Vegana', label: 'Vegana' },
  { value: 'Chetogenica / Low Carb', label: 'Chetogenica / Low Carb' },
  { value: 'Senza glutine', label: 'Senza glutine' },
  { value: 'Senza lattosio', label: 'Senza lattosio' },
] as const

export default function SettingsPage() {
  const router = useRouter()
  const supabase = createClient()
  const { theme, setTheme } = useTheme()

  const [userId, setUserId] = useState<string | null>(null)
  const [email, setEmail] = useState<string>('')
  const [username, setUsername] = useState(() => readCachedProfileSettings().username)
  const [weightKgInput, setWeightKgInput] = useState(() => {
    const bp = readBodyProfile()
    const logs = readWeightLogs()
    const latest = logs.length > 0 ? logs[logs.length - 1].weightKg : bp.weightKg
    return latest !== null ? String(latest) : ''
  })
  const [targetWeightInput, setTargetWeightInput] = useState(() => {
    const bp = readBodyProfile()
    return bp.targetWeightKg !== null ? String(bp.targetWeightKg) : ''
  })
  const [heightCmInput, setHeightCmInput] = useState(() => {
    const bp = readBodyProfile()
    return bp.heightCm !== null ? String(bp.heightCm) : ''
  })
  const [ageInput, setAgeInput] = useState(() => {
    const bp = readBodyProfile()
    return bp.age !== null ? String(bp.age) : ''
  })
  const [sexInput, setSexInput] = useState<'m' | 'f' | ''>(() => readBodyProfile().sex)
  const [waterGoalMl, setWaterGoalMl] = useState(() => readCachedProfileSettings().water_goal_ml)
  const [weeklyWorkoutGoal, setWeeklyWorkoutGoal] = useState(() => getWeeklyWorkoutGoal())
  const [dietType, setDietType] = useState(() => readCachedProfileSettings().diet_type)
  const [allergies, setAllergies] = useState(() => readCachedProfileSettings().allergies.join(', '))
  const [dislikedFoods, setDislikedFoods] = useState(() => readCachedProfileSettings().disliked_foods.join(', '))
  const [avatarConfig, setAvatarConfig] = useState<ProfileAvatarConfig>(() => readProfileAvatar())
  const [isProfileEditorOpen, setIsProfileEditorOpen] = useState(false)
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false)
  const [updateStatusText, setUpdateStatusText] = useState<string | null>(null)
  const [updateModalOpen, setUpdateModalOpen] = useState(false)
  const [updateStage, setUpdateStage] = useState<UpdateStage>('idle')
  const [updateProgress, setUpdateProgress] = useState(0)
  const [updateEstimateSec, setUpdateEstimateSec] = useState(4)
  const [updateStepLabel, setUpdateStepLabel] = useState('Verifica versione...')
  const [updateTargetVersion, setUpdateTargetVersion] = useState<string | null>(null)
  const [restartEvaluation, setRestartEvaluation] = useState<RestartEvaluation | null>(null)
  const [updateErrorText, setUpdateErrorText] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const user = session?.user
        if (!user) {
          router.replace('/login')
          return
        }
        setUserId(user.id)
        setEmail(user.email ?? '')
        setIsLoading(false)

        if (!navigator.onLine) return

        const [profileRes, pendingOutbox] = await Promise.all([
          supabase
            .from('profiles')
            .select('username, water_goal_ml, diet_type, allergies, disliked_foods')
            .eq('id', user.id)
            .maybeSingle(),
          offlineDatabase.outbox.where('userId').equals(user.id).toArray(),
        ])

        const hasPendingProfile = pendingOutbox.some(
          item => item.table === 'profiles' || item.table === 'profiles_water_goal',
        )

        const profile = profileRes.data
        if (profile && !hasPendingProfile) {
          const cached = saveCachedProfileSettings({
            username: profile.username ?? '',
            water_goal_ml: profile.water_goal_ml ?? 2500,
            diet_type: profile.diet_type ?? '',
            allergies: profile.allergies ?? [],
            disliked_foods: profile.disliked_foods ?? [],
          })
          setUsername(cached.username)
          setWaterGoalMl(cached.water_goal_ml)
          setDietType(cached.diet_type)
          setAllergies(cached.allergies.join(', '))
          setDislikedFoods(cached.disliked_foods.join(', '))
        }
      } catch (error) {
        console.error('Errore caricamento profilo:', error)
      } finally {
        setIsLoading(false)
      }
    }
    void loadProfile()
  }, [router, supabase])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId || isSaving) return
    setIsSaving(true)
    try {
      saveWeeklyWorkoutGoal(weeklyWorkoutGoal)
      const parsedWeight = weightKgInput ? Number.parseFloat(weightKgInput) : null
      const parsedTarget = targetWeightInput ? Number.parseFloat(targetWeightInput) : null
      const parsedHeight = heightCmInput ? Number.parseInt(heightCmInput, 10) : null
      const parsedAge = ageInput ? Number.parseInt(ageInput, 10) : null
      const savedBody = saveBodyProfile({
        weightKg: Number.isFinite(parsedWeight) ? parsedWeight : null,
        targetWeightKg: Number.isFinite(parsedTarget) ? parsedTarget : null,
        heightCm: Number.isFinite(parsedHeight) ? parsedHeight : null,
        age: Number.isFinite(parsedAge) ? parsedAge : null,
        sex: sexInput,
      })
      if (savedBody.weightKg !== null) {
        upsertWeightEntry(savedBody.weightKg)
      }

      const usernameCheck = validateSafeUserText(username, 'Nome visualizzato', 40)
      const dietCheck = validateSafeUserText(dietType, 'Stile alimentare', 50)
      const allergiesCheck = validateSafeUserText(allergies, 'Allergie', 160)
      const dislikedCheck = validateSafeUserText(dislikedFoods, 'Cibi da evitare', 160)
      const failedCheck = [usernameCheck, dietCheck, allergiesCheck, dislikedCheck].find(c => !c.ok)
      if (failedCheck) {
        toast.error(failedCheck.error)
        setIsSaving(false)
        return
      }

      const cleanedAllergies = allergiesCheck.value.split(',').map(s => s.trim()).filter(Boolean)
      const cleanedDisliked = dislikedCheck.value.split(',').map(s => s.trim()).filter(Boolean)
      const cleanUsername = usernameCheck.value || 'Atleta'
      const cleanDiet = dietCheck.value

      saveProfileAvatar(avatarConfig)

      saveCachedProfileSettings({
        username: cleanUsername,
        water_goal_ml: waterGoalMl,
        diet_type: cleanDiet,
        allergies: cleanedAllergies,
        disliked_foods: cleanedDisliked,
      })
      saveCachedWaterState(readCachedWaterState().logs, waterGoalMl)

      const profilePayload = {
        id: userId,
        username: cleanUsername,
        water_goal_ml: waterGoalMl,
        diet_type: cleanDiet || null,
        allergies: cleanedAllergies,
        disliked_foods: cleanedDisliked,
        updated_at: new Date().toISOString(),
      }

      const queueProfileSync = async () => {
        await queueAndSync({
          id: `profiles:${userId}`,
          userId,
          table: 'profiles',
          conflictTarget: 'id',
          payload: profilePayload,
        })
      }

      if (!navigator.onLine) {
        await queueProfileSync()
        window.dispatchEvent(new Event('nutriflow:data-updated'))
        setIsProfileEditorOpen(false)
        toast.success('Impostazioni salvate offline (verranno sincronizzate al ritorno della rete).')
        return
      }

      const { error } = await supabase.from('profiles').upsert([profilePayload])
      if (error) {
        await queueProfileSync()
        window.dispatchEvent(new Event('nutriflow:data-updated'))
        setIsProfileEditorOpen(false)
        toast.success('Impostazioni salvate in locale (sync profilo in coda).')
        return
      }

      window.dispatchEvent(new Event('nutriflow:data-updated'))
      setIsProfileEditorOpen(false)
      toast.success('Impostazioni salvate.')
    } catch (error) {
      console.error('Errore salvataggio impostazioni:', error)
      toast.error('Impossibile salvare le impostazioni.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleExportBackup = () => {
    const backup = {
      exportedAt: new Date().toISOString(),
      bodyProfile: readBodyProfile(),
      weeklyWorkoutGoal,
      habits: readHabits(),
      habitLogs: readHabitLogs(),
      weightLogs: readWeightLogs(),
      trash: readTrashItems(),
    }
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `nutriflow-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Backup locale esportato.')
  }

  const waitMs = (ms: number) => new Promise<void>(resolve => window.setTimeout(resolve, ms))

  const handleRestartAppNow = () => {
    window.location.reload()
  }

  const handleCheckUpdates = async () => {
    if (isCheckingUpdate) return
    if (!navigator.onLine) {
      toast.warning(`Connettiti a internet per cercare aggiornamenti (versione attuale v${APP_VERSION}).`)
      return
    }
    setIsCheckingUpdate(true)
    setUpdateModalOpen(true)
    setUpdateStage('checking')
    setUpdateProgress(12)
    setUpdateEstimateSec(4)
    setUpdateStepLabel(`Confronto versione corrente v${APP_VERSION}...`)
    setUpdateTargetVersion(null)
    setRestartEvaluation(null)
    setUpdateErrorText(null)

    const nowTime = new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
    let remoteInfo: RemoteVersionInfo | null = null
    let hasWaitingWorker = false
    let hasInstallingFinished = false
    let controllerChanged = false

    const handleControllerChange = () => {
      controllerChanged = true
    }

    try {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange)
      }

      // Step 1: check live version manifest
      try {
        const res = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' })
        if (res.ok) {
          const parsed = (await res.json()) as Partial<RemoteVersionInfo>
          if (typeof parsed.version === 'string' && typeof parsed.buildId === 'string') {
            remoteInfo = {
              version: parsed.version,
              buildId: parsed.buildId,
              builtAt: parsed.builtAt,
            }
            setUpdateTargetVersion(`${parsed.version} (${parsed.buildId})`)
          }
        }
      } catch {
        // Offline/local dev preview might not expose /version.json; proceed with Service Worker check
      }

      setUpdateProgress(38)
      setUpdateEstimateSec(3)
      setUpdateStage('downloading')
      setUpdateStepLabel('Controllo Service Worker e risorse PWA...')
      await waitMs(380)

      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration()
        if (registration) {
          if (registration.waiting) {
            hasWaitingWorker = true
          }
          await registration.update().catch(() => undefined)
          setUpdateProgress(65)
          setUpdateEstimateSec(2)

          const waitingAfterUpdate = registration.waiting as ServiceWorker | null
          const installingAfterUpdate = registration.installing as ServiceWorker | null

          if (waitingAfterUpdate) {
            hasWaitingWorker = true
            setUpdateStage('installing')
            setUpdateProgress(84)
            setUpdateEstimateSec(1)
            setUpdateStepLabel('Attivazione nuova versione scaricata...')
            waitingAfterUpdate.postMessage({ type: 'SKIP_WAITING' })
            await waitMs(650)
          } else if (installingAfterUpdate) {
            setUpdateStage('installing')
            setUpdateProgress(78)
            setUpdateEstimateSec(2)
            setUpdateStepLabel('Download nuovo pacchetto in corso...')

            await new Promise<void>(resolve => {
              const timeout = window.setTimeout(resolve, 4500)
              installingAfterUpdate.addEventListener('statechange', () => {
                if (installingAfterUpdate.state === 'installed') {
                  hasInstallingFinished = true
                  installingAfterUpdate.postMessage({ type: 'SKIP_WAITING' })
                  setUpdateProgress(90)
                  setUpdateEstimateSec(1)
                  window.clearTimeout(timeout)
                  window.setTimeout(resolve, 450)
                } else if (installingAfterUpdate.state === 'activated') {
                  hasInstallingFinished = true
                  controllerChanged = true
                  window.clearTimeout(timeout)
                  resolve()
                } else if (installingAfterUpdate.state === 'redundant') {
                  window.clearTimeout(timeout)
                  resolve()
                }
              })
            })
          } else {
            await waitMs(280)
          }
        }
      } else {
        await waitMs(320)
      }

      // Step 3: post-update restart evaluation
      setUpdateStage('evaluating')
      setUpdateProgress(95)
      setUpdateEstimateSec(1)
      setUpdateStepLabel('Valutazione necessità riavvio app...')
      await waitMs(260)

      const evaluation = evaluateRestartRequirement({
        hasWaitingWorker,
        hasInstallingFinished,
        controllerChanged,
        localVersion: APP_VERSION,
        localBuildId: APP_BUILD_ID,
        remoteInfo,
      })

      setRestartEvaluation(evaluation)
      setUpdateProgress(100)
      setUpdateEstimateSec(0)

      if (evaluation.shouldRestart) {
        setUpdateStage('restart_required')
        setUpdateStepLabel(`Aggiornamento v${evaluation.targetVersion} pronto`)
        setUpdateStatusText(`Aggiornamento rilevato (${evaluation.targetVersion}) · riavvio consigliato`)
        toast.success('Aggiornamento disponibile! Valuta il riavvio per applicarlo.')
      } else {
        setUpdateStage('up_to_date')
        setUpdateStepLabel(`Versione v${APP_VERSION} verificata · nessun riavvio richiesto`)
        setUpdateStatusText(`Controllato alle ${nowTime} · v${APP_VERSION} (${APP_BUILD_ID}) già aggiornata`)
        toast.success(`NutriFlow v${APP_VERSION} è già aggiornato!`)
      }
    } catch {
      setUpdateStage('error')
      setUpdateProgress(100)
      setUpdateEstimateSec(0)
      setUpdateStepLabel('Verifica non completata')
      setUpdateErrorText('Impossibile contattare il server degli aggiornamenti al momento.')
      setUpdateStatusText(`Verifica completata alle ${nowTime} · v${APP_VERSION}`)
    } finally {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange)
      }
      setIsCheckingUpdate(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  if (isLoading) {
    return <p className="py-12 text-center text-sm text-muted-foreground">Caricamento impostazioni...</p>
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 pb-8">
      <header className="flex items-center gap-3">
        <NutriFlowLogo className="size-11 shrink-0" />
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Impostazioni</h1>
          <p className="truncate text-xs text-muted-foreground">
            {siteConfig.name} · {email || 'Profilo personale'}
          </p>
        </div>
      </header>

      {!isProfileEditorOpen ? (
        <Card className="nf-pop-enter border-primary/25" data-tour="settings-profile-card">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex min-w-0 flex-1 items-center gap-2.5">
                <ProfileAvatar config={avatarConfig} className="size-10" />
                <div className="min-w-0 flex-1">
                  <CardTitle className="truncate text-base">
                    {username.trim() || 'Atleta'}
                  </CardTitle>
                  <CardDescription className="truncate text-xs">
                    Profilo & Obiettivi{dietType.trim() ? ` · ${dietType.trim()}` : ''}
                  </CardDescription>
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setIsProfileEditorOpen(true)}
                className="h-9 shrink-0 rounded-xl border-primary/40 bg-primary/10 px-2.5 text-xs text-primary hover:bg-primary/20"
              >
                <SlidersHorizontal className="mr-1.5 size-3.5" />
                Personalizza
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {(() => {
              const parsedWeight = Number.parseFloat(weightKgInput)
              const parsedTarget = Number.parseFloat(targetWeightInput)
              const parsedHeight = Number.parseInt(heightCmInput, 10)
              const validWeight = Number.isFinite(parsedWeight) ? parsedWeight : null
              const validTarget = Number.isFinite(parsedTarget) ? parsedTarget : null
              const validHeight = Number.isFinite(parsedHeight) ? parsedHeight : null
              const bmi = computeBmi(validWeight, validHeight)
              const bmiCategory =
                bmi === null
                  ? 'Inserisci peso/altezza'
                  : bmi < 18.5
                    ? 'Sottopeso'
                    : bmi < 25
                      ? 'Normopeso'
                      : bmi < 30
                        ? 'Sovrappeso'
                        : 'Obesità'
              const gap =
                validWeight !== null && validTarget !== null
                  ? Math.round((validWeight - validTarget) * 10) / 10
                  : null

              return (
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="rounded-xl border border-border/60 bg-muted/40 p-2.5 dark:bg-[#111f2c]/80">
                    <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Scale className="size-3 text-primary" />
                      Peso & Target
                    </p>
                    <p className="mt-1 font-mono text-sm font-bold text-foreground">
                      {validWeight !== null ? `${validWeight} kg` : '—'}
                      {validTarget !== null ? ` → ${validTarget} kg` : ''}
                    </p>
                    <p className="mt-0.5 text-[10.5px] text-emerald-600 dark:text-emerald-400">
                      {gap === null
                        ? 'Imposta target peso'
                        : gap === 0
                          ? 'Target raggiunto'
                          : `${gap > 0 ? `-${gap.toFixed(1)}` : `+${Math.abs(gap).toFixed(1)}`} kg al target`}
                    </p>
                  </div>

                  <div className="rounded-xl border border-border/60 bg-muted/40 p-2.5 dark:bg-[#111f2c]/80">
                    <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Target className="size-3 text-amber-500" />
                      BMI stimato
                    </p>
                    <p className="mt-1 font-mono text-sm font-bold text-primary">
                      {bmi !== null ? bmi.toFixed(1) : '—'}
                    </p>
                    <p className="mt-0.5 truncate text-[10.5px] text-muted-foreground">
                      {bmiCategory}
                    </p>
                  </div>

                  <div className="rounded-xl border border-border/60 bg-muted/40 p-2.5 dark:bg-[#111f2c]/80">
                    <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Droplets className="size-3 text-sky-500" />
                      Obiettivo acqua
                    </p>
                    <p className="mt-1 font-mono text-sm font-bold text-sky-600 dark:text-sky-400">
                      {(waterGoalMl / 1000).toFixed(1)} L / giorno
                    </p>
                  </div>

                  <div className="rounded-xl border border-border/60 bg-muted/40 p-2.5 dark:bg-[#111f2c]/80">
                    <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Dumbbell className="size-3 text-emerald-500" />
                      Allenamenti
                    </p>
                    <p className="mt-1 font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400">
                      {weeklyWorkoutGoal}× / settimana
                    </p>
                  </div>
                </div>
              )
            })()}
          </CardContent>
        </Card>
      ) : (
        <form onSubmit={e => void handleSave(e)} className="nf-pop-enter space-y-4">
          <Card className="overflow-hidden border-primary/35">
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <User className="size-4 shrink-0 text-primary" />
                    <span className="truncate">Personalizza profilo & obiettivi</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Icona profilo, nome e target giornalieri/settimanali
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsProfileEditorOpen(false)}
                  aria-label="Chiudi personalizzazione profilo"
                  className="h-8 shrink-0 rounded-xl px-2.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  <X className="mr-1 size-3.5" />
                  Chiudi
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
            <AvatarCustomizer value={avatarConfig} onChange={setAvatarConfig} />

            <div className="space-y-1.5">
              <Label htmlFor="settings-username">Nome visualizzato</Label>
              <Input
                id="settings-username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Es. Antonio"
                className="h-11"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1.5">
                <Label htmlFor="settings-weight" className="flex items-center gap-1.5 text-xs">
                  <Scale className="size-3.5 text-primary" />
                  Peso attuale (kg)
                </Label>
                <Input
                  id="settings-weight"
                  type="number"
                  inputMode="decimal"
                  min="20"
                  max="300"
                  step="0.1"
                  value={weightKgInput}
                  onChange={e => setWeightKgInput(e.target.value)}
                  placeholder="Es. 75.0"
                  className="h-10 font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="settings-target-weight" className="flex items-center gap-1.5 text-xs">
                  <Target className="size-3.5 text-emerald-400" />
                  Obiettivo peso (kg)
                </Label>
                <Input
                  id="settings-target-weight"
                  type="number"
                  inputMode="decimal"
                  min="20"
                  max="300"
                  step="0.1"
                  value={targetWeightInput}
                  onChange={e => setTargetWeightInput(e.target.value)}
                  placeholder="Es. 72.0"
                  className="h-10 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="settings-height" className="flex items-center gap-1 text-xs">
                  <Ruler className="size-3.5 text-primary" />
                  Altezza (cm)
                </Label>
                <Input
                  id="settings-height"
                  type="number"
                  inputMode="numeric"
                  min="100"
                  max="250"
                  value={heightCmInput}
                  onChange={e => setHeightCmInput(e.target.value)}
                  placeholder="178"
                  className="h-10 font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="settings-age" className="text-xs">Età</Label>
                <Input
                  id="settings-age"
                  type="number"
                  inputMode="numeric"
                  min="12"
                  max="110"
                  value={ageInput}
                  onChange={e => setAgeInput(e.target.value)}
                  placeholder="24"
                  className="h-10 font-mono"
                />
              </div>
              <div className="min-w-0 space-y-1.5">
                <Label className="text-xs">Sesso</Label>
                <div className="grid h-10 min-w-0 grid-cols-2 gap-1">
                  {(['m', 'f'] as const).map(code => (
                    <Button
                      key={code}
                      type="button"
                      size="sm"
                      variant={sexInput === code ? 'secondary' : 'outline'}
                      className={`h-10 w-full min-w-0 rounded-lg px-0 text-xs uppercase ${
                        sexInput === code ? 'border-primary/40 bg-primary/15 text-primary' : ''
                      }`}
                      onClick={() => setSexInput(prev => (prev === code ? '' : code))}
                    >
                      {code}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {(() => {
              const w = Number.parseFloat(weightKgInput)
              const t = Number.parseFloat(targetWeightInput)
              const h = Number.parseInt(heightCmInput, 10)
              const bmi = computeBmi(Number.isFinite(w) ? w : null, Number.isFinite(h) ? h : null)
              const gap = Number.isFinite(w) && Number.isFinite(t) ? Math.round((w - t) * 10) / 10 : null
              if (bmi === null && gap === null) return null
              return (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-primary/25 bg-primary/5 px-3 py-2 text-xs">
                  <span>
                    {bmi !== null ? (
                      <>BMI stimato: <strong className="font-mono text-primary">{bmi}</strong></>
                    ) : (
                      'Inserisci altezza per il BMI'
                    )}
                  </span>
                  {gap !== null && (
                    <span className="font-mono text-emerald-400">
                      {gap === 0
                        ? 'Target raggiunto'
                        : `${gap > 0 ? `-${gap.toFixed(1)}` : `+${Math.abs(gap).toFixed(1)}`} kg al target`}
                    </span>
                  )}
                </div>
              )
            })()}

            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Droplets className="size-3.5 text-sky-400" />
                Obiettivo acqua giornaliero
              </Label>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                {WATER_GOAL_OPTIONS.map(ml => (
                  <Button
                    key={ml}
                    type="button"
                    size="sm"
                    variant={waterGoalMl === ml ? 'secondary' : 'outline'}
                    className={`h-9 min-w-0 rounded-xl px-1.5 font-mono text-xs ${
                      waterGoalMl === ml ? 'border-sky-500/40 bg-sky-500/15 text-sky-600 dark:text-sky-300' : ''
                    }`}
                    onClick={() => setWaterGoalMl(ml)}
                  >
                    {(ml / 1000).toFixed(1)}L
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Dumbbell className="size-3.5 text-emerald-400" />
                Allenamenti a settimana
              </Label>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                {WORKOUT_GOAL_OPTIONS.map(count => (
                  <Button
                    key={count}
                    type="button"
                    size="sm"
                    variant={weeklyWorkoutGoal === count ? 'secondary' : 'outline'}
                    className={`h-9 min-w-0 rounded-xl px-1.5 font-mono text-xs ${
                      weeklyWorkoutGoal === count ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-600 dark:text-emerald-300' : ''
                    }`}
                    onClick={() => setWeeklyWorkoutGoal(count)}
                  >
                    {count}× / sett
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="settings-diet">Stile alimentare</Label>
              <Select
                value={
                  dietType && DIET_STYLE_OPTIONS.some(opt => opt.value === dietType)
                    ? dietType
                    : dietType.trim()
                      ? dietType
                      : 'none'
                }
                onValueChange={val => setDietType(val === 'none' ? '' : val)}
              >
                <SelectTrigger id="settings-diet" className="h-11 w-full">
                  <SelectValue placeholder="Seleziona stile alimentare" />
                </SelectTrigger>
                <SelectContent>
                  {DIET_STYLE_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                  {dietType.trim() &&
                    !DIET_STYLE_OPTIONS.some(opt => opt.value === dietType) && (
                      <SelectItem value={dietType}>{dietType}</SelectItem>
                    )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="settings-allergies">Allergie</Label>
                <Input
                  id="settings-allergies"
                  value={allergies}
                  onChange={e => setAllergies(e.target.value)}
                  placeholder="Separate da virgola"
                  className="h-10"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="settings-disliked">Cibi da evitare</Label>
                <Input
                  id="settings-disliked"
                  value={dislikedFoods}
                  onChange={e => setDislikedFoods(e.target.value)}
                  placeholder="Separati da virgola"
                  className="h-10"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsProfileEditorOpen(false)}
                className="h-11 rounded-xl px-4"
              >
                Chiudi
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="h-11 flex-1 rounded-xl bg-emerald-600 text-white hover:bg-emerald-500"
              >
                <Check className="mr-1.5 size-4" />
                {isSaving ? 'Salvataggio...' : 'Salva e chiudi'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Aspetto & Dati</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={theme === 'dark' ? 'secondary' : 'outline'}
              className="h-10 rounded-xl text-xs"
              onClick={() => setTheme('dark')}
            >
              <Moon className="mr-1.5 size-4" />
              Tema Scuro
            </Button>
            <Button
              type="button"
              variant={theme === 'light' ? 'secondary' : 'outline'}
              className="h-10 rounded-xl text-xs"
              onClick={() => setTheme('light')}
            >
              <Sun className="mr-1.5 size-4" />
              Tema Chiaro
            </Button>
          </div>

          <Button
            type="button"
            variant="outline"
            className="h-auto min-h-10 w-full whitespace-normal rounded-xl border-primary/40 px-3 py-2 text-center text-xs text-primary hover:bg-primary/10"
            onClick={handleExportBackup}
          >
            <Download className="mr-1.5 size-4 shrink-0" />
            Esporta backup locale (Routine, Peso, Cestino)
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base">Tutorial & Aggiornamenti</CardTitle>
            <span className="rounded-full border border-sky-500/35 bg-sky-500/10 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-sky-400">
              v{APP_VERSION} · {APP_BUILD_ID}
            </span>
          </div>
          <CardDescription className="text-xs">
            Rivedi le funzioni principali dell’app o controlla nuove versioni PWA
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2.5">
          <Button
            type="button"
            variant="outline"
            className="h-10 w-full rounded-xl border-emerald-500/40 bg-emerald-500/10 text-xs text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-400"
            onClick={requestAppTourStart}
          >
            <Compass className="mr-1.5 size-4" />
            Avvia tutorial rapido dell’app
          </Button>

          <Button
            type="button"
            variant="outline"
            disabled={isCheckingUpdate}
            className="h-10 w-full rounded-xl border-sky-500/40 bg-sky-500/10 text-xs text-sky-700 hover:bg-sky-500/20 dark:text-sky-400"
            onClick={() => void handleCheckUpdates()}
          >
            <RefreshCw className={`mr-1.5 size-4 ${isCheckingUpdate ? 'animate-spin' : ''}`} />
            {isCheckingUpdate
              ? `Controllo v${APP_VERSION}...`
              : `Cerca aggiornamenti (v${APP_VERSION})`}
          </Button>

          {updateStatusText && (
            <p className="text-center text-[11px] text-muted-foreground">{updateStatusText}</p>
          )}

          <div className="flex items-center justify-center gap-4 border-t border-border/50 pt-2.5 text-[11px] text-muted-foreground">
            <Link href="/privacy" className="underline underline-offset-4 hover:text-foreground">
              Privacy Policy (GDPR UE)
            </Link>
            <Link href="/terms" className="underline underline-offset-4 hover:text-foreground">
              Termini di Servizio
            </Link>
          </div>
        </CardContent>
      </Card>

      <UpdateProgressModal
        open={updateModalOpen}
        stage={updateStage}
        progress={updateProgress}
        estimatedSecondsLeft={updateEstimateSec}
        currentVersion={APP_VERSION}
        currentBuildId={APP_BUILD_ID}
        targetVersion={updateTargetVersion}
        stepLabel={updateStepLabel}
        evaluation={restartEvaluation}
        errorMessage={updateErrorText}
        onRestartNow={handleRestartAppNow}
        onClose={() => setUpdateModalOpen(false)}
      />

      <Button
        type="button"
        variant="destructive"
        className="h-11 w-full rounded-xl"
        onClick={() => void handleLogout()}
      >
        <LogOut className="mr-1.5 size-4" />
        Esci dall’account
      </Button>
    </div>
  )
}
