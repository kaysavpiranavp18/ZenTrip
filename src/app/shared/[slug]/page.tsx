'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, ChevronDown, ChevronRight, Wind, Umbrella, AlertTriangle, Globe,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Navbar from '@/components/shared/Navbar';
import BudgetChart from '@/components/trip/BudgetChart';
import TripRouteMap from '@/components/trip/TripRouteMap';
import type { Trip, DayPlan, WeatherForecast } from '@/types';
import { cn } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────────────────────

type AccessLevel = 'view' | 'comment' | 'edit';

interface SharedTripData {
  trip: Trip;
  accessLevel: AccessLevel;
  expiresAt: string | null;
  slug: string;
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function AccessBadge({ level }: { level: AccessLevel }) {
  const config = {
    view: { label: 'VIEW ONLY', cls: 'border-[rgba(124,252,154,0.14)] text-[#82958A]' },
    comment: { label: 'CAN COMMENT', cls: 'border-[#FFB454]/30 text-[#FFB454]' },
    edit: { label: 'CAN EDIT', cls: 'border-[#7CFC9A]/30 text-[#7CFC9A]' },
  }[level];
  return (
    <span className={cn('text-[9px] tracking-[0.2em] px-2 py-0.5 border font-mono', config.cls)}>
      {config.label}
    </span>
  );
}

function weatherGlyph(condition: string): string {
  return condition === 'rainy' ? '🌧' : condition === 'sunny' ? '☀' : '⛅';
}

function DayCard({ day, index }: { day: DayPlan; index: number }) {
  const [expanded, setExpanded] = useState(index === 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="hud-corner"
    >
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center justify-between p-4 hover:bg-[#131A17] transition-colors font-mono text-left">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 border border-[rgba(124,252,154,0.3)] flex items-center justify-center text-sm font-bold text-[#7CFC9A] shrink-0">
            {String(day.day).padStart(2, '0')}
          </div>
          <div>
            <span className="text-[#D7E4DC] font-semibold text-sm tracking-[0.05em] block">{day.title}</span>
            <span className="text-[10px] tracking-[0.1em] text-[#82958A]">
              {day.date} · {day.activities.length} ACTIVITIES{day.locked ? ' · LOCKED' : ''}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {day.weather && (
            <span className="hidden sm:block text-[10px] tracking-[0.1em] text-[#82958A]">
              {weatherGlyph(day.weather.condition)} {day.weather.tempHigh}°/{day.weather.tempLow}°
            </span>
          )}
          {expanded ? <ChevronDown className="w-4 h-4 text-[#82958A]" /> : <ChevronRight className="w-4 h-4 text-[#82958A]" />}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-[rgba(124,252,154,0.1)]">
            <div className="p-4 space-y-4 font-mono">
              {/* Activities — timeline */}
              <div className="space-y-0">
                {day.activities.map((act) => (
                  <div key={act.id} className="flex items-start gap-3 py-2 border-b border-dashed border-[rgba(124,252,154,0.08)] last:border-0">
                    <span className={cn(
                      'w-1.5 h-1.5 rotate-45 mt-1.5 shrink-0',
                      act.weatherDependent ? 'bg-[#7CFC9A]' : 'border border-[#FFB454]'
                    )} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs text-[#D7E4DC] truncate">{act.name}</span>
                        <span className="text-[10px] text-[#82958A] shrink-0">{act.cost > 0 ? `₹${act.cost.toLocaleString('en-IN')}` : 'FREE'}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[9px] tracking-[0.1em] text-[#82958A]">
                        <span>{act.duration.toUpperCase()}</span>
                        <span className="text-[#4A544E]">/</span>
                        <span>{act.type.toUpperCase()}</span>
                        {act.fitLabel && (
                          <>
                            <span className="text-[#4A544E]">/</span>
                            <span className="text-[#7CFC9A]">{act.fitLabel.toUpperCase()}</span>
                          </>
                        )}
                        {act.weatherDependent && day.weather?.condition === 'rainy' && act.indoorAlternative && (
                          <span className="text-[#FFB454]">→ WX-DEP: {act.indoorAlternative.toUpperCase()}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Meals */}
              <div className="border border-dashed border-[rgba(124,252,154,0.14)] p-3">
                <div className="text-[9px] tracking-[0.25em] text-[#82958A] mb-2">FOOD</div>
                <div className="grid grid-cols-3 gap-3">
                  {day.meals.map((meal, i) => (
                    <div key={i}>
                      <div className="text-[9px] tracking-[0.15em] text-[#82958A]">{meal.type.toUpperCase()}{meal.time ? ` ${meal.time}` : ''}</div>
                      <div className="text-[10px] text-[#D7E4DC] truncate mt-0.5">{meal.suggestion}</div>
                      <div className="text-[9px] text-[#82958A] mt-0.5">₹{meal.cost.toLocaleString('en-IN')}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Lodging */}
              {day.stay && (
                <div className="flex items-center justify-between border border-[rgba(124,252,154,0.1)] px-3 py-2 text-[10px]">
                  <span className="tracking-[0.2em] text-[#82958A]">LODGING</span>
                  <span className="text-[#D7E4DC] truncate">{day.stay.name} · ₹{day.stay.pricePerNight.toLocaleString('en-IN')}/NIGHT</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function WeatherCard({ forecast }: { forecast: WeatherForecast }) {
  return (
    <div className="flex items-center gap-4 border border-[rgba(124,252,154,0.1)] px-4 py-3 font-mono">
      <div className="text-xl shrink-0">{weatherGlyph(forecast.condition)}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-xs text-[#D7E4DC] tracking-[0.1em]">{forecast.date}</span>
          <span className="text-xs text-[#D7E4DC]">{forecast.tempHigh}° / {forecast.tempLow}°</span>
        </div>
        <div className="flex items-center gap-3 mt-0.5 text-[9px] tracking-[0.1em] text-[#82958A]">
          <span>{forecast.condition.toUpperCase()}</span>
          <span className="flex items-center gap-1"><Umbrella className="w-2.5 h-2.5" />{forecast.precipitation}%</span>
          <span className="flex items-center gap-1"><Wind className="w-2.5 h-2.5" />{forecast.windSpeed} KM/H</span>
        </div>
        {forecast.advisory && <p className="text-[9px] text-[#FFB454] mt-1 tracking-[0.05em]">{forecast.advisory.toUpperCase()}</p>}
      </div>
    </div>
  );
}

// ─── Loading skeleton ───────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="pt-24 max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="animate-pulse space-y-6 font-mono">
          <div className="h-3 w-48 bg-[#131A17]" />
          <div className="h-8 w-72 bg-[#131A17]" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-20 bg-[#0D1210] border border-[rgba(124,252,154,0.1)]" />)}
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-[#0D1210] border border-[rgba(124,252,154,0.1)]" />)}
          </div>
        </div>
      </main>
    </div>
  );
}

// ─── Main page ──────────────────────────────────────────────────────────────────

export default function SharedTripPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;

  const [data, setData] = useState<SharedTripData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'itinerary' | 'budget' | 'route' | 'weather'>('itinerary');

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/shared/${slug}`)
      .then(async (r) => {
        const payload = await r.json();
        if (!payload.success) throw new Error(payload.error || 'Failed to load shared trip');
        setData(payload.data as SharedTripData);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (data && typeof window !== 'undefined') {
      const search = new URL(window.location.href).searchParams;
      if (search.get('print') === 'true') {
        setTimeout(() => {
          window.print();
        }, 1200);
      }
    }
  }, [data]);

  if (loading) return <LoadingSkeleton />;

  if (error || !data) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <main className="pt-32 flex items-center justify-center min-h-[60vh] px-4">
          <div className="text-center font-mono">
            <div className="text-[10px] tracking-[0.3em] text-[#FF6B5E] mb-4">✕ SIGNAL LOST</div>
            <h2 className="text-2xl font-bold text-[#D7E4DC] tracking-[0.1em] mb-3">LINK UNAVAILABLE</h2>
            <p className="text-[11px] tracking-[0.1em] text-[#82958A] mb-8">{error || 'THIS SHARE LINK IS INVALID OR HAS EXPIRED.'}</p>
            <Button onClick={() => router.push('/')} className="bg-[#7CFC9A] text-[#07100B] hover:bg-[#7CFC9A]/85 font-mono text-xs tracking-[0.15em] h-11 px-6 rounded-none shadow-glow">
              RETURN TO CONTROL TOWER ▸
            </Button>
          </div>
        </main>
      </div>
    );
  }

  const { trip, accessLevel, expiresAt } = data;
  const totalActivities = trip.itinerary.reduce((a, d) => a + d.activities.length, 0);

  const tabs = [
    { id: 'itinerary', label: 'TIMELINE' },
    { id: 'budget', label: 'BUDGET' },
    { id: 'route', label: 'ROUTE' },
    { id: 'weather', label: 'WX' },
  ] as const;

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="pt-16">
        {/* Header — flight plan distribution strip */}
        <div className="sticky top-16 z-40 bg-[#0D1210]/95 backdrop-blur border-b border-[rgba(124,252,154,0.12)]">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 font-mono">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <button onClick={() => router.push('/')} className="p-1.5 border border-[rgba(124,252,154,0.14)] hover:border-[#7CFC9A]/50 text-[#82958A] hover:text-[#7CFC9A] transition-colors shrink-0">
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="min-w-0">
                  <div className="text-[9px] tracking-[0.25em] text-[#82958A]">INCOMING DISTRIBUTION · {slug.toUpperCase()}</div>
                  <h1 className="text-base font-bold text-[#D7E4DC] tracking-[0.05em] truncate">{trip.title}</h1>
                  <p className="text-[10px] tracking-[0.1em] text-[#82958A] truncate">
                    {trip.destinationSummary} · {trip.duration} DAYS · TRAVELERS {trip.travelers}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <AccessBadge level={accessLevel} />
                <span className={cn('text-[9px] tracking-[0.2em] px-2 py-0.5 border',
                  trip.confidenceScore >= 80 ? 'border-[#7CFC9A]/30 text-[#7CFC9A]' : 'border-[#FFB454]/30 text-[#FFB454]')}>
                  CONF {trip.confidenceScore}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Distribution notice */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 mt-4">
          <div className="flex items-center gap-3 border border-dashed border-[rgba(124,252,154,0.2)] px-4 py-3 font-mono text-[10px] tracking-[0.1em] text-[#82958A]">
            <Globe className="w-3.5 h-3.5 text-[#7CFC9A] shrink-0" />
            <span>
              READ-ONLY DISTRIBUTION. {expiresAt ? `LINK EXPIRES ${new Date(expiresAt).toLocaleDateString().toUpperCase()}.` : 'NO EXPIRY SET.'}{' '}
              <button onClick={() => router.push('/trip/new')} className="text-[#7CFC9A] hover:underline">
                FILE YOUR OWN PLAN ▸
              </button>
            </span>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 pb-28 sm:pb-10">
          {/* Telemetry */}
          <div className="hud-corner grid grid-cols-2 md:grid-cols-4 gap-6 px-6 py-5 mb-6 font-mono">
            {[
              { value: String(trip.destinations.length), label: 'DESTINATIONS' },
              { value: String(totalActivities), label: 'ACTIVITIES' },
              { value: `₹${(trip.budget / 1000).toFixed(0)}K`, label: 'TOTAL BUDGET' },
              { value: `${trip.duration}D`, label: 'DURATION' },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-2xl font-bold text-[#7CFC9A]">{stat.value}</div>
                <div className="text-[9px] tracking-[0.2em] text-[#82958A] mt-1">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex gap-0 border-b border-[rgba(124,252,154,0.12)] mb-6 font-mono overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'px-5 py-2.5 text-[10px] tracking-[0.25em] border-b-2 -mb-px transition-colors whitespace-nowrap',
                  activeTab === tab.id
                    ? 'border-[#7CFC9A] text-[#7CFC9A]'
                    : 'border-transparent text-[#82958A] hover:text-[#D7E4DC]'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'itinerary' && (
            <div className="space-y-3">
              {trip.itinerary.map((day, idx) => <DayCard key={day.day} day={day} index={idx} />)}
              {trip.itinerary.length === 0 && (
                <div className="hud-corner py-12 text-center font-mono text-[11px] tracking-[0.15em] text-[#82958A]">
                  NO TIMELINE DATA IN THIS DISTRIBUTION
                </div>
              )}
            </div>
          )}

          {activeTab === 'budget' && (
            <div className="hud-corner p-6 font-mono">
              <div className="text-[9px] tracking-[0.25em] text-[#82958A] mb-5">BUDGET BREAKDOWN</div>
              <BudgetChart budget={trip.budgetBreakdown} />
            </div>
          )}

          {activeTab === 'route' && (
            <div className="hud-corner p-6 font-mono">
              <div className="text-[9px] tracking-[0.25em] text-[#82958A] mb-5">ROUTE OVERVIEW</div>
              <TripRouteMap route={trip.route} destinations={trip.destinations} />
            </div>
          )}

          {activeTab === 'weather' && (
            <div className="hud-corner p-6 font-mono">
              <div className="text-[9px] tracking-[0.25em] text-[#82958A] mb-5">WX OUTLOOK</div>
              <div className="space-y-2">
                {trip.weatherSnapshots.map((f, i) => <WeatherCard key={i} forecast={f} />)}
                {trip.weatherSnapshots.length === 0 && (
                  <div className="py-8 text-center text-[11px] tracking-[0.15em] text-[#82958A]">NO WX DATA ATTACHED</div>
                )}
              </div>
            </div>
          )}

          {/* Warnings */}
          {trip.warnings.length > 0 && (
            <div className="border border-[#FFB454]/25 mt-6 p-4 font-mono">
              <div className="text-[9px] tracking-[0.25em] text-[#FFB454] flex items-center gap-2 mb-3">
                <AlertTriangle className="w-3.5 h-3.5" />PLAN NOTICES
              </div>
              {trip.warnings.map((w, i) => <p key={i} className="text-xs text-[#82958A] leading-relaxed">{w}</p>)}
            </div>
          )}

          {/* CTA */}
          <div className="hud-corner p-10 text-center mt-8 font-mono">
            <div className="text-[9px] tracking-[0.3em] text-[#7CFC9A] mb-3">◉ TOWER STANDING BY</div>
            <h3 className="text-xl font-bold text-[#D7E4DC] tracking-[0.08em] mb-2">WANT YOUR OWN?</h3>
            <p className="text-[11px] tracking-[0.1em] text-[#82958A] mb-7">
              DESCRIBE THE TRIP — NINE AGENTS FILE THE PLAN IN UNDER 90 SECONDS.
            </p>
            <Button onClick={() => router.push('/trip/new')} className="bg-[#7CFC9A] text-[#07100B] hover:bg-[#7CFC9A]/85 font-mono text-xs tracking-[0.2em] h-11 px-8 rounded-none shadow-glow">
              INITIATE TRIP ▸
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
