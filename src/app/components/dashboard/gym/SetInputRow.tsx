'use client'

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

export interface SetLog {
  set_number: number;
  reps: string;
  weight_kg: string;
}

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
    <div className="flex items-center gap-2 sm:gap-4">
      <Label className="flex h-8 w-8 items-center justify-center rounded-md border bg-muted text-lg font-bold shrink-0">
        {set.set_number}
      </Label>
      
      {/* Griglia per gli input */}
      <div className="grid grid-cols-2 flex-1 gap-2">
        <div className="space-y-1">
          <Label htmlFor={`weight-${index}`} className="text-xs text-muted-foreground">Peso (kg)</Label>
          <Input 
            id={`weight-${index}`}
            type="number"
            placeholder="0"
            value={set.weight_kg}
            onChange={(e) => onUpdate(index, 'weight_kg', e.target.value)}
            className="text-center"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`reps-${index}`} className="text-xs text-muted-foreground">Reps</Label>
          <Input
            id={`reps-${index}`}
            type="number"
            placeholder="0"
            value={set.reps}
            onChange={(e) => onUpdate(index, 'reps', e.target.value)}
            className="text-center"
          />
        </div>
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => onDelete(index)}
        disabled={!isDeletable}
        className={`shrink-0 ${!isDeletable ? 'opacity-0 cursor-default' : ''}`}
      >
        <Trash2 className="h-4 w-4" />
        <span className="sr-only">Elimina serie</span>
      </Button>
    </div>
  );
}