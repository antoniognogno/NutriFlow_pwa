import { lazy, Suspense, useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'
import { TransitionProvider } from '@/app/context/TransitionContext'
import { NutriFlowLogo } from '@/components/NutriFlowLogo'
import DashboardLayout from '@/app/dashboard/layout'
import { createClient } from '@/lib/supabase/client'

// Route-level code splitting for faster mobile cold start (all chunks precached by VitePWA offline)
const DashboardPage = lazy(() => import('@/app/dashboard/page'))
const LoginPage = lazy(() => import('@/app/login/page'))
const SignUpPage = lazy(() => import('@/app/signup/page'))
const RoutinePage = lazy(() => import('@/app/dashboard/routine/page'))
const GymPage = lazy(() => import('@/app/dashboard/gym/page'))
const GymHistoryPage = lazy(() => import('@/app/dashboard/gym/history/page'))
const GymTrashPage = lazy(() => import('@/app/dashboard/gym/trash/page'))
const PlanBuilderPage = lazy(() => import('@/app/dashboard/gym/plan/PlanBuilderPage'))
const WorkoutSessionPage = lazy(() => import('@/app/dashboard/gym/[workoutId]/page'))
const NutritionPage = lazy(() => import('@/app/dashboard/nutrition/page'))
const RecipesPage = lazy(() => import('@/app/dashboard/recipes/page'))
const SettingsPage = lazy(() => import('@/app/dashboard/settings/page'))
const StatsPage = lazy(() => import('@/app/dashboard/stats/page'))
const WaterTrackerPage = lazy(() => import('@/app/dashboard/water/page'))
const OnboardingPage = lazy(() => import('@/app/onboarding/page'))
const PrivacyPage = lazy(() => import('@/app/legal/PrivacyPage'))
const TermsPage = lazy(() => import('@/app/legal/TermsPage'))

function ScrollToTopOnNavigate() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [pathname])

  return null
}

function SessionRedirect() {
  const [destination, setDestination] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    void createClient().auth.getSession().then(({ data, error }) => {
      if (error) {
        console.error('Impossibile leggere la sessione Supabase:', error)
        if (active) setDestination('/login')
        return
      }
      if (active) setDestination(data.session ? '/dashboard' : '/login')
    })
    return () => {
      active = false
    }
  }, [])

  return destination ? <Navigate to={destination} replace /> : <PageLoading />
}

function ProtectedRoute() {
  const [status, setStatus] = useState<'loading' | 'signed-in' | 'signed-out'>('loading')

  useEffect(() => {
    const supabase = createClient()
    let active = true
    void supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        console.error('Impossibile verificare la sessione Supabase:', error)
        if (active) setStatus('signed-out')
        return
      }
      if (active) setStatus(data.session ? 'signed-in' : 'signed-out')
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setStatus(session ? 'signed-in' : 'signed-out')
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  if (status === 'loading') return <PageLoading />
  if (status === 'signed-out') return <Navigate to="/login" replace />
  return (
    <DashboardLayout>
      <Suspense fallback={<PageLoading />}>
        <Outlet />
      </Suspense>
    </DashboardLayout>
  )
}

function PageLoading() {
  return (
    <div className="flex min-h-[75dvh] flex-col items-center justify-center gap-4 px-6" role="status">
      <div className="nf-splash-logo rounded-[22%]">
        <NutriFlowLogo className="size-20" />
      </div>
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="text-lg font-bold tracking-tight">NutriFlow</span>
        <div className="h-1 w-28 overflow-hidden rounded-full bg-muted">
          <div className="nf-splash-bar h-full w-1/2 rounded-full bg-gradient-to-r from-sky-400 to-emerald-400" />
        </div>
        <span className="text-xs text-muted-foreground">Caricamento in corso...</span>
      </div>
    </div>
  )
}

function OAuthCallback() {
  const [message, setMessage] = useState('Completo l’accesso...')

  useEffect(() => {
    let active = true
    const completeSignIn = async () => {
      const supabase = createClient()
      const code = new URLSearchParams(window.location.search).get('code')
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) {
          console.error('Accesso OAuth non completato:', error)
          if (active) setMessage(`Accesso non riuscito: ${error.message}`)
          return
        }
      }
      const { data, error } = await supabase.auth.getSession()
      if (error || !data.session) {
        if (error) console.error('Impossibile recuperare la sessione dopo OAuth:', error)
        if (active) setMessage('Accesso non riuscito. Torna alla pagina di login.')
        return
      }
      window.location.replace('/dashboard')
    }
    void completeSignIn()
    return () => {
      active = false
    }
  }, [])

  return <p className="mx-auto mt-20 max-w-sm text-center text-muted-foreground">{message}</p>
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
        <TransitionProvider>
          <ScrollToTopOnNavigate />
          <Suspense fallback={<PageLoading />}>
            <Routes>
              <Route path="/" element={<SessionRedirect />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignUpPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/auth/callback" element={<OAuthCallback />} />
              <Route element={<ProtectedRoute />}>
                <Route path="/onboarding" element={<OnboardingPage />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/dashboard/routine" element={<RoutinePage />} />
                <Route path="/dashboard/gym" element={<GymPage />} />
                <Route path="/dashboard/gym/plan/new" element={<PlanBuilderPage />} />
                <Route path="/dashboard/gym/plan/:planId" element={<PlanBuilderPage />} />
                <Route path="/dashboard/gym/history" element={<GymHistoryPage />} />
                <Route path="/dashboard/gym/trash" element={<GymTrashPage />} />
                <Route path="/dashboard/gym/:workoutId" element={<WorkoutSessionPage />} />
                <Route path="/dashboard/nutrition" element={<NutritionPage />} />
                <Route path="/dashboard/stats" element={<StatsPage />} />
                <Route path="/dashboard/water" element={<WaterTrackerPage />} />
                <Route path="/dashboard/recipes" element={<RecipesPage />} />
                <Route path="/dashboard/settings" element={<SettingsPage />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
          <Toaster position="top-right" richColors />
        </TransitionProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
