'use client'

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
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
    
    // --- LA CORREZIONE È QUI ---
    const { data, error } = await supabase
      .from('workout_plans')
      .select(`
        *, 
        workouts (
          *,
          workout_exercises (
            *
          )
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error("Errore nel recupero delle schede:", error);
    } else if (data) {
      // Ora i dati corrispondono perfettamente al tipo, non serve più il cast
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
            {/* È utile avere il pulsante anche qui */}
            <div className="mt-4">
              <NewPlanDialog onSaveSuccess={fetchWorkoutPlans} />
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {plans.map((plan) => (
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