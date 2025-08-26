// src/app/page.tsx

import { redirect } from 'next/navigation'

export default function HomePage() {
  // Questa pagina non mostrerà mai nulla.
  // Il suo unico compito è reindirizzare l'utente
  // alla pagina di login.
  redirect('/login')
}