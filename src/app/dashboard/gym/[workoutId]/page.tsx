'use client'

import { useState, useEffect, useCallback, use } from "react"; // Assicurati di importare 'use'
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Tables } from "@/lib/supabase/types";
import { ExerciseCard } from "@/app/components/dashboard/gym/ExerciseCard";
import { SetLog } from "@/app/components/dashboard/gym/SetInputRow";
import { Button } from "@/components/ui/button";

type WorkoutSessionLogs = Record<string, SetLog[]>;

type WorkoutWithExercises = Tables<'workouts'> & {
  workout_exercises: Tables<'workout_exercises'>[]
};

// 1. Usiamo un nome diverso per la prop, es. "paramsPromise"
export default function WorkoutSessionPage({ params: paramsPromise }: { params: Promise<{ workoutId: string }> }) {
  // 2. Ora possiamo dichiarare la nostra costante 'params' senza conflitti
  const params = use(paramsPromise);
  const { workoutId } = params;

  const router = useRouter();
  const supabase = createClient();
  const [workout, setWorkout] = useState<WorkoutWithExercises | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [sessionLogs, setSessionLogs] = useState<WorkoutSessionLogs>({});
  const [userId, setUserId] = useState<string | null>(null);

  const fetchWorkoutDetails = useCallback(async (id: string) => {
    const { data, error } = await (supabase as any)
      .rpc('get_workout_details', { p_workout_id: id });

    if (error || !data) {
      console.error("Errore nel recupero dell'allenamento:", error);
      alert("Allenamento non trovato o non hai i permessi per vederlo.");
      router.push('/dashboard/gym');
      return;
    }
    
    const workoutData = data as WorkoutWithExercises;
    if (workoutData.workout_exercises) {
        workoutData.workout_exercises.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    } else {
        workoutData.workout_exercises = []; // Assicura che sia un array
    }
    setWorkout(workoutData);
    setIsLoading(false);
  }, [router, supabase]);

  useEffect(() => {
    const getUserAndWorkout = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if(user) {
        setUserId(user.id);
        if (workoutId) fetchWorkoutDetails(workoutId);
      } else {
        router.push('/login');
      }
    };
    getUserAndWorkout();
  }, [workoutId, fetchWorkoutDetails, router, supabase.auth]);

  const updateExerciseLogs = (exerciseId: string, sets: SetLog[]) => {
    setSessionLogs(prevLogs => ({ ...prevLogs, [exerciseId]: sets }));
  };
  
  const handleFinishWorkout = async () => {
    setIsSaving(true);
    if (!workout) {
      alert("Errore: Allenamento non caricato.");
      setIsSaving(false);
      return;
    }

    const allSetsPayload = Object.entries(sessionLogs)
      .flatMap(([exerciseId, sets]) => {
        const exerciseDetails = workout.workout_exercises.find(e => e.id === exerciseId);
        return sets
          .filter(set => set.reps.trim() && set.weight_kg.trim())
          .map(set => ({
            workout_exercise_id: exerciseId,
            exercise_name: exerciseDetails?.exercise_name || 'Sconosciuto',
            set_number: set.set_number,
            reps: parseInt(set.reps, 10),
            weight_kg: parseFloat(set.weight_kg),
          }));
      });

    if (allSetsPayload.length === 0) {
      alert("Nessuna serie completata. Allenamento non salvato.");
      setIsSaving(false);
      return;
    }
    
    const { error } = await (supabase as any).rpc('save_workout_session', {
      p_workout_id: workout.id,
      p_sets: allSetsPayload,
    });
    
    if (error) {
      console.error("Errore RPC:", error);
      alert("Si è verificato un errore nel salvare la sessione: " + error.message);
    } else {
      alert("Allenamento salvato con successo!");
      router.push('/dashboard/gym');
      router.refresh();
    }
    setIsSaving(false);
  };

  if (isLoading || !userId) {
    return <div className="flex flex-1 items-center justify-center">Caricamento...</div>;
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
        {workout?.workout_exercises.map(exercise => (
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