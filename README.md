# NutriFlow PWA

**Versione attuale:** `0.1.4`

Applicazione web progressiva (PWA) offline-first per organizzare allenamenti, nutrizione, idratazione, routine quotidiana e statistiche personali.

## Funzionalità principali

- **Home & Riepilogo Oggi (`/dashboard`):** anelli di avanzamento giornalieri, prossimo allenamento, creatina (oggi e ieri), timer Focus (Pomodoro / Blocco) e streak/XP.
- **Allenamenti & Schede (`/dashboard/gym`):**
  - Schede personalizzate, preset rapidi e importazione intelligente tramite prompt guidati per Gemini AI (testo libero o configurazione guidata con macchine/vincoli).
  - Allenamento live con timer di recupero automatico, calcolo bilanciere, superserie, note per esercizio e guida esecuzione con anteprime esercizi/macchinari.
  - Corsa & Cardio rapido con storico modificabile (`Storico allenamenti`) e **Cestino con conservazione 30 giorni** e conferme di sicurezza su spostamento, ripristino ed eliminazione definitiva.
- **Statistiche (`/dashboard/stats`):** progressione esercizi, 1RM stimato, volume settimanale delle ultime 8 settimane, heatmap attività e record personali.
- **Routine & Corpo (`/dashboard/routine`):**
  - Check-in abitudini e peso corporeo con **selettore giorno per giorno degli ultimi 7 giorni** (`Oggi`, `Ieri` e giorni precedenti + selettore data), promemoria configurabili e report per giorno, settimana, mese, 3 mesi, 6 mesi e anno.
- **Nutrizione & Idratazione (`/dashboard/nutrition`, `/dashboard/water`):**
  - Diario pasti con macro personalizzati (TDEE), preset rapidi, ricerca locale/OpenFoodFacts (con filtro offline e pesi in grammi) e report storici navigabili.
  - Tracker acqua con dosi personalizzabili e gestione completa anche su **Oggi, Ieri e gli ultimi 7 giorni**.
- **Offline-first & PWA:** salvataggio locale in IndexedDB (`Dexie`) + `localStorage`, sincronizzazione automatica al ritorno della connessione, gestione aggiornamenti PWA con versione/progress bar e ripristino automatico anti-schermo bianco (`AppErrorBoundary` + `lazyWithRetry`).
- **Sicurezza & Conformità UE:** validazione input anti-iniezione, gestione sessione resiliente su Supabase Auth, Privacy Policy (GDPR UE) e Termini di Servizio (`/privacy`, `/terms`).

## Stack Tecnologico

- **Frontend:** React 19, TypeScript, Vite 8, React Router 7, Tailwind CSS v4, Radix UI, Lucide Icons, Recharts / grafici SVG leggeri
- **PWA:** `vite-plugin-pwa` + Workbox (`dist/version.json` generato ad ogni build)
- **Backend & Auth:** Supabase (`@supabase/supabase-js`, Postgres + RLS, migrazioni in `supabase/migrations/`)
- **Offline Sync:** Dexie (IndexedDB outbox)
- **Test:** Vitest 5 (`vitest run`)

## Configurazione locale

1. Installa le dipendenze:

```bash
npm install
```

2. Configura le variabili d’ambiente in `.env.local`:

```env
VITE_SUPABASE_URL=https://tuo-progetto.supabase.co
VITE_SUPABASE_ANON_KEY=la-tua-anon-key
```

*(Sono supportati anche i prefissi `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` come fallback configurato in Vite).*

3. Avvia il server di sviluppo:

```bash
npm run dev
```

## Script disponibili

- `npm run dev` — Avvia Vite in sviluppo su `127.0.0.1`
- `npm test` — Esegue la suite di test Vitest (`vitest run`)
- `npm run build` — Verifica i tipi (`tsc --noEmit -p tsconfig.json`) e genera la build PWA in `dist/`
- `npm run preview` — Avvia l’anteprima locale della build di produzione
- `npm run lint` — Esegue ESLint sul progetto
