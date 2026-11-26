// src/app/dashboard/page.tsx
'use client'

import { createClient } from "@/lib/supabase/client"
import { useEffect, useState } from "react"
import { TodayWidget } from "@/features/dashboard/TodayWidget";
import { WelcomeBackCtaCard } from "@/features/dashboard/WelcomeBackCtaCard";
import { GamificationCard } from "@/app/components/dashboard/home/GamificationCard";
import { NextWorkoutCard } from "@/app/components/dashboard/home/NextWorkoutCard";
import { ProgressRings } from "@/app/components/dashboard/home/ProgressRings";
import { RecentWins } from "@/app/components/dashboard/home/RecentWins";
import { DEFAULT_WORKOUTS } from "@/features/workouts/defaultWorkouts";
import { offlineDatabase } from "@/features/offline/database";
import { readCachedProfileSettings, saveCachedProfileSettings } from "@/features/routine/profileGoalsStore";
import {
  cachePlans,
  mergeRemoteAndCachedPlans,
  readCachedPlans,
} from "@/features/workouts/workoutOfflineCache";
import type { PlanWithWorkoutsAndExercises, Workout, WorkoutExercise } from "@/lib/supabase/types";
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(res => res.json());

const getFormattedDate = (): string => {
  const today = new Date();
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  };
  // Capitalizza la prima lettera della stringa
  const formattedDate = new Intl.DateTimeFormat('it-IT', options).format(today);
  return formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
};

export type Win = {
    type: string;
    title: string;
    description: string;
    icon: string;
    color: string;
}

export default function DashboardPage() {
  const supabase = createClient()
  const [username, setUsername] = useState<string | null>(
    () => readCachedProfileSettings().username || null,
  )
  const [latestPlan, setLatestPlan] = useState<PlanWithWorkoutsAndExercises | null>(
    () => readCachedPlans()[0] ?? null,
  );
  const currentDate = getFormattedDate();


  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!navigator.onLine) return;
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;

      const [profileResponse, planResponse, pendingOutbox] = await Promise.all([
        supabase.from('profiles').select('username').single(),
        supabase.rpc('get_latest_plan_details'),
        user ? offlineDatabase.outbox.where('userId').equals(user.id).toArray() : Promise.resolve([]),
      ]);

      const hasPendingProfile = pendingOutbox.some(item => item.table === 'profiles');
      if (!hasPendingProfile && profileResponse.data) {
        const nextName = profileResponse.data.username ?? '';
        setUsername(nextName || null);
        saveCachedProfileSettings({ username: nextName });
      }

      const pendingSyncIds = new Set<string>()
      const pendingDeleteIds = new Set<string>()
      for (const item of pendingOutbox) {
        if (item.table === 'workout_plans_sync') {
          pendingSyncIds.add(item.payload.plan.id)
        } else if (item.table === 'workout_plans_delete') {
          pendingDeleteIds.add(item.payload.plan_id)
        }
      }

      if (planResponse.data) {
        const remotePlan = planResponse.data as PlanWithWorkoutsAndExercises;
        const merged = mergeRemoteAndCachedPlans(
          [remotePlan],
          readCachedPlans(),
          pendingSyncIds,
          pendingDeleteIds,
        );
        cachePlans(merged);
        setLatestPlan(merged[0] ?? null);
      }
    }

    void fetchDashboardData();
  }, [supabase]);

  const nextWorkout =
    latestPlan?.workouts?.[0] ??
    (DEFAULT_WORKOUTS[0] as unknown as Workout & { workout_exercises: WorkoutExercise[] });

  return (
    <div className="flex flex-col gap-4 sm:gap-6 animate-fade-in">
      <header className="space-y-0.5">
        <p className="text-xs font-medium capitalize text-muted-foreground sm:text-sm">
          {currentDate}
        </p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Bentornato, <span className="text-primary">{username || 'Atleta'}!</span>
        </h1>
      </header>

      <div className="space-y-4 sm:space-y-6">
        <WelcomeBackCtaCard />

        <GamificationCard />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
          <div className="lg:col-span-2" data-tour="home-progress">
            <ProgressRings />
          </div>
          <div className="lg:col-span-1">
            <NextWorkoutCard workout={nextWorkout} />
          </div>
        </div>

        <TodayWidget />

        <RecentWins />
      </div>
    </div>
  );
}