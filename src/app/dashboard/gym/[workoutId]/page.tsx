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
    
    data.workout_exercises.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    setWorkout(data as WorkoutWithExercises);
    setIsLoading(false);
  }, [router, supabase]);

  useEffect(() => {
    if (params.workoutId) {
      fetchWorkoutDetails(params.workoutId);
    }
  }, [params.workoutId, fetchWorkoutDetails]);

  const updateExerciseLogs = (exerciseName: string, sets: SetLog[]) => {
    setSessionLogs(prevLogs => ({
      ...prevLogs,
      [exerciseName]: sets,
    }));
  };
  
  const handleFinishWorkout = async () => {
    setIsSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !workout) {
      setIsSaving(false);
      return;
    }

    const { data: workoutLog, error: workoutLogError } = await supabase
      .from('workout_logs')
      .insert({ 
        user_id: user.id, 
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
    
    const allSetLogsToInsert = Object.entries(sessionLogs)
      .flatMap(([exerciseName, sets]) => 
        sets
          .filter(set => set.reps && set.weight_kg)
          .map(set => ({
            log_id: workoutLog.id,
            exercise_name: exerciseName,
            set_number: set.set_number,
            reps: parseInt(set.reps, 10),
            weight_kg: parseFloat(set.weight_kg),
          }))
      );
      
    if (allSetLogsToInsert.length > 0) {
      const { error: exerciseLogError } = await supabase
        .from('exercise_logs')
        .insert(allSetLogsToInsert);

      if (exerciseLogError) {
        console.error("Errore nel salvare i log degli esercizi:", exerciseLogError);
        alert("Si è verificato un errore nel salvare i dettagli della sessione.");
        setIsSaving(false);
        return;
      }
    }
    
    alert("Allenamento salvato con successo!");
    router.push('/dashboard/gym');
    router.refresh(); // Forza un refresh per visualizzare eventuali dati aggiornati
    setIsSaving(false);
  };

  if (isLoading) {
    return <div className="flex flex-1 items-center justify-center">Caricamento allenamento...</div>;
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-2xl font-bold">{workout?.name}</h1>
            <p className="text-muted-foreground">Registra le tue serie qui sotto.</p>
        </div>
        <Button onClick={handleFinishWorkout} disabled={isSaving}>
          {isSaving ? "Salvataggio..." : "Termina Allenamento"}
        </Button>
      </div>
      <div className="space-y-4">
        {workout?.workout_exercises.map(exercise => (
          <ExerciseCard 
            key={exercise.id}
            exercise={exercise}
            onUpdateLogs={updateExerciseLogs}
          />
        ))}
      </div>
    </div>
  );
}