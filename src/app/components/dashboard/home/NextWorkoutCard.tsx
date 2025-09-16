// src/app/components/dashboard/home/NextWorkoutCard.tsx
'use client'; 

import { Dumbbell, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import type { Workout, WorkoutExercise } from '@/lib/supabase/types'; 
import Link from 'next/link';
import { useMemo } from 'react';

type WorkoutWithExercises = Workout & {
  workout_exercises: WorkoutExercise[];
};

interface NextWorkoutCardProps {
  workout?: WorkoutWithExercises;
}

const getWorkoutTip = (workoutName: string): string => {
    const name = workoutName.toLowerCase();
    if (name.includes('push') || name.includes('spinta') || name.includes('petto')) return "Concentrati sulla contrazione del petto. La qualità del movimento batte sempre la quantità.";
    if (name.includes('pull') || name.includes('tirata') || name.includes('dorso')) return "Pensa a tirare con i gomiti, non con le mani, per attivare al massimo i muscoli della schiena.";
    if (name.includes('leg') || name.includes('gambe')) return "Non aver paura di spingere! Le gambe sono il motore del tuo corpo.";
    if (name.includes('core') || name.includes('addome')) return "Un core forte è la base di tutto. Mantieni la tensione per tutta la durata dell'esercizio.";
    return "Ogni ripetizione ti avvicina al tuo obiettivo. Dai il massimo!";
};


export function NextWorkoutCard({ workout }: NextWorkoutCardProps) {
  
  if (!workout) {
    return (
      <Card className="flex flex-col h-full items-center justify-center text-center p-6 bg-muted/50 border-dashed">
        <Info className="text-muted-foreground mb-4 h-12 w-12" />
        <h3 className="text-lg font-semibold">Nessuna Scheda Trovata</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Crea la tua prima scheda di allenamento per vedere qui la tua prossima sfida!
        </p>
        <Link href="/dashboard/gym" passHref>
            <Button>Vai al Gym Tracker</Button>
        </Link>
      </Card>
    );
  }

  const exercisePreview = workout.workout_exercises.slice(0, 3).map(ex => ex.exercise_name).join(', ');
  const motivationalTip = useMemo(() => getWorkoutTip(workout.name), [workout.name]);

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Dumbbell className="text-primary" />
          Prossima Sfida
        </CardTitle>
        <CardDescription>Il tuo prossimo allenamento in programma.</CardDescription>
      </CardHeader>

      {/* <<< MODIFICA: Miglioriamo il layout del contenuto */}
      <CardContent className="flex-grow flex flex-col">
        <div className="bg-muted p-4 rounded-lg flex-grow flex flex-col justify-between">
          
          {/* Sezione Superiore: Info del Workout */}
          <div>
            {/* <<< MODIFICA: Aggiunto `truncate` per evitare l'overflow */}
            <h3 
              className="text-2xl font-bold text-primary truncate" 
              title={workout.name} // Mostra il nome completo al passaggio del mouse su desktop
            >
              {workout.name}
            </h3>
            
            {workout.workout_exercises.length > 0 ? (
              <p className="text-muted-foreground truncate" title={exercisePreview}>
                {exercisePreview}{workout.workout_exercises.length > 3 ? '...' : ''}
              </p>
            ) : (
              <p className="text-muted-foreground italic">Nessun esercizio aggiunto.</p>
            )}
          </div>
          
          {/* Sezione Inferiore: Frase Motivazionale */}
          <p className="text-sm mt-4 italic text-muted-foreground/80">
            "{motivationalTip}"
          </p>

        </div>
      </CardContent>

      <CardFooter>
        <Link href={`/dashboard/gym/${workout.id}`} passHref className="w-full">
          <Button className="w-full font-bold">Inizia Sessione</Button>
        </Link>
      </CardFooter>
    </Card>
  );
}