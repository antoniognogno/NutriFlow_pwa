import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

type StepperProps = {
    currentStep: number;
    totalSteps: number;
    goToStep: (step: number) => void;
};

const steps = [
    { number: 1, title: 'Benvenuto' },
    { number: 2, title: 'Dieta' },
    { number: 3, title: 'Preferenze' },
];

export function OnboardingStepper({ currentStep, goToStep }: StepperProps) {
    return (
        <nav aria-label="Progress">
            <ol role="list" className="flex items-center justify-between">
                {steps.map((step, stepIdx) => (
                    <li
                        key={step.title}
                        className={cn('relative flex-1', {
                            'pr-8 sm:pr-20': stepIdx !== steps.length - 1,
                        })}
                    >
                        {currentStep > step.number ? (
                            // Step completati
                            <>
                                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                    <div className="h-0.5 w-full bg-primary dark:bg-primary-dark" />
                                </div>
                                <button
                                    onClick={() => goToStep(step.number)}
                                    className="relative flex h-8 w-8 items-center justify-center rounded-full bg-primary hover:bg-primary/90 dark:bg-primary-dark dark:hover:bg-primary-dark/90 text-white"
                                >
                                    <Check className="h-5 w-5 text-white" aria-hidden="true" />
                                    <span className="sr-only">{step.title}</span>
                                </button>
                            </>
                        ) : currentStep === step.number ? (
                            // Step attuale
                            <>
                                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                    <div className="h-0.5 w-full bg-gray-200 dark:bg-gray-700" />
                                </div>
                                <button
                                    onClick={() => goToStep(step.number)}
                                    className="relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-primary bg-white dark:border-primary-dark dark:bg-gray-900"
                                    aria-current="step"
                                >
                                    <span className="h-2.5 w-2.5 rounded-full bg-primary dark:bg-primary-dark" aria-hidden="true" />
                                    <span className="sr-only">{step.title}</span>
                                </button>
                            </>
                        ) : (
                            // Step futuri
                            <>
                                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                    <div className="h-0.5 w-full bg-gray-200 dark:bg-gray-700" />
                                </div>
                                <button
                                    disabled // Non puoi cliccare su step futuri
                                    className="group relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-900"
                                >
                                    <span className="h-2.5 w-2.5 rounded-full bg-transparent" aria-hidden="true" />
                                    <span className="sr-only">{step.title}</span>
                                </button>
                            </>
                        )}
                        <p className="absolute -bottom-6 text-sm font-medium text-gray-600 dark:text-gray-300">{step.title}</p>
                    </li>
                ))}
            </ol>
        </nav>
    );
}