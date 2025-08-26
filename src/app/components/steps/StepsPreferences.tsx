// src/components/auth/steps/StepPreferences.tsx

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";

// Definiamo i tipi di dati
type StepProps = {
  data: { 
    allergies: string;
    disliked_foods: string;
  };
  updateData: (data: { allergies?: string; disliked_foods?: string }) => void;
  onBack: () => void;
  onSave: () => void; // Funzione per salvare tutto
};

export function StepPreferences({ data, updateData, onBack, onSave }: StepProps) {
  // Aggiungiamo uno stato per il loading, per dare un feedback all'utente
  const [isSaving, setIsSaving] = useState(false);

  const handleFinalSave = async () => {
    setIsSaving(true);
    await onSave(); // Eseguiamo la funzione di salvataggio passata come prop
    // Non è necessario rimettere isSaving a false, perché verremo reindirizzati
  };

  return (
    <div className="space-y-6">
      <CardHeader className="p-0">
        <CardTitle>Preferenze e Restrizioni</CardTitle>
        <CardDescription>
          Mancano solo gli ultimi dettagli per personalizzare al massimo la tua esperienza.
        </CardDescription>
      </CardHeader>
      
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="allergies">Hai qualche allergia? (separale con una virgola)</Label>
          <Textarea 
            id="allergies"
            placeholder="Es: lattosio, glutine, noci..."
            value={data.allergies}
            onChange={(e) => updateData({ allergies: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="disliked-foods">C'è qualcosa che proprio non ti piace? (separale con una virgola)</Label>
          <Textarea 
            id="disliked-foods"
            placeholder="Es: cipolle, funghi, aglio..."
            value={data.disliked_foods}
            onChange={(e) => updateData({ disliked_foods: e.target.value })}
          />
        </div>
      </div>


      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} disabled={isSaving}>Indietro</Button>
        <Button onClick={handleFinalSave} className="bg-primary text-white hover:bg-primary/90" disabled={isSaving}>
          {isSaving ? "Salvataggio..." : "Salva e inizia"}
        </Button>
      </div>
    </div>
  );
}