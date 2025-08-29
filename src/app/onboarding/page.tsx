// src/app/onboarding/page.tsx
'use client'

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Importeremo i nostri nuovi componenti
import { OnboardingStepper } from "../components/OnboardingStepper";
import { StepUsername } from "../components/steps/StepsUsername";
import { StepDiet } from "../components/steps/StepsDiet";
import { StepPreferences } from "../components/steps/StepsPreferences";

import { Card } from "@/components/ui/card";

// Definiamo i tipi di dati che raccoglieremo
type FormData = {
  username: string;
  diet_type: string;
  allergies: string;
  disliked_foods: string;
};

const TOTAL_STEPS = 3;

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null>(null);

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    username: "",
    diet_type: "",
    allergies: "",
    disliked_foods: "",
  });

  // Funzione per aggiornare i dati del form da qualsiasi step
  const updateFormData = (newData: Partial<FormData>) => {
    setFormData(prev => ({ ...prev, ...newData }));
  };
  
  // Funzioni di navigazione
  const goToNextStep = () => setCurrentStep(prev => Math.min(prev + 1, TOTAL_STEPS));
  const goToPreviousStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));
  const goToStep = (step: number) => {
    if (step >= 1 && step <= TOTAL_STEPS) {
      setCurrentStep(step);
    }
  };

  // Funzione finale per salvare tutto su Supabase
  const handleSaveProfile = async () => {
  console.log("Tentativo di salvataggio per lutente ID:", userId);
  console.log("Dati da salvare:", formData);
  const { data: { user } } = await supabase.auth.getUser();
  console.log("user.id da Supabase:", user?.id);
  console.log("userId passato nell'upsert:", userId);
    if (!userId) {
      alert("Errore: Utente non trovato.");
      return;
    }

    const allergiesArray = formData.allergies.split(',').map(item => item.trim()).filter(Boolean);
    const dislikedFoodsArray = formData.disliked_foods.split(',').map(item => item.trim()).filter(Boolean);

    const { error } = await supabase
      .from('profiles')
      .upsert([{
        id: userId,
        username: formData.username,
        diet_type: formData.diet_type,
        allergies: allergiesArray,
        disliked_foods: dislikedFoodsArray,
        updated_at: new Date().toISOString(),
      }]);

    if (error) {
      alert("Errore durante il salvataggio: " + error.message);
    } else {
      router.push('/dashboard');
    }
  };
  
  // Recupera l'ID dell'utente al caricamento
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
      else router.push('/login');
    };
    getUser();
  }, [router, supabase.auth]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
      <Card className="w-full max-w-lg p-6 sm:p-8 space-y-8">
        {/* 1. La nostra barra di progressione */}
        <OnboardingStepper 
          currentStep={currentStep} 
          totalSteps={TOTAL_STEPS} 
          goToStep={goToStep} 
        />

        {/* 2. Il contenuto dello step che cambia dinamicamente */}
        <div className="pt-4">
          {currentStep === 1 && (
            <StepUsername data={formData} updateData={updateFormData} onNext={goToNextStep} />
          )}
          {currentStep === 2 && (
            <StepDiet data={formData} updateData={updateFormData} onNext={goToNextStep} onBack={goToPreviousStep} />
          )}
          {currentStep === 3 && (
            <StepPreferences data={formData} updateData={updateFormData} onBack={goToPreviousStep} onSave={handleSaveProfile} />
          )}
        </div>
      </Card>
    </div>
  );
}