'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, Cloud, Users, Lock, Unlock, RefreshCw,
  Download, Edit3, Check, X, Plus, Trash2, Sun, CloudRain,
  Wind, Umbrella, Map as MapIcon, Star, ListTodo,
  AlertTriangle, ChevronRight, ChevronDown, Loader2,
  IndianRupee, Clock3, Navigation2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import AtlasShell from '@/components/shared/AtlasShell';
import { useTripStore } from '@/store/useTripStore';
import type { Trip, DayPlan, AgentInfo, WeatherForecast, Activity } from '@/types';
import BudgetChart from '@/components/trip/BudgetChart';
import RouteDiagram from '@/components/trip/RouteDiagram';
import TripRouteMap from '@/components/trip/TripRouteMap';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { fetchWeatherForecast, type WeatherForecastItem } from '@/lib/weatherApi';

// ─── Constants ─────────────────────────────────────────────────────────────────

const typeGlyph: Record<string, string> = {
  outdoor: '◇', indoor: '◆', food: '◈', cultural: '▣',
  relaxation: '◌', adventure: '△', nature: '❋', nightlife: '☾',
};

const typeColor: Record<string, string> = {
  outdoor: '#7CFC9A', indoor: '#C8F169', food: '#FFB454', cultural: '#F0C868',
  relaxation: '#C8F169', adventure: '#FF6B5E', nature: '#7CFC9A', nightlife: '#FFB454',
};

// ─── Day Card ──────────────────────────────────────────────────────────────────

function DayCard({
  day,
  index,
  onToggleLock,
  onRegenerate,
  regenerating,
  onDeleteActivity,
  onAddActivity,
  onSwapIndoor,
}: {
  day: DayPlan;
  index: number;
  onToggleLock: () => void;
  onRegenerate: () => void;
  regenerating?: boolean;
  onDeleteActivity: (actId: string) => void;
  onAddActivity: (name: string, type: string, duration: string, cost: number) => void;
  onSwapIndoor: () => void;
}) {
  const [expanded, setExpanded] = useState(index === 0);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('outdoor');
  const [newDuration, setNewDuration] = useState('2 hours');
  const [newCost, setNewCost] = useState('0');

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      toast.error('Name the activity first');
      return;
    }
    onAddActivity(newName.trim(), newType, newDuration, parseFloat(newCost) || 0);
    setNewName('');
    setShowAddForm(false);
  };

  const isRainy = day.weather?.condition === 'rainy' || day.weather?.condition === 'stormy';
  const hasWeatherDependent = day.activities.some((a) => a.weatherDependent && a.indoorAlternative);

  // Interleaved timeline
  const blocks: Array<{ kind: 'meal' | 'activity'; time: string; data: any }> = [];
  const bMeal = day.meals.find((m) => m.type === 'breakfast');
  if (bMeal) blocks.push({ kind: 'meal', time: (bMeal as any).time || '08:30', data: bMeal });
  if (day.activities[0]) blocks.push({ kind: 'activity', time: (day.activities[0] as any).time || '10:00', data: day.activities[0] });
  const lMeal = day.meals.find((m) => m.type === 'lunch');
  if (lMeal) blocks.push({ kind: 'meal', time: (lMeal as any).time || '13:00', data: lMeal });
  if (day.activities[1]) blocks.push({ kind: 'activity', time: (day.activities[1] as any).time || '15:00', data: day.activities[1] });
  day.activities.slice(2).forEach((act, i) => {
    blocks.push({ kind: 'activity', time: (act as any).time || `${17 + i * 2}:00`, data: act });
  });
  const dMeal = day.meals.find((m) => m.type === 'dinner');
  if (dMeal) blocks.push({ kind: 'meal', time: (dMeal as any).time || '20:00', data: dMeal });

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className={cn('hud-corner', day.locked && 'border-[#FFB454]/40')}
    >
      {/* Day header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-4 p-4 text-left hover:bg-white/[0.02] transition-colors"
      >
        <div className={cn(
          'w-11 h-11 flex items-center justify-center font-mono text-lg font-bold shrink-0 border',
          day.locked
            ? 'border-[#FFB454]/50 bg-[#FFB454]/10 text-[#FFB454]'
            : 'border-[rgba(124,252,154,0.3)] bg-[#7CFC9A]/5 text-[#7CFC9A]'
        )}>
          {String(day.day).padStart(2, '0')}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-sm text-[#D7E4DC] tracking-[0.05em] truncate">{day.title}</span>
            {day.locked && <Lock className="w-3 h-3 text-[#FFB454] shrink-0" />}
          </div>
          <div className="font-mono text-[10px] tracking-[0.15em] text-[#82958A] mt-0.5 flex items-center gap-2">
            {day.date && <span>{day.date}</span>}
            {day.date && <span className="text-[#4A544E]">·</span>}
            <span>{day.activities.length} ACT</span>
            <span className="text-[#4A544E]">·</span>
            <span>{day.travelLoad || 'LOW'} LOAD</span>
          </div>
        </div>
        {day.weather && (
          <div className="hidden sm:flex font-mono text-[10px] text-[#82958A] items-center gap-1.5 shrink-0">
            {day.weather.condition === 'rainy' || day.weather.condition === 'stormy' ? (
              <CloudRain className="w-3.5 h-3.5 text-[#7CFC9A]" />
            ) : day.weather.condition === 'sunny' ? (
              <Sun className="w-3.5 h-3.5 text-[#FFB454]" />
            ) : (
              <Cloud className="w-3.5 h-3.5" />
            )}
            <span className="text-[#D7E4DC]">{day.weather.tempHigh}°</span>
          </div>
        )}
        {expanded ? <ChevronDown className="w-4 h-4 text-[#82958A]" /> : <ChevronRight className="w-4 h-4 text-[#82958A]" />}
      </button>

      {/* Expanded */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-dashed border-[rgba(124,252,154,0.12)]"
          >
            <div className="p-4 space-y-4">
              {/* Rain advisory */}
              {isRainy && hasWeatherDependent && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 border border-[#FFB454]/25 bg-[#FFB454]/5 font-mono text-[11px]">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[#FFB454]" />
                    <span className="text-[#FFB454] tracking-[0.05em]">
                      PRECIP WINDOW — swap exposed activities to covered alternatives.
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); onSwapIndoor(); }}
                    className="border-[#FFB454]/40 text-[#FFB454] hover:bg-[#FFB454]/10 text-[10px] h-7 font-mono tracking-[0.1em] rounded-none shrink-0"
                  >
                    SWAP ▸
                  </Button>
                </div>
              )}

              {/* Timeline */}
              <div className="space-y-0 timeline-line font-mono">
                {blocks.map((block, idx) => (
                  <div key={`${block.kind}-${idx}`} className="flex gap-3 group/act">
                    <div className="text-[10px] text-[#6E7F74] pt-1.5 w-10 shrink-0 text-right">{block.time}</div>
                    <div className="relative shrink-0 pt-1">
                      <div
                        className="w-2 h-2 rotate-45 border"
                        style={{
                          backgroundColor: block.kind === 'meal' ? '#07090A' : typeColor[block.data.type] || '#7CFC9A',
                          borderColor: block.kind === 'meal' ? '#FFB454' : typeColor[block.data.type] || '#7CFC9A',
                        }}
                      />
                    </div>
                    <div className="flex-1 min-w-0 pb-3">
                      {block.kind === 'meal' ? (
                        <div className="hover:bg-white/[0.02] p-1.5 -ml-1.5 rounded-sm transition-colors">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs text-[#D7E4DC] tracking-[0.1em] uppercase">{block.data.type}</span>
                            <span className="text-[10px] text-[#82958A] shrink-0">₹{block.data.cost}</span>
                          </div>
                          <div className="text-[10px] text-[#82958A] mt-0.5">{block.data.suggestion}</div>
                        </div>
                      ) : (
                        (() => {
                          const activity = block.data as Activity;
                          return (
                            <div className="hover:bg-white/[0.02] p-1.5 -ml-1.5 rounded-sm transition-colors">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="text-xs text-[#D7E4DC] truncate">{activity.name}</span>
                                  <span
                                    className="shrink-0 text-[9px] px-1.5 py-0.5 border font-bold tracking-[0.1em]"
                                    style={{
                                      color: activity.fitLabel === 'Low Fit' ? '#FF6B5E' : '#7CFC9A',
                                      borderColor: activity.fitLabel === 'Low Fit' ? 'rgba(255,107,94,0.4)' : 'rgba(124,252,154,0.3)',
                                    }}
                                  >
                                    {(activity.fitLabel || 'REC').toUpperCase()}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="text-[10px] text-[#82958A]">{activity.cost > 0 ? `₹${activity.cost.toLocaleString('en-IN')}` : 'FREE'}</span>
                                  <button
                                    onClick={() => onDeleteActivity(activity.id)}
                                    className="p-1 text-[#6E7F74] hover:text-[#FF6B5E] opacity-100 md:opacity-0 md:group-hover/act:opacity-100 transition-opacity"
                                    title="Delete activity"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 mt-0.5 text-[10px] text-[#82958A]">
                                <span style={{ color: typeColor[activity.type] || '#82958A' }}>{typeGlyph[activity.type] || '◇'} {activity.type}</span>
                                <span className="text-[#4A544E]">·</span>
                                <span className="flex items-center gap-0.5"><Clock3 className="w-2.5 h-2.5" />{activity.duration}</span>
                                {activity.weatherDependent && (
                                  <span className="flex items-center gap-0.5 text-[#FFB454]"><Umbrella className="w-2.5 h-2.5" />WX-DEP</span>
                                )}
                              </div>
                              {activity.description && (
                                <div className="text-[10px] text-[#6E7F74] mt-0.5 line-clamp-2">{activity.description}</div>
                              )}
                            </div>
                          );
                        })()
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Add activity */}
              <div>
                {showAddForm ? (
                  <form onSubmit={handleAddSubmit} className="border border-[rgba(124,252,154,0.14)] bg-[#0D1210] p-3.5 space-y-3 max-w-md">
                    <div className="font-mono text-[10px] tracking-[0.2em] text-[#82958A]">NEW ACTIVITY ENTRY</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <Input
                        placeholder="Activity name..."
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="bg-[#07090A] border-[rgba(124,252,154,0.14)] text-[#D7E4DC] text-xs h-9 rounded-none font-mono focus-visible:ring-[#7CFC9A]/30"
                      />
                      <select
                        value={newType}
                        onChange={(e) => setNewType(e.target.value)}
                        className="bg-[#07090A] border border-[rgba(124,252,154,0.14)] text-[#D7E4DC] text-xs h-9 rounded-none px-2 font-mono"
                      >
                        {Object.keys(typeGlyph).map((t) => (
                          <option key={t} value={t}>{t.toUpperCase()}</option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <Input
                        placeholder="Duration (e.g. 2 hours)"
                        value={newDuration}
                        onChange={(e) => setNewDuration(e.target.value)}
                        className="bg-[#07090A] border-[rgba(124,252,154,0.14)] text-[#D7E4DC] text-xs h-9 rounded-none font-mono"
                      />
                      <Input
                        type="number"
                        placeholder="Cost (₹)"
                        value={newCost}
                        onChange={(e) => setNewCost(e.target.value)}
                        className="bg-[#07090A] border-[rgba(124,252,154,0.14)] text-[#D7E4DC] text-xs h-9 rounded-none font-mono"
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button type="button" variant="ghost" size="sm" onClick={() => setShowAddForm(false)}
                        className="text-[#82958A] text-[10px] h-8 font-mono tracking-[0.1em] rounded-none">
                        CANCEL
                      </Button>
                      <Button type="submit" size="sm"
                        className="bg-[#7CFC9A] text-[#07100B] text-[10px] h-8 px-4 font-mono tracking-[0.1em] rounded-none">
                        ADD ENTRY
                      </Button>
                    </div>
                  </form>
                ) : (
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="flex items-center gap-1.5 font-mono text-[10px] tracking-[0.15em] text-[#7CFC9A] hover:bg-[#7CFC9A]/10 px-3 py-1.5 border border-dashed border-[rgba(124,252,154,0.25)] transition-all"
                  >
                    <Plus className="w-3 h-3" /> ADD ACTIVITY
                  </button>
                )}
              </div>

              {/* Stay readout */}
              {day.stay && (
                <div className="flex items-center justify-between font-mono text-[11px] bg-[#0D1210] border border-[rgba(124,252,154,0.1)] p-3">
                  <div className="min-w-0">
                    <div className="text-[9px] tracking-[0.2em] text-[#82958A] uppercase">{day.stay.type || 'LODGING'}</div>
                    <div className="text-[#D7E4DC] truncate mt-0.5">{day.stay.name}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[#7CFC9A]">₹{day.stay.pricePerNight?.toLocaleString('en-IN')}</div>
                    <div className="text-[9px] tracking-[0.15em] text-[#82958A]">PER NIGHT</div>
                  </div>
                </div>
              )}

              {/* Day actions */}
              <div className="flex items-center gap-2 pt-3 border-t border-dashed border-[rgba(124,252,154,0.12)]">
                <button
                  onClick={onToggleLock}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 font-mono text-[10px] tracking-[0.15em] transition-all border',
                    day.locked
                      ? 'border-[#FFB454]/40 bg-[#FFB454]/10 text-[#FFB454]'
                      : 'border-[rgba(124,252,154,0.14)] text-[#82958A] hover:text-[#D7E4DC]'
                  )}
                >
                  {day.locked ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                  {day.locked ? 'UNLOCK DAY' : 'LOCK DAY'}
                </button>
                <button
                  onClick={onRegenerate}
                  disabled={regenerating}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-[rgba(124,252,154,0.14)] text-[#82958A] hover:text-[#D7E4DC] font-mono text-[10px] tracking-[0.15em] transition-all disabled:opacity-50"
                >
                  {regenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                  {regenerating ? 'REGENERATING…' : 'REGENERATE DAY'}
                </button>
                {day.walkingLoad && (
                  <span className="ml-auto hidden sm:flex font-mono text-[9px] tracking-[0.15em] text-[#6E7F74] items-center gap-3">
                    <span>WALK {day.walkingLoad.toUpperCase()}</span>
                    <span className="text-[#4A544E]">/</span>
                    <span>{day.dailyTransit || '<45M'}</span>
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Checklist Tab ─────────────────────────────────────────────────────────────

function ChecklistTab({ trip }: { trip: Trip }) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const toggle = (id: string) => setChecked((prev) => ({ ...prev, [id]: !prev[id] }));

  const STANDARD_ITEMS = [
    { group: 'DOCUMENTS', items: ['Passport / ID', 'Visa documents', 'Travel insurance policy', 'Hotel confirmations', 'Tickets', 'Emergency contacts sheet'] },
    { group: 'ESSENTIALS', items: ['Phone charger & adapters', 'Power bank', 'Medications & first aid', 'Cash & travel cards', 'Sunscreen & toiletries', 'Travel pillow'] },
    { group: 'DIGITAL', items: ['Offline maps downloaded', 'Translation app', 'Emergency numbers saved'] },
  ];

  const handleDownload = () => {
    const lines = [`# ${trip.title} — Packing Checklist\n`];
    STANDARD_ITEMS.forEach(({ group, items }) => {
      lines.push(`## ${group}`);
      items.forEach((item) => lines.push(`- [${checked[item] ? 'x' : ' '}] ${item}`));
      lines.push('');
    });
    trip.itinerary.forEach((day) => {
      lines.push(`## Day ${day.day}: ${day.title}`);
      day.activities.forEach((a) => lines.push(`- [ ] ${a.name}`));
      lines.push('');
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${trip.title.replace(/\s+/g, '-').toLowerCase()}-checklist.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success('Checklist downloaded!');
  };

  const totalItems = STANDARD_ITEMS.reduce((a, g) => a + g.items.length, 0) + trip.itinerary.reduce((a, d) => a + d.activities.length, 0);
  const doneItems = Object.values(checked).filter(Boolean).length;
  const pct = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="hud-corner p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="font-mono text-[10px] tracking-[0.25em] text-[#82958A]">PRE-FLIGHT CHECKS</div>
            <div className="font-mono text-xs text-[#D7E4DC] mt-1">{doneItems} / {totalItems} COMPLETE</div>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-lg font-bold text-[#7CFC9A]">{pct}%</span>
            <Button variant="outline" size="sm" onClick={handleDownload}
              className="border-[rgba(124,252,154,0.2)] text-[#82958A] hover:text-[#D7E4DC] font-mono text-[10px] tracking-[0.1em] rounded-none">
              <Download className="w-3 h-3 mr-1" />EXPORT
            </Button>
          </div>
        </div>
        <div className="h-1 bg-white/5">
          <motion.div className="h-full bg-[#7CFC9A]" animate={{ width: `${pct}%` }} transition={{ duration: 0.4 }} />
        </div>
      </div>

      {STANDARD_ITEMS.map(({ group, items }) => (
        <div key={group} className="hud-corner p-5">
          <div className="font-mono text-[10px] tracking-[0.25em] text-[#FFB454] mb-3">{group}</div>
          <div className="space-y-1">
            {items.map((item) => (
              <label key={item} className="flex items-center gap-3 cursor-pointer group font-mono text-xs py-1">
                <div
                  onClick={() => toggle(item)}
                  className={cn(
                    'w-3.5 h-3.5 border flex items-center justify-center transition-all shrink-0',
                    checked[item] ? 'bg-[#7CFC9A] border-[#7CFC9A]' : 'border-[rgba(124,252,154,0.3)] group-hover:border-[#7CFC9A]'
                  )}
                >
                  {checked[item] && <Check className="w-2.5 h-2.5 text-[#07100B]" />}
                </div>
                <span className={cn('transition-all', checked[item] ? 'line-through text-[#6E7F74]' : 'text-[#D7E4DC]')}>{item}</span>
              </label>
            ))}
          </div>
        </div>
      ))}

      {trip.itinerary.map((day) => (
        <div key={day.day} className="hud-corner p-5">
          <div className="font-mono text-[10px] tracking-[0.25em] text-[#82958A] mb-3">
            DAY {String(day.day).padStart(2, '0')} — {day.title.toUpperCase()}
          </div>
          <div className="space-y-1">
            {day.activities.map((act) => {
              const id = `day-${day.day}-act-${act.id}`;
              return (
                <label key={id} className="flex items-center gap-3 cursor-pointer group font-mono text-xs py-1">
                  <div
                    onClick={() => toggle(id)}
                    className={cn(
                      'w-3.5 h-3.5 border flex items-center justify-center transition-all shrink-0',
                      checked[id] ? 'bg-[#7CFC9A] border-[#7CFC9A]' : 'border-[rgba(124,252,154,0.3)] group-hover:border-[#7CFC9A]'
                    )}
                  >
                    {checked[id] && <Check className="w-2.5 h-2.5 text-[#07100B]" />}
                  </div>
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    <span className={cn('transition-all truncate', checked[id] ? 'line-through text-[#6E7F74]' : 'text-[#D7E4DC]')}>{act.name}</span>
                    <span className="text-[10px] text-[#6E7F74] shrink-0">{act.duration}</span>
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Agent card ────────────────────────────────────────────────────────────────

function AgentCard({ agent }: { agent: AgentInfo }) {
  const color =
    agent.status === 'completed' ? '#7CFC9A'
    : agent.status === 'error' || agent.status === 'warning' ? '#FF6B5E'
    : agent.status === 'analyzing' || agent.status === 'generating' ? '#FFB454'
    : '#6E7F74';

  return (
    <div className="flex items-center gap-3 p-2.5 bg-[#0D1210] border border-[rgba(124,252,154,0.08)]">
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[11px] text-[#D7E4DC] truncate">{agent.name}</span>
          <span className="font-mono text-[9px] tracking-[0.1em] shrink-0" style={{ color }}>{agent.status.toUpperCase()}</span>
        </div>
        {agent.outputSummary && (
          <p className="font-mono text-[9px] text-[#6E7F74] truncate mt-0.5">{agent.outputSummary}</p>
        )}
      </div>
    </div>
  );
}

// ─── Weather card ──────────────────────────────────────────────────────────────

function WeatherCard({ forecast }: { forecast: WeatherForecast | WeatherForecastItem }) {
  const icon =
    forecast.condition === 'rainy' || forecast.condition === 'stormy' ? <CloudRain className="w-4 h-4 text-[#7CFC9A]" />
    : forecast.condition === 'sunny' ? <Sun className="w-4 h-4 text-[#FFB454]" />
    : <Cloud className="w-4 h-4 text-[#82958A]" />;

  return (
    <div className="flex items-center gap-4 p-3 bg-[#0D1210] border border-[rgba(124,252,154,0.08)] font-mono">
      <div className="w-9 h-9 border border-[rgba(124,252,154,0.14)] flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-[#D7E4DC]">{forecast.date}</span>
          <span className="text-xs text-[#D7E4DC]">{forecast.tempHigh}° / {forecast.tempLow}°</span>
        </div>
        <div className="flex items-center gap-3 mt-0.5 text-[9px] tracking-[0.1em] text-[#82958A]">
          <span className="uppercase">{forecast.condition}</span>
          <span className="flex items-center gap-0.5"><Umbrella className="w-2.5 h-2.5" />{forecast.precipitation}%</span>
          <span className="flex items-center gap-0.5"><Wind className="w-2.5 h-2.5" />{forecast.windSpeed} KPH</span>
        </div>
        {forecast.advisory && <p className="text-[9px] text-[#FFB454] mt-1">{forecast.advisory}</p>}
      </div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function TripDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { currentTrip, setCurrentTrip, savedTrips, lockDay, unlockDay, addSavedTrip } = useTripStore();
  const [activeTab, setActiveTab] = useState('itinerary');
  const [regeneratingDay, setRegeneratingDay] = useState<number | null>(null);
  const [showExportPanel, setShowExportPanel] = useState(false);
  const [showGroupPanel, setShowGroupPanel] = useState(false);
  const [companions, setCompanions] = useState<Array<{ id: string; name: string; votes: Record<string, string>; preferences?: Record<string, unknown> }>>([]);
  const [liveWeather, setLiveWeather] = useState<WeatherForecastItem[]>([]);
  const [weatherSource, setWeatherSource] = useState<'live' | 'fallback' | 'trip'>('trip');

  // Find trip from store
  const trip = currentTrip || savedTrips.find((t) => t.id === params.id);
  const userId = trip?.userId;
  const tripCode = (typeof params.id === 'string' ? params.id : '').slice(0, 4).toUpperCase() || '----';

  const handleToggleLock = (day: number) => {
    if (!trip) return;
    const d = trip.itinerary.find((d) => d.day === day);
    if (d?.locked) {
      unlockDay(day);
      toast.success(`Day ${day} unlocked`);
    } else {
      lockDay(day);
      toast.success(`Day ${day} locked — safe from regeneration`);
    }
  };

  const handleRegenerateDay = async (dayNum: number) => {
    if (!trip) return;
    const dayPlan = trip.itinerary.find((d) => d.day === dayNum);
    if (dayPlan?.locked) { toast.error('Unlock this day before regenerating'); return; }
    if (regeneratingDay !== null) { toast.error('A regeneration is already in progress'); return; }

    setRegeneratingDay(dayNum);
    toast.loading(`Re-dispatching agents for Day ${dayNum}…`, { id: `regen-${dayNum}` });
    try {
      const response = await fetch(`/api/trips/${trip.id}/regenerate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          sections: ['itinerary', 'activities'],
          preferences: trip.preferences,
        }),
      });
      const payload = await response.json();
      if (!payload.success || !payload.data) throw new Error(payload.error || 'Regeneration failed');
      const updatedTrip = payload.data as Trip;
      setCurrentTrip(updatedTrip);
      addSavedTrip(updatedTrip);
      toast.success(`Day ${dayNum} regenerated!`, { id: `regen-${dayNum}` });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to regenerate day', { id: `regen-${dayNum}` });
    } finally {
      setRegeneratingDay(null);
    }
  };

  const handleDeleteActivity = (dayNum: number, actId: string) => {
    if (!trip) return;
    const updatedItinerary = trip.itinerary.map((d) =>
      d.day === dayNum ? { ...d, activities: d.activities.filter((a) => a.id !== actId) } : d
    );
    const updatedTrip = recalcBudget({ ...trip, itinerary: updatedItinerary });
    setCurrentTrip(updatedTrip);
    addSavedTrip(updatedTrip);
    toast.success('Activity removed');
  };

  const handleAddActivity = (dayNum: number, name: string, type: string, duration: string, cost: number) => {
    if (!trip) return;
    const newActivity: Activity = {
      id: Math.random().toString(36).slice(2, 9),
      name,
      description: name,
      type: type as Activity['type'],
      duration,
      cost,
      timeSlot: 'afternoon',
      location: trip.itinerary.find((d) => d.day === dayNum)?.title || 'Local Area',
      weatherDependent: false,
      score: 100,
    };
    const updatedItinerary = trip.itinerary.map((d) =>
      d.day === dayNum ? { ...d, activities: [...d.activities, newActivity] } : d
    );
    const updatedTrip = recalcBudget({ ...trip, itinerary: updatedItinerary });
    setCurrentTrip(updatedTrip);
    addSavedTrip(updatedTrip);
    toast.success('Activity added');
  };

  const handleSwapIndoor = (dayNum: number) => {
    if (!trip) return;
    const updatedItinerary = trip.itinerary.map((d) =>
      d.day === dayNum
        ? {
            ...d,
            activities: d.activities.map((a) =>
              a.weatherDependent && a.indoorAlternative
                ? { ...a, name: a.indoorAlternative, description: `Covered alternative: ${a.indoorAlternative}`, weatherDependent: false, indoorAlternative: a.name, type: 'indoor' as const }
                : a
            ),
          }
        : d
    );
    const updatedTrip = recalcBudget({ ...trip, itinerary: updatedItinerary });
    setCurrentTrip(updatedTrip);
    addSavedTrip(updatedTrip);
    toast.success('Swapped to covered alternatives');
  };

  const loadLiveWeather = async () => {
    if (!trip) return;
    const city = trip.destinations[0]?.name || trip.preferences.destinationIdea.split(',')[0]?.trim();
    if (!city) {
      toast.error('No destination for weather lookup');
      return;
    }
    try {
      const result = await fetchWeatherForecast(city);
      setLiveWeather(result.forecasts);
      setWeatherSource(result.source === 'openweather' ? 'live' : 'fallback');
      toast.success('Weather window updated');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to fetch live weather');
      setLiveWeather([]);
      setWeatherSource('trip');
    }
  };

  const openGroupPanel = () => {
    if (!trip) return;
    const seeded = (trip.preferences.companions || []).map((c) => ({
      id: c.id,
      name: c.name,
      votes: Object.fromEntries(Object.entries(c.votes || {}).map(([key, value]) => [key, String(value)])),
      preferences: c.preferences,
    }));
    setCompanions(seeded);
    setShowGroupPanel(true);
  };

  const addCompanion = () => {
    const id = Math.random().toString(36).slice(2, 9);
    setCompanions((prev) => [...prev, { id, name: '', votes: {} }]);
  };

  const updateCompanion = (id: string, patch: Partial<{ name: string; votes: Record<string, string> }>) => {
    setCompanions((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  const updateCompanionVote = (id: string, key: string, value: string) => {
    setCompanions((prev) =>
      prev.map((c) => (c.id === id ? { ...c, votes: { ...c.votes, [key]: value } } : c))
    );
  };

  const submitVotes = () => {
    if (!trip) return;
    const validCompanions = companions.filter((c) => c.name.trim().length > 0);
    if (!validCompanions.length) {
      toast.error('Add at least one traveler before executing consensus');
      return;
    }

    const pickMostFrequent = (values: string[]): string | undefined => {
      if (!values.length) return undefined;
      const counts = values.reduce<Record<string, number>>((acc, value) => {
        acc[value] = (acc[value] || 0) + 1;
        return acc;
      }, {});
      return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
    };

    const voteValues = validCompanions.flatMap((c) => Object.entries(c.votes || {}));
    const getVotes = (key: string) => voteValues.filter(([k]) => k === key).map(([, v]) => String(v));

    const votedTripType = pickMostFrequent(getVotes('tripType')) as typeof trip.preferences.tripType | undefined;
    const votedPace = pickMostFrequent(getVotes('pace')) as typeof trip.preferences.pace | undefined;
    const votedClimate = pickMostFrequent(getVotes('climatePreference')) as typeof trip.preferences.climatePreference | undefined;
    const votedTransport = pickMostFrequent(getVotes('transportPreference')) as typeof trip.preferences.transportPreference | undefined;

    const budgetVotes = getVotes('budget').map((v) => Number(v)).filter((v) => !Number.isNaN(v));
    const avgBudget = budgetVotes.length ? Math.round(budgetVotes.reduce((sum, v) => sum + v, 0) / budgetVotes.length) : undefined;

    const mergedFood = new Set(trip.preferences.foodPreferences || []);
    validCompanions.forEach((companion) => {
      const food = companion.preferences?.foodPreferences;
      if (Array.isArray(food)) {
        food.forEach((item) => {
          if (typeof item === 'string' && item.trim()) mergedFood.add(item);
        });
      }
    });

    const mergedPreferences = {
      ...trip.preferences,
      tripType: votedTripType || trip.preferences.tripType,
      pace: votedPace || trip.preferences.pace,
      climatePreference: votedClimate || trip.preferences.climatePreference,
      transportPreference: votedTransport || trip.preferences.transportPreference,
      budget: avgBudget || trip.preferences.budget,
      foodPreferences: [...mergedFood],
      companions: validCompanions as any,
      travelers: Math.max(trip.travelers, validCompanions.length || trip.travelers),
    };

    const updatedTrip = { ...trip, preferences: mergedPreferences, travelers: mergedPreferences.travelers };
    setCurrentTrip(updatedTrip);
    addSavedTrip(updatedTrip);
    toast.success('Group consensus applied');
    setShowGroupPanel(false);
  };

  const handleCreateExport = (type: 'pdf' | 'json' | 'calendar' | 'checklist') => {
    if (!trip) return;

    if (type === 'pdf') {
      toast.success('Opening print view — select "Save as PDF"');
      setShowExportPanel(false);
      setTimeout(() => window.print(), 500);
      return;
    }

    if (type === 'json') {
      const blob = new Blob([JSON.stringify(trip, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${trip.title.replace(/\s+/g, '-').toLowerCase()}-trip.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('JSON downloaded');
      return;
    }

    if (type === 'calendar') {
      const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', `PRODID:-//ZenTrip//${trip.title}//EN`];
      trip.itinerary.forEach((day) => {
        const dtstart = day.date ? day.date.replace(/-/g, '') : new Date().toISOString().split('T')[0].replace(/-/g, '');
        lines.push(
          'BEGIN:VEVENT',
          `UID:${trip.id}-day${day.day}@zentrip`,
          `DTSTART;VALUE=DATE:${dtstart}`,
          `SUMMARY:${day.title}`,
          `DESCRIPTION:${day.activities.map((a) => a.name).join(', ')}`,
          'END:VEVENT'
        );
      });
      lines.push('END:VCALENDAR');
      const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${trip.title.replace(/\s+/g, '-').toLowerCase()}.ics`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('Calendar file downloaded');
      return;
    }

    if (type === 'checklist') {
      const lines = [`# ${trip.title} — Packing Checklist`, ''];
      lines.push('## Documents', '- [ ] Passport', '- [ ] Visa', '- [ ] Travel insurance', '- [ ] Hotel bookings', '');
      trip.itinerary.forEach((day) => {
        lines.push(`## Day ${day.day}: ${day.title}`);
        day.activities.forEach((a) => lines.push(`- [ ] ${a.name} (${a.duration})`));
        lines.push('');
      });
      const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${trip.title.replace(/\s+/g, '-').toLowerCase()}-checklist.md`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('Checklist downloaded');
      return;
    }
  };

  // Recompute budget telemetry after itinerary edits
  function recalcBudget(t: Trip): Trip {
    const totalAllocated = t.itinerary.reduce((acc, d) => {
      const actCost = d.activities.reduce((sum, a) => sum + (a.cost || 0), 0);
      const stayCost = d.stay?.pricePerNight || 0;
      const mealCost = d.meals.reduce((sum, m) => sum + (m.cost || 0), 0);
      return acc + actCost + stayCost + mealCost;
    }, 0);
    return {
      ...t,
      budgetBreakdown: {
        ...t.budgetBreakdown,
        allocated: totalAllocated,
        remaining: Math.max(0, t.budget - totalAllocated),
        items: t.budgetBreakdown.items.map((item) =>
          item.category === 'activities'
            ? {
                ...item,
                amount: t.itinerary.reduce((acc, d) => acc + d.activities.reduce((sum, a) => sum + (a.cost || 0), 0), 0),
              }
            : item
        ),
      },
    };
  }

  // ─── Trip not found ──────────────────────────────────────────────────────────

  if (!trip) {
    return (
      <AtlasShell>
        <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
          <div className="text-center font-mono">
            <div className="w-14 h-14 border border-[rgba(124,252,154,0.25)] flex items-center justify-center mx-auto mb-4">
              <Navigation2 className="w-6 h-6 text-[#82958A]" />
            </div>
            <h2 className="text-lg font-bold text-[#D7E4DC] tracking-[0.1em] mb-2">NO PLAN ON FILE</h2>
            <p className="text-xs text-[#82958A] mb-6 tracking-[0.05em]">This trip does not exist in local storage or has been deleted.</p>
            <Link href="/dashboard">
              <Button className="bg-[#7CFC9A] text-[#07100B] font-mono text-xs tracking-[0.15em] rounded-none">
                RETURN TO HANGAR ▸
              </Button>
            </Link>
          </div>
        </div>
      </AtlasShell>
    );
  }

  const TABS = [
    { id: 'itinerary', label: 'TIMELINE' },
    { id: 'budget', label: 'BUDGET' },
    { id: 'map', label: 'ROUTE' },
    { id: 'weather', label: 'WX' },
    { id: 'checklist', label: 'CHECKLIST' },
  ];

  return (
    <AtlasShell>
      {/* pb-16 clears the mobile bottom nav; md+ hides it, so restore exact height */}
      <div className="flex h-[calc(100vh-64px)] pb-16 md:pb-0 overflow-hidden">
        {/* ── Left rail: nav ── */}
        <div className="w-56 border-r border-[rgba(124,252,154,0.12)] bg-[#0A0E0C] overflow-y-auto flex-col shrink-0 hidden md:flex font-mono">
          <div className="p-4 border-b border-[rgba(124,252,154,0.12)]">
            <div className="text-[9px] tracking-[0.25em] text-[#82958A] mb-1">TRIP PLAN</div>
            <div className="text-sm font-bold text-[#7CFC9A] tracking-[0.15em]">ZT-{tripCode}</div>
            <div className="text-[10px] text-[#82958A] mt-1 truncate">{trip.destinationSummary}</div>
            <div className="mt-3 flex items-center gap-2 text-[9px] tracking-[0.15em] text-[#82958A]">
              <span>{trip.duration}D</span>
              <span className="text-[#4A544E]">/</span>
              <span>TRAVELERS {trip.travelers}</span>
              <span className="text-[#4A544E]">/</span>
              <span className={trip.confidenceScore >= 80 ? 'text-[#7CFC9A]' : 'text-[#FFB454]'}>{trip.confidenceScore}%</span>
            </div>
          </div>

          <div className="flex-1 p-2 space-y-0.5">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2.5 text-[10px] tracking-[0.2em] transition-colors border-l-2',
                  activeTab === tab.id
                    ? 'border-[#7CFC9A] bg-[#7CFC9A]/10 text-[#7CFC9A]'
                    : 'border-transparent text-[#82958A] hover:bg-white/[0.03] hover:text-[#D7E4DC]'
                )}
              >
                {tab.id === 'itinerary' && <Calendar className="w-3.5 h-3.5" />}
                {tab.id === 'budget' && <IndianRupee className="w-3.5 h-3.5" />}
                {tab.id === 'map' && <MapIcon className="w-3.5 h-3.5" />}
                {tab.id === 'weather' && <Cloud className="w-3.5 h-3.5" />}
                {tab.id === 'checklist' && <ListTodo className="w-3.5 h-3.5" />}
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-2 border-t border-[rgba(124,252,154,0.12)] space-y-0.5">
            <button onClick={openGroupPanel}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-[10px] tracking-[0.2em] text-[#82958A] hover:bg-white/[0.03] hover:text-[#D7E4DC] transition-colors border-l-2 border-transparent">
              <Users className="w-3.5 h-3.5" /> CONSENSUS
            </button>
            <button onClick={() => setShowExportPanel(true)}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-[10px] tracking-[0.2em] text-[#82958A] hover:bg-white/[0.03] hover:text-[#D7E4DC] transition-colors border-l-2 border-transparent">
              <Download className="w-3.5 h-3.5" /> EXPORT
            </button>
            <Link href="/trip/new"
              className="flex items-center gap-2.5 px-3 py-2 text-[10px] tracking-[0.2em] text-[#82958A] hover:bg-white/[0.03] hover:text-[#D7E4DC] transition-colors border-l-2 border-transparent">
              <Plus className="w-3.5 h-3.5" /> NEW PLAN
            </Link>
          </div>
        </div>

        {/* ── Center: canvas ── */}
        <div className="flex-1 bg-[#07090A] overflow-y-auto flex flex-col relative">
          {/* Trip hero strip */}
          <div className="border-b border-[rgba(124,252,154,0.12)] bg-[#0A0E0C] px-5 sm:px-8 py-4 shrink-0">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="min-w-0">
                <div className="font-mono text-[9px] tracking-[0.25em] text-[#82958A] mb-1">
                  ZT-{tripCode} · {trip.status.toUpperCase()}
                </div>
                <h1 className="text-lg sm:text-xl font-bold text-[#D7E4DC] tracking-tight truncate">{trip.title}</h1>
              </div>
              <div className="flex items-center gap-2 font-mono text-[10px]">
                <span className="px-2.5 py-1 border border-[rgba(124,252,154,0.25)] text-[#7CFC9A] tracking-[0.1em]">
                  <Star className="w-2.5 h-2.5 inline mr-1 -mt-0.5" />{trip.confidenceScore}% CONF
                </span>
                <span className="px-2.5 py-1 border border-[rgba(124,252,154,0.25)] text-[#D7E4DC] tracking-[0.1em]">
                  <IndianRupee className="w-2.5 h-2.5 inline mr-1 -mt-0.5" />{trip.budget.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Mobile tabs */}
            <div className="md:hidden flex items-center gap-1 mt-3 overflow-x-auto font-mono">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'px-3 py-1.5 text-[9px] tracking-[0.15em] border whitespace-nowrap transition-colors',
                    activeTab === tab.id
                      ? 'border-[#7CFC9A] bg-[#7CFC9A]/10 text-[#7CFC9A]'
                      : 'border-[rgba(124,252,154,0.14)] text-[#82958A]'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-5 sm:p-8 flex-1 max-w-4xl mx-auto w-full pb-16">
            {/* TIMELINE */}
            {activeTab === 'itinerary' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-2 font-mono">
                  <span className="text-[10px] tracking-[0.25em] text-[#82958A]">OPERATIONS TIMELINE</span>
                  <span className="text-[10px] tracking-[0.2em] text-[#82958A]">{trip.itinerary.length} DAYS ON FILE</span>
                </div>
                {trip.itinerary.map((day, idx) => (
                  <DayCard
                    key={day.day}
                    day={day}
                    index={idx}
                    onToggleLock={() => handleToggleLock(day.day)}
                    onRegenerate={() => handleRegenerateDay(day.day)}
                    regenerating={regeneratingDay === day.day}
                    onDeleteActivity={(actId) => handleDeleteActivity(day.day, actId)}
                    onAddActivity={(name, type, duration, cost) => handleAddActivity(day.day, name, type, duration, cost)}
                    onSwapIndoor={() => handleSwapIndoor(day.day)}
                  />
                ))}
              </div>
            )}

            {/* BUDGET */}
            {activeTab === 'budget' && (
              <div className="hud-corner p-6">
                <div className="flex items-center justify-between mb-6 font-mono">
                  <span className="text-[10px] tracking-[0.25em] text-[#82958A]">BUDGET BREAKDOWN</span>
                  <span className="text-xs text-[#D7E4DC]">
                    ₹{(trip.budgetBreakdown.allocated || 0).toLocaleString('en-IN')} / {trip.budget.toLocaleString('en-IN')}
                  </span>
                </div>
                <BudgetChart budget={trip.budgetBreakdown} />
              </div>
            )}

            {/* ROUTE */}
            {activeTab === 'map' && (
              <div className="space-y-6">
                <RouteDiagram route={trip.route} destinationName={trip.destinations[0]?.name || trip.destinationSummary} />
                <div className="hud-corner p-2">
                  <TripRouteMap
                    route={trip.route}
                    destinations={trip.destinations}
                    provider={process.env.NEXT_PUBLIC_MAP_PROVIDER}
                  />
                </div>
              </div>
            )}

            {/* WEATHER */}
            {activeTab === 'weather' && (
              <div className="hud-corner p-6">
                <div className="flex items-center justify-between gap-3 mb-6 font-mono">
                  <div>
                    <div className="text-[10px] tracking-[0.25em] text-[#82958A]">WEATHER</div>
                    <div className="text-[9px] tracking-[0.15em] text-[#6E7F74] mt-1">SOURCE: {weatherSource.toUpperCase()}</div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={loadLiveWeather}
                    className="border-[rgba(124,252,154,0.2)] text-[#82958A] hover:text-[#D7E4DC] font-mono text-[10px] tracking-[0.1em] rounded-none"
                  >
                    <RefreshCw className="w-3 h-3 mr-1.5" /> REFRESH
                  </Button>
                </div>
                <div className="space-y-2">
                  {(liveWeather.length ? liveWeather : trip.weatherSnapshots).map((forecast, i) => (
                    <WeatherCard key={i} forecast={forecast} />
                  ))}
                  {!liveWeather.length && !trip.weatherSnapshots.length && (
                    <div className="py-8 text-center font-mono text-[11px] tracking-[0.15em] text-[#82958A]">
                      NO WX DATA ON FILE
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* CHECKLIST */}
            {activeTab === 'checklist' && <ChecklistTab trip={trip} />}
          </div>
        </div>

        {/* ── Right rail: supervisor telemetry ── */}
        <div className="w-72 border-l border-[rgba(124,252,154,0.12)] bg-[#0A0E0C] overflow-y-auto flex-col shrink-0 hidden xl:flex font-mono">
          <div className="p-4">
            <div className="text-[9px] tracking-[0.25em] text-[#82958A] mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#7CFC9A] agent-pulse" />
              SUPERVISOR REVIEW
            </div>

            <div className="border border-[rgba(124,252,154,0.1)] bg-[#0D1210] p-4 mb-6 space-y-3">
              {[
                { label: 'CONFIDENCE', value: `${trip.confidenceScore}`, color: '#7CFC9A' },
                { label: 'BUDGET FIT', value: (trip.budgetFit || 'GOOD').toUpperCase(), color: '#D7E4DC' },
                { label: 'WX FIT', value: (trip.weatherFit || 'HIGH').toUpperCase(), color: '#D7E4DC' },
                { label: 'ROUTE FIT', value: (trip.routeFit || 'EXCELLENT').toUpperCase(), color: '#D7E4DC' },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between text-[10px] tracking-[0.15em]">
                  <span className="text-[#82958A]">{row.label}</span>
                  <span style={{ color: row.color }} className="font-bold">{row.value}</span>
                </div>
              ))}
            </div>

            <div className="text-[9px] tracking-[0.25em] text-[#82958A] mb-3">AGENT NETWORK</div>
            <div className="space-y-1.5 mb-6">
              {trip.agents.length ? (
                trip.agents.map((agent) => <AgentCard key={agent.id} agent={agent} />)
              ) : (
                <div className="text-[10px] text-[#6E7F74] py-2">NO TELEMETRY</div>
              )}
            </div>

            {trip.warnings.length > 0 && (
              <>
                <div className="text-[9px] tracking-[0.25em] text-[#FFB454] mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-3 h-3" /> SYSTEM NOTICES
                </div>
                <div className="space-y-1.5">
                  {trip.warnings.map((w, i) => (
                    <div key={i} className="p-2.5 bg-[#FFB454]/5 border border-[#FFB454]/20 text-[10px] text-[#82958A] leading-relaxed">
                      {w}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Export modal ── */}
      <AnimatePresence>
        {showExportPanel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowExportPanel(false)}
          >
            <div className="hud-corner w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-[10px] tracking-[0.25em] text-[#82958A]">ARTIFACT EXPORT</span>
                <button onClick={() => setShowExportPanel(false)} className="text-[#82958A] hover:text-[#D7E4DC]">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="font-mono text-sm text-[#D7E4DC] tracking-[0.1em] mb-5 mt-2">All artifacts render locally.</div>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { type: 'pdf', label: 'PRINT / PDF' },
                  { type: 'json', label: 'JSON DATA' },
                  { type: 'calendar', label: 'ICS CALENDAR' },
                  { type: 'checklist', label: 'CHECKLIST MD' },
                ] as const).map(({ type, label }) => (
                  <button
                    key={type}
                    onClick={() => handleCreateExport(type)}
                    className="px-4 py-4 border border-[rgba(124,252,154,0.14)] font-mono text-[10px] tracking-[0.2em] text-[#D7E4DC] hover:border-[#7CFC9A] hover:text-[#7CFC9A] hover:bg-[#7CFC9A]/5 transition-all text-left"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Group consensus modal ── */}
      <AnimatePresence>
        {showGroupPanel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowGroupPanel(false)}
          >
            <div className="hud-corner w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-[10px] tracking-[0.25em] text-[#82958A]">CONSENSUS ENGINE</span>
                <button onClick={() => setShowGroupPanel(false)} className="text-[#82958A] hover:text-[#D7E4DC]">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="font-mono text-sm text-[#D7E4DC] tracking-[0.1em] mb-5 mt-2">
                Majority vote wins. Budget votes are averaged.
              </div>

              <div className="space-y-4">
                {companions.map((companion) => (
                  <div key={companion.id} className="border border-[rgba(124,252,154,0.1)] bg-[#0D1210] p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <input
                        value={companion.name}
                        onChange={(e) => updateCompanion(companion.id, { name: e.target.value })}
                        placeholder="TRAVELER NAME"
                        className="flex-1 h-9 bg-[#07090A] border border-[rgba(124,252,154,0.14)] px-3 font-mono text-xs text-[#D7E4DC] placeholder:text-[#6E7F74] focus:outline-none focus:border-[#7CFC9A]/50"
                      />
                      <button
                        onClick={() => setCompanions((prev) => prev.filter((c) => c.id !== companion.id))}
                        className="p-2 text-[#6E7F74] hover:text-[#FF6B5E] transition-colors"
                        title="Remove traveler"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      {[
                        { key: 'tripType', label: 'TYPE', options: ['relaxed', 'adventurous', 'romantic', 'family', 'luxury'] },
                        { key: 'pace', label: 'PACE', options: ['relaxed', 'balanced', 'packed'] },
                        { key: 'budget', label: 'BUDGET', options: ['25000', '50000', '100000', '250000'] },
                        { key: 'climatePreference', label: 'CLIMATE', options: ['tropical', 'cold', 'temperate', 'any'] },
                        { key: 'transportPreference', label: 'TRANSIT', options: ['flight', 'train', 'car', 'mixed'] },
                      ].map((voteDef) => (
                        <div key={voteDef.key} className="font-mono">
                          <div className="text-[9px] tracking-[0.2em] text-[#82958A] mb-1">{voteDef.label}</div>
                          <select
                            value={companion.votes[voteDef.key] || ''}
                            onChange={(e) => updateCompanionVote(companion.id, voteDef.key, e.target.value)}
                            className="w-full h-8 bg-[#07090A] border border-[rgba(124,252,154,0.14)] text-[#D7E4DC] text-[10px] px-1.5 focus:outline-none focus:border-[#7CFC9A]/50"
                          >
                            <option value="">—</option>
                            {voteDef.options.map((opt) => (
                              <option key={opt} value={opt}>{opt.toUpperCase()}</option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-5 mt-5 border-t border-[rgba(124,252,154,0.12)] font-mono">
                <Button
                  variant="outline"
                  onClick={addCompanion}
                  className="border-[rgba(124,252,154,0.2)] text-[#82958A] hover:text-[#D7E4DC] text-[10px] tracking-[0.15em] rounded-none"
                >
                  <Plus className="w-3 h-3 mr-1.5" /> ADD TRAVELER
                </Button>
                <Button onClick={submitVotes} className="bg-[#7CFC9A] text-[#07100B] ml-auto text-[10px] tracking-[0.15em] rounded-none shadow-glow">
                  EXECUTE CONSENSUS ▸
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </AtlasShell>
  );
}
