'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Check, Radar as RadarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import Navbar from '@/components/shared/Navbar';
import { useTripStore } from '@/store/useTripStore';
import {
  tripPreferencesSchema,
  step0Schema,
  step1Schema,
  step2Schema,
  step3Schema,
  type TripFormData,
} from '@/lib/validations';
import type { TripPace, TripType, TransportMode, ClimatePref, AgentStatus, Trip } from '@/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ─── Constants ─────────────────────────────────────────────────────────────────

const steps = [
  { id: 'idea', label: 'DESTINATION' },
  { id: 'dates', label: 'DATES' },
  { id: 'budget', label: 'BUDGET' },
  { id: 'preferences', label: 'PROFILE' },
  { id: 'companions', label: 'CREW' },
  { id: 'review', label: 'REVIEW' },
] as const;

const tripTypes: { value: TripType; label: string; description: string }[] = [
  { value: 'relaxed', label: 'RELAXED', description: 'Slow pace, leisure focused' },
  { value: 'adventurous', label: 'ADVENTUROUS', description: 'Thrills and exploration' },
  { value: 'romantic', label: 'ROMANTIC', description: 'Perfect for couples' },
  { value: 'family', label: 'FAMILY', description: 'Fun for all ages' },
  { value: 'solo', label: 'SOLO', description: 'Me time adventure' },
  { value: 'luxury', label: 'LUXURY', description: 'Premium experience' },
  { value: 'budget', label: 'BUDGET', description: 'Wallet friendly' },
  { value: 'cultural', label: 'CULTURAL', description: 'History and heritage' },
];

const paces: { value: TripPace; label: string; description: string }[] = [
  { value: 'relaxed', label: 'RELAXED', description: 'Plenty of free time' },
  { value: 'balanced', label: 'BALANCED', description: 'Mix of planned and free' },
  { value: 'packed', label: 'PACKED', description: 'Maximize every moment' },
];

const foodPrefs = ['Vegetarian', 'Vegan', 'Halal', 'Seafood', 'Local Cuisine', 'Fine Dining', 'Street Food', 'Kosher'];

const climatePrefs: { value: ClimatePref; label: string }[] = [
  { value: 'tropical', label: 'BEACH & SUN' },
  { value: 'cold', label: 'MOUNTAINS & SNOW' },
  { value: 'temperate', label: 'MILD WEATHER' },
  { value: 'any', label: 'NO PREFERENCE' },
];

const transportPrefs: { value: TransportMode; label: string }[] = [
  { value: 'flight', label: 'FLIGHT' },
  { value: 'train', label: 'TRAIN' },
  { value: 'car', label: 'ROAD TRIP' },
  { value: 'mixed', label: 'MIXED' },
];

const AGENT_DEFINITIONS = [
  { code: 'AGT-01', id: 'intent', name: 'INTENT', desc: 'Parsing your travel intentions' },
  { code: 'AGT-02', id: 'destination', name: 'GROUNDING', desc: 'Locking the destination grid' },
  { code: 'AGT-03', id: 'budget', name: 'BUDGET', desc: 'Allocating fuel' },
  { code: 'AGT-04', id: 'route', name: 'ROUTE', desc: 'Plotting the corridor' },
  { code: 'AGT-05', id: 'weather', name: 'WEATHER', desc: 'Reading the sky' },
  { code: 'AGT-06', id: 'activities', name: 'ACTIVITIES', desc: 'Curating the dayplan' },
  { code: 'AGT-07', id: 'planner', name: 'PLANNER', desc: 'Building the timeline' },
  { code: 'AGT-08', id: 'supervisor', name: 'SUPERVISOR', desc: 'Clearing the plan' },
];

const stepFields: (keyof TripFormData)[][] = [
  ['destinationIdea'],
  ['startDate', 'endDate', 'duration'],
  ['budget', 'travelers'],
  ['tripType', 'pace', 'foodPreferences', 'transportPreference', 'climatePreference'],
  [],
  [],
];

const stepSchemas = [step0Schema, step1Schema, step2Schema, step3Schema, null, null];

// ─── Shared bits ───────────────────────────────────────────────────────────────

interface AgentState {
  status: AgentStatus;
  progress: number;
  output: string | null;
}

interface LogLine {
  t: string;
  text: string;
  kind: 'info' | 'ok' | 'warn';
}

const statusColor: Record<AgentStatus, string> = {
  idle: '#6E7F74',
  analyzing: '#FFB454',
  generating: '#FFB454',
  completed: '#7CFC9A',
  warning: '#FFB454',
  error: '#FF6B5E',
};

function FieldError({ field, errors }: { field: keyof TripFormData; errors: Record<string, { message?: string }> }) {
  const err = errors[field];
  if (!err?.message) return null;
  return (
    <motion.p
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-1.5 text-xs text-[#FF6B5E] mt-1.5 font-mono"
      role="alert"
    >
      <AlertCircle className="w-3 h-3 shrink-0" />
      {String(err.message)}
    </motion.p>
  );
}

function ThrottleSlider({ min, max, step, value, onChange }: {
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseInt(e.target.value))}
      className="w-full h-1 bg-white/5 appearance-none cursor-pointer rounded-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-[#7CFC9A] [&::-webkit-slider-thumb]:shadow-glow [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:bg-[#7CFC9A] [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:rounded-none"
    />
  );
}

function OptionChip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'px-3 py-2 border font-mono text-xs tracking-[0.1em] transition-all text-left',
        selected
          ? 'border-[#7CFC9A] bg-[#7CFC9A]/10 text-[#7CFC9A] shadow-glow'
          : 'border-[rgba(124,252,154,0.14)] text-[#82958A] hover:text-[#D7E4DC] hover:border-[rgba(124,252,154,0.35)]'
      )}
    >
      {children}
    </button>
  );
}

// ─── Mission Control overlay ───────────────────────────────────────────────────

function MissionControl({ agentStates, statusMsg, logLines, planLocked, planTitle }: {
  agentStates: Record<string, AgentState>;
  statusMsg: string;
  logLines: LogLine[];
  planLocked: boolean;
  planTitle: string;
}) {
  const [elapsed, setElapsed] = useState(0);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const interval = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logLines]);

  const totalAgents = AGENT_DEFINITIONS.length;
  const completedAgents = AGENT_DEFINITIONS.filter((a) => agentStates[a.id]?.status === 'completed').length;
  const pct = Math.round((completedAgents / totalAgents) * 100);
  const sweepDuration = Math.max(0.6, 4 - (pct / 100) * 3.2);
  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');

  return (
    <div className="fixed inset-0 z-[100] bg-[#07090A] overflow-hidden">
      <div className="scanline" />

      {/* Header */}
      <div className="flex items-center justify-between px-6 h-16 border-b border-[rgba(124,252,154,0.14)] font-mono">
        <div className="flex items-center gap-3">
          <RadarIcon className="w-4 h-4 text-[#7CFC9A]" />
          <span className="text-sm tracking-[0.25em] text-[#D7E4DC]">MISSION CONTROL</span>
        </div>
        <div className="flex items-center gap-6 text-[10px] tracking-[0.2em] text-[#82958A]">
          <span>T+{mm}:{ss}</span>
          <span className="hidden sm:inline">{completedAgents}/{totalAgents} AGENTS COMPLETE</span>
          <span className="text-[#7CFC9A]">{pct}%</span>
        </div>
      </div>

      {/* Mobile: single scrollable column (roster, then log). lg+: the original
          two-panel fixed-height ops room. */}
      <div className="flex flex-col gap-6 p-4 sm:p-6 max-w-6xl mx-auto overflow-y-auto lg:grid lg:grid-cols-[1.1fr_1fr] lg:h-[calc(100vh-64px)] lg:overflow-visible">
        {/* Left: agent roster */}
        <div className="hud-corner p-5 lg:overflow-y-auto">
          <div className="text-[10px] tracking-[0.25em] text-[#82958A] mb-4 font-mono">AGENT ROSTER</div>
          <div className="space-y-3">
            {AGENT_DEFINITIONS.map((def) => {
              const state = agentStates[def.id] ?? { status: 'idle' as AgentStatus, progress: 0, output: null };
              const color = statusColor[state.status];
              const active = state.status === 'analyzing' || state.status === 'generating';
              return (
                <div key={def.id} className="flex items-center gap-3">
                  <span className="text-[11px] font-mono text-[#7CFC9A] w-14 shrink-0">{def.code}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-xs text-[#D7E4DC] tracking-[0.1em]">{def.name}</span>
                      <span className="font-mono text-[9px] tracking-[0.15em] uppercase" style={{ color }}>
                        {active && <span className="inline-block w-1.5 h-1.5 rounded-full bg-current agent-pulse mr-1.5 align-middle" />}
                        {state.status}
                      </span>
                    </div>
                    <div className="h-0.5 bg-white/5 overflow-hidden">
                      <motion.div
                        className="h-full"
                        style={{ background: state.status === 'completed' ? '#7CFC9A' : state.status === 'error' ? '#FF6B5E' : '#FFB454' }}
                        animate={{ width: `${state.progress}%` }}
                        transition={{ duration: 0.4, ease: 'easeOut' }}
                      />
                    </div>
                    {state.output && (
                      <div className="font-mono text-[10px] text-[#82958A] truncate mt-1">{state.output}</div>
                    )}
                  </div>
                  {state.status === 'completed' && <Check className="w-3 h-3 text-[#7CFC9A] shrink-0" />}
                </div>
              );
            })}
          </div>

          {/* Radar minimap */}
          <div className="mt-8 flex items-center gap-6">
            <div className="relative w-28 h-28 shrink-0">
              {[100, 66, 33].map((size) => (
                <div
                  key={size}
                  className="absolute rounded-full border border-[rgba(124,252,154,0.16)]"
                  style={{ width: `${size}%`, height: `${size}%`, top: `${(100 - size) / 2}%`, left: `${(100 - size) / 2}%` }}
                />
              ))}
              <div className="absolute top-0 bottom-0 left-1/2 w-px bg-[rgba(124,252,154,0.1)]" />
              <div className="absolute left-0 right-0 top-1/2 h-px bg-[rgba(124,252,154,0.1)]" />
              <div className="radar-sweep absolute inset-0 rounded-full" style={{ animationDuration: `${sweepDuration}s` }} />
            </div>
            <div className="font-mono">
              <div className="text-4xl font-bold text-[#7CFC9A] mb-1">{pct}%</div>
              <div className="text-[9px] tracking-[0.2em] text-[#82958A]">MISSION PROGRESS</div>
              <div className="text-[9px] tracking-[0.2em] text-[#82958A] mt-2">
                SWEEP {sweepDuration.toFixed(1)}s · DO NOT CLOSE
              </div>
            </div>
          </div>
        </div>

        {/* Right: log ticker */}
        <div className="hud-corner p-5 flex flex-col min-h-0 h-64 lg:h-auto">
          <div className="text-[10px] tracking-[0.25em] text-[#82958A] mb-4 font-mono">LIVE TELEMETRY</div>
          <div ref={logRef} className="flex-1 overflow-y-auto font-mono text-[11px] leading-relaxed pr-1 min-h-0">
            {statusMsg && (
              <div className="text-[#FFB454] mb-3 tracking-[0.1em]">▸ {statusMsg}</div>
            )}
            {logLines.map((line, i) => (
              <div key={i} className={cn('flex gap-3', line.kind === 'ok' && 'text-[#7CFC9A]', line.kind === 'warn' && 'text-[#FF6B5E]', line.kind === 'info' && 'text-[#82958A]')}>
                <span className="text-[#6E7F74] shrink-0">{line.t}</span>
                <span className="min-w-0">{line.text}</span>
              </div>
            ))}
            <div className="text-[#7CFC9A] animate-pulse">▌</div>
          </div>
        </div>
      </div>

      {/* PLAN LOCKED stamp */}
      <AnimatePresence>
        {planLocked && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[110] flex items-center justify-center bg-[#07090A]/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 1.8, opacity: 0, rotate: -4 }}
              animate={{ scale: 1, opacity: 1, rotate: -2 }}
              transition={{ type: 'spring', stiffness: 300, damping: 22 }}
              className="border-2 border-[#7CFC9A] px-10 py-6 text-center shadow-glow bg-[#0D1210]"
            >
              <div className="font-mono text-2xl sm:text-3xl tracking-[0.3em] text-[#7CFC9A] font-bold">PLAN LOCKED</div>
              {planTitle && (
                <div className="font-mono text-[10px] tracking-[0.2em] text-[#82958A] mt-3">{planTitle.toUpperCase()}</div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main page ──────────────────────────────────────────────────────────────────

export default function NewTripPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [maxStep, setMaxStep] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [planLocked, setPlanLocked] = useState(false);
  const [planTitle, setPlanTitle] = useState('');
  const [agentStates, setAgentStates] = useState<Record<string, AgentState>>({});
  const [statusMsg, setStatusMsg] = useState('');
  const [logLines, setLogLines] = useState<LogLine[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const { setCurrentTrip, setGenerating: setStoreGenerating, updateAgentStatus, setAgents, userPreferences, updateUserPreferences } = useTripStore();

  const savedDefaults = {
    destinationIdea: userPreferences.destinationIdea || '',
    startDate: userPreferences.startDate || '',
    endDate: userPreferences.endDate || '',
    duration: userPreferences.duration || 5,
    budget: userPreferences.budget || 50000,
    currency: userPreferences.currency || 'INR',
    travelers: userPreferences.travelers || 1,
    tripType: (userPreferences.tripType || 'relaxed') as TripType,
    pace: (userPreferences.pace || 'balanced') as TripPace,
    foodPreferences: userPreferences.foodPreferences || [],
    transportPreference: (userPreferences.transportPreference || 'mixed') as TransportMode,
    climatePreference: (userPreferences.climatePreference || 'any') as ClimatePref,
    accessibilityNeeds: userPreferences.accessibilityNeeds || [],
    companions: userPreferences.companions || [],
  };

  const { register, control, setValue, trigger, formState: { errors } } = useForm<TripFormData>({
    resolver: zodResolver(tripPreferencesSchema),
    defaultValues: savedDefaults,
    mode: 'onChange',
  });

  const watched = useWatch({ control });

  const pushLog = (text: string, kind: LogLine['kind'] = 'info') => {
    setLogLines((prev) => [...prev.slice(-60), { t: new Date().toISOString().slice(11, 19), text, kind }]);
  };

  const handleDateChange = (field: 'startDate' | 'endDate', value: string) => {
    setValue(field, value, { shouldValidate: true });
    const start = field === 'startDate' ? value : watched.startDate;
    const end = field === 'endDate' ? value : watched.endDate;
    if (start && end) {
      const s = new Date(start), e = new Date(end);
      if (!isNaN(s.getTime()) && !isNaN(e.getTime()) && e > s) {
        setValue('duration', Math.ceil((e.getTime() - s.getTime()) / 86400000), { shouldValidate: true });
      }
    }
  };

  const toggleFoodPref = (pref: string) => {
    const current = watched.foodPreferences || [];
    setValue('foodPreferences', current.includes(pref) ? current.filter((p) => p !== pref) : [...current, pref], { shouldValidate: true });
  };

  const validateStep = async (step: number): Promise<boolean> => {
    const fields = stepFields[step];
    if (!fields?.length) return true;
    const schema = stepSchemas[step];
    if (schema) {
      const result = schema.safeParse(watched);
      if (!result.success) { await trigger(fields as Parameters<typeof trigger>[0]); return false; }
      return true;
    }
    return await trigger(fields as Parameters<typeof trigger>[0]);
  };

  const goToStep = (step: number) => {
    if (step <= maxStep) setCurrentStep(step);
  };

  const handleNext = async () => {
    if (await validateStep(currentStep)) {
      const next = Math.min(steps.length - 1, currentStep + 1);
      setCurrentStep(next);
      setMaxStep((m) => Math.max(m, next));
    }
  };

  // ─── SSE Generation ──────────────────────────────────────────────────────────

  const handleGenerate = async () => {
    const valid = await trigger();
    if (!valid) { toast.error('Fix highlighted fields before dispatch'); return; }

    const prefs = {
      destinationIdea: watched.destinationIdea!,
      startDate: watched.startDate!,
      endDate: watched.endDate!,
      duration: watched.duration!,
      budget: watched.budget!,
      currency: watched.currency!,
      travelers: watched.travelers!,
      tripType: watched.tripType as TripType,
      pace: watched.pace as TripPace,
      foodPreferences: watched.foodPreferences || [],
      transportPreference: watched.transportPreference as TransportMode,
      climatePreference: watched.climatePreference as ClimatePref,
      accessibilityNeeds: watched.accessibilityNeeds || [],
      companions: (watched.companions || []).map((c) => ({
        id: c.id || Math.random().toString(36).substring(2, 9),
        name: c.name || 'Companion',
        preferences: (c.preferences || {}) as Record<string, unknown>,
        votes: Object.fromEntries(Object.entries(c.votes || {}).map(([k, v]) => [k, String(v)])),
      })),
    };

    // Persist to local memory (prefills the next filing)
    updateUserPreferences(prefs);

    setGenerating(true);
    setStoreGenerating(true);
    setAgentStates({});
    setPlanLocked(false);
    setPlanTitle('');
    setStatusMsg('Your AI ops team is assembling…');
    setLogLines([]);

    const abort = new AbortController();
    abortRef.current = abort;

    try {
      const response = await fetch('/api/agents/orchestrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
        body: JSON.stringify({ preferences: prefs }),
        signal: abort.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error('Server error — could not start the mission');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split('\n\n');
        buffer = chunks.pop() ?? '';

        for (const chunk of chunks) {
          if (!chunk.trim()) continue;
          const lines = chunk.split('\n');
          let eventType = 'message';
          let dataLine = '';
          for (const line of lines) {
            if (line.startsWith('event: ')) eventType = line.slice(7).trim();
            if (line.startsWith('data: ')) dataLine = line.slice(6);
          }
          if (!dataLine) continue;

          try {
            const payload = JSON.parse(dataLine);

            if (eventType === 'agent') {
              const { agentId, status, progress, output } = payload as { agentId: string; status: AgentStatus; progress: number; output: string | null };
              setAgentStates((prev) => ({ ...prev, [agentId]: { status, progress, output } }));
              updateAgentStatus(agentId, status, progress, output ?? undefined);
              const def = AGENT_DEFINITIONS.find((d) => d.id === agentId);
              const label = def ? `${def.code} ${def.name}` : agentId.toUpperCase();
              if (status === 'completed') pushLog(`${label} COMPLETE — ${output ?? 'done'}`, 'ok');
              else if (status === 'error') pushLog(`${label} ERROR`, 'warn');
              else if (output) pushLog(`${label} ACTIVE — ${output}`);
            }

            if (eventType === 'status') {
              setStatusMsg(payload.message ?? '');
              if (payload.message) pushLog(`[OPS] ${payload.message}`);
            }

            if (eventType === 'trip') {
              const trip = payload.trip as Trip;
              setCurrentTrip(trip);
              useTripStore.getState().addSavedTrip(trip);
              if (trip.agents?.length) setAgents(trip.agents);
              setPlanTitle(trip.destinationSummary || trip.title);
              pushLog(`PLAN LOCKED — ${trip.destinationSummary || trip.title}`, 'ok');
              setPlanLocked(true);
              setTimeout(() => router.push(`/trip/${trip.id}`), 1200);
              return;
            }

            if (eventType === 'error') {
              throw new Error(payload.message ?? 'Generation failed');
            }
          } catch (parseErr) {
            if (parseErr instanceof SyntaxError) continue; // partial chunk
            throw parseErr;
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        toast.error(err instanceof Error ? err.message : 'Mission failed. Please retry.');
        pushLog('MISSION ABORTED — see error', 'warn');
        setGenerating(false);
        setStoreGenerating(false);
        return;
      }
    }
  };

  // ─── Step renderers ───────────────────────────────────────────────────────────

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <motion.div key="step0" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <div>
              <div className="font-mono text-[10px] tracking-[0.25em] text-[#82958A] mb-2">SECTION 01</div>
              <h2 className="text-2xl font-bold text-[#D7E4DC] tracking-tight mb-1">Where are we flying?</h2>
              <p className="text-sm text-[#82958A]">Destination, vibe, or a rough idea — the intent agent handles ambiguity.</p>
            </div>
            <Textarea
              {...register('destinationIdea')}
              placeholder="e.g., Plan a 5-day budget trip to Kerala for 2 friends, mostly beaches, low crowd, vegetarian food..."
              className={cn(
                'min-h-[120px] bg-[#0D1210] border rounded-none font-mono text-sm text-[#D7E4DC] placeholder:text-[#6E7F74] resize-none focus-visible:ring-[#7CFC9A]/30',
                errors.destinationIdea ? 'border-[#FF6B5E]/60' : 'border-[rgba(124,252,154,0.14)] focus:border-[#7CFC9A]'
              )}
            />
            <FieldError field="destinationIdea" errors={errors as Record<string, { message?: string }>} />
            <div className="flex flex-wrap gap-2">
              {[
                { text: 'Beach vacation in Goa' },
                { text: 'Romantic trip to Udaipur' },
                { text: 'Adventure in Manali' },
                { text: 'Cultural tour of Rajasthan' },
              ].map((s) => (
                <button key={s.text} type="button" onClick={() => setValue('destinationIdea', s.text, { shouldValidate: true })}
                  className="px-3 py-1.5 border border-[rgba(124,252,154,0.14)] font-mono text-[11px] text-[#82958A] hover:text-[#7CFC9A] hover:border-[rgba(124,252,154,0.35)] transition-all">
                  {s.text}
                </button>
              ))}
            </div>
          </motion.div>
        );

      case 1:
        return (
          <motion.div key="step1" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
            <div>
              <div className="font-mono text-[10px] tracking-[0.25em] text-[#82958A] mb-2">SECTION 02</div>
              <h2 className="text-2xl font-bold text-[#D7E4DC] tracking-tight mb-1">Set the launch window.</h2>
              <p className="text-sm text-[#82958A]">Dates and duration for the operation.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="font-mono text-[10px] tracking-[0.2em] text-[#82958A]">LAUNCH DATE</label>
                <Input type="date" value={watched.startDate} onChange={(e) => handleDateChange('startDate', e.target.value)}
                  className={cn('bg-[#0D1210] border rounded-none font-mono text-sm text-[#D7E4DC] [color-scheme:dark]', errors.startDate ? 'border-[#FF6B5E]/60' : 'border-[rgba(124,252,154,0.14)] focus:border-[#7CFC9A]')} />
                <FieldError field="startDate" errors={errors as Record<string, { message?: string }>} />
              </div>
              <div className="space-y-2">
                <label className="font-mono text-[10px] tracking-[0.2em] text-[#82958A]">RETURN DATE</label>
                <Input type="date" value={watched.endDate} onChange={(e) => handleDateChange('endDate', e.target.value)}
                  className={cn('bg-[#0D1210] border rounded-none font-mono text-sm text-[#D7E4DC] [color-scheme:dark]', errors.endDate ? 'border-[#FF6B5E]/60' : 'border-[rgba(124,252,154,0.14)] focus:border-[#7CFC9A]')} />
                <FieldError field="endDate" errors={errors as Record<string, { message?: string }>} />
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="font-mono text-[10px] tracking-[0.2em] text-[#82958A]">DURATION</label>
                <span className="font-mono text-sm text-[#7CFC9A]">{watched.duration} DAYS</span>
              </div>
              <ThrottleSlider min={1} max={30} step={1} value={watched.duration || 1} onChange={(v) => setValue('duration', v, { shouldValidate: true })} />
              <div className="flex justify-between font-mono text-[9px] tracking-[0.15em] text-[#6E7F74]"><span>1D</span><span>15D</span><span>30D</span></div>
              <FieldError field="duration" errors={errors as Record<string, { message?: string }>} />
            </div>
          </motion.div>
        );

      case 2:
        return (
          <motion.div key="step2" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
            <div>
              <div className="font-mono text-[10px] tracking-[0.25em] text-[#82958A] mb-2">SECTION 03</div>
              <h2 className="text-2xl font-bold text-[#D7E4DC] tracking-tight mb-1">Declare the fuel load.</h2>
              <p className="text-sm text-[#82958A]">The budget agent splits this across stay, food, activities, transport, and buffer.</p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="font-mono text-[10px] tracking-[0.2em] text-[#82958A]">TOTAL BUDGET</label>
                <span className="font-mono text-lg text-[#7CFC9A]">₹{(watched.budget || 0).toLocaleString('en-IN')}</span>
              </div>
              <ThrottleSlider min={5000} max={500000} step={5000} value={watched.budget || 50000} onChange={(v) => setValue('budget', v, { shouldValidate: true })} />
              <div className="flex justify-between font-mono text-[9px] tracking-[0.15em] text-[#6E7F74]"><span>₹5K</span><span>₹2.5L</span><span>₹5L+</span></div>
              <FieldError field="budget" errors={errors as Record<string, { message?: string }>} />
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'BACKPACKER', amount: 10000 },
                { label: 'BUDGET', amount: 25000 },
                { label: 'MODERATE', amount: 50000 },
                { label: 'COMFORT', amount: 100000 },
                { label: 'LUXURY', amount: 250000 },
              ].map((opt) => (
                <OptionChip key={opt.label} selected={watched.budget === opt.amount} onClick={() => setValue('budget', opt.amount, { shouldValidate: true })}>
                  {opt.label} · ₹{opt.amount.toLocaleString('en-IN')}
                </OptionChip>
              ))}
            </div>
            <div className="space-y-3">
              <label className="font-mono text-[10px] tracking-[0.2em] text-[#82958A]">TRAVELERS</label>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <OptionChip key={n} selected={watched.travelers === n} onClick={() => setValue('travelers', n, { shouldValidate: true })}>
                    {n}
                  </OptionChip>
                ))}
              </div>
              <FieldError field="travelers" errors={errors as Record<string, { message?: string }>} />
            </div>
          </motion.div>
        );

      case 3:
        return (
          <motion.div key="step3" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
            <div>
              <div className="font-mono text-[10px] tracking-[0.25em] text-[#82958A] mb-2">SECTION 04</div>
              <h2 className="text-2xl font-bold text-[#D7E4DC] tracking-tight mb-1">Mission profile.</h2>
              <p className="text-sm text-[#82958A]">Agents tune constraints and recommendations to these parameters.</p>
            </div>

            <div className="space-y-3">
              <label className="font-mono text-[10px] tracking-[0.2em] text-[#82958A]">MISSION TYPE</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {tripTypes.map((type) => (
                  <OptionChip key={type.value} selected={watched.tripType === type.value} onClick={() => setValue('tripType', type.value, { shouldValidate: true })}>
                    <div>{type.label}</div>
                    <div className="text-[9px] text-[#6E7F74] mt-0.5 tracking-normal">{type.description}</div>
                  </OptionChip>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="font-mono text-[10px] tracking-[0.2em] text-[#82958A]">PACE</label>
              <div className="grid grid-cols-3 gap-2">
                {paces.map((pace) => (
                  <OptionChip key={pace.value} selected={watched.pace === pace.value} onClick={() => setValue('pace', pace.value, { shouldValidate: true })}>
                    {pace.label}
                  </OptionChip>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="font-mono text-[10px] tracking-[0.2em] text-[#82958A]">CLIMATE</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {climatePrefs.map((c) => (
                  <OptionChip key={c.value} selected={watched.climatePreference === c.value} onClick={() => setValue('climatePreference', c.value, { shouldValidate: true })}>
                    {c.label}
                  </OptionChip>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="font-mono text-[10px] tracking-[0.2em] text-[#82958A]">TRANSPORT MODE</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {transportPrefs.map((t) => (
                  <OptionChip key={t.value} selected={watched.transportPreference === t.value} onClick={() => setValue('transportPreference', t.value, { shouldValidate: true })}>
                    {t.label}
                  </OptionChip>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="font-mono text-[10px] tracking-[0.2em] text-[#82958A]">FOOD PREFERENCES</label>
              <div className="flex flex-wrap gap-2">
                {foodPrefs.map((pref) => (
                  <OptionChip key={pref} selected={(watched.foodPreferences || []).includes(pref)} onClick={() => toggleFoodPref(pref)}>
                    {pref.toUpperCase()}
                  </OptionChip>
                ))}
              </div>
            </div>
          </motion.div>
        );

      case 4:
        return (
          <motion.div key="step4" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <div>
              <div className="font-mono text-[10px] tracking-[0.25em] text-[#82958A] mb-2">SECTION 05</div>
              <h2 className="text-2xl font-bold text-[#D7E4DC] tracking-tight mb-1">Crew manifest.</h2>
              <p className="text-sm text-[#82958A]">Companion votes happen on the ops board after generation — everyone ranks trip type, pace, and budget, and the consensus engine merges them.</p>
            </div>
            <div className="hud-corner p-6 font-mono space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#82958A] tracking-[0.15em] text-[10px] tracking-[0.2em]">DECLARED TRAVELERS</span>
                <span className="text-[#7CFC9A] text-xl font-bold">{watched.travelers}</span>
              </div>
              <div className="h-px bg-[rgba(124,252,154,0.12)]" />
              <p className="text-xs text-[#82958A] leading-relaxed">
                Group consensus runs post-generation: open the trip board → GROUP CONSENSUS, add travelers, collect votes, execute the merge. Locked days are never overwritten.
              </p>
            </div>
          </motion.div>
        );

      case 5:
        return (
          <motion.div key="step5" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <div>
              <div className="font-mono text-[10px] tracking-[0.25em] text-[#82958A] mb-2">FINAL SECTION</div>
              <h2 className="text-2xl font-bold text-[#D7E4DC] tracking-tight mb-1">Flight plan ready for filing.</h2>
              <p className="text-sm text-[#82958A]">Verify the parameters, then dispatch to the agent team.</p>
            </div>

            <div className="hud-corner p-6 font-mono space-y-0">
              {[
                { label: 'DEST', value: watched.destinationIdea || 'NOT SET' },
                { label: 'DATES', value: watched.startDate && watched.endDate ? `${watched.startDate} → ${watched.endDate}` : 'NOT SET' },
                { label: 'DURATION', value: `${watched.duration} DAYS` },
                { label: 'BUDGET', value: `₹${(watched.budget || 0).toLocaleString('en-IN')}` },
                { label: 'TRAVELERS', value: String(watched.travelers) },
                { label: 'PROFILE', value: `${String(watched.tripType).toUpperCase()} · ${String(watched.pace).toUpperCase()}` },
                { label: 'TRANSIT', value: String(watched.transportPreference).toUpperCase() },
                { label: 'FOOD', value: (watched.foodPreferences || []).length ? watched.foodPreferences!.join(', ').toUpperCase() : 'ANY' },
              ].map(({ label, value }, i, arr) => (
                <div key={label} className={cn('flex items-center justify-between gap-6 py-3', i < arr.length - 1 && 'border-b border-dashed border-[rgba(124,252,154,0.12)]')}>
                  <span className="text-[10px] tracking-[0.25em] text-[#82958A] shrink-0">{label}</span>
                  <span className="text-xs text-[#D7E4DC] text-right truncate capitalize">{value}</span>
                </div>
              ))}
            </div>

            {Object.keys(errors).length > 0 && (
              <div className="border border-[#FF6B5E]/30 bg-[#FF6B5E]/5 p-4 font-mono">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-3.5 h-3.5 text-[#FF6B5E]" />
                  <span className="text-xs text-[#FF6B5E] tracking-[0.15em]">FIX BEFORE DISPATCH:</span>
                </div>
                <ul className="space-y-1">
                  {Object.entries(errors).map(([field, err]) => (
                    <li key={field} className="text-[11px] text-[#82958A] flex items-center gap-2">
                      <span className="w-1 h-1 rounded-full bg-[#FF6B5E]" />
                      {String(err?.message || `${field} is invalid`)}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {!generating && (
              <Button onClick={handleGenerate}
                className="w-full bg-[#7CFC9A] text-[#07100B] hover:bg-[#7CFC9A]/85 font-mono text-sm tracking-[0.2em] h-14 rounded-none shadow-glow">
                DISPATCH TO AGENTS ▸
              </Button>
            )}
          </motion.div>
        );

      default: return null;
    }
  };

  // ─── Mission Control takeover ─────────────────────────────────────────────────

  if (generating) {
    return (
      <MissionControl
        agentStates={agentStates}
        statusMsg={statusMsg}
        logLines={logLines}
        planLocked={planLocked}
        planTitle={planTitle}
      />
    );
  }

  // ─── Wizard UI ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="pt-24 pb-24 px-4 sm:px-6 max-w-3xl mx-auto">
        {/* Filing header */}
        <div className="flex items-center justify-between mb-6 font-mono">
          <div>
            <div className="text-[10px] tracking-[0.25em] text-[#82958A] mb-1">ZENTRIP OPS / NEW TRIP PLAN</div>
            <h1 className="text-lg font-bold text-[#D7E4DC] tracking-[0.1em]">TRIP PLAN — NEW</h1>
          </div>
          <div className="text-[10px] tracking-[0.2em] text-[#82958A]">
            STEP {String(currentStep + 1).padStart(2, '0')}/{String(steps.length).padStart(2, '0')}
          </div>
        </div>

        {/* Pre-flight checklist stepper */}
        <div className="hud-corner mb-8 px-4 py-3 overflow-x-auto">
          <div className="flex items-center gap-1 min-w-max font-mono">
            {steps.map((step, idx) => {
              const done = idx < currentStep;
              const active = idx === currentStep;
              const reachable = idx <= maxStep;
              return (
                <div key={step.id} className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => goToStep(idx)}
                    disabled={!reachable}
                    className={cn(
                      'px-3 py-1.5 text-[10px] tracking-[0.15em] transition-all whitespace-nowrap',
                      done && 'text-[#7CFC9A] hover:bg-[#7CFC9A]/10',
                      active && 'bg-[#7CFC9A]/10 text-[#7CFC9A] border border-[#7CFC9A]/40',
                      !done && !active && (reachable ? 'text-[#82958A] hover:text-[#D7E4DC]' : 'text-[#4A544E] cursor-not-allowed')
                    )}
                  >
                    {done && <Check className="inline w-3 h-3 mr-1 -mt-0.5" />}
                    {String(idx + 1).padStart(2, '0')} {step.label}
                    {done ? ' — FILED' : active ? ' ▸' : ''}
                  </button>
                  {idx < steps.length - 1 && <span className="text-[#4A544E]">/</span>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step content */}
        <div className="min-h-[420px]">
          {renderStep()}
        </div>

        {/* Nav buttons */}
        <div className="flex items-center justify-between mt-10 pt-6 border-t border-[rgba(124,252,154,0.12)] font-mono">
          <Button
            variant="ghost"
            onClick={() => setCurrentStep((p) => Math.max(0, p - 1))}
            disabled={currentStep === 0}
            className="text-[#82958A] hover:text-[#D7E4DC] text-xs tracking-[0.15em] rounded-none"
          >
            ◂ BACK
          </Button>
          {currentStep < steps.length - 1 ? (
            <Button
              onClick={handleNext}
              className="bg-[#7CFC9A] text-[#07100B] hover:bg-[#7CFC9A]/85 text-xs tracking-[0.15em] px-6 h-10 rounded-none shadow-glow"
            >
              CONTINUE ▸
            </Button>
          ) : (
            <span className="text-[10px] tracking-[0.2em] text-[#82958A]">READY FOR DISPATCH</span>
          )}
        </div>
      </main>
    </div>
  );
}
