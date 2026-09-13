'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Save, Loader2, ArrowLeft, Edit3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Navbar from '@/components/shared/Navbar';
import { useTripStore } from '@/store/useTripStore';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import Link from 'next/link';
import type { Trip } from '@/types';

// ─── Trip record row ────────────────────────────────────────────────────────────

function TripRow({ trip, index }: { trip: Trip; index: number }) {
  return (
    <Link href={`/trip/${trip.id}`}>
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.04 }}
        className="group grid grid-cols-[72px_1fr_auto] gap-3 items-center px-4 py-3 border-b border-[rgba(124,252,154,0.07)] last:border-0 hover:bg-[#131A17] transition-colors font-mono"
      >
        <span className="text-[#7CFC9A] text-[10px]">{trip.id.slice(0, 6).toUpperCase()}</span>
        <div className="min-w-0">
          <div className="text-xs text-[#D7E4DC] truncate">{trip.title}</div>
          <div className="text-[10px] text-[#82958A] truncate">{trip.destinationSummary}</div>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-[#82958A] shrink-0">
          <span>{trip.duration}D</span>
          <span>₹{(trip.budget / 1000).toFixed(0)}K</span>
          <span className={cn(trip.confidenceScore >= 80 ? 'text-[#7CFC9A]' : 'text-[#FFB454]')}>{trip.confidenceScore}%</span>
        </div>
      </motion.div>
    </Link>
  );
}

// ─── Main page ──────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const router = useRouter();
  const { savedTrips, userPreferences } = useTripStore();

  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [displayName, setDisplayName] = useState('Traveler');
  const [bio, setBio] = useState('Passionate traveler exploring the world one trip at a time.');

  // Identity lives in this browser only — no accounts, no sync, nothing leaves the terminal.
  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 250)); // deliberate terminal pause
      toast.success('Crew manifest updated');
      setEditing(false);
    } finally {
      setLoading(false);
    }
  };

  const totalDays = savedTrips.reduce((a, t) => a + t.duration, 0);
  const totalBudget = savedTrips.reduce((a, t) => a + t.budget, 0);
  const avgScore = savedTrips.length > 0
    ? Math.round(savedTrips.reduce((a, t) => a + t.confidenceScore, 0) / savedTrips.length)
    : 0;

  const dna: Array<[string, string]> = [
    ['PROFILE', String(userPreferences.tripType || '—').toUpperCase()],
    ['PACE', String(userPreferences.pace || '—').toUpperCase()],
    ['TRANSIT', String(userPreferences.transportPreference || '—').toUpperCase()],
    ['FOOD', (userPreferences.foodPreferences?.length ? userPreferences.foodPreferences.slice(0, 2).join(', ') : '—').toUpperCase()],
    ['CLIMATE', String(userPreferences.climatePreference || '—').toUpperCase()],
  ];

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="pt-24 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto pb-28 sm:pb-20 font-mono">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="text-[#82958A] hover:text-[#7CFC9A] transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="text-[10px] tracking-[0.25em] text-[#82958A] mb-1">ZENTRIP OPS / PERSONNEL</div>
              <h1 className="text-2xl font-bold text-[#D7E4DC] tracking-[0.1em]">CREW MANIFEST</h1>
              <p className="text-[11px] text-[#82958A] mt-1">Your profile, travel style, and saved itineraries.</p>
            </div>
          </div>
        </motion.div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* ── Left rail: identity card ── */}
          <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} className="lg:w-80 shrink-0 space-y-4">
            {/* Identity */}
            <div className="hud-corner p-6">
              <div className="flex items-start justify-between mb-5">
                <div className="text-[9px] tracking-[0.25em] text-[#82958A]">OPERATOR RECORD</div>
                <div className="text-[9px] tracking-[0.15em] px-2 py-0.5 border border-[#7CFC9A]/30 text-[#7CFC9A]">
                  LOCAL MODE
                </div>
              </div>

              {/* Callsign block — like a passport data page */}
              <div className="w-16 h-16 border border-[rgba(124,252,154,0.3)] flex items-center justify-center mb-4">
                <span className="text-2xl font-bold text-[#7CFC9A]">{displayName.charAt(0).toUpperCase()}</span>
              </div>

              {editing ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[9px] tracking-[0.25em] text-[#82958A] mb-1">CALLSIGN</label>
                    <Input
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="h-10 bg-[#0D1210] border-[rgba(124,252,154,0.14)] text-[#D7E4DC] rounded-none font-mono text-xs focus:border-[#7CFC9A]/50"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] tracking-[0.25em] text-[#82958A] mb-1">SERVICE LOG</label>
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      rows={2}
                      className="w-full bg-[#0D1210] border border-[rgba(124,252,154,0.14)] text-[#D7E4DC] rounded-none font-mono text-xs p-2 resize-none focus:outline-none focus:border-[#7CFC9A]/50"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleSaveProfile} disabled={loading} size="sm"
                      className="flex-1 bg-[#7CFC9A] text-[#07100B] hover:bg-[#7CFC9A]/85 font-mono text-[10px] tracking-[0.15em] rounded-none h-9">
                      {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3 mr-1" />}
                      COMMIT
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setEditing(false)}
                      className="text-[#82958A] hover:text-[#D7E4DC] font-mono text-[10px] tracking-[0.15em] h-9 rounded-none">
                      ABORT
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="text-lg font-bold text-[#D7E4DC] tracking-[0.05em]">{displayName.toUpperCase()}</div>
                  <div className="mt-3 pt-3 border-t border-dashed border-[rgba(124,252,154,0.14)] text-[11px] text-[#82958A] leading-relaxed">
                    {bio}
                  </div>
                  <button onClick={() => setEditing(true)}
                    className="mt-4 flex items-center gap-1.5 text-[9px] tracking-[0.2em] text-[#82958A] hover:text-[#7CFC9A] transition-colors">
                    <Edit3 className="w-3 h-3" />AMEND RECORD
                  </button>
                </>
              )}
            </div>

            {/* Travel DNA — config readout */}
            <div className="hud-corner p-5">
              <div className="text-[9px] tracking-[0.25em] text-[#82958A] mb-4">TRAVEL DNA — LAST FILED PREFS</div>
              <div className="space-y-2.5">
                {dna.map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-3 text-[10px]">
                    <span className="tracking-[0.2em] text-[#82958A]">{label}</span>
                    <span className="text-[#D7E4DC] tracking-[0.08em] truncate">{value}</span>
                  </div>
                ))}
              </div>
              <Link href="/settings" className="block mt-5 text-[9px] tracking-[0.2em] text-[#7CFC9A] hover:underline">
                AMEND PREFS ▸
              </Link>
            </div>

            {/* Data note */}
            <div className="border border-dashed border-[rgba(124,252,154,0.14)] px-4 py-3 text-[10px] text-[#6E7F74] leading-relaxed">
              NO ACCOUNT. NO CLOUD. PLANS AND PREFS RESIDE IN THIS BROWSER ONLY.
            </div>
          </motion.div>

          {/* ── Right: telemetry + records ── */}
          <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} className="flex-1 min-w-0 space-y-6">
            {/* Telemetry */}
            <div className="hud-corner grid grid-cols-2 md:grid-cols-4 gap-6 px-6 py-5">
              {[
                { value: String(savedTrips.length), label: 'TRIPS PLANNED' },
                { value: String(totalDays), label: 'TOTAL DAYS' },
                { value: `₹${(totalBudget / 1000).toFixed(0)}K`, label: 'TOTAL BUDGET' },
                { value: avgScore > 0 ? `${avgScore}%` : '—', label: 'AVG CONFIDENCE' },
              ].map((stat) => (
                <div key={stat.label}>
                  <div className="text-2xl font-bold text-[#7CFC9A]">{stat.value}</div>
                  <div className="text-[9px] tracking-[0.2em] text-[#82958A] mt-1">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* FOOD chips */}
            {(userPreferences.foodPreferences?.length ?? 0) > 0 && (
              <div className="border border-dashed border-[rgba(124,252,154,0.14)] px-5 py-3.5">
                <div className="text-[9px] tracking-[0.25em] text-[#82958A] mb-2">FOOD PREFERENCES</div>
                <div className="flex flex-wrap gap-2">
                  {userPreferences.foodPreferences?.map((pref) => (
                    <span key={pref} className="px-2 py-0.5 border border-[rgba(124,252,154,0.2)] text-[9px] tracking-[0.1em] text-[#7CFC9A]">
                      {pref.toUpperCase()}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Records board */}
            <div className="hud-corner">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(124,252,154,0.12)]">
                <span className="text-[9px] tracking-[0.25em] text-[#82958A]">TRIP PLANS ON FILE</span>
                <Link href="/dashboard" className="text-[9px] tracking-[0.2em] text-[#7CFC9A] hover:underline">HANGAR ▸</Link>
              </div>
              {savedTrips.length > 0 ? (
                <div>
                  {savedTrips.slice(0, 8).map((trip, i) => <TripRow key={trip.id} trip={trip} index={i} />)}
                </div>
              ) : (
                <div className="py-14 text-center">
                  <div className="text-[11px] tracking-[0.15em] text-[#82958A] mb-6">NO TRIP PLANS ON FILE</div>
                  <div className="flex items-center justify-center gap-3">
                    <Link href="/trip/new">
                      <Button className="bg-[#7CFC9A] text-[#07100B] hover:bg-[#7CFC9A]/85 font-mono text-[10px] tracking-[0.15em] h-10 px-5 rounded-none shadow-glow">
                        FILE A PLAN ▸
                      </Button>
                    </Link>
                    <Link href="/dashboard">
                      <Button variant="outline" className="border-[rgba(124,252,154,0.25)] text-[#7CFC9A] hover:bg-[#7CFC9A]/10 font-mono text-[10px] tracking-[0.15em] h-10 px-5 rounded-none">
                        LOAD DEMO
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Destinations log */}
            {savedTrips.length > 0 && (
              <div className="border border-dashed border-[rgba(124,252,154,0.14)] px-5 py-3.5">
                <div className="text-[9px] tracking-[0.25em] text-[#82958A] mb-2">DESTINATIONS</div>
                <div className="flex flex-wrap gap-2">
                  {Array.from(new Set(savedTrips.flatMap((t) => t.destinationSummary.split('→').map((d) => d.trim())))).slice(0, 14).map((dest, i) => (
                    <span key={i} className="px-2 py-0.5 border border-[rgba(124,252,154,0.14)] text-[9px] tracking-[0.1em] text-[#82958A]">
                      {dest.toUpperCase()}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
