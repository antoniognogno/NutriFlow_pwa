'use client'

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { PlanWithWorkoutsAndExercises } from "@/lib/supabase/types"; 
import WorkoutSelector from "@/app/components/dashboard/gym/WorkoutSelector";
import { NewPlanDialog } from "@/app/components/dashboard/gym/NewPlanDialog";

export default function GymPage() {
  const router = useRouter();
  const supabase = createClient();
  const [plans, setPlans] = useState<PlanWithWorkoutsAndExercises[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchWorkoutPlans = useCallback(async () => {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }
    
    const { data, error } = await supabase
      .from('workout_plans')
      .select(`
        id, name,
        workouts ( id, name, muscle_group, 
          workout_exercises ( id, exercise_name, target_sets, target_reps, order )
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }); // Ordina per le più recenti
    
    if (error) {
      console.error("Errore nel recupero delle schede:", error);
    } else if (data) {
      setPlans(data);
    }
    setIsLoading(false);
  }, [router, supabase]);

  useEffect(() => {
    fetchWorkoutPlans();
  }, [fetchWorkoutPlans]);

  if (isLoading) {
    return <div className="flex flex-1 items-center justify-center">Caricamento schede...</div>;
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold md:text-2xl">I Tuoi Allenamenti</h1>
        <NewPlanDialog onSaveSuccess={fetchWorkoutPlans} />
      </div>

      {plans.length === 0 ? (
        <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm">
          <div className="flex flex-col items-center gap-1 text-center">
            <h3 className="text-2xl font-bold tracking-tight">Nessuna scheda trovata</h3>
            <p className="text-sm text-muted-foreground">Inizia creando la tua prima scheda di allenamento.</p>
            <NewPlanDialog onSaveSuccess={fetchWorkoutPlans} />
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {plans.map((plan) => (
            // Passiamo la funzione di callback per l'aggiornamento
            <WorkoutSelector 
              key={plan.id} 
              plan={plan} 
              onDeleteSuccess={fetchWorkoutPlans} 
            />
          ))}
        </div>
      )}
    </div>
  );
}