// src/app/login/page.tsx
'use client';

import { useEffect, useState } from 'react'; // Aggiungiamo useState
import { createClient, getSessionWithTimeout, readStoredSupabaseSession } from '@/lib/supabase/client';
import { LoginForm } from "@/app/components/loginForm"; 
import { siteConfig } from "@/config/attributes"; 
import { NutriFlowLogo } from "@/components/NutriFlowLogo";

export default function LoginPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    const checkInitialSession = async () => {
      try {
        if (readStoredSupabaseSession()) {
          window.location.replace('/dashboard');
          return;
        }
        const { session } = await getSessionWithTimeout(supabase, 2500);
        if (active && session) {
          window.location.replace('/dashboard');
          return;
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void checkInitialSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        window.location.href = '/dashboard';
      }
    });

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, [supabase]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <NutriFlowLogo className="size-16" />
      </div>
    );
  }

  // Altrimenti, mostriamo il contenuto normale
  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-background">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center space-y-2 text-center">
          <div className="flex items-center gap-2">
            <NutriFlowLogo className="size-9" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground dark:text-white">{siteConfig.name}</h1>
          </div>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}