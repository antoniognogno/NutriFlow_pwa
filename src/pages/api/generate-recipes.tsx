import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { NextApiRequest, NextApiResponse } from 'next';

function extractJson(text: string): any {
  const jsonStart = text.indexOf('{');
  const jsonEnd = text.lastIndexOf('}');
  
  if (jsonStart === -1 || jsonEnd === -1 || jsonEnd < jsonStart) {
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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    const { 
      ingredients: customIngredients, 
      breakfast_preference: breakfastPreference,
      recipe_hint: recipeHint,
      mealToRegenerate,
      existingMeals,
    } = req.body;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const googleApiKey = process.env.GOOGLE_AI_API_KEY;

    if (!supabaseUrl || !supabaseAnonKey || !googleApiKey) {
      return res.status(500).json({ error: 'Variabili d\'ambiente mancanti' });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Token di autenticazione mancante' });
    }
    
    const supabaseAccessToken = authHeader.split(' ')[1];
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user }, error: userError } = await supabase.auth.getUser(supabaseAccessToken);

    if (userError || !user) {
      return res.status(401).json({ error: 'Utente non autenticato o token non valido' });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('diet_type, allergies, disliked_foods, goals')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error("Errore nel recupero del profilo Supabase:", profileError);
      throw new Error("Impossibile recuperare il profilo utente.");
    }

    let prompt = '';

    if (mealToRegenerate && Array.isArray(existingMeals)) {
      const otherMealsString = existingMeals
        .map((meal: { meal: string, title: string }) => `- ${meal.meal}: ${meal.title}`)
        .join('\n');

      prompt = `
        Sei un nutrizionista e chef esperto. L'utente vuole rigenerare SOLO la ricetta per il seguente pasto: ${mealToRegenerate}.
        Gli altri pasti della giornata sono già stati decisi e sono:
        ${otherMealsString}
        
        La nuova ricetta per ${mealToRegenerate} deve essere DIVERSA da quelle esistenti, complementare e bilanciata con gli altri pasti.

        Considera le preferenze generali dell'utente:
        - Tipo di dieta: ${profile.diet_type || 'onnivoro'}
        - Allergie (da evitare assolutamente): ${(profile.allergies || []).join(', ') || 'nessuna'}
        - Cibi non graditi: ${(profile.disliked_foods || []).join(', ') || 'nessuno'}
        - Obiettivi: ${profile.goals || 'mangiare sano'}
        ${customIngredients ? `- L'utente vuole usare anche: ${customIngredients}.` : ''}
        ${breakfastPreference && mealToRegenerate === 'Colazione' ? `- Per questa colazione, l'utente preferisce un'opzione ${breakfastPreference}.` : ''}

        Fornisci UNA SOLA ricetta. Rispondi ESATTAMENTE in formato JSON con questa struttura: { "recipe": { "meal": "${mealToRegenerate}", "title": "...", "description": "...", "ingredients": ["..."], "instructions": ["..."], "prep_time": "...", "cook_time": "..." } }.
        Non aggiungere testo, commenti, o markdown prima o dopo il JSON.
      `;
    } else {
      
        let ingredientsPromptSection = '';
      if (customIngredients?.trim()) {
        ingredientsPromptSection = `- L'utente desidera usare questi ingredienti: ${customIngredients}. Includili in modo intelligente in una o più ricette, non necessariamente in tutte.`;
      }

      let breakfastPromptSection = '';
      if (breakfastPreference) {
        breakfastPromptSection = `- Per la colazione, l'utente ha una preferenza per un'opzione ${breakfastPreference}.`;
      }
      
      let hintPromptSection = '';
      if (recipeHint?.trim()) {
        hintPromptSection = `- L'utente ha espresso il desiderio di mangiare: "${recipeHint}". Includi una ricetta per questo piatto (o una sua variante salutare) nel pasto più appropriato.`;
      }

      prompt = `
        Sei un nutrizionista e chef esperto. Crea un piano alimentare per una singola giornata (colazione, pranzo, cena) per un utente con le seguenti caratteristiche:
        - Tipo di dieta: ${profile?.diet_type || 'onnivoro'}
        - Allergie (da evitare assolutamente): ${(profile?.allergies || []).join(', ') || 'nessuna'}
        - Cibi non graditi: ${(profile?.disliked_foods || []).join(', ') || 'nessuno'}
        - Obiettivi: ${profile?.goals || 'mangiare sano'}
        ${ingredientsPromptSection}
        ${breakfastPromptSection}
        ${hintPromptSection}

        Per OGNI ricetta, DEVI fornire TUTTI i seguenti campi:
        - "meal": Il tipo di pasto ("Colazione", "Pranzo", o "Cena").
        - "title": Un nome accattivante.
        - "description": Una breve descrizione (1-2 frasi).
        - "ingredients": Una lista di ingredienti come array di stringhe.
        - "instructions": Il procedimento di preparazione a passi come array di stringhe.
        - "prep_time": Il tempo di preparazione come stringa (es. "10 minuti").
        - "cook_time": Il tempo di cottura come stringa (es. "20 minuti"). Se la cottura non è necessaria, usa "N/A".

        Rispondi ESATTAMENTE in formato JSON, con questa struttura: { "recipes": [ { ...colazione... }, { ...pranzo... }, { ...cena... } ] }.
        Non aggiungere testo, commenti, o markdown prima o dopo il JSON. La tua risposta deve essere solo il JSON puro e valido, senza omissioni.
      `;
    }
    
    const genAI = new GoogleGenerativeAI(googleApiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const data = extractJson(text);
    
    return res.status(200).json(data);

  } catch (error) {
    console.error('API Route Error:', error);
    const message = error instanceof Error ? error.message : 'Errore sconosciuto';
    return res.status(500).json({ error: message });
  }
}