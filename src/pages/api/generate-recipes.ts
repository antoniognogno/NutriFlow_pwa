import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI, GenerationConfig } from '@google/generative-ai';
import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { generateRecipesSchema, regenerateMealSchema } from '@/lib/validators';

// La funzione extractJson non serve più se usiamo responseMimeType: 'application/json',
// ma la teniamo come fallback in caso di errori dell'IA.

const ipRequestCounts = new Map<string, { count: number; expiry: number }>();
const RATE_LIMIT_COUNT = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    // 1. Rate Limiting
    let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown-ip';
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

    // 2. Validazione con Zod (UN SOLO BLOCCO, PULITO)
    let validatedBody;
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

    // 3. Autenticazione e recupero profilo
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

    // 4. Costruzione del Prompt
    let prompt = '';
    const nutritionalInfoPrompt = `Per OGNI ricetta, DEVI fornire TUTTI i seguenti campi, inclusi i valori nutrizionali STIMATI: "meal", "title", "description", "ingredients" (array di stringhe), "instructions" (array di stringhe), "prep_time", "cook_time", "calories" (numero), "protein" (numero), "carbs" (numero), "fats" (numero).`;
    const personaPrompt = `Sei un nutrizionista e chef esperto della cucina ITALIANA. Conosci le ricette italiane da almeno 100 anni e non accetti variazioni (es. niente panna nella carbonara, solo guanciale). Affidati alla tradizione.`;

    if (mealToRegenerate && Array.isArray(existingMeals)) {
      const otherMealsString = existingMeals.map((meal) => `- ${meal.meal}: ${meal.title}`).join('\n');
      const discardedMealString = mealToDiscard?.title ? `L'utente ha scartato la ricetta "${mealToDiscard.title}".` : '';
      const discardedHistoryString = Array.isArray(discardedMeals) && discardedMeals.length > 0 ? `Inoltre, evita di riproporre queste ricette già scartate: ${discardedMeals.join(', ')}` : '';

      prompt = `${personaPrompt} L'utente vuole rigenerare SOLO la ricetta per: ${mealToRegenerate}. ${discardedMealString} ${discardedHistoryString} Gli altri pasti sono: ${otherMealsString}. La nuova ricetta deve essere DIVERSA, complementare e bilanciata. Considera le preferenze dell'utente: Dieta: ${profile?.diet_type || 'onnivoro'}, Allergie: ${(profile?.allergies || []).join(', ') || 'nessuna'}, Cibi non graditi: ${(profile?.disliked_foods || []).join(', ') || 'nessuno'}. Fornisci UNA SOLA ricetta. Rispondi in formato JSON con la struttura: { "recipe": { ...dati ricetta... } }. ${nutritionalInfoPrompt}`;
    } else {
      const ingredientsPromptSection = customIngredients ? `- Ingredienti da usare: ${customIngredients}.` : '';
      const breakfastPromptSection = breakfastPreference ? `- Preferenza colazione: ${breakfastPreference}.` : '';
      const hintPromptSection = recipeHint ? `- Suggerimento piatto: "${recipeHint}".` : '';

      prompt = `${personaPrompt} Crea un piano alimentare di 3 pasti (colazione, pranzo, cena) per un utente con le seguenti caratteristiche: Dieta: ${profile?.diet_type || 'onnivoro'}, Allergie: ${(profile?.allergies || []).join(', ') || 'nessuna'}, Cibi non graditi: ${(profile?.disliked_foods || []).join(', ') || 'nessuno'}, Obiettivi: ${profile?.goals || 'mangiare sano'}. ${ingredientsPromptSection} ${breakfastPromptSection} ${hintPromptSection}. ${nutritionalInfoPrompt} Rispondi ESATTAMENTE in formato JSON, con la struttura: { "recipes": [ { ...colazione... }, { ...pranzo... }, { ...cena... } ] }. Non aggiungere commenti prima o dopo il JSON.`;
    }
    
    // 5. Chiamata all'IA
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