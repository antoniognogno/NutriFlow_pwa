import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI, GenerationConfig } from '@google/generative-ai';
import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { generateRecipesSchema, regenerateMealSchema } from '@/lib/validators';

function extractJson(text: string): any {
  const jsonStart = text.indexOf('{');
  const jsonEnd = text.lastIndexOf('}');
  
  if (jsonStart === -1 || jsonEnd === -1 || jsonEnd < jsonStart) {
    if(text.length > 0) return { error: text };
    throw new Error('Nessun oggetto JSON valido trovato nella risposta dell\'IA.');
  }
  const jsonString = text.substring(jsonStart, jsonEnd + 1);
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.error("Errore durante il parsing del JSON estratto:", error);
    throw new Error("Il formato del JSON ricevuto dall'IA non è valido.");
  }
}

const ipRequestCounts = new Map<string, { count: number; expiry: number }>();
const RATE_LIMIT_COUNT = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    console.log("--- NUOVA RICHIESTA DI RIGENERAZIONE RICEVUTA ---");
    console.log("BODY RICEVUTO:", JSON.stringify(req.body, null, 2));

  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown-ip';
    if (Array.isArray(ip)) {
      ip = ip[0];
    }
    const now = Date.now();
    const record = ipRequestCounts.get(ip);
    if (record && now < record.expiry) {
      record.count++;
      if (record.count > RATE_LIMIT_COUNT) {
        return res.status(429).json({ error: 'Troppe richieste. Riprova tra un minuto.' });
      }
    } else {
      ipRequestCounts.set(ip, { count: 1, expiry: now + RATE_LIMIT_WINDOW_MS });
    }

    type ValidatedBodyType = {
      ingredients?: string | null;
      breakfast_preference?: "dolce" | "salato" | null;
      recipe_hint?: string | null;
      mealToRegenerate?: string | null;
      existingMeals?: any[] | null;
      mealToDiscard?: any | null;
      discardedMeals?: string[] | null;
    };

    let validatedBody: ValidatedBodyType;
    try {
      if (req.body.mealToRegenerate) {
        validatedBody = regenerateMealSchema.parse(req.body);
      } else {
        validatedBody = generateRecipesSchema.parse(req.body);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Errore di validazione Zod:", error.issues);
        return res.status(400).json({ error: 'Dati di input non validi.', details: error.issues });
      }
      throw error;
    }
    
    const { 
      ingredients: customIngredients, 
      breakfast_preference: breakfastPreference,
      recipe_hint: recipeHint,
      mealToRegenerate,
      existingMeals,
      mealToDiscard,
      discardedMeals,
    } = validatedBody;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const googleApiKey = process.env.GOOGLE_AI_API_KEY!;
    
    const authHeader = req.headers.authorization!;
    const supabaseAccessToken = authHeader.split(' ')[1];
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user } } = await supabase.auth.getUser(supabaseAccessToken);

    if (!user) {
      return res.status(401).json({ error: 'Utente non autenticato o token non valido' });
    }

    const { data: profile } = await supabase.from('profiles').select('diet_type, allergies, disliked_foods, goals').eq('id', user.id).single();

    let prompt = '';
    const nutritionalInfoPrompt = `Per OGNI ricetta, DEVI fornire TUTTI i seguenti campi, inclusi i valori nutrizionali STIMATI: "meal", "title", "description", "ingredients" (array di stringhe), "instructions" (array di stringhe), "prep_time", "cook_time", "calories" (numero), "protein" (numero), "carbs" (numero), "fats" (numero).`;

    if (mealToRegenerate && Array.isArray(existingMeals)) {
      const otherMealsString = existingMeals.map((meal: any) => `- ${meal.meal}: ${meal.title}`).join('\n');
      const discardedMealString = (mealToDiscard as any)?.title ? `L'utente ha scartato la ricetta "${(mealToDiscard as any).title}".` : '';
      const discardedHistoryString = Array.isArray(discardedMeals) && discardedMeals.length > 0 
        ? `Inoltre, evita di riproporre queste ricette già scartate: ${discardedMeals.join(', ')}`
        : '';

      prompt = `Sei un nutrizionista e chef esperto della cucina ITALIANA. Tu conosci le ricette italiane da almeno 100 anni. Non faresti mai variazioni sulla cucina italiana. Ad esempio Non metteresti mai la panna nella carbonara, o addirittura la pancetta al posto del guanciale. Affiddati alla cucina tradizionale italiana per ogni pasto italiano. Crea un piano alimentare per una singola giornata (colazione, pranzo, cena) per un utente con le seguenti caratteristiche: Rigenera SOLO la ricetta per: ${mealToRegenerate}. ${discardedMealString} ${discardedHistoryString} Gli altri pasti sono: ${otherMealsString}. La nuova ricetta deve essere DIVERSA, complementare e bilanciata. Considera le preferenze dell'utente: Dieta: ${profile?.diet_type || 'onnivoro'}, Allergie: ${(profile?.allergies || []).join(', ') || 'nessuna'}, Cibi non graditi: ${(profile?.disliked_foods || []).join(', ') || 'nessuno'}. Fornisci UNA SOLA ricetta. Rispondi in formato JSON con la struttura: { "recipe": { ...dati ricetta... } }. ${nutritionalInfoPrompt}`;
    } else {
      const ingredientsPromptSection = customIngredients ? `- Ingredienti da usare: ${customIngredients}.` : '';
      const breakfastPromptSection = breakfastPreference ? `- Preferenza colazione: ${breakfastPreference}.` : '';
      const hintPromptSection = recipeHint ? `- Suggerimento piatto: "${recipeHint}".` : '';

      prompt = `Sei un nutrizionista e chef esperto della cucina ITALIANA. Tu conosci le ricette italiane da almeno 100 anni. Non faresti mai variazioni sulla cucina italiana. Ad esempio Non metteresti mai la panna nella carbonara, o addirittura la pancetta al posto del guanciale. Affiddati alla cucina tradizionale italiana per ogni pasto italiano. Crea un piano alimentare per una singola giornata (colazione, pranzo, cena) per un utente con le seguenti caratteristiche: Crea un piano alimentare di 3 pasti (colazione, pranzo, cena) per un utente con le seguenti caratteristiche: Dieta: ${profile?.diet_type || 'onnivoro'}, Allergie: ${(profile?.allergies || []).join(', ') || 'nessuna'}, Cibi non graditi: ${(profile?.disliked_foods || []).join(', ') || 'nessuno'}, Obiettivi: ${profile?.goals || 'mangiare sano'}. ${ingredientsPromptSection} ${breakfastPromptSection} ${hintPromptSection}. ${nutritionalInfoPrompt} Rispondi ESATTAMENTE in formato JSON, con la struttura: { "recipes": [ { ...colazione... }, { ...pranzo... }, { ...cena... } ] }. Non aggiungere testo o commenti prima o dopo il JSON.`;
    }
    
    const genAI = new GoogleGenerativeAI(googleApiKey);
    const generationConfig: GenerationConfig = {
      temperature: 0.8,
      responseMimeType: 'application/json',
    };
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash-latest',
      generationConfig: generationConfig,
    });
    
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    const data = JSON.parse(text); 
    
    return res.status(200).json(data);

  } catch (error) {
    console.error('API Route Error:', error);
    const message = error instanceof Error ? error.message : 'Errore sconosciuto';
    return res.status(500).json({ error: message });
  }
}