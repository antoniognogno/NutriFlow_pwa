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
    <div className="grid grid-cols-[auto_1fr_1fr_auto] items-center gap-2 sm:gap-4">
      <Label className="flex h-10 w-10 items-center justify-center rounded-md border bg-muted text-lg font-bold shrink-0">
        {set.set_number}
      </Label>
      
      <div className="space-y-1">
        <Label htmlFor={`weight-${index}`} className="text-xs font-medium text-muted-foreground ml-1">Peso (kg)</Label>
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
        <Label htmlFor={`reps-${index}`} className="text-xs font-medium text-muted-foreground ml-1">Reps</Label>
        <Input
          id={`reps-${index}`}
          type="number"
          placeholder="0"
          value={set.reps}
          onChange={(e) => onUpdate(index, 'reps', e.target.value)}
          className="text-center"
        />
      </div>
      
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onDelete(index)}
        disabled={!isDeletable}
        className={`h-10 w-10 self-end ${!isDeletable ? 'opacity-0 cursor-default' : ''}`}
      >
        <Trash2 className="h-4 w-4" />
        <span className="sr-only">Elimina serie</span>
      </Button>
    </div>
  );
}