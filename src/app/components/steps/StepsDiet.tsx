// src/components/auth/steps/StepDiet.tsx

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Definiamo i tipi di dati che questo componente gestisce
type StepProps = {
  data: { diet_type: string };
  updateData: (data: { diet_type: string }) => void;
  onNext: () => void;
  onBack: () => void;
};

export function StepDiet({ data, updateData, onNext, onBack }: StepProps) {
  return (
    <div className="space-y-6">
      <CardHeader className="p-0">
        <CardTitle>Qual è il tuo regime alimentare?</CardTitle>
        <CardDescription>
          Questo ci aiuterà a suggerirti le ricette più adatte a te.
        </CardDescription>
      </CardHeader>
      
      <div className="space-y-2">
        <Label>Tipo di Dieta</Label>
        <Select 
          value={data.diet_type} 
          onValueChange={(value) => updateData({ diet_type: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleziona un'opzione..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="omnivore">Onnivoro</SelectItem>
            <SelectItem value="vegetarian">Vegetariano</SelectItem>
            <SelectItem value="vegan">Vegano</SelectItem>
            <SelectItem value="pescetarian">Pescetariano</SelectItem>
            <SelectItem value="other">Altro</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>Indietro</Button>
        <Button onClick={onNext} disabled={!data.diet_type} className="bg-primary text-white hover:bg-primary/90">Avanti</Button>
      </div>
    </div>
  );
}