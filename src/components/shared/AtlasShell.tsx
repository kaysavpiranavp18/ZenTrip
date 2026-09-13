'use client';

import type { ReactNode } from 'react';
import Navbar from '@/components/shared/Navbar';
import { cn } from '@/lib/utils';

interface AtlasShellProps {
  children: ReactNode;
  /** Extra classes for the content area below the navbar */
  className?: string;
}

/**
 * AtlasShell — application chrome for full-bleed workspace pages
 * (e.g. the trip detail "Atlas" view).
 *
 * Renders the fixed 64px top navbar and reserves exactly that space,
 * so children can size themselves against the remaining viewport
 * height (e.g. `h-[calc(100vh-64px)]`).
 */
export default function AtlasShell({ children, className }: AtlasShellProps) {
  return (
    <div className="min-h-screen pt-16">
      <Navbar />
      <main className={cn('relative', className)}>{children}</main>
    </div>
  );
}
