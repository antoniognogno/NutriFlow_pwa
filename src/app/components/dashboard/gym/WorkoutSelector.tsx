'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import { Dumbbell } from 'lucide-react';
import type { PlanWithWorkoutsAndExercises } from '@/lib/supabase/types';

interface WorkoutSelectorProps {
  plan: PlanWithWorkoutsAndExercises;
}

export default function WorkoutSelector({ plan }: WorkoutSelectorProps) {

  return (
    <Card>
      <CardHeader>
        <CardTitle>{plan.name}</CardTitle>
        <CardDescription>Seleziona un allenamento per iniziare la tua sessione.</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {plan.workouts.map((workout) => (
          // Usiamo il componente Link di Next.js per una navigazione ottimale
          <Link key={workout.id} href={`/dashboard/gym/${workout.id}`} passHref>
            <div className="flex flex-col items-center justify-center text-center p-6 border rounded-lg hover:bg-muted/50 transition-colors h-full cursor-pointer">
              <div className="bg-primary/10 p-3 rounded-full mb-4">
                <Dumbbell className="h-8 w-8 text-primary" />
              </div>
              <p className="font-semibold">{workout.name}</p>
              {workout.muscle_group && (
                <p className="text-sm text-muted-foreground capitalize">
                  {workout.muscle_group}
                </p>
              )}
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}