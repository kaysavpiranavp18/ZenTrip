'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface NavbarProps {
  transparent?: boolean;
}

/**
 * Navbar — fixed top chrome. No auth: the app runs entirely in guest mode
 * (plans live in this browser). Kept simple on purpose.
 */
export default function Navbar({ transparent = false }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav
      className={cn(
        'fixed top-0 left-0 right-0 z-50 font-mono',
        transparent ? 'bg-transparent' : 'bg-background/85 backdrop-blur-md border-b border-[rgba(124,252,154,0.14)]'
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo — terminal callsign */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <span className="relative flex items-center justify-center w-8 h-8 border border-[rgba(124,252,154,0.4)] bg-[#0D1210]">
              <span className="w-2 h-2 rounded-full bg-[#7CFC9A] agent-pulse" />
              <span className="absolute inset-0 hud-corner opacity-70" />
            </span>
            <span className="text-sm tracking-[0.25em] text-[#D7E4DC] font-semibold">
              ZENTRIP<span className="text-[#7CFC9A]">_</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            <Link href="/" className="text-xs tracking-[0.15em] text-[#82958A] hover:text-[#7CFC9A] transition-colors">
              HOME
            </Link>
            <Link href="/plans" className="text-xs tracking-[0.15em] text-[#82958A] hover:text-[#7CFC9A] transition-colors">
              EXPLORE
            </Link>
            <Link href="/dashboard" className="text-xs tracking-[0.15em] text-[#82958A] hover:text-[#7CFC9A] transition-colors">
              HANGAR
            </Link>
            <Link href="/trip/new">
              <Button size="sm" className="bg-[#7CFC9A] text-[#07100B] hover:bg-[#7CFC9A]/85 font-mono text-xs tracking-[0.15em] shadow-glow rounded-none">
                INITIATE ▸
              </Button>
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 hover:bg-white/5 text-[#D7E4DC]"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-background/95 backdrop-blur-md border-b border-[rgba(124,252,154,0.14)] overflow-hidden"
          >
            <div className="px-4 py-4 space-y-3">
              <Link href="/" className="block text-xs tracking-[0.15em] text-[#82958A] hover:text-[#7CFC9A] py-2" onClick={() => setMobileOpen(false)}>
                HOME
              </Link>
              <Link href="/plans" className="block text-xs tracking-[0.15em] text-[#82958A] hover:text-[#7CFC9A] py-2" onClick={() => setMobileOpen(false)}>
                EXPLORE
              </Link>
              <Link href="/dashboard" className="block text-xs tracking-[0.15em] text-[#82958A] hover:text-[#7CFC9A] py-2" onClick={() => setMobileOpen(false)}>
                HANGAR
              </Link>
              <Link href="/trip/new" onClick={() => setMobileOpen(false)}>
                <Button className="w-full bg-[#7CFC9A] text-[#07100B] font-mono text-xs tracking-[0.15em] rounded-none">
                  INITIATE ▸
                </Button>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
