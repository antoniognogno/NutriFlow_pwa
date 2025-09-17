// src/app/components/PageLoader.tsx
'use client';

import { useTransitionContext } from '@/app/context/TransitionContext';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function PageLoader() {
  const { isLoading } = useTransitionContext();
  const [LoaderComponent, setLoaderComponent] = useState<React.ElementType | null>(null);

  // <<< SOLUZIONE CHIAVE
  // Usiamo useEffect per eseguire il codice che dipende dal browser.
  // L'array di dipendenze vuoto `[]` assicura che questo codice venga eseguito
  // solo una volta, dopo il primo rendering del componente sul client.
  useEffect(() => {
    // Importiamo la libreria DINAMICAMENTE all'interno dell'effetto
    import('ldrs').then(({ ring }) => {
      // Registriamo il componente
      ring.register();
      // Una volta registrato, lo salviamo in uno stato per poterlo renderizzare
      // Usiamo 'l-ring' come stringa perché è un Custom Element
      setLoaderComponent(() => 'l-ring'); 
    });
  }, []); // L'array vuoto è fondamentale

  return (
    <AnimatePresence>
      {isLoading && LoaderComponent && ( // Renderizza solo se isLoading E il loader è pronto
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/80 backdrop-blur-sm"
        >
          {/* 
            Renderizziamo il componente dinamicamente.
            React sa come creare un elemento dal nome del tag stringa.
          */}
          <LoaderComponent
            size="40"
            stroke="5"
            bg-opacity="0"
            speed="2"
            color="hsl(var(--primary))"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}