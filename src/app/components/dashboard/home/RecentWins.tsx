import { Award, Droplets, Medal } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface WinCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  colorClass: string;
}

function WinCard({ icon, title, description, colorClass }: WinCardProps) {
    return (
        <Card className="flex-shrink-0 w-48 snap-start">
            <CardContent className="p-4 flex items-center gap-4">
                <div className={`p-2 rounded-full ${colorClass}`}>
                    {icon}
                </div>
                <div>
                    <p className="font-semibold text-sm">{title}</p>
                    <p className="text-xs text-muted-foreground">{description}</p>
                </div>
            </CardContent>
        </Card>
    )
}

export function RecentWins() {
  return (
    <div>
        <h2 className="text-xl font-bold mb-4">Le Tue Vittorie Recenti</h2>
        {/* Contenitore per lo scroll orizzontale su mobile */}
        <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory">
            <WinCard 
                icon={<Medal className="text-amber-900" />}
                title="Nuovo Record!"
                description="100kg di Squat"
                colorClass="bg-amber-100"
            />
             <WinCard 
                icon={<Award className="text-green-900" />}
                title="Che Costanza!"
                description="3 giorni di log di fila"
                colorClass="bg-green-100"
            />
             <WinCard 
                icon={<Droplets className="text-sky-900" />}
                title="Super Idratato"
                description="Obiettivo Acqua 110%"
                colorClass="bg-sky-100"
            />
            <WinCard 
                icon={<Medal className="text-purple-900" />}
                title="Record Trazioni"
                description="10 reps con peso"
                colorClass="bg-purple-100"
            />
        </div>
    </div>
  );
}