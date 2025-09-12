'use client'

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

// --- MODIFICA CHIAVE QUI ---
// Ora tutti i campi del form sono stringhe, che è la pratica corretta.
export interface SetLog {
  set_number: number; // Manteniamo questo come numero per la visualizzazione
  reps: string;
  weight_kg: string;
}

// Definiamo un tipo per le sole chiavi che possiamo modificare
export type UpdatableSetLogFields = 'reps' | 'weight_kg';

interface SetInputRowProps {
  set: SetLog;
  index: number;
  onUpdate: (index: number, field: UpdatableSetLogFields, value: string) => void;
  onDelete: (index: number) => void;
  isDeletable: boolean;
}

export function SetInputRow({ set, index, onUpdate, onDelete, isDeletable }: SetInputRowProps) {
  return (
    <div className="flex items-center gap-4">
      <Label className="flex h-10 w-10 items-center justify-center rounded-md border bg-muted text-lg font-bold">
        {set.set_number}
      </Label>
      <div className="grid flex-1 grid-cols-2 gap-4">
        <div>
          <Label htmlFor={`weight-${index}`} className="sr-only">Peso (kg)</Label>
          <Input 
            id={`weight-${index}`}
            type="number"
            placeholder="Peso (kg)"
            value={set.weight_kg}
            onChange={(e) => onUpdate(index, 'weight_kg', e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor={`reps-${index}`} className="sr-only">Reps</Label>
          <Input
            id={`reps-${index}`}
            type="number"
            placeholder="Reps"
            value={set.reps}
            onChange={(e) => onUpdate(index, 'reps', e.target.value)}
          />
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onDelete(index)}
        disabled={!isDeletable}
        className={!isDeletable ? 'opacity-0 cursor-not-allowed' : ''}
      >
        <Trash2 className="h-4 w-4" />
        <span className="sr-only">Elimina serie</span>
      </Button>
    </div>
  );
}