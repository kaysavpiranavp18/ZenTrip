'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Search, Trash2, Copy, ChevronRight, Plus, Radar as RadarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Navbar from '@/components/shared/Navbar';
import { useTripStore } from '@/store/useTripStore';
import { toast } from 'sonner';
import type { Trip } from '@/types';
import { cn } from '@/lib/utils';

// ─── Demo flight plan (fully populated — one click to the Ops Board) ──────────

const demoTrip: Trip = {
  id: 'demo-742a',
  title: 'Kerala Backwaters Run',
  destinationSummary: 'Kochi → Alleppey → Marari',
  startDate: '2026-10-12',
  endDate: '2026-10-15',
  duration: 3,
  budget: 42000,
  travelers: 2,
  status: 'completed',
  confidenceScore: 92,
  confidence: 'Excellent Match',
  budgetFit: 'Good',
  weatherFit: 'High',
  routeFit: 'Excellent',
  warnings: ['Houseboat season peaks in October — lock Alleppey stays early.'],
  preferences: {
    destinationIdea: '3 day Kerala backwaters trip for 2, houseboats and quiet beaches',
    startDate: '2026-10-12',
    endDate: '2026-10-15',
    duration: 3,
    budget: 42000,
    currency: 'INR',
    travelers: 2,
    tripType: 'relaxed',
    pace: 'balanced',
    foodPreferences: ['Seafood', 'Local Cuisine'],
    transportPreference: 'car',
    climatePreference: 'tropical',
    accessibilityNeeds: [],
    companions: [],
  },
  destinations: [
    { id: 'd1', name: 'Kochi', country: 'India', description: 'Harbour heritage quarter', score: 10, reasons: ['Fort Kochi walkable grid'], bestSeason: 'Oct–Mar', estimatedCost: 0, climate: 'tropical' },
    { id: 'd2', name: 'Alleppey', country: 'India', description: 'Backwater houseboat hub', score: 9, reasons: ['Houseboat night'], bestSeason: 'Oct–Mar', estimatedCost: 0, climate: 'tropical' },
    { id: 'd3', name: 'Marari', country: 'India', description: 'Quiet fishing beach', score: 8, reasons: ['Low-crowd shoreline'], bestSeason: 'Oct–Mar', estimatedCost: 0, climate: 'tropical' },
  ],
  itinerary: [
    {
      day: 1, date: '2026-10-12', title: 'Fort Kochi grid', description: 'Heritage quarter on foot',
      activities: [
        { id: 'a1', name: 'Fort Kochi heritage walk', description: 'Chinese fishing nets, colonial lanes', type: 'cultural', duration: '2h', timeSlot: 'morning', cost: 500, location: 'Fort Kochi', weatherDependent: true, indoorAlternative: 'Kerala Folklore Museum', score: 9, fitLabel: 'Highly Recommended' },
        { id: 'a2', name: 'Kathakali performance', description: 'Classical dance-drama with makeup demo', type: 'cultural', duration: '1.5h', timeSlot: 'evening', cost: 800, location: 'Kathakali Centre', weatherDependent: false, score: 8, fitLabel: 'Recommended' },
      ],
      meals: [
        { type: 'breakfast', suggestion: 'Kerala puttu and kadala curry', cost: 250, time: '08:00' },
        { type: 'lunch', suggestion: 'Sadya thali near the harbour', cost: 450, time: '13:00' },
        { type: 'dinner', suggestion: 'Seafood grill at the mouth of the backwaters', cost: 900, time: '20:00' },
      ],
      stay: { id: 's1', name: 'Boutique homestay, Fort Kochi', type: 'homestay', description: 'Heritage quarter stay', pricePerNight: 3200, currency: 'INR', rating: 4.4, vibe: ['heritage', 'quiet'], location: 'Fort Kochi', amenities: ['WiFi', 'Breakfast'], score: 8, fitLabel: 'Recommended' },
      weather: { date: '2026-10-12', condition: 'cloudy', tempHigh: 31, tempLow: 25, humidity: 78, windSpeed: 11, precipitation: 30, advisory: 'Favorable for outdoor activities.' },
      notes: '', locked: false, travelLoad: 'Low', walkingLoad: 'Moderate', dailyTransit: '<45 mins',
    },
    {
      day: 2, date: '2026-10-13', title: 'Backwater corridor', description: 'Houseboat night on Vembanad',
      activities: [
        { id: 'a3', name: 'Houseboat cruise, Vembanad Lake', description: 'Overnight kettuvallam through the backwaters', type: 'relaxation', duration: '22h', timeSlot: 'morning', cost: 8500, location: 'Alleppey jetty', weatherDependent: false, score: 10, fitLabel: 'Highly Recommended' },
        { id: 'a4', name: 'Village canoe channel ride', description: 'Narrow canals past paddy and palms', type: 'nature', duration: '1.5h', timeSlot: 'afternoon', cost: 700, location: 'Kainakary', weatherDependent: true, indoorAlternative: 'Coir museum visit', score: 8, fitLabel: 'Recommended' },
      ],
      meals: [
        { type: 'lunch', suggestion: 'Onboard Kerala fish curry and rice', cost: 600, time: '13:00' },
        { type: 'dinner', suggestion: 'Onboard traditional spread', cost: 600, time: '20:30' },
      ],
      stay: { id: 's2', name: 'Kettuvallam houseboat', type: 'villa', description: 'Overnight backwater houseboat', pricePerNight: 8500, currency: 'INR', rating: 4.6, vibe: ['water', 'slow'], location: 'Vembanad Lake', amenities: ['Chef onboard', 'Deck'], score: 9, fitLabel: 'Highly Recommended' },
      weather: { date: '2026-10-13', condition: 'sunny', tempHigh: 32, tempLow: 25, humidity: 72, windSpeed: 9, precipitation: 10, advisory: 'Weather is favorable for outdoor activities.' },
      notes: '', locked: false, travelLoad: 'Low', walkingLoad: 'Low', dailyTransit: '1-2 hours',
    },
    {
      day: 3, date: '2026-10-14', title: 'Marari shoreline', description: 'Slow beach day before the return',
      activities: [
        { id: 'a5', name: 'Marari beach morning', description: 'Quiet fishing-village shoreline', type: 'outdoor', duration: '3h', timeSlot: 'morning', cost: 0, location: 'Mararikulam', weatherDependent: true, indoorAlternative: 'Ayurvedic massage session', score: 9, fitLabel: 'Highly Recommended' },
        { id: 'a6', name: 'Coconut-grove cycle loop', description: 'Flat village lanes between groves', type: 'adventure', duration: '2h', timeSlot: 'evening', cost: 400, location: 'Mararikulam', weatherDependent: true, indoorAlternative: 'Local café crawl', score: 7, fitLabel: 'Recommended' },
      ],
      meals: [
        { type: 'breakfast', suggestion: 'Appam and stew at the homestay', cost: 250, time: '08:30' },
        { type: 'lunch', suggestion: 'Beachside toddy-shop seafood', cost: 500, time: '13:30' },
        { type: 'dinner', suggestion: 'Return-leg dinner in Kochi', cost: 800, time: '20:00' },
      ],
      stay: { id: 's3', name: 'Beach resort, Marari', type: 'resort', description: 'Final-night shoreline stay', pricePerNight: 5100, currency: 'INR', rating: 4.3, vibe: ['beach'], location: 'Mararikulam', amenities: ['Pool', 'WiFi'], score: 8, fitLabel: 'Recommended' },
      weather: { date: '2026-10-14', condition: 'sunny', tempHigh: 31, tempLow: 25, humidity: 74, windSpeed: 12, precipitation: 15, advisory: 'Weather is favorable for outdoor activities.' },
      notes: '', locked: true, travelLoad: 'Low', walkingLoad: 'Low', dailyTransit: '<45 mins',
    },
  ],
  budgetBreakdown: {
    total: 42000,
    allocated: 42000,
    remaining: 0,
    items: [
      { category: 'stay', label: 'Lodging', amount: 16800, currency: 'INR' },
      { category: 'activities', label: 'Activities', amount: 10900, currency: 'INR' },
      { category: 'food', label: 'Meals', amount: 6300, currency: 'INR' },
      { category: 'transport', label: 'Transport', amount: 5000, currency: 'INR' },
      { category: 'buffer', label: 'Buffer', amount: 3000, currency: 'INR' },
    ],
    warnings: [],
  },
  route: {
    segments: [
      { from: 'Kochi', to: 'Alleppey', mode: 'car', duration: '1h 30m', distance: '53km', cost: 1500, notes: 'Southbound NH66' },
      { from: 'Alleppey', to: 'Marari', mode: 'car', duration: '45m', distance: '30km', cost: 900 },
      { from: 'Marari', to: 'Kochi', mode: 'car', duration: '1h 15m', distance: '45km', cost: 1200 },
    ],
    totalDistance: '128km',
    totalDuration: '3h 30m',
    warnings: [],
  },
  agents: [
    { id: 'intent', name: 'Intent Agent', icon: '🎯', description: 'Parsing intent', status: 'completed', progress: 100, outputSummary: 'Parsed: weekend trip' },
    { id: 'destination', name: 'Destination Grounding', icon: '🌍', description: 'Grounding', status: 'completed', progress: 100, outputSummary: 'Grounded: Kochi' },
    { id: 'budget', name: 'Budget Agent', icon: '💰', description: 'Allocating', status: 'completed', progress: 100, outputSummary: '₹42,000 allocated' },
    { id: 'route', name: 'Route Agent', icon: '🗺️', description: 'Routing', status: 'completed', progress: 100, outputSummary: '3 route segments' },
    { id: 'weather', name: 'Weather Agent', icon: '🌤️', description: 'Weather', status: 'completed', progress: 100, outputSummary: '3 day forecast' },
    { id: 'activities', name: 'Activities Agent', icon: '🎪', description: 'Curating', status: 'completed', progress: 100, outputSummary: '6 activities' },
    { id: 'planner', name: 'Itinerary Planner', icon: '📅', description: 'Planning', status: 'completed', progress: 100, outputSummary: '3 days planned' },
    { id: 'supervisor', name: 'Supervisor Agent', icon: '⭐', description: 'Validating', status: 'completed', progress: 100, outputSummary: '92% confidence' },
  ],
  weatherSnapshots: [
    { date: '2026-10-12', condition: 'cloudy', tempHigh: 31, tempLow: 25, humidity: 78, windSpeed: 11, precipitation: 30, advisory: 'Favorable for outdoor activities.' },
    { date: '2026-10-13', condition: 'sunny', tempHigh: 32, tempLow: 25, humidity: 72, windSpeed: 9, precipitation: 10, advisory: 'Weather is favorable for outdoor activities.' },
    { date: '2026-10-14', condition: 'sunny', tempHigh: 31, tempLow: 25, humidity: 74, windSpeed: 12, precipitation: 15, advisory: 'Weather is favorable for outdoor activities.' },
  ],
  localExperiences: [],
  locked: false,
  createdAt: '2026-09-01T09:00:00.000Z',
  updatedAt: '2026-09-01T09:00:00.000Z',
};

// ─── Date formatting ────────────────────────────────────────────────────────

function fmtDateRange(startDate: string | null, duration: number): string {
  if (!startDate) return 'DATES TBD';
  const start = new Date(startDate);
  if (isNaN(start.getTime())) return 'DATES TBD';
  const end = new Date(start);
  end.setDate(end.getDate() + Math.max(0, duration - 1));
  const sameMonth = start.getMonth() === end.getMonth();
  const day = (d: Date) => String(d.getDate()).padStart(2, '0');
  const mon = (d: Date) => d.toLocaleString('en-GB', { month: 'short' }).toUpperCase();
  return sameMonth ? `${day(start)}–${day(end)} ${mon(start)}` : `${day(start)} ${mon(start)}–${day(end)} ${mon(end)}`;
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const { savedTrips, removeSavedTrip, addSavedTrip, setCurrentTrip, userPreferences } = useTripStore();

  const trips = savedTrips;
  const filtered = trips.filter(
    (t) =>
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.destinationSummary.toLowerCase().includes(search.toLowerCase())
  );

  const loadDemo = () => {
    setCurrentTrip(demoTrip);
    addSavedTrip(demoTrip);
    toast.success('Demo plan loaded — opening ops board');
    router.push(`/trip/${demoTrip.id}`);
  };

  const handleDuplicate = (trip: Trip) => {
    const copy: Trip = {
      ...trip,
      id: `zt-${Math.random().toString(36).slice(2, 6)}`,
      title: `${trip.title} — COPY`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    addSavedTrip(copy);
    toast.success('Plan duplicated');
  };

  const handleDelete = (id: string) => {
    removeSavedTrip(id);
    toast.success('Plan struck from records');
  };

  const avgConf = trips.length ? Math.round(trips.reduce((a, t) => a + t.confidenceScore, 0) / trips.length) : 0;
  const totalDays = trips.reduce((a, t) => a + t.duration, 0);
  const totalFuel = trips.reduce((a, t) => a + t.budget, 0);

  const memoryHighlights = [
    userPreferences.tripType && `PROFILE: ${String(userPreferences.tripType).toUpperCase()}`,
    userPreferences.pace && `PACE: ${String(userPreferences.pace).toUpperCase()}`,
    userPreferences.transportPreference && `TRANSIT: ${String(userPreferences.transportPreference).toUpperCase()}`,
    userPreferences.foodPreferences?.length ? `FOOD: ${userPreferences.foodPreferences.slice(0, 2).join(', ').toUpperCase()}` : null,
  ].filter(Boolean) as string[];

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="pt-24 pb-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 font-mono"
        >
          <div>
            <div className="text-[10px] tracking-[0.25em] text-[#82958A] mb-1">ZENTRIP OPS / SAVED ITINERARIES</div>
            <h1 className="text-2xl font-bold text-[#D7E4DC] tracking-[0.1em]">HANGAR</h1>
            <p className="text-[11px] text-[#82958A] mt-1">Your AI-planned trip itineraries, stored in this browser.</p>
          </div>
          <Link href="/trip/new">
            <Button className="bg-[#7CFC9A] text-[#07100B] hover:bg-[#7CFC9A]/85 font-mono text-xs tracking-[0.15em] h-10 px-5 rounded-none shadow-glow">
              <Plus className="w-3.5 h-3.5 mr-1.5" /> NEW PLAN ▸
            </Button>
          </Link>
        </motion.div>

        {/* Telemetry */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="hud-corner grid grid-cols-2 md:grid-cols-4 gap-6 px-6 py-5 mb-6 font-mono"
        >
          {[
            { value: String(trips.length), label: 'TRIPS PLANNED' },
            { value: String(totalDays), label: 'TOTAL DAYS' },
            { value: `₹${(totalFuel / 1000).toFixed(0)}K`, label: 'TOTAL BUDGET' },
            { value: trips.length ? `${avgConf}%` : '—', label: 'AVG CONFIDENCE' },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="text-2xl font-bold text-[#7CFC9A]">{stat.value}</div>
              <div className="text-[9px] tracking-[0.2em] text-[#82958A] mt-1">{stat.label}</div>
            </div>
          ))}
        </motion.div>

        {/* Memory strip */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-dashed border-[rgba(124,252,154,0.14)] px-5 py-3.5 mb-8 font-mono"
        >
          <span className="text-[9px] tracking-[0.25em] text-[#82958A] shrink-0">YOUR TRAVEL PROFILE</span>
          <div className="flex flex-wrap gap-2 flex-1">
            {memoryHighlights.length ? memoryHighlights.map((item) => (
              <span key={item} className="px-2 py-0.5 border border-[rgba(124,252,154,0.14)] text-[9px] tracking-[0.1em] text-[#82958A]">
                {item}
              </span>
            )) : (
              <span className="text-[10px] tracking-[0.1em] text-[#6E7F74]">NO PREFERENCES YET — SET THEM IN SETTINGS</span>
            )}
          </div>
          <Link href="/settings" className="text-[9px] tracking-[0.2em] text-[#7CFC9A] hover:underline shrink-0">
            EDIT ▸
          </Link>
        </motion.div>

        {/* Command-line search */}
        {trips.length > 0 && (
          <div className="relative mb-5 font-mono">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#6E7F74]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="search hangar records…"
              className="w-full bg-[#0D1210] border border-[rgba(124,252,154,0.14)] pl-9 pr-4 h-11 font-mono text-xs text-[#D7E4DC] placeholder:text-[#6E7F74] focus:outline-none focus:border-[#7CFC9A]/50"
            />
          </div>
        )}

        {/* Flight strips */}
        {filtered.length > 0 ? (
          <div className="hud-corner">
            <div className="hidden sm:grid grid-cols-[84px_1fr_120px_60px_100px_70px_110px_80px] gap-3 px-5 py-3 border-b border-[rgba(124,252,154,0.12)] font-mono text-[9px] tracking-[0.2em] text-[#82958A]">
              <span>CODE</span>
              <span>DESTINATION</span>
              <span>DATES</span>
              <span>DAYS</span>
              <span>TRAVELERS</span>
              <span>BUDGET</span>
              <span>CONF</span>
              <span>STATUS</span>
              <span className="text-right">OPS</span>
            </div>

            {filtered.map((trip, i) => (
              <motion.div
                key={trip.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => router.push(`/trip/${trip.id}`)}
                className="group cursor-pointer border-b border-[rgba(124,252,154,0.07)] last:border-0 hover:bg-[#131A17] transition-colors font-mono"
              >
                {/* Desktop row */}
                <div className="hidden sm:grid grid-cols-[84px_1fr_120px_60px_100px_70px_110px_80px] gap-3 px-5 py-4 items-center text-xs">
                  <span className="text-[#7CFC9A] text-[11px]">{trip.id.slice(0, 7).toUpperCase()}</span>
                  <div className="min-w-0">
                    <div className="text-[#D7E4DC] truncate">{trip.title}</div>
                    <div className="text-[10px] text-[#82958A] truncate">{trip.destinationSummary}</div>
                  </div>
                  <span className="text-[10px] text-[#82958A]">{fmtDateRange(trip.startDate, trip.duration)}</span>
                  <span className="text-[#D7E4DC]">{trip.duration}D</span>
                  <span className="text-[#D7E4DC]">{trip.travelers}</span>
                  <span className="text-[#D7E4DC]">₹{trip.budget.toLocaleString('en-IN')}</span>
                  <span className={cn(trip.confidenceScore >= 80 ? 'text-[#7CFC9A]' : 'text-[#FFB454]')}>{trip.confidenceScore}%</span>
                  <span className={cn(
                    'text-[9px] tracking-[0.15em] px-2 py-0.5 border w-fit',
                    trip.status === 'completed'
                      ? 'border-[#7CFC9A]/30 text-[#7CFC9A]'
                      : 'border-[#FFB454]/30 text-[#FFB454]'
                  )}>
                    {trip.status.toUpperCase()}
                  </span>
                  <div className="flex items-center justify-end gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDuplicate(trip); }}
                      className="p-1.5 text-[#82958A] hover:text-[#7CFC9A] transition-colors"
                      title="Duplicate"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(trip.id); }}
                      className="p-1.5 text-[#82958A] hover:text-[#FF6B5E] transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <ChevronRight className="w-3.5 h-3.5 text-[#7CFC9A]" />
                  </div>
                </div>

                {/* Mobile row */}
                <div className="sm:hidden px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[11px] text-[#7CFC9A]">{trip.id.slice(0, 7).toUpperCase()}</div>
                      <div className="text-sm text-[#D7E4DC] truncate mt-0.5">{trip.title}</div>
                      <div className="text-[10px] text-[#82958A] truncate">{trip.destinationSummary}</div>
                      <div className="flex items-center gap-2 mt-1.5 text-[10px] text-[#82958A]">
                        <span>{fmtDateRange(trip.startDate, trip.duration)}</span><span className="text-[#4A544E]">/</span>
                        <span>{trip.duration}D</span><span className="text-[#4A544E]">/</span>
                        <span>₹{trip.budget.toLocaleString('en-IN')}</span><span className="text-[#4A544E]">/</span>
                        <span className={trip.confidenceScore >= 80 ? 'text-[#7CFC9A]' : 'text-[#FFB454]'}>{trip.confidenceScore}%</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <div className="flex items-center gap-1">
                        <button onClick={(e) => { e.stopPropagation(); handleDuplicate(trip); }} className="p-1.5 text-[#82958A] hover:text-[#7CFC9A]"><Copy className="w-3.5 h-3.5" /></button>
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(trip.id); }} className="p-1.5 text-[#82958A] hover:text-[#FF6B5E]"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-[#7CFC9A]" />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          /* Empty state */
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="hud-corner py-20 text-center font-mono"
          >
            <div className="w-14 h-14 border border-[rgba(124,252,154,0.25)] flex items-center justify-center mx-auto mb-5">
              <RadarIcon className="w-6 h-6 text-[#82958A]" />
            </div>
            <div className="text-sm font-bold text-[#D7E4DC] tracking-[0.15em] mb-2">NO TRIP PLANS ON FILE</div>
            <p className="text-[11px] tracking-[0.1em] text-[#82958A] mb-8">
              {search ? 'NO RECORDS MATCH THE QUERY' : 'FILE YOUR FIRST PLAN — OR INSPECT THE DEMO'}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/trip/new">
                <Button className="bg-[#7CFC9A] text-[#07100B] hover:bg-[#7CFC9A]/85 font-mono text-xs tracking-[0.15em] h-11 px-6 rounded-none shadow-glow">
                  INITIATE TRIP ▸
                </Button>
              </Link>
              <Button
                variant="outline"
                onClick={loadDemo}
                className="border-[rgba(124,252,154,0.25)] text-[#7CFC9A] hover:bg-[#7CFC9A]/10 font-mono text-xs tracking-[0.15em] h-11 px-6 rounded-none"
              >
                LOAD DEMO PLAN
              </Button>
            </div>
          </motion.div>
        )}

        {/* Demo access when trips exist */}
        {trips.length > 0 && (
          <div className="mt-4 flex justify-end">
            <button onClick={loadDemo} className="font-mono text-[10px] tracking-[0.2em] text-[#82958A] hover:text-[#7CFC9A] transition-colors">
              + LOAD DEMO PLAN (ZT-DEMO)
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
