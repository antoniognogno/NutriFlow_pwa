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
    
    // MODIFICA: Chiamiamo la funzione RPC
    const { data, error } = await supabase.rpc('get_user_workout_plans');
    
    if (error) {
      console.error("Errore nel recupero delle schede:", error);
      // Qui potremmo voler mostrare un errore all'utente
    } else if (data) {
      // La RPC restituisce un array JSON, che possiamo usare direttamente
      setPlans(data); 
    }
    setIsLoading(false);
  }, [supabase]);

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
        <NewPlanDialog onSaveSuccess={fetchWorkoutPlans} />
      </div>

      {plans.length === 0 ? (
        <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm">
          <div className="flex flex-col items-center gap-2 text-center">
            <h3 className="text-2xl font-bold tracking-tight">Nessuna scheda trovata</h3>
            <p className="text-sm text-muted-foreground">Inizia creando la tua prima scheda di allenamento.</p>
            <div className="mt-4">
              <NewPlanDialog onSaveSuccess={fetchWorkoutPlans} />
            </div>
          </div>
        </div>
      ) : (
        <Accordion type="single" collapsible className="w-full space-y-4">
          {plans.map((plan) => (
            <AccordionItem value={plan.id} key={plan.id} className="border rounded-lg bg-card">
              <AccordionTrigger className="px-6 text-lg font-semibold hover:no-underline">
                {plan.name}
              </AccordionTrigger>
              <AccordionContent className="p-6 pt-0">
                <WorkoutSelector 
                  plan={plan} 
                  onDeleteSuccess={fetchWorkoutPlans} 
                />
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );
}