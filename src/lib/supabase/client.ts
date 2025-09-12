import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/lib/supabase/types' // 1. IMPORTA I TIPI

// 2. SPECIFICA I TIPI QUANDO CREI IL CLIENT
export const createClient = () => createBrowserClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)