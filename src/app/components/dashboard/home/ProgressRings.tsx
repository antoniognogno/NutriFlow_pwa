import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface RingProps {
  progress: number;
  label: string;
  value: string;
  colorClass: string;
}

function Ring({ progress, label, value, colorClass }: RingProps) {
  const circumference = 2 * Math.PI * 40; // Raggio di 40
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
        <circle
          className="text-muted/20"
          strokeWidth="8"
          stroke="currentColor"
          fill="transparent"
          r="40"
          cx="50"
          cy="50"
        />
        <circle
          className={colorClass}
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r="40"
          cx="50"
          cy="50"
          style={{ transition: 'stroke-dashoffset 0.5s ease-out' }}
        />
      </svg>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-bold text-sm">{value}</p>
    </div>
  );
}

export function ProgressRings() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>I Tuoi Progressi di Oggi</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col gap-6 sm:flex-row sm:justify-around sm:items-center">
                    <Ring 
                        progress={75} 
                        label="Calorie" 
                        value="1500 / 2000" 
                        colorClass="text-sky-500" 
                    />
                    <Ring 
                        progress={90} 
                        label="Proteine" 
                        value="135g / 150g" 
                        colorClass="text-red-500" 
                    />
                    <Ring 
                        progress={50} 
                        label="Acqua" 
                        value="1.0L / 2.0L" 
                        colorClass="text-blue-500" 
                    />
                </div>
            </CardContent>
        </Card>
    );
}