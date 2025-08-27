import { SignUpForm } from "../components/signUpForm"; // Assicurati che il percorso sia corretto!
import { siteConfig } from "../../config/attributes";
import { GalleryVerticalEnd } from "lucide-react";

export default function SignUpPage() {
  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-background">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center space-y-2 text-center">
          {/* Logo e Nome App */}
          <div className="flex items-center gap-2">
             <div className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg">
                <GalleryVerticalEnd className="size-5" />
             </div>
             <h1 className="text-2xl font-bold tracking-tight">{siteConfig.name}</h1>
          </div>
        </div>
        
        {/* Usiamo il nostro nuovo componente super-intelligente! */}
        <SignUpForm />
      </div>
    </div>
  );
}