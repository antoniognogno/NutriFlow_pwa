// src/app/login/page.tsx

import { LoginForm } from "../components/loginForm"; // Assicurati che il percorso sia corretto
import { siteConfig } from "../../config/attributes";
import { GalleryVerticalEnd } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-background">
      <div className="w-full max-w-sm space-y-6">
        
        {/* Parte 1: Il layout della pagina (logo e nome) */}
        <div className="flex flex-col items-center space-y-2 text-center">
          <div className="flex items-center gap-2">
             <div className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg">
                <GalleryVerticalEnd className="size-5" />
             </div>
             <h1 className="text-2xl font-bold tracking-tight text-foreground">{siteConfig.name}</h1>
          </div>
        </div>
        <LoginForm />

      </div>
    </div>
  );
}