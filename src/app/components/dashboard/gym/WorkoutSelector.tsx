'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { CardDescription } from '@/components/ui/card';
import Link from 'next/link';
import { Dumbbell, Trash2 } from 'lucide-react';
import type { PlanWithWorkoutsAndExercises } from '@/lib/supabase/types';
import { Button } from '@/components/ui/button';
import { queueAndSync, removeOutboxItem } from '@/features/offline/useOfflineSync';
import { moveToTrash } from '@/features/trash/trashStore';
import { removeCachedPlan } from '@/features/workouts/workoutOfflineCache';
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
import { toast } from 'sonner';

interface WorkoutSelectorProps {
  plan: PlanWithWorkoutsAndExercises;
  onDeleteSuccess: () => void;
  editComponent: React.ReactNode;
}

export default function WorkoutSelector({ plan, onDeleteSuccess, editComponent }: WorkoutSelectorProps) {
  const supabase = createClient();
  
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDeletePlan = async () => {
    setIsDeleting(true);
    setError(null);
    removeCachedPlan(plan.id);
    await removeOutboxItem(`workout_plans_sync:${plan.id}`);

    moveToTrash({
      id: `workout_plan:${plan.id}`,
      kind: 'workout_plan',
      title: plan.name,
      subtitle: `${plan.workouts?.length ?? 0} allenamenti`,
      plan,
    });

    const queuePlanDelete = async () => {
      await queueAndSync({
        id: `workout_plans_delete:${plan.id}`,
        userId: plan.user_id,
        table: 'workout_plans_delete',
        payload: { plan_id: plan.id },
      });
    };

    if (!navigator.onLine) {
      await queuePlanDelete();
      onDeleteSuccess();
      window.dispatchEvent(new Event('nutriflow:data-updated'));
      toast.success("Scheda spostata nel cestino offline (verrà sincronizzata).");
      setIsDeleting(false);
      setConfirmText("");
      return;
    }

    const { error } = await supabase.from('workout_plans').delete().eq('id', plan.id);
    if (error) {
      await queuePlanDelete();
      onDeleteSuccess();
      window.dispatchEvent(new Event('nutriflow:data-updated'));
      toast.success("Scheda rimossa in locale (eliminazione in coda sync).");
    } else {
      onDeleteSuccess();
      window.dispatchEvent(new Event('nutriflow:data-updated'));
      toast.success("Scheda spostata nel cestino (30 giorni).");
    }
    setIsDeleting(false);
    setConfirmText("");
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <CardDescription className="min-w-0">Seleziona un allenamento per iniziare.</CardDescription>
        <div className="flex shrink-0 items-center">
          {editComponent}
          <AlertDialog onOpenChange={() => {setError(null); setConfirmText("")}}>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Sei assolutamente sicuro?</AlertDialogTitle>
              <AlertDialogDescription>
                Questa azione è irreversibile. Eliminerà la scheda
                <strong className="text-foreground"> &quot;{plan.name}&quot; </strong> 
                e tutti i suoi allenamenti.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="my-4 space-y-2">
              <p className="text-sm text-muted-foreground">
                Per confermare, scrivi <strong className="text-foreground">"{plan.name}"</strong> qui sotto.
              </p>
              <Input 
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={plan.name}
              />
              {error && <p className="text-sm text-red-500">{error}</p>}
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Annulla</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeletePlan}
                disabled={confirmText !== plan.name || isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? "Eliminazione..." : "Sì, elimina"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {(plan.workouts || []).map((workout) => (
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
        {(!plan.workouts || plan.workouts.length === 0) && (
            <p className="text-sm text-muted-foreground col-span-full text-center py-8">
                Questa scheda non ha ancora nessun allenamento.
            </p>
        )}
      </div>
    </div>
  );
}