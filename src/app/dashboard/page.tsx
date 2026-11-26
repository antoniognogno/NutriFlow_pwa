// src/app/dashboard/page.tsx
'use client'

import { createClient } from "@/lib/supabase/client"
import { useEffect, useState } from "react"
import { TodayWidget } from "@/features/dashboard/TodayWidget";
import { GamificationCard } from "@/app/components/dashboard/home/GamificationCard";
import { NextWorkoutCard } from "@/app/components/dashboard/home/NextWorkoutCard";
import { ProgressRings } from "@/app/components/dashboard/home/ProgressRings";
import { RecentWins } from "@/app/components/dashboard/home/RecentWins";
import { DEFAULT_WORKOUTS } from "@/features/workouts/defaultWorkouts";
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
  const [username, setUsername] = useState<string | null>(null)
  const [latestPlan, setLatestPlan] = useState<PlanWithWorkoutsAndExercises | null>(null);
  const currentDate = getFormattedDate();


  useEffect(() => {
    const fetchDashboardData = async () => {
      const [profileResponse, planResponse] = await Promise.all([
        supabase.from('profiles').select('username').single(),
        supabase.rpc('get_latest_plan_details'),
      ]);

      if (profileResponse.data) {
        setUsername(profileResponse.data.username);
      }
      if (planResponse.data) {
        setLatestPlan(planResponse.data as PlanWithWorkoutsAndExercises);
      }
      if (planResponse.error) {
        console.error("Errore nel recupero del piano via RPC:", planResponse.error);
      }
    }

    fetchDashboardData();
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
        <GamificationCard />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
          <div className="lg:col-span-2">
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