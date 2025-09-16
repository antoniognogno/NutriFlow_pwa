import { Lightbulb } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function FocusCard() {
    return (
        <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg dark:bg-gradient-to-br dark:text-white">
            <CardHeader className="flex flex-row items-center gap-4 pb-2">
                <Lightbulb size={40} className="text-amber-300" />
                <CardTitle className="text-xl font-bold">Il Tuo Focus di Oggi</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-lg dark:text-gray-100">
                    Grande volume di allenamento ieri! Assicurati di fare il pieno di proteine oggi per un recupero ottimale.
                </p>
            </CardContent>
        </Card>
    );
}

// import { Lightbulb, AlertTriangle, Loader2 } from 'lucide-react';
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// import { useDailyInsight } from '@/hooks/use-dashboard-data';

// export function FocusCard() {
//     const { data, error, isLoading } = useDailyInsight();

//     let cardClass = "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg dark:bg-gradient-to-br dark:text-white";
//     let content = null;

//     if (isLoading) {
//         content = (
//             <div className="flex items-center gap-3">
//                 <Loader2 className="animate-spin h-5 w-5 text-amber-300" />
//                 <span>Sto pensando al consiglio di oggi...</span>
//             </div>
//         );
//     } else if (error) {
//         cardClass = "bg-destructive/90 text-destructive-foreground shadow-lg";
//         content = (
//             <div className="flex items-center gap-3">
//                 <AlertTriangle className="h-5 w-5 text-destructive" />
//                 <span>Impossibile caricare il consiglio.</span>
//             </div>
//         );
//     } else {
//         content = (
//             <p className="text-lg dark:text-gray-100">
//                 {data?.insight || "Grande volume di allenamento ieri! Assicurati di fare il pieno di proteine oggi per un recupero ottimale."}
//             </p>
//         );
//     }

//     return (
//         <Card className={cardClass}>
//             <CardHeader className="flex flex-row items-center gap-4 pb-2">
//                 <Lightbulb size={40} className="text-amber-300" />
//                 <CardTitle className="text-xl font-bold">Il Tuo Focus di Oggi</CardTitle>
//             </CardHeader>
//             <CardContent>
//                 {content}
//             </CardContent>
//         </Card>
//     );
// }