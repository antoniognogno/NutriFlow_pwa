'use client'

import { useState, useEffect, useCallback} from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import dynamic from 'next/dynamic';

// Componenti UI
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// Icone
import { GlassWater, Droplet, Milk, RotateCcw } from "lucide-react"; 

// Importiamo dinamicamente il componente del grafico per evitare problemi di SSR con i colori
const WaterLogChart = dynamic(
  () => import('@/app/components/dashboard/WaterLogChart').then(mod => mod.WaterLogChart),
  { 
    ssr: false,
    loading: () => <p className="text-center text-sm text-muted-foreground py-8">Caricamento grafico...</p>
  }
);

interface ChartData {
  time: string;
  ml: number;
}

export default function WaterTrackerPage() {
  const router = useRouter();
  const supabase = createClient();

  const [userId, setUserId] = useState<string | null>(null);
  const [totalToday, setTotalToday] = useState(0);
  const [dailyGoal, setDailyGoal] = useState(2500);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- NUOVA FUNZIONE FETCHDATA CON AGGREGAZIONE ---
  const fetchData = useCallback(async (currentUserId: string) => {
    const startOfDay = new Date(new Date().setHours(0, 0, 0, 0));
    
    // 1. Recuperiamo i dati come prima
    const [profileResponse, logsResponse] = await Promise.all([
      supabase.from('profiles').select('water_goal_ml').eq('id', currentUserId).single(),
      supabase.from('water_logs').select('amount_ml, created_at').eq('user_id', currentUserId).gte('created_at', startOfDay.toISOString())
    ]);

    const { data: profile } = profileResponse;
    if (profile && profile.water_goal_ml) {
      setDailyGoal(profile.water_goal_ml);
    }

    const { data: logs } = logsResponse;
    if (logs) {
      const total = logs.reduce((sum, log) => sum + log.amount_ml, 0);
      setTotalToday(total);
      
      // 2. AGGREGAZIONE DATI PER ORA
      const hourlyTotals = new Map<number, number>();
      for (const log of logs) {
        const hour = new Date(log.created_at).getHours();
        const currentTotal = hourlyTotals.get(hour) || 0;
        hourlyTotals.set(hour, currentTotal + log.amount_ml);
      }

      // 3. CREAZIONE DELLA STRUTTURA FINALE DEL GRAFICO CON TUTTE LE ORE
      const formattedData: ChartData[] = [];
      const startHour = 7; // Orario di inizio del grafico
      const endHour = 23;   // Orario di fine del grafico

      for (let hour = startHour; hour <= endHour; hour++) {
        formattedData.push({
          time: `${hour}:00`, // Etichetta dell'ora
          ml: hourlyTotals.get(hour) || 0, // Prende il totale o 0 se non c'è
        });
      }
      
      setChartData(formattedData);
    }
  }, [supabase]);

  useEffect(() => {
    const initializePage = async () => {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUserId(user.id);
      await fetchData(user.id);
      setIsLoading(false);
    };
    initializePage();
  }, [router, supabase, fetchData]);

  const handleAddWater = async (amount: number) => {
    if (!userId) return;
    const { error } = await supabase.from('water_logs').insert([{ user_id: userId, amount_ml: amount }]);
    if (error) {
      alert("Errore nell'aggiungere l'acqua: " + error.message);
    } else {
      await fetchData(userId); // Ricarica tutti i dati, incluso il grafico
    }
  };

  const handleResetWater = async () => {
    if (!userId) return;
    const startOfDay = new Date(new Date().setHours(0, 0, 0, 0));
    const { error } = await supabase.from('water_logs').delete().eq('user_id', userId).gte('created_at', startOfDay.toISOString());
    if (error) {
      alert("Errore durante il reset: " + error.message);
    } else {
      await fetchData(userId); // Ricarica tutti i dati, incluso il grafico
    }
  };

  const progressValue = dailyGoal > 0 ? (totalToday / dailyGoal) * 100 : 0;

  if (isLoading) {
    return <div className="flex flex-1 items-center justify-center">Caricamento...</div>;
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <h1 className="text-lg font-semibold md:text-2xl">Water Tracker</h1>
      
      <Card>
        <CardHeader className="text-center">
          <CardTitle>Il Tuo Progresso Giornaliero</CardTitle>
          <CardDescription>
            Ogni goccia conta per il tuo benessere.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="space-y-2">
            <p className="text-center text-4xl font-bold text-primary">
              {totalToday.toLocaleString()}
              <span className="text-xl font-medium text-muted-foreground"> / {dailyGoal.toLocaleString()} ml</span>
            </p>
            <Progress value={progressValue} className="w-full" />
          </div>

          <div className="flex flex-col items-center gap-4">
            <p className="text-sm font-medium text-muted-foreground">Aggiungi una consumazione:</p>
            <div className="flex justify-center gap-4 flex-wrap">
                <AddWaterButton amount={200} label="Bicchiere" icon={GlassWater} color="text-blue-500" onClick={handleAddWater} />
                <AddWaterButton amount={500} label="Boraccia" icon={Milk} color="text-green-500" onClick={handleAddWater} />
                <AddWaterButton amount={100} label="Sorso" icon={Droplet} color="text-sky-400" onClick={handleAddWater} />
            </div>
          </div>
        </CardContent>
        
        {totalToday > 0 && (
          <>
            <div className="px-6">
              <Separator />
            </div>
            <CardFooter className="flex justify-center pt-6">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Resetta conteggio
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Sei assolutamente sicuro?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Questa azione cancellerà tutti i log odierni.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annulla</AlertDialogCancel>
                    <AlertDialogAction className="bg-red-500 text-white hover:bg-destructive/90" onClick={handleResetWater}>
                      Sì, resetta
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardFooter>
          </>
        )}
      </Card>

      {/* Il grafico viene renderizzato qui, come componente autonomo, solo se ci sono dati */}
      {chartData.length > 0 && (
        <WaterLogChart data={chartData} />
      )}
    </div>
  );
}

const AddWaterButton = ({ amount, label, icon: Icon, color, onClick }: {
  amount: number;
  label: string;
  icon: React.ElementType;
  color: string;
  onClick: (amount: number) => void;
}) => (
  <Button 
    variant="outline" 
    className="h-24 w-24 flex-col gap-2"
    onClick={() => onClick(amount)}
  >
    <Icon className={`h-8 w-8 ${color}`} />
    <span className="text-xs text-center font-semibold">{label} <br/>({amount}ml)</span>
  </Button>
);