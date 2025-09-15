'use client'

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle, Pencil, Trash2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import type { PlanWithWorkoutsAndExercises } from "@/lib/supabase/types";
import { toast } from "sonner";

// --- TIPI PER LO STATO INTERNO DEL FORM ---
interface ExerciseForm {
  exercise_name: string;
  target_sets: string;
  target_reps: string;
}

interface WorkoutForm {
  name: string;
  exercises: ExerciseForm[];
}

// --- STATO INIZIALE PER LA MODALITÀ 'CREATE' ---
const getInitialCreateState = () => ({
    planName: `Scheda`,
    workouts: [
        { name: "Spinta (Petto/Tricipiti/Spalle)", exercises: [{ exercise_name: "Panca Piana", target_sets: "4", target_reps: "8" }] },
        { name: "Tirata (Schiena/Bicipiti)", exercises: [{ exercise_name: "Trazioni o Lat Machine", target_sets: "4", target_reps: "8" }] },
        { name: "Gambe", exercises: [{ exercise_name: "Squat con Bilanciere", target_sets: "4", target_reps: "8" }] }
    ]
});

// --- PROPS DEL COMPONENTE ---
interface NewPlanDialogProps {
  mode: 'create' | 'edit';
  planToEdit?: PlanWithWorkoutsAndExercises;
  onSaveSuccess: () => void;
}

export function NewPlanDialog({ mode, planToEdit, onSaveSuccess }: NewPlanDialogProps) {
  const supabase = createClient();
  
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [planName, setPlanName] = useState("");
  const [workouts, setWorkouts] = useState<WorkoutForm[]>([]);
  const [openAccordionItems, setOpenAccordionItems] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      if (mode === 'edit' && planToEdit) {
        setPlanName(planToEdit.name);
        const editableWorkouts = planToEdit.workouts.map(workout => ({
          name: workout.name,
          // <<< CORREZIONE DATABASE SCHEMA: Il tipo custom usa `exercises`
          exercises: Array.isArray(workout.exercises)
            ? workout.exercises.map(exercise => ({
                exercise_name: exercise.exercise_name,
                target_sets: String(exercise.target_sets || ''),
                target_reps: String(exercise.target_reps || ''),
              }))
            : [],
        }));
        setWorkouts(editableWorkouts);
        setOpenAccordionItems(editableWorkouts.map((_, index) => `item-${index}`));
      } else {
        const initialState = getInitialCreateState();
        setPlanName(initialState.planName);
        setWorkouts(initialState.workouts);
        setOpenAccordionItems(['item-0']);
      }
      setError(null);
    }
  }, [open, mode, planToEdit]);

  // --- HANDLERS (invariati) ---
  const handleWorkoutChange = (index: number, newName: string) => { const updatedWorkouts = [...workouts]; updatedWorkouts[index].name = newName; setWorkouts(updatedWorkouts); };
  const handleExerciseChange = (workoutIndex: number, exerciseIndex: number, field: keyof ExerciseForm, value: string) => { const updatedWorkouts = [...workouts]; updatedWorkouts[workoutIndex].exercises[exerciseIndex][field] = value; setWorkouts(updatedWorkouts); };
  const handleAddExercise = (workoutIndex: number) => { const updatedWorkouts = [...workouts]; updatedWorkouts[workoutIndex].exercises.push({ exercise_name: "", target_sets: "3", target_reps: "10" }); setWorkouts(updatedWorkouts); };
  const handleRemoveExercise = (workoutIndex: number, exerciseIndex: number) => { const updatedWorkouts = [...workouts]; updatedWorkouts[workoutIndex].exercises.splice(exerciseIndex, 1); setWorkouts(updatedWorkouts); };
  const handleAddWorkout = () => { setWorkouts([...workouts, { name: "Nuovo Allenamento", exercises: [{ exercise_name: "", target_sets: "3", target_reps: "10" }] }]); };
  const handleRemoveWorkout = (workoutIndex: number) => { const updatedWorkouts = [...workouts]; updatedWorkouts.splice(workoutIndex, 1); setWorkouts(updatedWorkouts); };

  // --- LOGICA DI SALVATAGGIO ---
  const handleSubmit = async () => {
    setIsSaving(true);
    setError(null);
    if (!planName.trim()) { setError("Il nome della scheda non può essere vuoto."); setIsSaving(false); return; }

    try {
      if (mode === 'create') await handleCreatePlan();
      else if (mode === 'edit' && planToEdit) await handleUpdatePlan();
      
      toast.success(`Scheda ${mode === 'create' ? 'creata' : 'aggiornata'} con successo!`);
      onSaveSuccess();
      setOpen(false);
    } catch (error: any) {
      console.error("Dettagli errore salvataggio:", error);
      const errorMessage = error.message || "Violazione della policy di sicurezza o errore del database.";
      setError(errorMessage);
      toast.error("Salvataggio fallito", { description: errorMessage });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreatePlan = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Utente non autenticato.");

    // <<< CORREZIONE DATABASE SCHEMA: `workout_plans`
    const { data: planData, error: planError } = await supabase.from('workout_plans').insert({ name: planName, user_id: user.id }).select('id').single();
    if (planError) throw planError;
    if (!planData) throw new Error("Creazione del piano fallita.");

    for (const workout of workouts) {
      if (!workout.name.trim()) continue;
      // <<< CORREZIONE DATABASE SCHEMA: `workouts` e `plan_id`
      const { data: workoutData, error: workoutError } = await supabase.from('workouts').insert({ name: workout.name, plan_id: planData.id }).select('id').single();
      if (workoutError) throw workoutError;
      if (!workoutData) throw new Error("Creazione del workout fallita.");
      
      const exercisesToInsert = workout.exercises.filter(ex => ex.exercise_name.trim()).map((ex, index) => ({
        // <<< CORREZIONE DATABASE SCHEMA: `workout_exercises`, `workout_id`, `target_reps` è text
        workout_id: workoutData.id,
        exercise_name: ex.exercise_name,
        target_sets: parseInt(ex.target_sets, 10) || null,
        target_reps: ex.target_reps, // È già una stringa, va bene così
        order: index + 1,
      }));

      if (exercisesToInsert.length > 0) {
        // <<< CORREZIONE DATABASE SCHEMA: `workout_exercises`
        const { error: exerciseError } = await supabase.from('workout_exercises').insert(exercisesToInsert);
        if (exerciseError) throw exerciseError;
      }
    }
  };

  const handleUpdatePlan = async () => {
    if (!planToEdit) throw new Error("Dati della scheda da modificare non trovati.");

    // <<< CORREZIONE DATABASE SCHEMA: `workout_plans`
    if (planName !== planToEdit.name) {
      const { error: planUpdateError } = await supabase.from('workout_plans').update({ name: planName }).eq('id', planToEdit.id);
      if (planUpdateError) throw planUpdateError;
    }
    
    // Per l'aggiornamento, la strategia "Delete & Replace" è la più semplice.
    // L'ordine è importante: prima i figli (`workout_exercises`), poi i padri (`workouts`).
    
    // <<< CORREZIONE DATABASE SCHEMA: `workout_exercises` e `workout_id`
    // Dobbiamo cancellare tutti gli esercizi di tutti i workout di questo piano
    const workoutIds = planToEdit.workouts.map(w => w.id);
    if (workoutIds.length > 0) {
      const { error: deleteExercisesError } = await supabase.from('workout_exercises').delete().in('workout_id', workoutIds);
      if (deleteExercisesError) throw deleteExercisesError;
    }
    
    // <<< CORREZIONE DATABASE SCHEMA: `workouts` e `plan_id`
    const { error: deleteWorkoutsError } = await supabase.from('workouts').delete().eq('plan_id', planToEdit.id);
    if (deleteWorkoutsError) throw deleteWorkoutsError;

    // Ora reinseriamo tutto come nella funzione di creazione
    for (const workout of workouts) {
      if (!workout.name.trim()) continue;

      // <<< CORREZIONE DATABASE SCHEMA: `workouts`
      const { data: workoutData, error: workoutError } = await supabase.from('workouts').insert({ name: workout.name, plan_id: planToEdit.id }).select('id').single();
      if (workoutError) throw workoutError;
      if (!workoutData) throw new Error("Reinserimento workout fallito.");

      const exercisesToInsert = workout.exercises.filter(ex => ex.exercise_name.trim()).map((ex, index) => ({
        // <<< CORREZIONE DATABASE SCHEMA: `workout_exercises`, `workout_id`
        workout_id: workoutData.id,
        exercise_name: ex.exercise_name,
        target_sets: parseInt(ex.target_sets, 10) || null,
        target_reps: ex.target_reps,
        order: index + 1,
      }));

      if (exercisesToInsert.length > 0) {
        // <<< CORREZIONE DATABASE SCHEMA: `workout_exercises`
        const { error: exerciseError } = await supabase.from('workout_exercises').insert(exercisesToInsert);
        if (exerciseError) throw exerciseError;
      }
    }
  };

  return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {mode === 'create' ? (
            <Button><PlusCircle className="mr-2 h-4 w-4" />Nuova Scheda</Button>
          ) : (
            <Button variant="ghost" disabled size="icon" className="h-7 w-7"><Pencil className="h-4 w-4" /></Button>
          )}
        </DialogTrigger>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{mode === 'create' ? 'Crea una Nuova Scheda' : 'Modifica Scheda'}</DialogTitle>
            <DialogDescription>Definisci i giorni di allenamento e gli esercizi per il tuo piano.</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pr-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="plan-name">Nome Scheda</Label>
              <Input id="plan-name" value={planName} onChange={(e) => setPlanName(e.target.value)} placeholder="Es: La mia scheda di forza" />
            </div>
            <Separator />
            <Accordion type="multiple" className="w-full" value={openAccordionItems} onValueChange={setOpenAccordionItems}>
              {workouts.map((workout, wIndex) => (
                <AccordionItem value={`item-${wIndex}`} key={wIndex}>
                  <div className="flex items-center w-full">
                    <AccordionTrigger className="flex-1 hover:no-underline p-2 rounded-md">
                        <Input
                            value={workout.name}
                            onChange={(e) => handleWorkoutChange(wIndex, e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="font-semibold text-base border-none bg-transparent focus-visible:ring-0 p-0 h-auto w-full"
                            placeholder="Nome Allenamento (es. Push Day)"
                        />
                    </AccordionTrigger>
                    <Button variant="ghost" size="icon" onClick={() => handleRemoveWorkout(wIndex)} className="mr-2 shrink-0">
                        <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                  <AccordionContent className="space-y-4 pt-2 pl-4 border-l-2 ml-4">
                    {workout.exercises.map((exercise, exIndex) => (
                      <div key={exIndex} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                          <Input
                            placeholder="Nome Esercizio"
                            value={exercise.exercise_name}
                            onChange={(e) => handleExerciseChange(wIndex, exIndex, 'exercise_name', e.target.value)}
                            className="flex-grow"
                          />
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              placeholder="Serie"
                              value={exercise.target_sets}
                              onChange={(e) => handleExerciseChange(wIndex, exIndex, 'target_sets', e.target.value)}
                              className="flex-1 sm:flex-initial sm:w-20"
                            />
                            <Input
                              type="text" // <<<<<<< MODIFICA IMPORTANTE, target_reps è di tipo TEXT
                              placeholder="Reps"
                              value={exercise.target_reps}
                              onChange={(e) => handleExerciseChange(wIndex, exIndex, 'target_reps', e.target.value)}
                              className="flex-1 sm:flex-initial sm:w-20"
                            />
                            <Button variant="ghost" size="icon" onClick={() => handleRemoveExercise(wIndex, exIndex)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                      </div>
                    ))}
                     <Button variant="outline" size="sm" onClick={() => handleAddExercise(wIndex)}>
                      <PlusCircle className="mr-2 h-4 w-4" /> Aggiungi Esercizio
                    </Button>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
            <Button variant="secondary" onClick={handleAddWorkout}>Aggiungi Giorno di Allenamento</Button>
            {error && <p className="text-sm text-red-500 text-center py-2">{error}</p>}
          </div>
          <DialogFooter className="mt-auto pt-4 border-t">
            <DialogClose asChild><Button variant="ghost">Annulla</Button></DialogClose>
            <Button onClick={handleSubmit} disabled={isSaving}>
              {isSaving ? "Salvataggio..." : (mode === 'edit' ? 'Salva Modifiche' : 'Crea Scheda')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
  );
}