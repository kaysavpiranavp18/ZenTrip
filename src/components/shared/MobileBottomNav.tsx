'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Compass, User, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'HANGAR' },
  { href: '/plans', icon: Compass, label: 'EXPLORE' },
  { href: '/trip/new', icon: Plus, label: 'INIT', primary: true },
  { href: '/profile', icon: User, label: 'PROFILE' },
];

export default function MobileBottomNav() {
  const pathname = usePathname();

  // Only show on the landing page (it has its own CTA nav)
  const hidden = ['/'].includes(pathname);
  if (hidden) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 sm:hidden font-mono">
      <div className="bg-background/90 backdrop-blur-md border-t border-[rgba(124,252,154,0.14)] px-2">
        <div className="flex items-center justify-around h-16">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            if (item.primary) {
              return (
                <Link key={item.href} href={item.href} className="flex flex-col items-center -mt-6">
                  <div className="w-12 h-12 flex items-center justify-center bg-[#7CFC9A] text-[#07100B] shadow-glow rounded-none border border-[#7CFC9A]">
                    <item.icon className="w-5 h-5" />
                  </div>
                  <span className="text-[9px] tracking-[0.2em] text-[#82958A] mt-0.5">{item.label}</span>
                </Link>
              );
            }
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center gap-0.5 px-3 py-2 transition-all',
                  isActive ? 'text-[#7CFC9A]' : 'text-[#82958A]'
                )}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-[9px] tracking-[0.2em]">{item.label}</span>
                {isActive && (
                  <div className="w-1 h-1 rounded-full bg-[#7CFC9A]" />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
