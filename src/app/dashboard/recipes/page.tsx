'use client'

import { useState, useEffect } from "react";
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
import { Sparkles, Clock, UtensilsCrossed, RefreshCw } from "lucide-react";

interface Recipe {
  meal: 'Colazione' | 'Pranzo' | 'Cena';
  title: string;
  description: string;
  ingredients: string[];
  instructions: string[];
  prep_time: string;
  cook_time: string;
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

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      } else {
        router.push('/login');
      }
    };
    fetchUser();
  }, [router, supabase]);

  const handleGeneratePlan = async () => {
    setIsLoading(true);
    setError(null);
    setRecipes([]);
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
      if (data.recipes) {
        setRecipes(data.recipes);
      } else {
        throw new Error("La risposta dell'IA non era nel formato atteso.");
      }

    } catch (err: any) {
      setError("Errore: " + err.message);
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

      const existingMeals = recipes.filter(r => r.meal !== mealToRegen);
      const response = await fetch('/api/generate-recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({
          mealToRegenerate: mealToRegen,
          existingMeals: existingMeals,
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
      
      if (data.recipe) {
        setRecipes(currentRecipes => 
          currentRecipes.map(r => r.meal === mealToRegen ? data.recipe : r)
        );
      } else {
        throw new Error("La risposta dell'IA per la rigenerazione non era valida.");
      }
    } catch (err: any) {
      setError("Errore durante la rigenerazione: " + err.message);
    } finally {
      setRegeneratingMeal(null);
    }
  };

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
            <Input
              id="recipe-hint"
              type="text"
              placeholder="Es: pancake, carbonara, zuppa di lenticchie..."
              value={recipeHint}
              onChange={(e) => setRecipeHint(e.target.value)}
            />
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
          <>
            <h2 className="text-xl font-bold text-center">Il Tuo Piano di Oggi</h2>
            {recipes.map((recipe) => (
              <RecipeCard 
                key={`${recipe.meal}-${recipe.title}`}
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
}) => (
  <Card>
    <CardHeader className="flex flex-row items-start justify-between space-y-0">
      <div className="space-y-1.5">
        <CardTitle>{recipe.title}</CardTitle>
        <CardDescription>{recipe.meal} - {recipe.description}</CardDescription>
      </div>
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={() => onRegenerate(recipe.meal)}
        disabled={isRegenerating}
        className="shrink-0"
      >
        <RefreshCw className={`h-4 w-4 ${isRegenerating ? 'animate-spin' : ''}`} />
        <span className="sr-only">Rigenera {recipe.meal}</span>
      </Button>
    </CardHeader>
    <CardContent>
      <div className="flex items-center gap-6 text-sm text-muted-foreground mb-4 border-b pb-4">
        <div className="flex items-center gap-1.5"><Clock className="h-4 w-4" /><span>Prep: {recipe.prep_time}</span></div>
        <div className="flex items-center gap-1.5"><UtensilsCrossed className="h-4 w-4" /><span>Cottura: {recipe.cook_time}</span></div>
      </div>
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="ingredients">
          <AccordionTrigger>Ingredienti</AccordionTrigger>
          <AccordionContent>
            <ul className="list-disc pl-5 space-y-1">
              {(recipe.ingredients || []).map((item, index) => <li key={index}>{item}</li>)}
            </ul>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="instructions">
          <AccordionTrigger>Procedimento</AccordionTrigger>
          <AccordionContent>
            <ol className="list-decimal pl-5 space-y-2">
              {(recipe.instructions || []).map((item, index) => <li key={index}>{item}</li>)}
            </ol>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </CardContent>
  </Card>
);