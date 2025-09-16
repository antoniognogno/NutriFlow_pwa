// src/app/dashboard/page.tsx
'use client'

import { createClient } from "@/lib/supabase/client"
import { useEffect, useState } from "react"
import { FocusCard } from "@/app/components/dashboard/home/FocusCard";
import { NextWorkoutCard } from "@/app/components/dashboard/home/NextWorkoutCard";
import { ProgressRings } from "@/app/components/dashboard/home/ProgressRings";
import { RecentWins } from "@/app/components/dashboard/home/RecentWins";
import { PlanWithWorkoutsAndExercises } from "@/lib/supabase/types"; // Importiamo il nostro tipo custom
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
  const [isLoading, setIsLoading] = useState(true)
  const [wins, setWins] = useState<Win[]>([]);
  const currentDate = getFormattedDate();


  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);

      // Eseguiamo le chiamate in parallelo per più velocità
      const [profileResponse, planResponse, winsResponse] = await Promise.all([
        // Chiamata per il profilo utente
        supabase.from('profiles').select('username').single(),
        
        // <<< CHIAMATA RPC PER IL PIANO DI ALLENAMENTO
        supabase.rpc('get_latest_plan_details'),
        supabase.rpc('get_recent_wins')
      ]);

      // Gestione del profilo
      if (profileResponse.data) {
        setUsername(profileResponse.data.username);
      }
      
      // Gestione del piano di allenamento
      if (planResponse.data) {
        // La RPC restituisce un JSON, che noi "castiamo" al nostro tipo per sicurezza
        setLatestPlan(planResponse.data as PlanWithWorkoutsAndExercises);
      }
      
      // Se c'è un errore nella RPC, loggalo
      if(planResponse.error) {
        console.error("Errore nel recupero del piano via RPC:", planResponse.error);
      }

      if (winsResponse.data) {
        setWins(winsResponse.data as Win[]);
      }
      if(winsResponse.error){
        console.error("Errore nel recupero delle vittorie:", winsResponse.error);
      }
      setIsLoading(false);
    }

    fetchDashboardData();
  }, [supabase]);

  // Estraiamo il prossimo workout dai dati di stato
  const nextWorkout = latestPlan?.workouts?.[0];

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center h-[calc(100vh-80px)]">
          <div className="loader ease-linear rounded-full border-4 border-t-4 border-gray-200 h-12 w-12 mb-4"></div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 animate-fade-in">
      <header className="mb-8">
        <p className="text-sm text-muted-foreground mt-1">
          {currentDate}
        </p>
        <h1 className="text-3xl font-bold tracking-tight">
          Bentornato, <p className="text-primary">{username || 'Atleta'}!</p>
        </h1>
        <p className="text-md text-muted-foreground mt-1">
          Ecco il riepilogo della tua giornata e i tuoi prossimi obiettivi.
        </p>
      </header>
      
      <main className="space-y-8">
        <FocusCard
          // insight={insightData?.insight} 
          // isLoading={!insightData && !insightError} 
          // error={insightError} 
        />
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <ProgressRings />
          </div>
          <div className="lg:col-span-1">
            {/* Passiamo il workout estratto dallo stato */}
            <NextWorkoutCard workout={nextWorkout} />
          </div>
        </div>

        <RecentWins />
      </main>
    </div>
  );
}