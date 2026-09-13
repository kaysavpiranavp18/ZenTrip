'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Search, Heart, ChevronRight } from 'lucide-react';
import Navbar from '@/components/shared/Navbar';
import { cn } from '@/lib/utils';

// ─── Recommended sorties (canned inspiration board) ────────────────────────────

const samplePlans = [
  { id: 'p1', title: 'Kerala Backwaters & Beaches', destinations: 'Kochi → Alleppey → Varkala → Kovalam', duration: 7, budget: 45000, travelers: 2, score: 94, type: 'Relaxed', code: 'SRT-01', likes: 234 },
  { id: 'p2', title: 'Bali Spiritual Retreat', destinations: 'Ubud → Seminyak → Uluwatu', duration: 10, budget: 120000, travelers: 1, score: 91, type: 'Spiritual', code: 'SRT-02', likes: 189 },
  { id: 'p3', title: 'Goa Beach Hopping', destinations: 'North Goa → South Goa', duration: 5, budget: 35000, travelers: 4, score: 88, type: 'Budget', code: 'SRT-03', likes: 312 },
  { id: 'p4', title: 'Manali Adventure Trek', destinations: 'Manali → Solang Valley → Rohtang Pass', duration: 6, budget: 40000, travelers: 3, score: 86, type: 'Adventure', code: 'SRT-04', likes: 156 },
  { id: 'p5', title: 'Rajasthan Royal Circuit', destinations: 'Jaipur → Jodhpur → Udaipur', duration: 8, budget: 75000, travelers: 2, score: 93, type: 'Cultural', code: 'SRT-05', likes: 278 },
  { id: 'p6', title: 'Phuket Island Paradise', destinations: 'Phuket → Phi Phi → Krabi', duration: 7, budget: 95000, travelers: 2, score: 90, type: 'Luxury', code: 'SRT-06', likes: 201 },
  { id: 'p7', title: 'Darjeeling Tea Trail', destinations: 'Darjeeling → Sikkim → Gangtok', duration: 6, budget: 38000, travelers: 2, score: 87, type: 'Cultural', code: 'SRT-07', likes: 143 },
  { id: 'p8', title: 'Coorg Nature Escape', destinations: 'Coorg → Mysore → Ooty', duration: 5, budget: 32000, travelers: 2, score: 89, type: 'Relaxed', code: 'SRT-08', likes: 198 },
  { id: 'p9', title: 'Leh Ladakh Road Trip', destinations: 'Leh → Pangong → Nubra', duration: 9, budget: 80000, travelers: 3, score: 92, type: 'Adventure', code: 'SRT-09', likes: 320 },
];

const FILTER_TYPES = ['All', 'Relaxed', 'Adventure', 'Budget', 'Luxury', 'Cultural', 'Spiritual'];

const SORT_OPTIONS = [
  { label: 'BEST MATCH', key: 'score' },
  { label: 'MOST SAVED', key: 'likes' },
  { label: 'BUDGET ↑', key: 'budget-asc' },
  { label: 'BUDGET ↓', key: 'budget-desc' },
  { label: 'DURATION ↑', key: 'duration' },
] as const;

type SortKey = typeof SORT_OPTIONS[number]['key'];

export default function PlansPage() {
  const [activeFilter, setActiveFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('score');
  const [liked, setLiked] = useState<Set<string>>(new Set());

  const toggleLike = (id: string) => {
    setLiked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const filtered = useMemo(() => {
    let plans = samplePlans;

    if (activeFilter !== 'All') {
      plans = plans.filter((p) => p.type === activeFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      plans = plans.filter((p) =>
        p.title.toLowerCase().includes(q) ||
        p.destinations.toLowerCase().includes(q) ||
        p.type.toLowerCase().includes(q)
      );
    }

    return [...plans].sort((a, b) => {
      switch (sortBy) {
        case 'likes': return b.likes - a.likes;
        case 'budget-asc': return a.budget - b.budget;
        case 'budget-desc': return b.budget - a.budget;
        case 'duration': return a.duration - b.duration;
        default: return b.score - a.score;
      }
    });
  }, [activeFilter, search, sortBy]);

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="pt-24 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto pb-24 font-mono">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="text-[10px] tracking-[0.25em] text-[#82958A] mb-1">ZENTRIP OPS / INSPIRATION</div>
          <h1 className="text-2xl font-bold text-[#D7E4DC] tracking-[0.1em]">DEPARTURES</h1>
          <p className="text-[11px] text-[#82958A] mt-1">Ready-made AI-generated trip itineraries — use any as a starting template.</p>
        </motion.div>

        {/* Command-line search + sort */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#6E7F74]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="search itineraries…"
              className="w-full bg-[#0D1210] border border-[rgba(124,252,154,0.14)] pl-9 pr-4 h-11 font-mono text-xs text-[#D7E4DC] placeholder:text-[#6E7F74] focus:outline-none focus:border-[#7CFC9A]/50"
            />
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortKey)}
            className="h-11 px-3 bg-[#0D1210] border border-[rgba(124,252,154,0.14)] text-[#D7E4DC] font-mono text-[10px] tracking-[0.15em] shrink-0 focus:outline-none focus:border-[#7CFC9A]/50"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.key} value={opt.key} className="bg-[#07090A]">{opt.label}</option>
            ))}
          </select>
        </motion.div>

        {/* Filters */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
          className="flex gap-2 overflow-x-auto pb-2 mb-4">
          {FILTER_TYPES.map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={cn(
                'px-4 py-2 text-[9px] tracking-[0.2em] whitespace-nowrap border transition-all',
                activeFilter === filter
                  ? 'border-[#7CFC9A]/50 bg-[#7CFC9A]/10 text-[#7CFC9A]'
                  : 'border-[rgba(124,252,154,0.14)] text-[#82958A] hover:text-[#D7E4DC] hover:border-[rgba(124,252,154,0.3)]'
              )}
            >
              {filter.toUpperCase()}
            </button>
          ))}
        </motion.div>

        {/* Results count */}
        <p className="text-[9px] tracking-[0.2em] text-[#82958A] mb-4">
          {filtered.length} ITINERARIES{filtered.length !== 1 ? 'S' : ''} ON THE BOARD
          {activeFilter !== 'All' ? ` · FILTER: ${activeFilter.toUpperCase()}` : ''}
          {search ? ` · QUERY: "${search.toUpperCase()}"` : ''}
        </p>

        {/* Flight strips */}
        {filtered.length > 0 ? (
          <div className="hud-corner">
            <div className="hidden sm:grid grid-cols-[72px_1fr_70px_100px_60px_90px_120px] gap-3 px-5 py-3 border-b border-[rgba(124,252,154,0.12)] text-[9px] tracking-[0.2em] text-[#82958A]">
              <span>CODE</span>
              <span>ITINERARY</span>
              <span>DAYS</span>
              <span>BUDGET</span>
              <span>TRAVELERS</span>
              <span>CLASS</span>
              <span className="text-right">OPS</span>
            </div>

            {filtered.map((plan, i) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="group border-b border-[rgba(124,252,154,0.07)] last:border-0 hover:bg-[#131A17] transition-colors"
              >
                {/* Desktop row */}
                <div className="hidden sm:grid grid-cols-[72px_1fr_70px_100px_60px_90px_120px] gap-3 px-5 py-4 items-center text-xs">
                  <span className="text-[#7CFC9A] text-[10px]">{plan.code}</span>
                  <div className="min-w-0">
                    <div className="text-[#D7E4DC] truncate">{plan.title}</div>
                    <div className="text-[10px] text-[#82958A] truncate">{plan.destinations}</div>
                  </div>
                  <span className="text-[#D7E4DC]">{plan.duration}D</span>
                  <span className="text-[#D7E4DC]">₹{plan.budget.toLocaleString('en-IN')}</span>
                  <span className="text-[#D7E4DC]">{plan.travelers}</span>
                  <span className={cn(
                    'text-[9px] tracking-[0.15em] px-2 py-0.5 border w-fit',
                    plan.score >= 90 ? 'border-[#7CFC9A]/30 text-[#7CFC9A]' : 'border-[#FFB454]/30 text-[#FFB454]'
                  )}>
                    {plan.type.toUpperCase()}
                  </span>
                  <div className="flex items-center justify-end gap-3">
                    <button
                      onClick={() => toggleLike(plan.id)}
                      className={cn('flex items-center gap-1 text-[10px] transition-all',
                        liked.has(plan.id) ? 'text-[#FF6B5E]' : 'text-[#82958A] hover:text-[#FF6B5E]')}
                    >
                      <Heart className={cn('w-3 h-3', liked.has(plan.id) && 'fill-current')} />
                      {plan.likes + (liked.has(plan.id) ? 1 : 0)}
                    </button>
                    <Link href="/trip/new" className="flex items-center gap-1 text-[9px] tracking-[0.15em] text-[#7CFC9A] opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      FILE IT <ChevronRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>

                {/* Mobile row */}
                <div className="sm:hidden px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[10px] text-[#7CFC9A]">{plan.code}</div>
                      <div className="text-sm text-[#D7E4DC] truncate mt-0.5">{plan.title}</div>
                      <div className="text-[10px] text-[#82958A] truncate">{plan.destinations}</div>
                      <div className="flex items-center gap-2 mt-1.5 text-[10px] text-[#82958A]">
                        <span>{plan.duration}D</span><span className="text-[#4A544E]">/</span>
                        <span>₹{plan.budget.toLocaleString('en-IN')}</span><span className="text-[#4A544E]">/</span>
                        <span>TRAVELERS {plan.travelers}</span><span className="text-[#4A544E]">/</span>
                        <span className={plan.score >= 90 ? 'text-[#7CFC9A]' : 'text-[#FFB454]'}>{plan.type.toUpperCase()}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <button
                        onClick={() => toggleLike(plan.id)}
                        className={cn(liked.has(plan.id) ? 'text-[#FF6B5E]' : 'text-[#82958A]')}
                      >
                        <Heart className={cn('w-3.5 h-3.5', liked.has(plan.id) && 'fill-current')} />
                      </button>
                      <Link href="/trip/new" className="text-[9px] tracking-[0.15em] text-[#7CFC9A]">
                        FILE ▸
                      </Link>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hud-corner py-20 text-center">
            <div className="text-sm font-bold text-[#D7E4DC] tracking-[0.15em] mb-2">NO ITINERARIES FOUND</div>
            <p className="text-[11px] tracking-[0.1em] text-[#82958A]">ADJUST THE QUERY OR FILTERS</p>
          </motion.div>
        )}

        {/* Footer note */}
        <p className="text-[9px] tracking-[0.2em] text-[#6E7F74] mt-6 text-center">
          STATIC INSPIRATION — FILE YOUR OWN AND THE AGENTS BUILD IT LIVE
        </p>
      </main>
    </div>
  );
}
