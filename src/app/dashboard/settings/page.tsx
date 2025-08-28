'use client'

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

// --- PERCORSI DI IMPORT CORRETTI ---
import { OnboardingStepper } from "@/app/components/OnboardingStepper";
import { StepUsername } from "@/app/components/steps/StepsUsername";
import { StepDiet } from "@/app/components/steps/StepsDiet";
import { StepPreferences } from "@/app/components/steps/StepsPreferences";

// --- ALTRI IMPORT ---
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/attributes";
import { GalleryVerticalEnd } from "lucide-react";

// Definiamo il tipo di dati del nostro form
type FormData = {
  username: string;
  diet_type: string;
  allergies: string;
  disliked_foods: string;
};

const TOTAL_STEPS = 3;

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();
  
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    username: "",
    diet_type: "",
    allergies: "",
    disliked_foods: "",
  });

  // Funzioni di navigazione
  const updateFormData = (newData: Partial<FormData>) => setFormData(prev => ({ ...prev, ...newData }));
  const goToNextStep = () => setCurrentStep(prev => Math.min(prev + 1, TOTAL_STEPS));
  const goToPreviousStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));
  const goToStep = (step: number) => {
    if (step >= 1 && step <= TOTAL_STEPS) {
      setCurrentStep(step);
    }
  };

  // Funzione per aggiornare il profilo
  const handleUpdateProfile = async () => {
    if (!userId) return;

    const allergiesArray = formData.allergies.split(',').map(item => item.trim()).filter(Boolean);
    const dislikedFoodsArray = formData.disliked_foods.split(',').map(item => item.trim()).filter(Boolean);

    const { error } = await supabase
      .from('profiles')
      .update({
        username: formData.username,
        diet_type: formData.diet_type,
        allergies: allergiesArray,
        disliked_foods: dislikedFoodsArray,
      })
      .eq('id', userId);

    if (error) {
      alert("Errore durante l&apos;aggiornamento: " + error.message);
    } else {
      setSuccessMessage("Profilo aggiornato con successo!");
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };
  
  // Hook per caricare i dati del profilo esistente
  useEffect(() => {
    const fetchInitialData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUserId(user.id);

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profile) {
        setFormData({
          username: profile.username || "",
          diet_type: profile.diet_type || "",
          allergies: (profile.allergies || []).join(', '),
          disliked_foods: (profile.disliked_foods || []).join(', '),
        });
      }
      setIsLoading(false);
    };

    fetchInitialData();
  }, [router, supabase]);

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen bg-background text-foreground">Caricamento impostazioni...</div>;
  }

  // --- LAYOUT COERENTE CON LE ALTRE PAGINE ---
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background">
        <div className="w-full max-w-lg space-y-6">
            <div className="flex flex-col items-center space-y-2 text-center">
                <div className="flex items-center gap-2">
                    <div className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg">
                        <GalleryVerticalEnd className="size-5" />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">{siteConfig.name}</h1>
                </div>
                <p className="text-muted-foreground">Modifica le tue preferenze</p>
            </div>

            <Card className="p-6 sm:p-8 space-y-8">
                <OnboardingStepper 
                    currentStep={currentStep} 
                    totalSteps={TOTAL_STEPS} 
                    goToStep={goToStep} 
                />

                <div className="pt-4">
                    {currentStep === 1 && <StepUsername data={formData} updateData={updateFormData} onNext={goToNextStep} />}
                    {currentStep === 2 && <StepDiet data={formData} updateData={updateFormData} onNext={goToNextStep} onBack={goToPreviousStep} />}
                    {currentStep === 3 && <StepPreferences data={formData} updateData={updateFormData} onBack={goToPreviousStep} onSave={handleUpdateProfile} />}
                </div>

                {successMessage && (
                    <p className="text-center text-green-600 font-semibold pt-4">{successMessage}</p>
                )}
            </Card>
            
            <div className="text-center">
                <Button asChild variant="ghost">
                    <Link href="/dashboard">Torna alla Dashboard</Link>
                </Button>
            </div>
        </div>
    </div>
  );
}