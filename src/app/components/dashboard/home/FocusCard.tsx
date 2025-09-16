import { Lightbulb } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function FocusCard() {
  return (
    <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg">
      <CardHeader className="flex flex-row items-center gap-4 pb-2">
        <Lightbulb size={28} />
        <CardTitle className="text-xl font-bold">Il Tuo Focus di Oggi</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-lg">
          Grande volume di allenamento ieri! Assicurati di fare il pieno di proteine oggi per un recupero ottimale.
        </p>
      </CardContent>
    </Card>
  );
}

// src/app/components/dashboard/home/FocusCard.tsx
// 'use client' // Questo componente ora gestisce stati, quindi deve essere client

// import { Lightbulb, AlertTriangle, Loader2 } from 'lucide-react';
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// interface FocusCardProps {
//   insight?: string;
//   isLoading: boolean;
//   error?: any;
// }

// export function FocusCard({ insight, isLoading, error }: FocusCardProps) {
  
//   const renderContent = () => {
//     if (isLoading) {
//       return (
//         <div className="flex items-center gap-3">
//           <Loader2 className="animate-spin h-5 w-5" />
//           <span>Sto pensando al consiglio di oggi...</span>
//         </div>
//       );
//     }

//     if (error) {
//       return (
//         <div className="flex items-center gap-3 text-destructive-foreground">
//           <AlertTriangle className="h-5 w-5" />
//           <span>Impossibile caricare il consiglio.</span>
//         </div>
//       );
//     }

//     return <p className="text-lg">{insight || "Inizia la giornata con un obiettivo chiaro!"}</p>;
//   };

//   return (
//     <Card className={`
//       shadow-lg transition-all 
//       ${error ? 'bg-destructive/90' : 'bg-gradient-to-br from-primary to-primary/80'} 
//       text-primary-foreground
//     `}>
//       <CardHeader className="flex flex-row items-center gap-4 pb-2">
//         <Lightbulb size={28} />
//         <CardTitle className="text-xl font-bold">Il Tuo Focus di Oggi</CardTitle>
//       </CardHeader>
//       <CardContent>
//         {renderContent()}
//       </CardContent>
//     </Card>
//   );
// }