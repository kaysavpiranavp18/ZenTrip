'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Route } from '@/types';
import { cn } from '@/lib/utils';

interface RouteDiagramProps {
  route: Route;
  destinationName?: string;
}

/**
 * RouteDiagram — "flight corridor" strip.
 * Renders the route as an SVG path that draws itself end-to-end when it
 * enters the viewport (stroke-dashoffset animation + pathLength=1).
 * Used on the Operations Board route tab alongside the leaflet map.
 */
export default function RouteDiagram({ route, destinationName }: RouteDiagramProps) {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const diagramRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    setMounted(true);
    const el = diagramRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const stops = useMemo(() => {
    const names = [...new Set(route.segments.flatMap((s) => [s.from, s.to]))].filter(
      (n) => n && n.trim().length > 0
    );
    return names.length ? names : destinationName ? [destinationName] : [];
  }, [route.segments, destinationName]);

  if (!stops.length) {
    return (
      <div className="hud-corner p-6 font-mono text-[11px] tracking-[0.15em] text-[#82958A] text-center">
        NO ROUTE DATA ON FILE
      </div>
    );
  }

  const W = 640;
  const H = 120;
  const padX = 60;
  const y = 60;

  // Distribute stops along a gentle zigzag corridor
  const points = stops.map((name, i) => {
    const x = stops.length === 1 ? W / 2 : padX + (i * (W - padX * 2)) / (stops.length - 1);
    const offset = i % 2 === 0 ? -14 : 14;
    return { name, x, y: y + offset };
  });

  const pathD = points
    .map((pt, i) => {
      if (i === 0) return `M ${pt.x} ${pt.y}`;
      const prev = points[i - 1];
      const mx = (prev.x + pt.x) / 2;
      return `C ${mx} ${prev.y}, ${mx} ${pt.y}, ${pt.x} ${pt.y}`;
    })
    .join(' ');

  return (
    <div className="hud-corner p-5 sm:p-6">
      <div className="flex items-center justify-between mb-4 font-mono">
        <span className="text-[10px] tracking-[0.25em] text-[#82958A]">ROUTE OVERVIEW</span>
        <div className="flex items-center gap-4 text-[9px] tracking-[0.15em] text-[#82958A]">
          {route.totalDistance && <span>DIST {route.totalDistance}</span>}
          {route.totalDuration && <span className="text-[#FFB454]">TIME {route.totalDuration}</span>}
        </div>
      </div>

      <div className="overflow-x-auto">
        <svg
          ref={diagramRef}
          viewBox={`0 0 ${W} ${H}`}
          className="w-full min-w-[520px] font-mono"
          style={{ height: 'auto' }}
        >
          {/* Grid ticks */}
          {points.map((pt, i) => (
            <line
              key={`tick-${i}`}
              x1={pt.x}
              y1={y - 30}
              x2={pt.x}
              y2={y + 30}
              stroke="rgba(124,252,154,0.08)"
              strokeWidth="1"
            />
          ))}

          {/* Corridor path — self-drawing */}
          <path
            d={pathD}
            fill="none"
            stroke="#7CFC9A"
            strokeWidth="1.5"
            strokeDasharray="6 5"
            pathLength={mounted ? 1 : undefined}
            className={cn(mounted && visible ? 'draw-line' : 'opacity-0')}
            style={{ opacity: mounted && visible ? undefined : 0 }}
          />

          {/* Nodes */}
          {points.map((pt, i) => {
            const isFirst = i === 0;
            const isLast = i === points.length - 1;
            return (
              <g key={pt.name}>
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isFirst || isLast ? 5 : 3.5}
                  fill="#07090A"
                  stroke={isFirst || isLast ? '#7CFC9A' : '#FFB454'}
                  strokeWidth="1.5"
                  className={cn('transition-opacity duration-500', mounted && visible ? 'opacity-100' : 'opacity-0')}
                  style={{ transitionDelay: `${400 + i * 200}ms` }}
                />
                <text
                  x={pt.x}
                  y={pt.y + (isFirst || isLast ? 22 : 20)}
                  textAnchor="middle"
                  fontSize="9"
                  fill={isFirst || isLast ? '#D7E4DC' : '#82958A'}
                  className="uppercase"
                  style={{ letterSpacing: '0.08em' }}
                >
                  {pt.name.length > 16 ? `${pt.name.slice(0, 15)}…` : pt.name}
                </text>
                <text
                  x={pt.x}
                  y={pt.y - 14}
                  textAnchor="middle"
                  fontSize="8"
                  fill="#6E7F74"
                  style={{ letterSpacing: '0.15em' }}
                >
                  {isFirst ? 'ORIGIN' : isLast ? 'DEST' : `STP-${String(i).padStart(2, '0')}`}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Segment readouts */}
      {route.segments.length > 0 && (
        <div className="mt-5 space-y-0 border-t border-dashed border-[rgba(124,252,154,0.12)]">
          {route.segments.map((seg, i) => (
            <div
              key={`${seg.from}-${seg.to}-${i}`}
              className="flex items-center justify-between gap-4 py-2.5 font-mono text-[11px] border-b border-dashed border-[rgba(124,252,154,0.12)] last:border-0"
            >
              <span className="text-[#D7E4DC] truncate">
                {seg.from} <span className="text-[#7CFC9A]">→</span> {seg.to}
              </span>
              <span className="text-[#82958A] shrink-0 text-[10px] tracking-[0.1em] uppercase">
                {seg.mode} · {seg.duration} · {seg.distance}
                {seg.cost > 0 ? ` · ₹${seg.cost.toLocaleString('en-IN')}` : ''}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
