import { NextRequest, NextResponse } from 'next/server';

export interface ExerciseSearchResult {
  id: number;
  name: string;
  category: string;
}

export async function GET(req: NextRequest) {
  const apiKey = process.env.WGER_API_KEY;
  if (!apiKey) {
    console.error("WGER API Key is missing in .env.local");
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const term = searchParams.get('term');

  if (!term || term.length < 2) {
    return NextResponse.json([]); // Restituisce un array vuoto, è corretto
  }

  // Costruiamo l'URL per la ricerca direttamente, che è più affidabile
  const apiUrl = `https://wger.de/api/v2/exercise/search/?term=${encodeURIComponent(term)}&language=10`;

  try {
    console.log(`[API] Searching WGER for term: "${term}"`);

    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Token ${apiKey}`
      }
    });

    if (!response.ok) {
      console.error(`[API] WGER API responded with status: ${response.status}`);
      // Se WGER dà errore, restituiamo un array vuoto per non far crashare il frontend
      return NextResponse.json([]); 
    }

    const data = await response.json();

    // La risposta dell'endpoint /search/ ha una struttura diversa!
    // Adattiamoci a questa struttura.
    if (!data || !Array.isArray(data.suggestions)) {
      console.error("[API] WGER response is missing 'suggestions' array.");
      return NextResponse.json([]);
    }

    const searchResults: ExerciseSearchResult[] = data.suggestions.map((item: any) => ({
      id: item.data.id,
      name: item.value, // Il nome è in 'value'
      category: item.data.category || 'Sconosciuta'
    }));

    console.log(`[API] Found ${searchResults.length} results.`);
    return NextResponse.json(searchResults);

  } catch (error) {
    const message = error instanceof Error ? error.message : "An unknown error occurred";
    console.error("[API] Handler error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}