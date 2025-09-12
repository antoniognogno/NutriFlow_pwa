'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import { Dumbbell, Trash2 } from 'lucide-react';
import type { PlanWithWorkoutsAndExercises } from '@/lib/supabase/types';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';

interface WorkoutSelectorProps {
  plan: PlanWithWorkoutsAndExercises;
  onDeleteSuccess: () => void; // Aggiungiamo il callback per aggiornare la UI
}

export default function WorkoutSelector({ plan, onDeleteSuccess }: WorkoutSelectorProps) {
  const router = useRouter();
  const supabase = createClient();
  
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDeletePlan = async () => {
    setIsDeleting(true);
    setError(null);

    const { error } = await supabase
      .from('workout_plans')
      .delete()
      .eq('id', plan.id);

    if (error) {
      setError("Errore durante l'eliminazione: " + error.message);
      console.error(error);
    } else {
      // Chiudiamo il dialogo e chiamiamo il callback per aggiornare la lista
      onDeleteSuccess();
    }
    
    setIsDeleting(false);
    setConfirmText(""); // Resetta il testo di conferma
  };

  return (
    <Card className="relative">
      {/* Pulsante di eliminazione posizionato nell'angolo in alto a destra */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-8 w-8">
            <Trash2 className="h-4 w-4 text-destructive" />
            <span className="sr-only">Elimina scheda</span>
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sei assolutamente sicuro?</AlertDialogTitle>
            <AlertDialogDescription>
              Questa azione è irreversibile. Verranno eliminati permanentemente la scheda
              <strong className="text-foreground"> "{plan.name}" </strong> 
              e tutti i suoi allenamenti ed esercizi associati.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-4 space-y-2">
            <p className="text-sm text-muted-foreground">
              Per confermare, scrivi <strong className="text-foreground">{plan.name}</strong> qui sotto.
            </p>
            <Input 
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={plan.name}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmText("")}>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePlan}
              disabled={confirmText !== plan.name || isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Eliminazione..." : "Sì, elimina questa scheda"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CardHeader>
        <CardTitle>{plan.name}</CardTitle>
        <CardDescription>Seleziona un allenamento per iniziare la tua sessione.</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {plan.workouts.map((workout) => (
          <Link key={workout.id} href={`/dashboard/gym/${workout.id}`} passHref>
            <div className="flex flex-col items-center justify-center text-center p-6 border rounded-lg hover:bg-muted/50 transition-colors h-full cursor-pointer">
              <div className="bg-primary/10 p-3 rounded-full mb-4">
                <Dumbbell className="h-8 w-8 text-primary" />
              </div>
              <p className="font-semibold">{workout.name}</p>
              {workout.muscle_group && (
                <p className="text-sm text-muted-foreground capitalize">{workout.muscle_group}</p>
              )}
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}