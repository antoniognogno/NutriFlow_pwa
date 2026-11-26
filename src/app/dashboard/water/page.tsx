'use client'

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { Check, GlassWater, Droplet, Milk, Pencil, Plus, RotateCcw, SlidersHorizontal, Undo2, Utensils, Waves, X } from "lucide-react";
import { toast } from "sonner";
import { WaterLogChart } from "@/app/components/dashboard/WaterLogChart";
import { queueAndSync } from "@/features/offline/useOfflineSync";
import {
  readWaterPresets,
  saveWaterPresets,
  type WaterPresetItem,
} from "@/features/nutrition/waterPresets";
import { focusAndScrollToElement } from "@/lib/focusScroll";

interface ChartData {
  time: string;
  ml: number;
}

interface TodayWaterLog {
  id?: number;
  amount_ml: number;
  created_at: string;
}

const WATER_GOALS = [2000, 2500, 3000, 3500] as const;

function presetIcon(kind: WaterPresetItem['kind']) {
  switch (kind) {
    case 'sip':
      return { Icon: Droplet, color: 'text-sky-400' };
    case 'glass':
      return { Icon: GlassWater, color: 'text-blue-500' };
    case 'bottle':
      return { Icon: Milk, color: 'text-emerald-500' };
    case 'large':
      return { Icon: Waves, color: 'text-cyan-400' };
  }
}

export default function WaterTrackerPage() {
  const router = useRouter();
  const supabase = createClient();

  const [userId, setUserId] = useState<string | null>(null);
  const [totalToday, setTotalToday] = useState(0);
  const [dailyGoal, setDailyGoal] = useState(2500);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [lastLog, setLastLog] = useState<TodayWaterLog | null>(null);
  const [presets, setPresets] = useState<WaterPresetItem[]>(() => readWaterPresets());

  const [isEditingPresets, setIsEditingPresets] = useState(false);
  const [presetDrafts, setPresetDrafts] = useState<WaterPresetItem[]>(() => readWaterPresets());
  const [customMl, setCustomMl] = useState('');
  const [isEditingLast, setIsEditingLast] = useState(false);
  const [lastMlDraft, setLastMlDraft] = useState('');

  const firstPresetInputRef = useRef<HTMLInputElement>(null);
  const editLastInputRef = useRef<HTMLInputElement>(null);

  const fetchData = useCallback(async (currentUserId: string) => {
    const startOfDay = new Date(new Date().setHours(0, 0, 0, 0));

    const [profileResponse, logsResponse] = await Promise.all([
      supabase.from('profiles').select('water_goal_ml').eq('id', currentUserId).single(),
      supabase
        .from('water_logs')
        .select('id, amount_ml, created_at')
        .eq('user_id', currentUserId)
        .gte('created_at', startOfDay.toISOString())
        .order('created_at', { ascending: false })
        .order('id', { ascending: false }),
    ]);

    const { data: profile } = profileResponse;
    if (profile?.water_goal_ml) {
      setDailyGoal(profile.water_goal_ml);
    }

    const { data: logs } = logsResponse;
    if (logs) {
      const total = logs.reduce((sum, log) => sum + log.amount_ml, 0);
      setTotalToday(total);
      setLastLog(logs[0] ?? null);

      const hourlyTotals = new Map<number, number>();
      for (const log of logs) {
        const hour = new Date(log.created_at).getHours();
        hourlyTotals.set(hour, (hourlyTotals.get(hour) || 0) + log.amount_ml);
      }

      const formattedData: ChartData[] = [];
      for (let hour = 7; hour <= 23; hour++) {
        formattedData.push({
          time: `${hour}:00`,
          ml: hourlyTotals.get(hour) || 0,
        });
      }
      setChartData(formattedData);
    }
  }, [supabase]);

  useEffect(() => {
    const initializePage = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user;
        if (!user) {
          router.push('/login');
          return;
        }
        setUserId(user.id);
        await fetchData(user.id);
      } catch (error) {
        console.error('Errore caricamento acqua:', error);
      }
    };
    void initializePage();
  }, [router, supabase, fetchData]);

  const handleAddWater = async (amount: number) => {
    if (!userId || amount <= 0) return;
    setTotalToday(prev => prev + amount);

    if (!navigator.onLine) {
      try {
        await queueAndSync({
          id: `water_logs:${crypto.randomUUID()}`,
          userId,
          table: 'water_logs',
          payload: {
            user_id: userId,
            amount_ml: amount,
            created_at: new Date().toISOString(),
          },
        });
        setLastLog({ amount_ml: amount, created_at: new Date().toISOString() });
        toast.success(`+${amount} ml salvati offline`);
        window.dispatchEvent(new Event('nutriflow:data-updated'));
      } catch {
        setTotalToday(prev => Math.max(0, prev - amount));
        toast.error("Impossibile salvare l'acqua offline.");
      }
      return;
    }

    const { data, error } = await supabase
      .from('water_logs')
      .insert([{ user_id: userId, amount_ml: amount }])
      .select('id, amount_ml, created_at')
      .single();

    if (error) {
      setTotalToday(prev => Math.max(0, prev - amount));
      toast.error("Errore nel registrare l'acqua: " + error.message);
      return;
    }

    setLastLog(data as TodayWaterLog);
    toast.success(`+${amount} ml aggiunti`);
    window.dispatchEvent(new Event('nutriflow:data-updated'));
    void fetchData(userId);
  };

  const handleRemoveLast = async () => {
    if (!userId || !lastLog) return;
    const removedAmount = lastLog.amount_ml;
    setTotalToday(prev => Math.max(0, prev - removedAmount));

    if (lastLog.id) {
      const { error } = await supabase
        .from('water_logs')
        .delete()
        .eq('id', lastLog.id)
        .eq('user_id', userId);
      if (error) {
        toast.error("Impossibile togliere l'ultima azione.");
        void fetchData(userId);
        return;
      }
    }
    toast.info(`Rimossi -${removedAmount} ml`);
    window.dispatchEvent(new Event('nutriflow:data-updated'));
    void fetchData(userId);
  };

  const openEditLast = () => {
    if (!lastLog) return;
    setLastMlDraft(String(lastLog.amount_ml));
    setIsEditingLast(true);
    setTimeout(() => focusAndScrollToElement(editLastInputRef.current), 20);
  };

  const handleSaveLastEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !lastLog?.id) return;
    const nextMl = Math.max(10, Math.min(3000, Number.parseInt(lastMlDraft, 10) || lastLog.amount_ml));
    const diff = nextMl - lastLog.amount_ml;
    setTotalToday(prev => Math.max(0, prev + diff));

    const { data: updatedRows, error: updateError } = await supabase
      .from('water_logs')
      .update({ amount_ml: nextMl })
      .eq('id', lastLog.id)
      .eq('user_id', userId)
      .select('id, amount_ml, created_at');

    if (updateError || !updatedRows || updatedRows.length === 0) {
      // Fallback nel caso la policy RLS di water_logs consenta DELETE + INSERT ma non UPDATE
      const { error: deleteErr } = await supabase
        .from('water_logs')
        .delete()
        .eq('id', lastLog.id)
        .eq('user_id', userId);
      const { data: insertedRow, error: insertErr } = await supabase
        .from('water_logs')
        .insert([{ user_id: userId, amount_ml: nextMl }])
        .select('id, amount_ml, created_at')
        .single();

      if (deleteErr || insertErr || !insertedRow) {
        toast.error("Impossibile modificare l'ultima azione.");
        void fetchData(userId);
        return;
      }
      setLastLog(insertedRow as TodayWaterLog);
    } else {
      setLastLog(updatedRows[0] as TodayWaterLog);
    }

    setIsEditingLast(false);
    toast.success(`Ultima registrazione aggiornata a ${nextMl} ml`);
    window.dispatchEvent(new Event('nutriflow:data-updated'));
    void fetchData(userId);
  };

  const openEditPresets = () => {
    const nextState = !isEditingPresets;
    setPresetDrafts(presets);
    setIsEditingPresets(nextState);
    if (nextState) {
      setTimeout(() => focusAndScrollToElement(firstPresetInputRef.current), 20);
    }
  };

  const handleSavePresets = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = presetDrafts.map(item => ({
      ...item,
      label: item.label.trim() || 'Dose',
      amountMl: Math.max(25, Math.min(3000, Math.round(Number(item.amountMl) || 100))),
    }));
    setPresets(cleaned);
    saveWaterPresets(cleaned);
    setIsEditingPresets(false);
    toast.success('Dosi personalizzate salvate.');
  };

  const handleGoalChange = async (goalMl: number) => {
    if (!userId || goalMl === dailyGoal) return;
    const previous = dailyGoal;
    setDailyGoal(goalMl);
    const { error } = await supabase
      .from('profiles')
      .update({ water_goal_ml: goalMl })
      .eq('id', userId);
    if (error) {
      setDailyGoal(previous);
      toast.error('Impossibile aggiornare l’obiettivo acqua.');
      return;
    }
    toast.success(`Obiettivo acqua impostato a ${(goalMl / 1000).toFixed(1)} L`);
    window.dispatchEvent(new Event('nutriflow:data-updated'));
  };

  const handleResetWater = async () => {
    if (!userId) return;
    const startOfDay = new Date(new Date().setHours(0, 0, 0, 0));
    const { error } = await supabase.from('water_logs').delete().eq('user_id', userId).gte('created_at', startOfDay.toISOString());
    if (error) {
      toast.error("Errore nel resettare i log: " + error.message);
    } else {
      setLastLog(null);
      setTotalToday(0);
      setIsEditingLast(false);
      toast.success("Log resettati con successo.");
      window.dispatchEvent(new Event('nutriflow:data-updated'));
      await fetchData(userId);
    }
  };

  const progressValue = dailyGoal > 0 ? Math.min(100, (totalToday / dailyGoal) * 100) : 0;
  const remainingMl = Math.max(0, dailyGoal - totalToday);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Idratazione</h1>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 rounded-xl border-sky-500/35 bg-sky-500/10 text-xs text-sky-400 hover:bg-sky-500/20"
          onClick={openEditPresets}
        >
          <SlidersHorizontal className="mr-1.5 size-3.5" />
          {isEditingPresets ? 'Chiudi dosi' : 'Personalizza dosi'}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" className="h-11 rounded-xl text-xs font-medium" asChild>
          <Link href="/dashboard/nutrition">
            <Utensils className="mr-1.5 size-4" />
            Pasti & Macro
          </Link>
        </Button>
        <Button variant="secondary" className="h-11 rounded-xl text-xs font-medium" asChild>
          <Link href="/dashboard/water">
            <GlassWater className="mr-1.5 size-4" />
            Acqua
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3 text-center">
          <CardTitle className="text-base sm:text-lg">Progresso giornaliero</CardTitle>
          <CardDescription>
            {remainingMl === 0
              ? 'Obiettivo giornaliero raggiunto!'
              : `Mancano ${remainingMl.toLocaleString('it-IT')} ml · ${Math.round(progressValue)}%`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <p className="text-center font-mono text-3xl font-bold text-primary sm:text-4xl">
              {totalToday.toLocaleString('it-IT')}
              <span className="text-base font-medium text-muted-foreground sm:text-xl">
                {' '}/ {dailyGoal.toLocaleString('it-IT')} ml
              </span>
            </p>
            <Progress value={progressValue} className="h-2.5 w-full" />
          </div>

          <div className="space-y-2">
            <p className="text-center text-xs font-medium text-muted-foreground">Aggiungi in 1 tap</p>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {presets.map(preset => {
                const { Icon, color } = presetIcon(preset.kind);
                return (
                  <Button
                    key={preset.id}
                    variant="outline"
                    disabled={!userId}
                    className="h-20 w-full min-w-0 flex-col gap-1.5 rounded-2xl active:scale-95"
                    onClick={() => void handleAddWater(preset.amountMl)}
                  >
                    <Icon className={`size-6 ${color}`} />
                    <span className="truncate text-xs font-semibold leading-tight">
                      {preset.label} · +{preset.amountMl} ml
                    </span>
                  </Button>
                );
              })}
            </div>
          </div>

          <form
            onSubmit={e => {
              e.preventDefault();
              const val = Number.parseInt(customMl, 10) || 0;
              if (val > 0) {
                void handleAddWater(val);
                setCustomMl('');
              }
            }}
            className="grid grid-cols-[minmax(0,1fr)_auto] gap-2"
          >
            <Input
              aria-label="Quantità personalizzata in ml"
              type="number"
              inputMode="numeric"
              min="25"
              max="3000"
              step="25"
              placeholder="Quantità libera (es. 800 ml)"
              value={customMl}
              onChange={e => setCustomMl(e.target.value)}
              className="h-10 min-w-0"
            />
            <Button type="submit" size="sm" className="h-10 shrink-0 rounded-xl bg-emerald-600 px-3 text-xs text-white hover:bg-emerald-500" disabled={!userId}>
              <Plus className="mr-1 size-3.5" />
              Aggiungi
            </Button>
          </form>

          {isEditingPresets && (
            <form onSubmit={handleSavePresets} className="space-y-2.5 rounded-xl border border-primary/30 bg-muted/20 p-3">
              <p className="text-xs font-semibold text-primary">Modifica dimensioni predefinite (es. 750 → 800 ml)</p>
              <div className="space-y-2">
                {presetDrafts.map((item, idx) => (
                  <div key={item.id} className="grid grid-cols-[minmax(0,1fr)_5.5rem] items-center gap-2">
                    <Input
                      ref={idx === 0 ? firstPresetInputRef : undefined}
                      aria-label={`Nome dose ${idx + 1}`}
                      value={item.label}
                      onChange={e =>
                        setPresetDrafts(curr =>
                          curr.map(d => (d.id === item.id ? { ...d, label: e.target.value } : d)),
                        )
                      }
                      className="h-9 min-w-0 text-xs"
                    />
                    <Input
                      aria-label={`Quantità in ml per ${item.label}`}
                      type="number"
                      inputMode="numeric"
                      min="25"
                      max="3000"
                      step="25"
                      value={item.amountMl}
                      onChange={e =>
                        setPresetDrafts(curr =>
                          curr.map(d =>
                            d.id === item.id ? { ...d, amountMl: Number.parseInt(e.target.value, 10) || 0 } : d,
                          ),
                        )
                      }
                      className="h-9 text-center font-mono text-xs"
                    />
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" size="sm" className="h-9 flex-1 text-xs" onClick={() => setIsEditingPresets(false)}>
                  Annulla
                </Button>
                <Button type="submit" size="sm" className="h-9 flex-1 bg-emerald-600 text-xs text-white hover:bg-emerald-500">
                  <Check className="mr-1 size-3.5" />
                  Salva dosi
                </Button>
              </div>
            </form>
          )}

          <div className="space-y-2 border-t pt-4">
            <p className="text-center text-xs font-medium text-muted-foreground">Obiettivo giornaliero</p>
            <div className="grid grid-cols-4 gap-2">
              {WATER_GOALS.map(goal => (
                <Button
                  key={goal}
                  type="button"
                  size="sm"
                  variant={dailyGoal === goal ? 'secondary' : 'outline'}
                  className="h-9 rounded-xl font-mono text-xs"
                  disabled={!userId}
                  onClick={() => void handleGoalChange(goal)}
                >
                  {(goal / 1000).toFixed(1)}L
                </Button>
              ))}
            </div>
          </div>
        </CardContent>

        {(lastLog || totalToday > 0) && (
          <>
            <div className="px-6">
              <Separator />
            </div>
            <CardFooter className="flex flex-col gap-2.5 pt-4">
              {isEditingLast && lastLog && (
                <form onSubmit={e => void handleSaveLastEdit(e)} className="flex w-full items-center gap-2">
                  <Input
                    ref={editLastInputRef}
                    aria-label="Nuova quantità ultima bevuta in ml"
                    type="number"
                    inputMode="numeric"
                    min="10"
                    max="3000"
                    value={lastMlDraft}
                    onChange={e => setLastMlDraft(e.target.value)}
                    className="h-9 min-w-0 flex-1 text-center font-mono"
                  />
                  <Button type="submit" size="sm" className="h-9 shrink-0 rounded-xl bg-emerald-600 px-3 text-xs text-white hover:bg-emerald-500">
                    <Check className="mr-1 size-3.5" />
                    Salva
                  </Button>
                  <Button type="button" variant="ghost" size="icon" className="size-9 shrink-0" onClick={() => setIsEditingLast(false)}>
                    <X className="size-4" />
                  </Button>
                </form>
              )}

              <div className="flex w-full flex-wrap items-center justify-center gap-2">
                {lastLog && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 rounded-xl border-amber-500/35 bg-amber-500/10 text-xs text-amber-400 hover:bg-amber-500/20 hover:text-amber-300"
                      onClick={() => void handleRemoveLast()}
                    >
                      <Undo2 className="mr-1.5 size-3.5" />
                      Togli ultima (-{lastLog.amount_ml} ml)
                    </Button>
                    {lastLog.id && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 rounded-xl border-sky-500/35 bg-sky-500/10 text-xs text-sky-400 hover:bg-sky-500/20"
                        onClick={openEditLast}
                      >
                        <Pencil className="mr-1.5 size-3.5" />
                        Modifica ultima
                      </Button>
                    )}
                  </>
                )}

                {totalToday > 0 && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 rounded-xl text-xs text-red-400 hover:bg-red-500/15 hover:text-red-300"
                      >
                        <RotateCcw className="mr-1.5 size-3.5" />
                        Resetta tutto
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
                )}
              </div>
            </CardFooter>
          </>
        )}
      </Card>

      {chartData.some(d => d.ml > 0) && <WaterLogChart />}
    </div>
  );
}
