'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { RecentDaysStrip } from "@/components/ui/RecentDaysStrip";
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
import { WaterHistoryReportCard } from "@/features/reports/WaterHistoryReportCard";
import { validateSafeUserText } from "@/lib/authSecurity";
import { offlineDatabase } from "@/features/offline/database";
import {
  clearPendingTodayWaterOutbox,
  queueAndSync,
  removeOutboxItem,
  updatePendingWaterAmount,
} from "@/features/offline/useOfflineSync";
import {
  appendCachedWaterLog,
  buildDayBoundsIso,
  buildHourlyWaterChartData,
  buildTimestampForDateKey,
  clearCachedWaterLogs,
  getTodayWaterDateKey,
  readCachedWaterByDateMap,
  readCachedWaterState,
  removeLastCachedWaterLog,
  saveCachedWaterState,
  sumWaterLogs,
  updateLastCachedWaterLog,
  type CachedWaterLog,
} from "@/features/nutrition/waterOfflineCache";
import {
  formatShortItalianDate,
  getLastNDaysKeys,
} from "@/features/routine/habitStore";
import {
  readWaterPresets,
  saveWaterPresets,
  type WaterPresetItem,
} from "@/features/nutrition/waterPresets";
import {
  readCachedProfileSettings,
  saveCachedProfileSettings,
} from "@/features/routine/profileGoalsStore";
import { focusAndScrollToElement } from "@/lib/focusScroll";

interface ChartData {
  time: string;
  ml: number;
}

type TodayWaterLog = CachedWaterLog;

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
  const todayKey = getTodayWaterDateKey();
  const recent7Days = useMemo(() => getLastNDaysKeys(7), [todayKey]);
  const [selectedDateKey, setSelectedDateKey] = useState<string>(() => getTodayWaterDateKey());
  const isSelectedToday = selectedDateKey === todayKey;

  const [totalForDay, setTotalForDay] = useState(() => sumWaterLogs(readCachedWaterState(todayKey).logs));
  const [dailyGoal, setDailyGoal] = useState(
    () => readCachedWaterState(todayKey).dailyGoal ?? readCachedProfileSettings().water_goal_ml,
  );
  const [waterByDate, setWaterByDate] = useState<Record<string, CachedWaterLog[]>>(
    () => readCachedWaterByDateMap(),
  );
  const [reportTick, setReportTick] = useState(0);
  const [, setChartData] = useState<ChartData[]>(() =>
    buildHourlyWaterChartData(readCachedWaterState(todayKey).logs),
  );
  const [lastLog, setLastLog] = useState<TodayWaterLog | null>(
    () => readCachedWaterState(todayKey).logs[0] ?? null,
  );
  const [presets, setPresets] = useState<WaterPresetItem[]>(() => readWaterPresets());

  const [isEditingPresets, setIsEditingPresets] = useState(false);
  const [presetDrafts, setPresetDrafts] = useState<WaterPresetItem[]>(() => readWaterPresets());
  const [customMl, setCustomMl] = useState('');
  const [isEditingLast, setIsEditingLast] = useState(false);
  const [lastMlDraft, setLastMlDraft] = useState('');

  const firstPresetInputRef = useRef<HTMLInputElement>(null);
  const editLastInputRef = useRef<HTMLInputElement>(null);
  const selectedDateRef = useRef(selectedDateKey);
  selectedDateRef.current = selectedDateKey;

  const applyCachedWaterToState = useCallback((logs: TodayWaterLog[], nextGoal?: number) => {
    setTotalForDay(sumWaterLogs(logs));
    setLastLog(logs[0] ?? null);
    setChartData(buildHourlyWaterChartData(logs));
    setWaterByDate(readCachedWaterByDateMap());
    if (typeof nextGoal === 'number' && nextGoal > 0) {
      setDailyGoal(nextGoal);
    }
  }, []);

  const fetchData = useCallback(async (currentUserId: string, targetDateKey: string = selectedDateRef.current) => {
    const cached = readCachedWaterState(targetDateKey);
    if (selectedDateRef.current === targetDateKey) {
      applyCachedWaterToState(
        cached.logs,
        cached.dailyGoal ?? readCachedProfileSettings().water_goal_ml,
      );
    }

    if (!navigator.onLine) return;

    const { startIso, endIso } = buildDayBoundsIso(targetDateKey);
    const [profileResponse, logsResponse, pendingOutbox] = await Promise.all([
      supabase.from('profiles').select('water_goal_ml').eq('id', currentUserId).single(),
      supabase
        .from('water_logs')
        .select('id, amount_ml, created_at')
        .eq('user_id', currentUserId)
        .gte('created_at', startIso)
        .lt('created_at', endIso)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false }),
      offlineDatabase.outbox.where('userId').equals(currentUserId).toArray(),
    ]);

    const hasPendingGoal = pendingOutbox.some(
      item => item.table === 'profiles' || item.table === 'profiles_water_goal',
    );
    const hasPendingWaterMutations = pendingOutbox.some(item =>
      item.table === 'water_logs' ||
      item.table === 'water_logs_update' ||
      item.table === 'water_logs_delete' ||
      item.table === 'water_logs_reset_day',
    );

    const { data: profile } = profileResponse;
    let resolvedGoal = cached.dailyGoal;
    if (!hasPendingGoal && profile?.water_goal_ml) {
      resolvedGoal = profile.water_goal_ml;
      setDailyGoal(profile.water_goal_ml);
      saveCachedProfileSettings({ water_goal_ml: profile.water_goal_ml });
    }

    const { data: logs } = logsResponse;
    if (!hasPendingWaterMutations && logs) {
      const normalized = logs as TodayWaterLog[];
      saveCachedWaterState(normalized, resolvedGoal, targetDateKey);
      if (selectedDateRef.current === targetDateKey) {
        applyCachedWaterToState(normalized);
      } else {
        setWaterByDate(readCachedWaterByDateMap());
      }
    }
  }, [supabase, applyCachedWaterToState]);

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
        await fetchData(user.id, selectedDateRef.current);
      } catch (error) {
        console.error('Errore caricamento acqua:', error);
      }
    };
    void initializePage();
    const handleSyncRefresh = () => {
      const targetKey = selectedDateRef.current;
      const cached = readCachedWaterState(targetKey);
      applyCachedWaterToState(
        cached.logs,
        cached.dailyGoal ?? readCachedProfileSettings().water_goal_ml,
      );
    };
    window.addEventListener('nutriflow:data-updated', handleSyncRefresh);
    return () => window.removeEventListener('nutriflow:data-updated', handleSyncRefresh);
  }, [router, supabase, fetchData, applyCachedWaterToState]);

  const handleSelectDate = (dateKey: string) => {
    setSelectedDateKey(dateKey);
    selectedDateRef.current = dateKey;
    setIsEditingLast(false);
    const cached = readCachedWaterState(dateKey);
    applyCachedWaterToState(cached.logs, cached.dailyGoal);
    if (userId) {
      void fetchData(userId, dateKey);
    }
  };

  const handleAddWater = async (amount: number) => {
    if (!userId || amount <= 0) return;
    const targetDateKey = selectedDateKey;
    const entryIso = buildTimestampForDateKey(targetDateKey);
    const outboxId = `water_logs:${crypto.randomUUID()}`;

    const queueOfflineAdd = async (message: string) => {
      await queueAndSync({
        id: outboxId,
        userId,
        table: 'water_logs',
        payload: {
          user_id: userId,
          amount_ml: amount,
          created_at: entryIso,
        },
      });
      const updated = appendCachedWaterLog({ localId: outboxId, amount_ml: amount, created_at: entryIso }, undefined, targetDateKey);
      if (selectedDateRef.current === targetDateKey) {
        applyCachedWaterToState(updated.logs);
      }
      setReportTick(t => t + 1);
      toast.success(message);
      window.dispatchEvent(new Event('nutriflow:data-updated'));
    };

    if (!navigator.onLine) {
      try {
        await queueOfflineAdd(`+${amount} ml salvati offline`);
      } catch {
        toast.error("Impossibile salvare l'acqua offline.");
      }
      return;
    }

    const optimistic = appendCachedWaterLog({ localId: outboxId, amount_ml: amount, created_at: entryIso }, undefined, targetDateKey);
    applyCachedWaterToState(optimistic.logs);

    try {
      const insertPayload =
        targetDateKey === getTodayWaterDateKey()
          ? { user_id: userId, amount_ml: amount }
          : { user_id: userId, amount_ml: amount, created_at: entryIso };
      const { data, error } = await supabase
        .from('water_logs')
        .insert([insertPayload])
        .select('id, amount_ml, created_at')
        .single();

      if (error || !data) {
        if (!navigator.onLine) {
          await queueOfflineAdd(`+${amount} ml salvati offline`);
          return;
        }
        throw error ?? new Error('Risposta vuota');
      }

      const reconciled = saveCachedWaterState(
        optimistic.logs.map(item => (item.localId === outboxId ? (data as TodayWaterLog) : item)),
        undefined,
        targetDateKey,
      );
      if (selectedDateRef.current === targetDateKey) {
        applyCachedWaterToState(reconciled.logs);
      }
      setReportTick(t => t + 1);
      toast.success(
        targetDateKey === todayKey
          ? `+${amount} ml aggiunti`
          : `+${amount} ml aggiunti (${formatShortItalianDate(targetDateKey)})`,
      );
      window.dispatchEvent(new Event('nutriflow:data-updated'));
      void fetchData(userId, targetDateKey);
    } catch {
      try {
        await queueOfflineAdd(`+${amount} ml salvati offline (in coda sync)`);
      } catch {
        toast.error("Errore nel registrare l'acqua.");
      }
    }
  };

  const handleRemoveLast = async () => {
    if (!userId || !lastLog) return;
    const targetDateKey = selectedDateKey;
    const { removed, state } = removeLastCachedWaterLog(targetDateKey);
    if (!removed) return;
    applyCachedWaterToState(state.logs);
    setReportTick(t => t + 1);

    const queueDelete = async () => {
      if (removed.localId) {
        await removeOutboxItem(removed.localId);
        return;
      }
      if (removed.id) {
        await queueAndSync({
          id: `water_logs_delete:${removed.id}`,
          userId,
          table: 'water_logs_delete',
          payload: { id: removed.id },
        });
      }
    };

    if (removed.localId || !navigator.onLine) {
      await queueDelete();
      toast.info(`Rimossi -${removed.amount_ml} ml (offline)`);
      window.dispatchEvent(new Event('nutriflow:data-updated'));
      return;
    }

    if (removed.id) {
      const { error } = await supabase
        .from('water_logs')
        .delete()
        .eq('id', removed.id)
        .eq('user_id', userId);
      if (error) {
        await queueDelete();
        toast.info(`Rimossi -${removed.amount_ml} ml (in coda sync)`);
        window.dispatchEvent(new Event('nutriflow:data-updated'));
        return;
      }
    }

    toast.info(`Rimossi -${removed.amount_ml} ml`);
    window.dispatchEvent(new Event('nutriflow:data-updated'));
    void fetchData(userId, targetDateKey);
  };

  const openEditLast = () => {
    if (!lastLog) return;
    setLastMlDraft(String(lastLog.amount_ml));
    setIsEditingLast(true);
    setTimeout(() => focusAndScrollToElement(editLastInputRef.current), 20);
  };

  const handleSaveLastEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !lastLog || (!lastLog.id && !lastLog.localId)) return;
    const targetDateKey = selectedDateKey;
    const nextMl = Math.max(10, Math.min(3000, Number.parseInt(lastMlDraft, 10) || lastLog.amount_ml));
    const { updated, previous, state } = updateLastCachedWaterLog(nextMl, targetDateKey);
    if (!updated || !previous) return;
    applyCachedWaterToState(state.logs);
    setReportTick(t => t + 1);
    setIsEditingLast(false);

    if (updated.localId) {
      await updatePendingWaterAmount(updated.localId, nextMl);
      toast.success(`Ultima registrazione aggiornata a ${nextMl} ml`);
      window.dispatchEvent(new Event('nutriflow:data-updated'));
      return;
    }

    const queueRemoteUpdate = async () => {
      if (!previous.id) return;
      await queueAndSync({
        id: `water_logs_update:${previous.id}`,
        userId,
        table: 'water_logs_update',
        payload: {
          id: previous.id,
          user_id: userId,
          amount_ml: nextMl,
          created_at: previous.created_at,
        },
      });
    };

    if (!navigator.onLine) {
      await queueRemoteUpdate();
      toast.success(`Ultima registrazione aggiornata offline a ${nextMl} ml`);
      window.dispatchEvent(new Event('nutriflow:data-updated'));
      return;
    }

    const targetId = previous.id!;
    const { data: updatedRows, error: updateError } = await supabase
      .from('water_logs')
      .update({ amount_ml: nextMl })
      .eq('id', targetId)
      .eq('user_id', userId)
      .select('id, amount_ml, created_at');

    if (updateError || !updatedRows || updatedRows.length === 0) {
      const { error: deleteErr } = await supabase
        .from('water_logs')
        .delete()
        .eq('id', targetId)
        .eq('user_id', userId);
      const { data: insertedRow, error: insertErr } = await supabase
        .from('water_logs')
        .insert([{ user_id: userId, amount_ml: nextMl, created_at: previous.created_at }])
        .select('id, amount_ml, created_at')
        .single();

      if (deleteErr || insertErr || !insertedRow) {
        await queueRemoteUpdate();
        toast.success(`Ultima registrazione salvata in coda (${nextMl} ml)`);
        window.dispatchEvent(new Event('nutriflow:data-updated'));
        return;
      }
      const nextState = saveCachedWaterState(
        [insertedRow as TodayWaterLog, ...state.logs.slice(1)],
        undefined,
        targetDateKey,
      );
      if (selectedDateRef.current === targetDateKey) {
        applyCachedWaterToState(nextState.logs);
      }
    } else {
      const nextState = saveCachedWaterState(
        [updatedRows[0] as TodayWaterLog, ...state.logs.slice(1)],
        undefined,
        targetDateKey,
      );
      if (selectedDateRef.current === targetDateKey) {
        applyCachedWaterToState(nextState.logs);
      }
    }

    toast.success(`Ultima registrazione aggiornata a ${nextMl} ml`);
    window.dispatchEvent(new Event('nutriflow:data-updated'));
    void fetchData(userId, targetDateKey);
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
    for (const item of presetDrafts) {
      const check = validateSafeUserText(item.label, 'Nome dose', 30);
      if (!check.ok) {
        toast.error(check.error);
        return;
      }
    }
    const cleaned = presetDrafts.map(item => ({
      ...item,
      label: validateSafeUserText(item.label, 'Nome dose', 30).value || 'Dose',
      amountMl: Math.max(25, Math.min(3000, Math.round(Number(item.amountMl) || 100))),
    }));
    setPresets(cleaned);
    saveWaterPresets(cleaned);
    setIsEditingPresets(false);
    toast.success('Dosi personalizzate salvate.');
  };

  const handleGoalChange = async (goalMl: number) => {
    if (!userId || goalMl === dailyGoal) return;
    setDailyGoal(goalMl);
    saveCachedProfileSettings({ water_goal_ml: goalMl });
    saveCachedWaterState(readCachedWaterState().logs, goalMl);

    const queueGoal = async () => {
      await queueAndSync({
        id: `profiles_water_goal:${userId}`,
        userId,
        table: 'profiles_water_goal',
        payload: {
          water_goal_ml: goalMl,
          updated_at: new Date().toISOString(),
        },
      });
    };

    if (!navigator.onLine) {
      await queueGoal();
      toast.success(`Obiettivo acqua salvato offline: ${(goalMl / 1000).toFixed(1)} L`);
      window.dispatchEvent(new Event('nutriflow:data-updated'));
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({ water_goal_ml: goalMl })
      .eq('id', userId);
    if (error) {
      await queueGoal();
      toast.success(`Obiettivo ${(goalMl / 1000).toFixed(1)} L salvato in coda sync`);
      window.dispatchEvent(new Event('nutriflow:data-updated'));
      return;
    }
    toast.success(`Obiettivo acqua impostato a ${(goalMl / 1000).toFixed(1)} L`);
    window.dispatchEvent(new Event('nutriflow:data-updated'));
  };

  const handleResetWater = async () => {
    if (!userId) return;
    const targetDateKey = selectedDateKey;
    const { startIso, endIso } = buildDayBoundsIso(targetDateKey);

    const cleared = clearCachedWaterLogs(targetDateKey);
    applyCachedWaterToState(cleared.logs);
    setReportTick(t => t + 1);
    setIsEditingLast(false);
    await clearPendingTodayWaterOutbox(userId, startIso, endIso);

    const queueReset = async () => {
      await queueAndSync({
        id: `water_logs_reset_day:${targetDateKey}`,
        userId,
        table: 'water_logs_reset_day',
        payload: { start_iso: startIso, end_iso: endIso },
      });
    };

    if (!navigator.onLine) {
      await queueReset();
      toast.success("Log resettati offline (verranno sincronizzati).");
      window.dispatchEvent(new Event('nutriflow:data-updated'));
      return;
    }

    const { error } = await supabase
      .from('water_logs')
      .delete()
      .eq('user_id', userId)
      .gte('created_at', startIso)
      .lt('created_at', endIso);

    if (error) {
      await queueReset();
      toast.success("Log resettati in locale (in coda sync).");
      window.dispatchEvent(new Event('nutriflow:data-updated'));
      return;
    }

    toast.success("Log resettati con successo.");
    window.dispatchEvent(new Event('nutriflow:data-updated'));
    await fetchData(userId, targetDateKey);
  };

  const progressValue = dailyGoal > 0 ? Math.min(100, (totalForDay / dailyGoal) * 100) : 0;
  const remainingMl = Math.max(0, dailyGoal - totalForDay);

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
        <CardHeader className="space-y-3 pb-3 text-center">
          <div>
            <CardTitle className="text-base sm:text-lg">
              {isSelectedToday
                ? 'Progresso giornaliero'
                : `Acqua · ${formatShortItalianDate(selectedDateKey)}`}
            </CardTitle>
            <CardDescription>
              {remainingMl === 0
                ? 'Obiettivo giornaliero raggiunto!'
                : `Mancano ${remainingMl.toLocaleString('it-IT')} ml · ${Math.round(progressValue)}%`}
            </CardDescription>
          </div>
          <RecentDaysStrip
            days={recent7Days}
            selectedDateKey={selectedDateKey}
            onSelect={handleSelectDate}
            renderBadge={dateKey => {
              const dayTotal = sumWaterLogs(waterByDate[dateKey] ?? []);
              if (dayTotal > 0) return `${(dayTotal / 1000).toFixed(1)}L`;
              return formatShortItalianDate(dateKey);
            }}
            isDayComplete={dateKey => sumWaterLogs(waterByDate[dateKey] ?? []) >= dailyGoal}
            accent="sky"
          />
          {!isSelectedToday && (
            <div className="flex items-center justify-between gap-2 rounded-xl border border-sky-500/35 bg-sky-500/10 px-3 py-1.5 text-left text-[11px] text-sky-300">
              <span>
                Modifica idratazione di <strong>{formatShortItalianDate(selectedDateKey)}</strong>
              </span>
              <button
                type="button"
                onClick={() => handleSelectDate(todayKey)}
                className="shrink-0 font-semibold underline underline-offset-2 hover:text-sky-200"
              >
                Torna a oggi
              </button>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-center font-mono text-3xl font-bold text-primary sm:text-4xl">
              {totalForDay.toLocaleString('it-IT')}
              <span className="text-base font-medium text-muted-foreground sm:text-xl">
                {' '}/ {dailyGoal.toLocaleString('it-IT')} ml
              </span>
            </p>
            <Progress value={progressValue} className="h-2.5 w-full" />
          </div>

          <div className="space-y-2">
            <p className="text-center text-xs font-medium text-muted-foreground">Aggiungi in 1 tap</p>
            <div data-tour="water-controls" className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
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

        {(lastLog || totalForDay > 0) && (
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
                    {(lastLog.id || lastLog.localId) && (
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

                {totalForDay > 0 && (
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
                          {isSelectedToday
                            ? 'Questa azione cancellerà tutti i log odierni.'
                            : `Questa azione cancellerà tutti i log del ${formatShortItalianDate(selectedDateKey)}.`}
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

      <WaterHistoryReportCard
        userId={userId}
        dailyGoal={dailyGoal}
        refreshSignal={reportTick}
      />
    </div>
  );
}
