// src/components/auth/steps/StepUsername.tsx

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type StepProps = {
  data: { username: string };
  updateData: (data: { username: string }) => void;
  onNext: () => void;
};

export function StepUsername({ data, updateData, onNext }: StepProps) {
  return (
    <div className="space-y-6">
      <CardHeader className="p-0">
        <CardTitle>Come possiamo chiamarti?</CardTitle>
    <CardDescription>Questo sar&agrave; il tuo nome visualizzato nell&apos;app.</CardDescription>
      </CardHeader>
      
      <div className="space-y-2">
        <Label htmlFor="username">Username</Label>
        <Input 
          id="username" 
          value={data.username}
          onChange={(e) => updateData({ username: e.target.value })}
        />
      </div>

      <div className="flex justify-end">
        <Button onClick={onNext} disabled={!data.username.trim()} className="bg-primary text-white hover:bg-primary/90">
          Avanti
        </Button>
      </div>
    </div>
  );
}