'use client'

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Tables } from "@/lib/supabase/types";
import { ExerciseCard } from "@/app/components/dashboard/gym/ExerciseCard";
import { SetLog } from "@/app/components/dashboard/gym/SetInputRow";
import { Button } from "@/components/ui/button";

// Definiamo il tipo per i log raccolti, pronti per essere salvati
type WorkoutSessionLogs = Record<string, SetLog[]>;

// Definiamo un tipo più specifico per il nostro stato 'workout'
type WorkoutWithExercises = Tables<'workouts'> & {
  workout_exercises: Tables<'workout_exercises'>[]
};

export default function WorkoutSessionPage({ params }: { params: { workoutId: string } }) {
  const router = useRouter();
  const supabase = createClient();
  const [workout, setWorkout] = useState<WorkoutWithExercises | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [sessionLogs, setSessionLogs] = useState<WorkoutSessionLogs>({});
  const [userId, setUserId] = useState<string | null>(null);

  const fetchWorkoutDetails = useCallback(async (id: string) => {
    const { data, error } = await supabase
      .from('workouts')
      .select(`
        *,
        workout_exercises (
          *
        )
      `)
      .eq('id', id)
      .single();

    if (error || !data) {
      console.error("Errore nel recupero dell'allenamento:", error);
      alert("Allenamento non trovato. Verrai reindirizzato.");
      router.push('/dashboard/gym');
      return;
    }
    
    data.workout_exercises.sort(
      (a: Tables<'workout_exercises'>, b: Tables<'workout_exercises'>) => (a.order ?? 0) - (b.order ?? 0)
    );
    setWorkout(data as WorkoutWithExercises);
    setIsLoading(false);
  }, [router, supabase]);

  useEffect(() => {
    const getUserAndWorkout = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if(user) {
        setUserId(user.id);
        fetchWorkoutDetails(params.workoutId);
      } else {
        router.push('/login');
      }
    };
    getUserAndWorkout();
  }, [params.workoutId, fetchWorkoutDetails, router, supabase.auth]);

  const updateExerciseLogs = (exerciseId: string, sets: SetLog[]) => {
    setSessionLogs(prevLogs => ({
      ...prevLogs,
      [exerciseId]: sets,
    }));
  };
  
  const handleFinishWorkout = async () => {
    setIsSaving(true);
    if (!userId || !workout) {
      alert("Errore: Utente o allenamento non trovato.");
      setIsSaving(false);
      return;
    }

    // 1. Crea un log per l'intera sessione
    const { data: workoutLog, error: workoutLogError } = await supabase
      .from('workout_logs')
      .insert({ 
        user_id: userId, 
        workout_id: workout.id, 
        completed_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (workoutLogError || !workoutLog) {
      console.error("Errore nel creare il workout log:", workoutLogError);
      alert("Si è verificato un errore nel salvare la sessione.");
      setIsSaving(false);
      return;
    }
    
    // 2. Prepara i log per ogni singola serie, ora includendo user_id
    const allSetLogsToInsert = Object.entries(sessionLogs)
      .flatMap(([exerciseId, sets]) => {
        const exerciseDetails = workout.workout_exercises.find(e => e.id === exerciseId);
        return sets
          .filter(set => set.reps && set.weight_kg)
          .map(set => ({
            log_id: workoutLog.id,
            user_id: userId, // Aggiunto per query più semplici
            workout_exercise_id: exerciseId,
            exercise_name: exerciseDetails?.exercise_name || 'Esercizio Sconosciuto',
            set_number: set.set_number,
            reps: parseInt(set.reps, 10),
            weight_kg: parseFloat(set.weight_kg),
          }));
      });
      
    if (allSetLogsToInsert.length > 0) {
      const { error: exerciseLogError } = await supabase
        .from('exercise_logs')
        .insert(allSetLogsToInsert);

      if (exerciseLogError) {
        console.error("Errore nel salvare i log degli esercizi:", exerciseLogError);
        alert("Si è verificato un errore nel salvare i dettagli della sessione.");
        setIsSaving(false);
        // Qui potremmo voler cancellare il workout_log appena creato per consistenza
        await supabase.from('workout_logs').delete().eq('id', workoutLog.id);
        return;
      }
    }
    
    alert("Allenamento salvato con successo!");
    router.push('/dashboard/gym');
    router.refresh();
    setIsSaving(false);
  };

  if (isLoading || !userId) {
    return <div className="flex flex-1 items-center justify-center">Caricamento allenamento...</div>;
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold truncate">{workout?.name}</h1>
          <p className="text-muted-foreground">Registra le tue serie qui sotto.</p>
        </div>
      </div>
      
      <div className="space-y-4">
        {workout?.workout_exercises.map((exercise: Tables<'workout_exercises'>) => (
          <ExerciseCard 
            key={exercise.id}
            exercise={exercise}
            userId={userId}
            onUpdateLogs={updateExerciseLogs}
          />
        ))}
      </div>

      <div className="mt-6 flex justify-center">
        <Button onClick={handleFinishWorkout} disabled={isSaving} size="lg">
          {isSaving ? "Salvataggio..." : "Termina e Salva Allenamento"}
        </Button>
      </div>
    </div>
  );
}