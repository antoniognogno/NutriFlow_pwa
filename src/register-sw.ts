// src/register-sw.ts
// Registra il service worker per la PWA

if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(reg => {
        // Registrazione avvenuta con successo
        // console.log('Service worker registrato:', reg);
      })
      .catch(err => {
        // console.error('Errore nella registrazione del service worker:', err);
      });
  });
}
