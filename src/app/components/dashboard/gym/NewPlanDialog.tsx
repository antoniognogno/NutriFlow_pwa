'use client'

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle, Trash2, GripVertical } from "lucide-react";
import { Separator } from "@/components/ui/separator";

// Definiamo i tipi per il nostro form dinamico
interface ExerciseForm {
  exercise_name: string;
  target_sets: string;
  target_reps: string;
}

interface WorkoutForm {
  name: string;
  exercises: ExerciseForm[];
}

// Stato iniziale pre-compilato
const defaultWorkouts: WorkoutForm[] = [
    { name: "Petto/Tricipiti/Spalle", exercises: [{ exercise_name: "Panca Piana", target_sets: "4", target_reps: "8" }] },
    { name: "Schiena/Bicipiti", exercises: [{ exercise_name: "Trazioni o Lat Machine", target_sets: "4", target_reps: "8" }] },
    { name: "Gambe", exercises: [{ exercise_name: "Squat con Bilanciere", target_sets: "4", target_reps: "8" }] }
];

const getInitialState = () => ({
    planName: `Scheda`,
    workouts: JSON.parse(JSON.stringify(defaultWorkouts))
});
interface NewPlanDialogProps {
  onSaveSuccess: () => void;
}

export function NewPlanDialog({ onSaveSuccess }: NewPlanDialogProps) {
  const router = useRouter();
  const supabase = createClient();
  
  const [open, setOpen] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [planName, setPlanName] = useState(getInitialState().planName);
  const [workouts, setWorkouts] = useState<WorkoutForm[]>(getInitialState().workouts);

    const handleWorkoutChange = (index: number, value: string) => {
    const newWorkouts = [...workouts];
    newWorkouts[index].name = value;
    setWorkouts(newWorkouts);
  };

  const addWorkout = () => {
    setWorkouts([...workouts, { name: "", exercises: [{ exercise_name: "", target_sets: "", target_reps: "" }] }]);
  };
  
  const removeWorkout = (index: number) => {
    setWorkouts(workouts.filter((_, i) => i !== index));
  };
  
  const handleExerciseChange = (workoutIndex: number, exIndex: number, field: keyof ExerciseForm, value: string) => {
    const newWorkouts = [...workouts];
    newWorkouts[workoutIndex].exercises[exIndex][field] = value;
    setWorkouts(newWorkouts);
  };

  const addExercise = (workoutIndex: number) => {
    const newWorkouts = [...workouts];
    newWorkouts[workoutIndex].exercises.push({ exercise_name: "", target_sets: "", target_reps: "" });
    setWorkouts(newWorkouts);
  };
  
  const removeExercise = (workoutIndex: number, exIndex: number) => {
    const newWorkouts = [...workouts];
    newWorkouts[workoutIndex].exercises = newWorkouts[workoutIndex].exercises.filter((_, i) => i !== exIndex);
    setWorkouts(newWorkouts);
  };

  const handleSavePlan = async () => {
    setIsSaving(true);
    setError(null);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !planName.trim()) {
      setError("Il nome della scheda è obbligatorio.");
      setIsSaving(false);
      return;
    }

    try {
      const { data: plan, error: planError } = await supabase
      .from('workout_plans').insert({ name: planName, user_id: user.id }).select('id').single();
      if (planError) throw planError;

      for (const workoutData of workouts) {
      if (!workoutData.name.trim()) continue;

      const { data: workout, error: workoutError } = await supabase
        .rpc('insert_workout', { plan_id: plan.id, name: workoutData.name });
      if (workoutError) throw workoutError;

      const exercisesToInsert = workoutData.exercises
        .filter(ex => ex.exercise_name.trim() && ex.target_sets.trim() && ex.target_reps.trim())
        .map((ex, exIndex) => ({
        workout_id: workout.id,
        exercise_name: ex.exercise_name,
        target_sets: parseInt(ex.target_sets, 10) || null,
        target_reps: ex.target_reps,
        order: exIndex + 1,
        }));

      if (exercisesToInsert.length > 0) {
        const { error: exercisesError } = await supabase.rpc('insert_workout_exercises', { exercises: exercisesToInsert });
        if (exercisesError) throw exercisesError;
      }
      }
      
      setOpen(false);
      setShowSuccessDialog(true);
      router.refresh();

    } catch (err) {
      if (err instanceof Error) {
      setError("Errore durante il salvataggio: " + err.message);
      } else {
      setError("Errore durante il salvataggio.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleSuccessDialogClose = () => {
    setShowSuccessDialog(false);
    onSaveSuccess();
    const initialState = getInitialState();
    setPlanName(initialState.planName);
    setWorkouts(initialState.workouts);
    router.refresh(); 
  };
  
  const resetFormOnOpen = (isOpen: boolean) => {
      if(isOpen) {
          const initialState = getInitialState();
          setPlanName(initialState.planName);
          setWorkouts(initialState.workouts);
          setError(null);
      }
      setOpen(isOpen);
  }

  return (
    <>
      <Dialog open={open} onOpenChange={resetFormOnOpen}>
        <DialogTrigger asChild>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Nuova Scheda
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Crea una Nuova Scheda</DialogTitle>
            <DialogDescription>
              Definisci i giorni di allenamento e gli esercizi. Puoi partire da questo modello.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="plan-name">Nome Scheda</Label>
              <Input id="plan-name" value={planName} onChange={(e) => setPlanName(e.target.value)} placeholder="Es: La mia scheda di forza" />
            </div>
            <Separator />
            <div className="space-y-4">
              {workouts.map((workout, wIndex) => (
                <div key={wIndex} className="space-y-4 rounded-md border p-4">
                  <div className="flex items-center justify-between">
                    <Label>Giorno {wIndex + 1}</Label>
                    <Button variant="ghost" size="icon" onClick={() => removeWorkout(wIndex)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                  <Input placeholder="Nome Allenamento (es: Giorno A: Spinta)" value={workout.name} onChange={(e) => handleWorkoutChange(wIndex, e.target.value)} />
                  
                  <div className="space-y-2 pl-4">
                    {workout.exercises.map((ex, exIndex) => (
                      // --- LAYOUT DEGLI ESERCIZI RESO ANCORA PIÙ RESPONSIVE ---
                      <div key={exIndex} className="space-y-2">
                        {/* Riga 1: Nome Esercizio e Tasto Elimina */}
                        <div className="flex items-center gap-2">
                           <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                           <Input placeholder="Nome Esercizio" value={ex.exercise_name} onChange={(e) => handleExerciseChange(wIndex, exIndex, 'exercise_name', e.target.value)} />
                           <Button variant="ghost" size="icon" onClick={() => removeExercise(wIndex, exIndex)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                        {/* Riga 2: Serie e Reps */}
                        <div className="flex items-center gap-2 pl-6">
                            <Input className="flex-1 min-w-[60px] text-center" placeholder="Serie" value={ex.target_sets} onChange={(e) => handleExerciseChange(wIndex, exIndex, 'target_sets', e.target.value)} />
                            <span className="text-muted-foreground font-semibold">x</span>
                            <Input className="flex-1 min-w-[60px] text-center" placeholder="Reps" value={ex.target_reps} onChange={(e) => handleExerciseChange(wIndex, exIndex, 'target_reps', e.target.value)} />
                        </div>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={() => addExercise(wIndex)}>Aggiungi Esercizio</Button>
                  </div>
                </div>
              ))}
              <Button variant="secondary" onClick={addWorkout}>Aggiungi Giorno di Allenamento</Button>
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="ghost">Annulla</Button></DialogClose>
            <Button onClick={handleSavePlan} disabled={isSaving}>
              {isSaving ? "Salvataggio..." : "Salva Scheda"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Scheda Salvata!</AlertDialogTitle>
            <AlertDialogDescription>La tua nuova scheda di allenamento è stata creata con successo e ora è visibile nella tua dashboard.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogAction onClick={handleSuccessDialogClose}>Fantastico!</AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}