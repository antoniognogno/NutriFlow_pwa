'use client'

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { SetInputRow, SetLog, UpdatableSetLogFields } from "./SetInputRow";
import { Tables } from "@/lib/supabase/types";
import { Label } from "@/components/ui/label";

interface ExerciseCardProps {
  exercise: Tables<'workout_exercises'>;
  userId: string;
  onUpdateLogs: (exerciseId: string, sets: SetLog[]) => void;
}

export function ExerciseCard({ exercise, userId, onUpdateLogs }: ExerciseCardProps) {
  const [sets, setSets] = useState<SetLog[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  useEffect(() => {
    const initializeSets = async () => {
      const supabase = createClient();
      const { data: lastLog } = await supabase
        .from('exercise_logs')
        .select('weight_kg')
        .eq('user_id', userId)
        .eq('workout_exercise_id', exercise.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      const lastWeight = lastLog?.weight_kg?.toString() || '';

      const initialSets = Array.from({ length: exercise.target_sets || 3 }, (_, i) => ({
        set_number: i + 1,
        reps: exercise.target_reps || '',
        weight_kg: lastWeight,
      }));
      
      setSets(initialSets);
      setIsLoadingHistory(false);
      onUpdateLogs(exercise.id, initialSets);
    };
    
    initializeSets();
  }, [exercise, userId, onUpdateLogs]);

  // --- LA FUNZIONE CORRETTA SENZA 'as any' ---
  const updateSet = (index: number, field: UpdatableSetLogFields, value: string) => {
    // Creiamo una copia dell'array di serie
    const newSets = [...sets];
    // Creiamo una copia dell'oggetto specifico che stiamo modificando
    const setToUpdate = { ...newSets[index] };

    // Usiamo una condizione esplicita, che TypeScript capisce
    if (field === 'reps') {
      setToUpdate.reps = value;
    } else if (field === 'weight_kg') {
      setToUpdate.weight_kg = value;
    }

    // Sostituiamo l'oggetto vecchio con quello aggiornato
    newSets[index] = setToUpdate;
    
    setSets(newSets);
    onUpdateLogs(exercise.id, newSets);
  };

  const addSet = () => {
    const newSet: SetLog = {
      set_number: sets.length + 1,
      reps: sets[sets.length - 1]?.reps || exercise.target_reps || '',
      weight_kg: sets[sets.length - 1]?.weight_kg || '',
    };
    const newSets = [...sets, newSet];
    setSets(newSets);
    onUpdateLogs(exercise.id, newSets);
  };

  const deleteSet = (index: number) => {
    if (index < (exercise.target_sets || 0)) return;
    
    const newSets = sets.filter((_, i) => i !== index)
      .map((set, i) => ({ ...set, set_number: i + 1 }));
    setSets(newSets);
    onUpdateLogs(exercise.id, newSets);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{exercise.exercise_name}</CardTitle>
        <CardDescription>
          Obiettivo: {exercise.target_sets} serie da {exercise.target_reps} reps
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="hidden sm:grid grid-cols-[auto_1fr_1fr_auto] items-center gap-2 sm:gap-4 px-[58px]">
            <Label className="text-xs text-muted-foreground text-center">Peso (kg)</Label>
            <Label className="text-xs text-muted-foreground text-center">Reps</Label>
        </div>

        {isLoadingHistory ? (
          <p className="text-sm text-muted-foreground">Caricamento storico...</p>
        ) : (
          sets.map((set, index) => (
            <SetInputRow
              key={`${exercise.id}-set-${index}`} // Chiave più robusta
              set={set}
              index={index}
              onUpdate={updateSet}
              onDelete={deleteSet}
              isDeletable={index >= (exercise.target_sets || 0)}
            />
          ))
        )}
      </CardContent>
      <CardFooter>
        <Button variant="outline" onClick={addSet}>
          <Plus className="mr-2 h-4 w-4" />
          Aggiungi Serie
        </Button>
      </CardFooter>
    </Card>
  );
}