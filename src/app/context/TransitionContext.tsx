// src/context/TransitionContext.tsx
'use client';

import { 
  createContext, 
  useState, 
  useContext, 
  Dispatch, 
  SetStateAction, 
  useEffect,
  Suspense // <<< Importa Suspense
} from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

interface TransitionContextType {
  isLoading: boolean;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
}

const TransitionContext = createContext<TransitionContextType | undefined>(undefined);

// <<< AZIONE CHIAVE: Creiamo un componente helper
// Questo componente contiene la logica "pericolosa" (useSearchParams)
function NavigationEvents({ setIsLoading }: { setIsLoading: Dispatch<SetStateAction<boolean>> }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    setIsLoading(false);
  }, [pathname, searchParams, setIsLoading]);

  // Questo componente non renderizza nulla di visibile
  return null;
}


export function TransitionProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <TransitionContext.Provider value={{ isLoading, setIsLoading }}>
      {children}
      {/* 
        Avvolgiamo il nostro componente helper in <Suspense>.
        Next.js ora sa che `NavigationEvents` deve essere renderizzato solo sul client.
        Durante il rendering sul server (build), questo pezzo verrà saltato.
        Il fallback `null` significa che non mostreremo nulla mentre aspettiamo.
      */}
      <Suspense fallback={null}>
        <NavigationEvents setIsLoading={setIsLoading} />
      </Suspense>
    </TransitionContext.Provider>
  );
}

export function useTransitionContext() {
  const context = useContext(TransitionContext);
  if (context === undefined) {
    throw new Error('useTransitionContext must be used within a TransitionProvider');
  }
  return context;
}