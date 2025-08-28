'use client'

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

// Componenti UI
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

// Icone
import { Sparkles, Clock, UtensilsCrossed, RefreshCw, Flame, Beef, Wheat, BrainCircuit } from "lucide-react";

interface Recipe {
  meal?: 'Colazione' | 'Pranzo' | 'Cena';
  title?: string;
  description?: string;
  ingredients?: string[];
  instructions?: string[];
  prep_time?: string;
  cook_time?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fats?: number;
}

export default function RecipesPage() {
  const router = useRouter();
  const supabase = createClient();

  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [customIngredients, setCustomIngredients] = useState('');
  const [breakfastPreference, setBreakfastPreference] = useState<'dolce' | 'salato'>('dolce');
  const [regeneratingMeal, setRegeneratingMeal] = useState<string | null>(null);
  const [recipeHint, setRecipeHint] = useState('');
  const [discardedRecipes, setDiscardedRecipes] = useState<string[]>([]);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
      else router.push('/login');
    };
    fetchUser();
  }, [router, supabase]);

  const handleGeneratePlan = async () => {
    setIsLoading(true);
    setError(null);
    setRecipes([]);
    setDiscardedRecipes([]);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Utente non autenticato.");

      const response = await fetch('/api/generate-recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({
          ingredients: customIngredients,
          breakfast_preference: breakfastPreference,
          recipe_hint: recipeHint,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Errore del server: ${response.statusText}`);
      }
      const data = await response.json();
      if (data.recipes) setRecipes(data.recipes);
      else throw new Error("La risposta dell'IA non era nel formato atteso.");

    } catch (err) {
      const error = err as Error; 
      setError("Errore: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerateMeal = async (mealToRegen: string) => {
    setRegeneratingMeal(mealToRegen);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Utente non autenticato.");

      const mealToDiscard = recipes.find(r => r.meal === mealToRegen);
      const existingMeals = recipes.filter(r => r.meal !== mealToRegen);
      
      const newDiscarded = mealToDiscard?.title ? [...discardedRecipes, mealToDiscard.title] : discardedRecipes;
      setDiscardedRecipes(newDiscarded);

      const requestBody = {
        mealToRegenerate: mealToRegen,
        existingMeals: existingMeals,
        // Costruiamo l'oggetto `mealToDiscard` ESATTAMENTE come lo vuole Zod
        mealToDiscard: mealToDiscard ? { title: mealToDiscard.title } : null,
        discardedMeals: newDiscarded,
        ingredients: customIngredients,
        breakfast_preference: breakfastPreference,
        recipe_hint: recipeHint,
      };

      const response = await fetch('/api/generate-recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Errore del server: ${response.statusText}`);
      }
      const data = await response.json();
      
      if (data.recipe) {
        setRecipes(currentRecipes => 
          currentRecipes.map(r => r.meal === mealToRegen ? data.recipe : r)
        );
      } else {
        throw new Error("La risposta dell'IA per la rigenerazione non era valida.");
      }
    } catch (err) {
      const error = err as Error; 
      setError("Errore durante la rigenerazione: " + error.message);
    } finally {
      setRegeneratingMeal(null);
    }
  };

  const dailyTotals = useMemo(() => {
    if (recipes.length === 0) return { calories: 0, protein: 0, carbs: 0, fats: 0 };
    
    return recipes.reduce((totals, recipe) => {
      // Usiamo parseInt() per convertire in numero prima di sommare.
      // Se il valore non è un numero valido (NaN), usiamo 0 come fallback.
      return {
        calories: (totals.calories ?? 0) + (parseInt(String(recipe.calories)) || 0),
        protein: (totals.protein ?? 0) + (parseInt(String(recipe.protein)) || 0),
        carbs: (totals.carbs ?? 0) + (parseInt(String(recipe.carbs)) || 0),
        fats: (totals.fats ?? 0) + (parseInt(String(recipe.fats)) || 0),
      };
    }, { calories: 0, protein: 0, carbs: 0, fats: 0 });
  }, [recipes]);

  return (
    <div className="flex flex-1 flex-col items-center gap-8 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Generatore di Ricette Intelligente</CardTitle>
          <CardDescription>Personalizza il tuo piano alimentare per la giornata.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="ingredients">Ingredienti da usare (opzionale)</Label>
            <Input id="ingredients" type="text" placeholder="Es: pomodori, pollo, riso..." value={customIngredients} onChange={(e) => setCustomIngredients(e.target.value)} />
          </div>
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="recipe-hint">Un piatto che vorresti mangiare? (opzionale)</Label>
            <Input id="recipe-hint" type="text" placeholder="Es: pancake, carbonara..." value={recipeHint} onChange={(e) => setRecipeHint(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Preferenza per la colazione</Label>
            <RadioGroup defaultValue="dolce" value={breakfastPreference} onValueChange={(value: 'dolce' | 'salato') => setBreakfastPreference(value)} className="flex gap-4">
              <div className="flex items-center space-x-2"><RadioGroupItem value="dolce" id="r-sweet" /><Label htmlFor="r-sweet">Dolce</Label></div>
              <div className="flex items-center space-x-2"><RadioGroupItem value="salato" id="r-salty" /><Label htmlFor="r-salty">Salato</Label></div>
            </RadioGroup>
          </div>
          <Button size="lg" className="w-full" onClick={handleGeneratePlan} disabled={isLoading || !userId || !!regeneratingMeal}>
            {isLoading ? "L'IA sta cucinando per te..." : <><Sparkles className="mr-2 h-5 w-5" /> Genera il mio piano</>}
          </Button>
        </CardContent>
      </Card>

      <div className="w-full max-w-2xl space-y-4">
        {error && <p className="text-center text-red-500 font-medium bg-red-500/10 p-4 rounded-md">{error}</p>}
        
        {recipes.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-center">Riepilogo Nutrizionale di Oggi</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <MacroStat icon={Flame} value={dailyTotals.calories} unit="kcal" label="Calorie" color="text-orange-500" />
              <MacroStat icon={Beef} value={dailyTotals.protein} unit="g" label="Proteine" color="text-red-500" />
              <MacroStat icon={Wheat} value={dailyTotals.carbs} unit="g" label="Carboidrati" color="text-yellow-500" />
              <MacroStat icon={BrainCircuit} value={dailyTotals.fats} unit="g" label="Grassi" color="text-green-500" />
            </CardContent>
          </Card>
        )}

        {recipes.length > 0 && (
          <>
            <h2 className="text-xl font-bold text-center pt-4">Il Tuo Piano Dettagliato</h2>
            {recipes.map((recipe, index) => (
              <RecipeCard 
                key={`${recipe.meal}-${index}-${recipe.title}`}
                recipe={recipe} 
                onRegenerate={handleRegenerateMeal}
                isRegenerating={regeneratingMeal === recipe.meal}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

const RecipeCard = ({ recipe, onRegenerate, isRegenerating }: { 
  recipe: Recipe;
  onRegenerate: (meal: string) => void;
  isRegenerating: boolean;
}) => {
  const hasPrepTime = recipe.prep_time && recipe.prep_time.trim() !== "" && recipe.prep_time.toLowerCase() !== "n/a";
  const hasCookTime = recipe.cook_time && recipe.cook_time.trim() !== "" && recipe.cook_time.toLowerCase() !== "n/a";
  const shouldShowTimeSection = hasPrepTime || hasCookTime;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div className="space-y-1.5 pr-2">
          <CardTitle>{recipe.title || "Ricetta Senza Titolo"}</CardTitle>
          <CardDescription>{recipe.meal} - {recipe.description || "Nessuna descrizione."}</CardDescription>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => onRegenerate(recipe.meal!)}
          disabled={isRegenerating}
          className="shrink-0"
        >
          <RefreshCw className={`h-4 w-4 ${isRegenerating ? 'animate-spin' : ''}`} />
          <span className="sr-only">Rigenera {recipe.meal}</span>
        </Button>
      </CardHeader>
      <CardContent>
        {shouldShowTimeSection && (
          <div className="flex items-center flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground mb-4 border-b pb-4">
            {hasPrepTime && (
              <div className="flex items-center gap-1.5"><Clock className="h-4 w-4" /><span>Prep: {recipe.prep_time}</span></div>
            )}
            {hasCookTime && (
              <div className="flex items-center gap-1.5"><UtensilsCrossed className="h-4 w-4" /><span>Cottura: {recipe.cook_time}</span></div>
            )}
          </div>
        )}
        
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-sm mb-4 border-b pb-4">
          <MacroStat icon={Flame} value={recipe.calories} unit="kcal" label="Calorie" color="text-orange-500" />
          <MacroStat icon={Beef} value={recipe.protein} unit="g" label="Proteine" color="text-red-500" />
          <MacroStat icon={Wheat} value={recipe.carbs} unit="g" label="Carboidrati" color="text-yellow-500" />
          <MacroStat icon={BrainCircuit} value={recipe.fats} unit="g" label="Grassi" color="text-green-500" />
        </div>

        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="ingredients">
            <AccordionTrigger>Ingredienti</AccordionTrigger>
            <AccordionContent>
              <ul className="list-disc pl-5 space-y-1">{(recipe.ingredients || []).map((item, index) => <li key={index}>{item}</li>)}</ul>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="instructions">
            <AccordionTrigger>Procedimento</AccordionTrigger>
            <AccordionContent>
              <ol className="list-decimal pl-5 space-y-2">{(recipe.instructions || []).map((item, index) => <li key={index}>{item}</li>)}</ol>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
};

const MacroStat = ({ icon: Icon, value, unit, label, color }: {
  icon: React.ElementType,
  value?: number,
  unit: string,
  label: string,
  color: string,
}) => (
  <div className="flex flex-col items-center">
    <Icon className={`h-5 w-5 ${color}`} />
    <span className="font-bold text-lg">{value ?? '-'}</span>
    <span className="text-xs text-muted-foreground">{label} ({unit})</span>
  </div>
);