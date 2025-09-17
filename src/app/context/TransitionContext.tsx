// src/context/TransitionContext.tsx
'use client';

import { 
  createContext, 
  useState, 
  useContext, 
  Dispatch, 
  SetStateAction, 
  useEffect 
} from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

// 1. Definiamo la "forma" del nostro contesto.
// Avrà una variabile booleana `isLoading` e una funzione `setIsLoading` per cambiarla.
interface TransitionContextType {
  isLoading: boolean;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
}

// 2. Creiamo il contesto.
// Lo inizializziamo come `undefined` e lo controlleremo nel nostro hook custom.
const TransitionContext = createContext<TransitionContextType | undefined>(undefined);

// 3. Creiamo il Provider.
// Questo è il componente che avvolgerà la nostra applicazione nel `layout.tsx`.
// Conterrà lo stato e la logica.
export function TransitionProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // 4. Logica Automatica per Nascondere il Loader.
  // Questo hook `useEffect` si attiva ogni volta che l'URL cambia
  // (cioè quando la navigazione verso una nuova pagina è completata).
  // Quando questo accade, nascondiamo il loader.
  useEffect(() => {
    setIsLoading(false);
  }, [pathname, searchParams]);

  // Il provider passa lo stato `isLoading` e la funzione `setIsLoading`
  // a tutti i componenti figli che ne faranno richiesta.
  return (
    <TransitionContext.Provider value={{ isLoading, setIsLoading }}>
      {children}
    </TransitionContext.Provider>
  );
}

// 5. Creiamo un Hook Custom per un Uso Semplice.
// Invece di importare `useContext` e `TransitionContext` ogni volta,
// i nostri componenti importeranno solo questo hook `useTransitionContext`.
// È più pulito e sicuro.
export function useTransitionContext() {
  const context = useContext(TransitionContext);
  
  // Se un componente prova a usare questo hook senza essere avvolto
  // dal `TransitionProvider`, riceverà un errore chiaro.
  if (context === undefined) {
    throw new Error('useTransitionContext must be used within a TransitionProvider');
  }
  
  return context;
}