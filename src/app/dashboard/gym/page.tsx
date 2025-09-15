'use client'

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { PlanWithWorkoutsAndExercises } from "@/lib/supabase/types"; 
import WorkoutSelector from "@/app/components/dashboard/gym/WorkoutSelector";
import { NewPlanDialog } from "@/app/components/dashboard/gym/NewPlanDialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

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
      .select(`*, workouts(*, workout_exercises(*))`)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
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
        <h1 className="text-lg font-semibold md:text-2xl">Le Tue Schede di Allenamento</h1>
        <NewPlanDialog mode="create" onSaveSuccess={fetchWorkoutPlans} />
      </div>

      {plans.length === 0 ? (
        <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm">
          <div className="flex flex-col items-center gap-2 text-center">
            <h3 className="text-2xl font-bold tracking-tight">Nessuna scheda trovata</h3>
            <p className="text-sm text-muted-foreground">Inizia creando la tua prima scheda.</p>
            <div className="mt-4">
              <NewPlanDialog mode="create" onSaveSuccess={fetchWorkoutPlans}/>
            </div>
          </div>
        </div>
      ) : (
        <Accordion type="single" collapsible className="w-full space-y-4">
          {plans.map((plan) => (
            <AccordionItem value={plan.id} key={plan.id} className="border rounded-lg bg-card overflow-hidden">
              <AccordionTrigger className="px-6 py-4 text-lg font-semibold hover:no-underline">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full text-left">
                    <span>{plan.name}</span>
                    <span className="text-sm font-normal text-muted-foreground mt-1 sm:mt-0">
                        Creata il: {new Date(plan.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="p-6 pt-0">
                <div className="flex flex-col gap-2">
                  <WorkoutSelector 
                    plan={plan} 
                    onDeleteSuccess={fetchWorkoutPlans}
                    editComponent={
                      <NewPlanDialog mode="edit" planToEdit={plan} onSaveSuccess={fetchWorkoutPlans} />
                    }
                  />
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );
}