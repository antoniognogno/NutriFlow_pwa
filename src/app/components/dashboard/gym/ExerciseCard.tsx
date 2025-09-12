'use client'

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { SetInputRow, SetLog, UpdatableSetLogFields } from "./SetInputRow";
import { Tables } from "@/lib/supabase/types";

interface ExerciseCardProps {
  exercise: Tables<'workout_exercises'>;
  userId: string;
  onUpdateLogs: (exerciseId: string, sets: SetLog[]) => void;
}

export function ExerciseCard({ exercise, userId, onUpdateLogs }: ExerciseCardProps) {
  const [sets, setSets] = useState<SetLog[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  // Usiamo useCallback per stabilizzare la funzione e passarla a useEffect
  const initializeSets = useCallback(() => {
    // Non facciamo più una chiamata al DB qui per l'ultimo peso per semplicità,
    // ma creiamo lo stato iniziale basato sui target.
    // La logica per l'ultimo peso può essere riaggiunta se necessario.
    const initialSetsData = Array.from({ length: exercise.target_sets || 3 }, (_, i) => ({
      set_number: i + 1,
      reps: exercise.target_reps || '',
      weight_kg: '', // Parte vuoto per semplicità
    }));
    
    setSets(initialSetsData);
    setIsLoadingHistory(false);
    // Non chiamiamo onUpdateLogs qui per evitare l'errore di rendering
  }, [exercise]);

  useEffect(() => {
    initializeSets();
  }, [initializeSets]);

  const updateSet = (index: number, field: UpdatableSetLogFields, value: string) => {
    const newSets = sets.map((s, i) => i === index ? { ...s, [field]: value } : s);
    setSets(newSets);
    onUpdateLogs(exercise.id, newSets); // Aggiorna il genitore solo dopo un'azione
  };

  const addSet = () => {
    const lastSet = sets.length > 0 ? sets[sets.length - 1] : null;
    const newSet: SetLog = {
      set_number: sets.length + 1,
      reps: lastSet?.reps || exercise.target_reps || '',
      weight_kg: lastSet?.weight_kg || '',
    };
    const newSets = [...sets, newSet];
    setSets(newSets);
    onUpdateLogs(exercise.id, newSets);
  };

  const deleteSet = (index: number) => {
    if (index < (exercise.target_sets || 0)) return;
    const newSets = sets.filter((_, i) => i !== index).map((set, i) => ({ ...set, set_number: i + 1 }));
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
        {isLoadingHistory ? <p className="text-sm text-muted-foreground">Inizializzazione...</p> : 
          sets.map((set, index) => (
            <SetInputRow
              key={`${exercise.id}-set-${set.set_number}`}
              set={set}
              index={index}
              onUpdate={updateSet}
              onDelete={deleteSet}
              isDeletable={index >= (exercise.target_sets || 0)}
            />
          ))
        }
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