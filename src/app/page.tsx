'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Navbar from '@/components/shared/Navbar';
import { cn } from '@/lib/utils';

// ─── Agent roster (matches the real pipeline) ────────────────────────────────

const AGENTS = [
  { code: 'AGT-01', name: 'INTENT', duty: 'Parse the request' },
  { code: 'AGT-02', name: 'PLACE-RESOLVER', duty: 'Normalize destination' },
  { code: 'AGT-03', name: 'GROUNDING', duty: 'Lock the map grid' },
  { code: 'AGT-04', name: 'BUDGET', duty: 'Allocate fuel' },
  { code: 'AGT-05', name: 'ROUTE', duty: 'Plot the corridor' },
  { code: 'AGT-06', name: 'WEATHER', duty: 'Read the sky' },
  { code: 'AGT-07', name: 'ACTIVITIES', duty: 'Curate the dayplan' },
  { code: 'AGT-08', name: 'PLANNER', duty: 'Build the timeline' },
  { code: 'AGT-09', name: 'SUPERVISOR', duty: 'Clear the plan' },
] as const;

// ─── How-it-works ─────────────────────────────────────────────────────────────

const PHASES = [
  { num: 'P1', title: 'FILE THE PLAN', body: 'Destination, dates, budget, crew. Two minutes of input, mono fields, no fluff.' },
  { num: 'P2', title: 'AGENTS EXECUTE', body: 'Nine specialists run the mission. Every decision logged, every constraint enforced.' },
  { num: 'P3', title: 'REVIEW THE PLAN', body: 'Day-by-day timeline, budget telemetry, route corridor, weather window. Lock what you like.' },
  { num: 'P4', title: 'FLY THE TRIP', body: 'Export the checklist, print the plan, pack the bag. The ops room did the paperwork.' },
] as const;

// ─── Radar ────────────────────────────────────────────────────────────────────

function Radar() {
  // Blip positions in % — delays sync each flash to the sweep's 4s rotation
  const blips = [
    { top: '18%', left: '62%', delay: 0.55 },
    { top: '38%', left: '28%', delay: 1.35 },
    { top: '64%', left: '48%', delay: 2.2 },
    { top: '52%', left: '74%', delay: 3.05 },
    { top: '76%', left: '22%', delay: 3.6 },
  ];

  return (
    <div className="relative w-64 h-64 sm:w-80 sm:h-80 aspect-square">
      {/* Rings */}
      {[100, 75, 50, 25].map((size) => (
        <div
          key={size}
          className="absolute rounded-full border border-[rgba(124,252,154,0.16)]"
          style={{
            width: `${size}%`,
            height: `${size}%`,
            top: `${(100 - size) / 2}%`,
            left: `${(100 - size) / 2}%`,
          }}
        />
      ))}
      {/* Crosshairs */}
      <div className="absolute top-0 bottom-0 left-1/2 w-px bg-[rgba(124,252,154,0.12)]" />
      <div className="absolute left-0 right-0 top-1/2 h-px bg-[rgba(124,252,154,0.12)]" />
      {/* Sweep */}
      <div className="radar-sweep absolute inset-0 rounded-full" />
      {/* Blips */}
      {blips.map((blip, i) => (
        <div
          key={i}
          className="radar-blip absolute w-2 h-2 rounded-full bg-[#7CFC9A]"
          style={{ top: blip.top, left: blip.left, animationDelay: `${blip.delay}s` }}
        />
      ))}
      {/* Center marker */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[9px] font-mono tracking-[0.2em] text-[#82958A]">
        OPS
      </div>
    </div>
  );
}

// ─── Landing page ─────────────────────────────────────────────────────────────

export default function LandingPage() {
  const [clock, setClock] = useState('--:--:--');

  useEffect(() => {
    const tick = () => setClock(new Date().toISOString().slice(11, 19));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen">
      <Navbar transparent />

      {/* ═══ HERO — Control Tower ═══ */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        <div className="scanline" />

        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-24 grid lg:grid-cols-[1.2fr_1fr] gap-16 items-center w-full">
          {/* Copy */}
          <div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
              className="flex items-center gap-3 mb-8 font-mono text-[10px] tracking-[0.25em] text-[#82958A]"
            >
              <span className="w-2 h-2 rounded-full bg-[#7CFC9A] agent-pulse" />
              <span className="text-[#7CFC9A]">ZENTRIP — AI TRIP PLANNER</span>
              <span className="text-[rgba(124,252,154,0.3)]">/</span>
              <span>SYSTEM ONLINE</span>
              <span className="text-[rgba(124,252,154,0.3)]">/</span>
              <span>{clock} UTC</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.15 }}
              className="text-5xl sm:text-6xl xl:text-7xl font-bold leading-[1.05] tracking-tight text-[#D7E4DC] mb-6"
            >
              PLAN LIKE A<br />
              <span className="text-[#7CFC9A]">FLIGHT OPS</span><br />
              TEAM.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="text-base sm:text-lg text-[#82958A] max-w-lg mb-10 leading-relaxed"
            >
              Describe your trip in one sentence — nine AI agents plan the whole
              itinerary: destinations, day-by-day schedule, budget, routes, weather,
              and stays. You review. You approve. You fly.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.45 }}
              className="flex flex-col sm:flex-row items-start sm:items-center gap-4"
            >
              <Link href="/trip/new">
                <Button className="bg-[#7CFC9A] text-[#07100B] hover:bg-[#7CFC9A]/85 font-mono text-sm tracking-[0.15em] px-8 h-12 rounded-none shadow-glow">
                  INITIATE TRIP ▸
                </Button>
              </Link>
              <Link href="/plans" className="font-mono text-xs tracking-[0.2em] text-[#82958A] hover:text-[#7CFC9A] transition-colors px-2 h-12 inline-flex items-center">
                VIEW SAMPLE PLANS
              </Link>
            </motion.div>
          </div>

          {/* Radar */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.4 }}
            className="hidden sm:flex justify-center lg:justify-end"
          >
            <Radar />
          </motion.div>
        </div>

        {/* Bottom fade into board */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-b from-transparent to-[#07090A]" />
      </section>

      {/* ═══ FLIGHT BOARD — agent roster ═══ */}
      <section className="relative py-24 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-end justify-between mb-8">
            <div>
              <div className="font-mono text-[10px] tracking-[0.25em] text-[#82958A] mb-2">CREW MANIFEST</div>
              <h2 className="text-2xl sm:text-3xl font-bold text-[#D7E4DC] tracking-tight">Nine specialists. One operation.</h2>
            </div>
            <div className="hidden sm:block font-mono text-[10px] tracking-[0.2em] text-[#82958A]">
              BOARD / 01
            </div>
          </div>

          <div className="hud-corner">
            {/* Board header */}
            <div className="grid grid-cols-[72px_1fr_auto] sm:grid-cols-[96px_180px_1fr_110px] gap-4 px-4 sm:px-6 py-3 border-b border-[rgba(124,252,154,0.12)] font-mono text-[9px] sm:text-[10px] tracking-[0.2em] text-[#82958A]">
              <span>CODE</span>
              <span className="hidden sm:block">AGENT</span>
              <span>DUTY</span>
              <span className="text-right">STATUS</span>
            </div>

            {/* Board rows */}
            {AGENTS.map((agent, i) => (
              <motion.div
                key={agent.code}
                initial={{ opacity: 0, x: -16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.35, delay: i * 0.05 }}
                className={cn(
                  'group grid grid-cols-[72px_1fr_auto] sm:grid-cols-[96px_180px_1fr_110px] gap-4 px-4 sm:px-6 py-3.5 items-center',
                  'font-mono text-xs border-b border-[rgba(124,252,154,0.07)] last:border-0',
                  'hover:bg-[#131A17] transition-colors'
                )}
              >
                <span className="text-[#7CFC9A] text-[11px]">{agent.code}</span>
                <span className="hidden sm:block text-[#D7E4DC] tracking-[0.1em]">{agent.name}</span>
                <span className="text-[#82958A] truncate sm:whitespace-normal">{agent.duty}</span>
                <span className="flex items-center justify-end gap-2 text-[10px] tracking-[0.15em] text-[#7CFC9A]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#7CFC9A] agent-pulse" style={{ animationDelay: `${i * 0.3}s` }} />
                  <span className="hidden sm:inline">READY</span>
                  <span className="sm:hidden">RDY</span>
                </span>
              </motion.div>
            ))}
          </div>

          <p className="mt-4 font-mono text-[10px] tracking-[0.15em] text-[#82958A]">
            * SUPERVISOR CAN REJECT A PLAN AND RE-DISPATCH ANY AGENT. YOU SEE EVERY RETRY.
          </p>
        </div>
      </section>

      {/* ═══ PHASES — how it works ═══ */}
      <section className="relative py-24 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-end justify-between mb-12">
            <div>
              <div className="font-mono text-[10px] tracking-[0.25em] text-[#82958A] mb-2">OPERATION BRIEF</div>
              <h2 className="text-2xl sm:text-3xl font-bold text-[#D7E4DC] tracking-tight">From idea to flight plan in four phases.</h2>
            </div>
            <div className="hidden sm:block font-mono text-[10px] tracking-[0.2em] text-[#82958A]">
              BOARD / 02
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-px bg-[rgba(124,252,154,0.12)] border border-[rgba(124,252,154,0.12)]">
            {PHASES.map((phase, i) => (
              <motion.div
                key={phase.num}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="bg-[#0A0E0C] p-6 hover:bg-[#131A17] transition-colors group"
              >
                <div className="font-mono text-[10px] tracking-[0.25em] text-[#7CFC9A] mb-4">{phase.num}</div>
                <h3 className="text-base font-semibold text-[#D7E4DC] tracking-wide mb-3">{phase.title}</h3>
                <p className="text-xs text-[#82958A] leading-relaxed">{phase.body}</p>
                <div className="mt-5 h-px bg-[rgba(124,252,154,0.15)] group-hover:bg-[#7CFC9A]/50 transition-colors" />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ TELEMETRY STRIP ═══ */}
      <section className="relative py-16 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="hud-corner px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-8 font-mono">
            {[
              { value: '09', label: 'SPECIALIST AGENTS' },
              { value: '01', label: 'SUPERVISOR GATE' },
              { value: '≤90s', label: 'FULL MISSION TIME' },
              { value: '100%', label: 'DECISIONS LOGGED' },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-3xl sm:text-4xl font-bold text-[#7CFC9A] mb-1.5">{stat.value}</div>
                <div className="text-[9px] tracking-[0.2em] text-[#82958A]">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section className="relative py-24 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="font-mono text-[10px] tracking-[0.25em] text-[#82958A] mb-4">FINAL CALL</div>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#D7E4DC] tracking-tight mb-4">
              The ops room is <span className="text-[#7CFC9A]">standing by.</span>
            </h2>
            <p className="text-sm text-[#82958A] mb-10 max-w-md mx-auto">
              No account needed for your first plan. File it, watch the agents work, review the output.
            </p>
            <Link href="/trip/new">
              <Button className="bg-[#7CFC9A] text-[#07100B] hover:bg-[#7CFC9A]/85 font-mono text-sm tracking-[0.15em] px-10 h-12 rounded-none shadow-glow">
                INITIATE TRIP <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
            <p className="mt-6 font-mono text-[10px] tracking-[0.2em] text-[#82958A]">
              LOCAL-FIRST · AGENTS RUN SERVER-SIDE · YOUR DATA STAYS YOURS
            </p>
          </motion.div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="py-10 px-4 sm:px-6 border-t border-[rgba(124,252,154,0.1)]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-[10px] tracking-[0.2em] text-[#82958A]">
          <div className="flex items-center gap-2.5">
            <span className="relative flex items-center justify-center w-6 h-6 border border-[rgba(124,252,154,0.4)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#7CFC9A]" />
            </span>
            <span>ZENTRIP_ OPS · 2026</span>
          </div>
          <div className="flex items-center gap-6">
            <span>12.97°N 77.59°E</span>
            <span>ALL SYSTEMS NOMINAL</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
