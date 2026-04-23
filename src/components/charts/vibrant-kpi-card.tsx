'use client';

import type { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type Variant = 'pink' | 'emerald' | 'purple' | 'amber' | 'sky';

type VibrantKpiCardProps = {
  label: string;
  value: string;
  icon: ReactNode;
  variant: Variant;
  progress?: number; // 0–100
  progressLabel?: string;
  className?: string;
};

const variants: Record<
  Variant,
  { bg: string; ring: string; text: string; iconBg: string; border: string }
> = {
  pink: {
    bg: 'bg-gradient-to-br from-pink-500 via-rose-500 to-fuchsia-600',
    ring: 'stroke-pink-100',
    text: 'text-pink-50',
    iconBg: 'bg-white/20',
    border: 'border-pink-400/30',
  },
  emerald: {
    bg: 'bg-gradient-to-br from-emerald-500 via-green-500 to-teal-600',
    ring: 'stroke-emerald-100',
    text: 'text-emerald-50',
    iconBg: 'bg-white/20',
    border: 'border-emerald-400/30',
  },
  purple: {
    bg: 'bg-gradient-to-br from-violet-500 via-purple-500 to-indigo-600',
    ring: 'stroke-violet-100',
    text: 'text-violet-50',
    iconBg: 'bg-white/20',
    border: 'border-violet-400/30',
  },
  amber: {
    bg: 'bg-gradient-to-br from-amber-400 via-orange-500 to-red-500',
    ring: 'stroke-amber-100',
    text: 'text-amber-50',
    iconBg: 'bg-white/20',
    border: 'border-amber-400/30',
  },
  sky: {
    bg: 'bg-gradient-to-br from-sky-400 via-cyan-500 to-blue-600',
    ring: 'stroke-sky-100',
    text: 'text-sky-50',
    iconBg: 'bg-white/20',
    border: 'border-sky-400/30',
  },
};

export function VibrantKpiCard({
  label,
  value,
  icon,
  variant,
  progress,
  progressLabel,
  className,
}: VibrantKpiCardProps) {
  const v = variants[variant];
  const clampedProgress = progress == null ? null : Math.max(0, Math.min(100, progress));
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const offset =
    clampedProgress == null ? 0 : circumference - (clampedProgress / 100) * circumference;

  return (
    <Card
      className={cn(
        'kpi-vibrant relative overflow-hidden border-0 p-5 shadow-lg transition-transform hover:scale-[1.02]',
        v.bg,
        className,
      )}
    >
      <div className="pointer-events-none absolute -top-10 -right-10 size-40 rounded-full bg-white/10 blur-3xl" />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className={cn('mb-3 flex size-9 items-center justify-center rounded-lg', v.iconBg)}>
            <span className={v.text}>{icon}</span>
          </div>
          <p className={cn('text-xs font-medium uppercase tracking-wider opacity-80', v.text)}>
            {label}
          </p>
          <p className={cn('mt-1 truncate text-2xl font-bold tabular-nums', v.text)}>{value}</p>
        </div>

        {clampedProgress != null ? (
          <div className="relative flex shrink-0 flex-col items-center">
            <svg width="72" height="72" viewBox="0 0 72 72" className="-rotate-90">
              <circle
                cx="36"
                cy="36"
                r={radius}
                fill="transparent"
                stroke="rgba(255,255,255,0.2)"
                strokeWidth="6"
              />
              <circle
                cx="36"
                cy="36"
                r={radius}
                fill="transparent"
                stroke="white"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                style={{ transition: 'stroke-dashoffset 0.6s ease' }}
              />
            </svg>
            <div
              className={cn(
                'pointer-events-none absolute inset-0 flex items-center justify-center text-sm font-bold',
                v.text,
              )}
            >
              {Math.round(clampedProgress)}%
            </div>
            {progressLabel ? (
              <span className={cn('mt-1 text-[10px] opacity-80', v.text)}>{progressLabel}</span>
            ) : null}
          </div>
        ) : null}
      </div>
    </Card>
  );
}
