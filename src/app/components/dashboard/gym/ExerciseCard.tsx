'use client'

import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { SetInputRow, SetLog, UpdatableSetLogFields } from "./SetInputRow"; // Importiamo i nuovi tipi
import { Tables } from "@/lib/supabase/types";

interface ExerciseCardProps {
  exercise: Tables<'workout_exercises'>;
  onUpdateLogs: (exerciseName: string, sets: SetLog[]) => void;
}

export function ExerciseCard({ exercise, onUpdateLogs }: ExerciseCardProps) {
  const initialSets = Array.from({ length: exercise.target_sets || 3 }, (_, i) => ({
    set_number: i + 1,
    reps: '',
    weight_kg: '',
  }));

  const [sets, setSets] = useState<SetLog[]>(initialSets);

  // --- FUNZIONE CORRETTA ---
  const updateSet = (index: number, field: UpdatableSetLogFields, value: string) => {
    // Creiamo una copia profonda per essere sicuri di non mutare lo stato
    const newSets = sets.map(set => ({ ...set }));
    newSets[index][field] = value;
    setSets(newSets);
    onUpdateLogs(exercise.exercise_name, newSets);
  };

  const addSet = () => {
    const newSet: SetLog = {
      set_number: sets.length + 1,
      reps: '',
      weight_kg: '',
    };
    const newSets = [...sets, newSet];
    setSets(newSets);
    onUpdateLogs(exercise.exercise_name, newSets);
  };

  const deleteSet = (index: number) => {
    if (index < (exercise.target_sets || 0)) return;
    
    const newSets = sets.filter((_, i) => i !== index)
      .map((set, i) => ({ ...set, set_number: i + 1 }));
    setSets(newSets);
    onUpdateLogs(exercise.exercise_name, newSets);
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
        {sets.map((set, index) => (
          <SetInputRow
            key={index}
            index={index}
            set={set}
            onUpdate={updateSet}
            onDelete={deleteSet}
            isDeletable={index >= (exercise.target_sets || 0)}
          />
        ))}
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