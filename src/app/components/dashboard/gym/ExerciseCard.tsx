'use client'

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { SetInputRow, SetLog } from "./SetInputRow";
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
      // 1. Recupera l'ultimo peso usato per questo esercizio
      const { data: lastLog } = await createClient()
        .from('exercise_logs')
        .select('weight_kg')
        .eq('user_id', userId)
        .eq('workout_exercise_id', exercise.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      const lastWeight = lastLog?.weight_kg?.toString() || '';

      // 2. Crea le serie iniziali con i dati pre-compilati
      const initialSets = Array.from({ length: exercise.target_sets || 3 }, (_, i) => ({
        set_number: i + 1,
        reps: exercise.target_reps || '',
        weight_kg: lastWeight,
      }));
      
      setSets(initialSets);
      setIsLoadingHistory(false);
      onUpdateLogs(exercise.id, initialSets); // Comunica i dati iniziali al genitore
    };
    
    initializeSets();
  }, [exercise, userId, onUpdateLogs]);

  const updateSet = (index: number, field: keyof SetLog, value: string) => { /* ... (invariato) ... */ };
  const addSet = () => { /* ... (invariato) ... */ };
  const deleteSet = (index: number) => { /* ... (invariato) ... */ };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{exercise.exercise_name}</CardTitle>
        <CardDescription>
          Obiettivo: {exercise.target_sets} serie da {exercise.target_reps} reps
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Etichette visibili solo su schermi grandi */}
        <div className="hidden sm:grid grid-cols-[auto_1fr_1fr_auto] items-center gap-2 sm:gap-4 px-[58px]">
            <Label className="text-xs text-muted-foreground text-center">Peso (kg)</Label>
            <Label className="text-xs text-muted-foreground text-center">Reps</Label>
        </div>

        {isLoadingHistory ? (
          <p className="text-sm text-muted-foreground">Caricamento storico...</p>
        ) : (
          sets.map((set, index) => (
            <SetInputRow
              key={index}
              set={set}
              index={index}
              onUpdate={(field, value) => updateSet(index, field as keyof SetLog, value)}
              onDelete={() => deleteSet(index)}
              isDeletable={sets.length > 1}
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