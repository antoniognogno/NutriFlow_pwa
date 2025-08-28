import { z } from 'zod';

// Definiamo uno schema base per una ricetta, con tutti i campi opzionali per la massima flessibilità
const recipeSchema = z.object({
  meal: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  ingredients: z.array(z.string()).optional(),
  instructions: z.array(z.string()).optional(),
  prep_time: z.string().optional(),
  cook_time: z.string().optional(),
  calories: z.number().optional(),
  protein: z.number().optional(),
  carbs: z.number().optional(),
  fats: z.number().optional(),
});

// Schema per la richiesta di generazione del piano completo
export const generateRecipesSchema = z.object({
  ingredients: z.string().max(200, "La lista degli ingredienti non può superare i 200 caratteri.").optional().nullable(),
  breakfast_preference: z.enum(['dolce', 'salato']).optional().nullable(),
  recipe_hint: z.string().max(100, "Il suggerimento non può superare i 100 caratteri.").optional().nullable(),
});

// Schema per la richiesta di rigenerazione di un singolo pasto
export const regenerateMealSchema = z.object({
  mealToRegenerate: z.enum(['Colazione', 'Pranzo', 'Cena']),
  existingMeals: z.array(recipeSchema).max(2),
  // Ci aspettiamo un oggetto con SOLO il titolo
  mealToDiscard: z.object({
    title: z.string().optional(),
  }).optional().nullable(),
  discardedMeals: z.array(z.string()).optional().nullable(),
  // Campi opzionali
  ingredients: z.string().max(200).optional().nullable(),
  breakfast_preference: z.enum(['dolce', 'salato']).optional().nullable(),
  recipe_hint: z.string().max(100).optional().nullable(),
});