'use client';

import { Sparkles, Store } from 'lucide-react';
import { Card } from '@/components/ui/card';

type DashboardHeroProps = {
  userName?: string;
  storeName?: string;
};

export function DashboardHero({ userName, storeName = 'Sistema de tienda' }: DashboardHeroProps) {
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Buen día';
    if (h < 19) return 'Buenas tardes';
    return 'Buenas noches';
  })();

  return (
    <Card className="hero-card relative min-h-[260px] overflow-hidden rounded-2xl border-0 p-8 md:p-10">
      {/* Geometría decorativa */}
      <div className="pointer-events-none absolute top-10 right-[30%] size-3 rounded-full bg-emerald-400/40" />
      <div className="pointer-events-none absolute bottom-10 right-[25%] size-16 rotate-12 rounded-md border-2 border-cyan-400/30" />
      <div className="pointer-events-none absolute top-1/2 right-[18%] hidden size-0 md:block"
        style={{
          borderLeft: '18px solid transparent',
          borderRight: '18px solid transparent',
          borderBottom: '28px solid rgb(34 211 238 / 0.25)',
        }}
      />

      {/* Icono sparkle top-right */}
      <div className="pointer-events-none absolute right-6 top-6 flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-emerald-500 shadow-lg shadow-cyan-500/30 md:right-8 md:top-8 md:size-16">
        <Sparkles className="size-5 text-white md:size-7" />
      </div>

      <div className="relative z-10 max-w-2xl">
        {/* Badge Eyebrow */}
        <div className="mb-4 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-300">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
          </span>
          Panel de control
        </div>

        {/* Título grande con gradient */}
        <h1 className="mb-4 text-4xl font-black leading-[1.05] tracking-tight md:text-6xl">
          <span className="block text-white">{greeting},</span>
          <span className="text-gradient-accent block">
            {userName ? userName.toUpperCase() : storeName.toUpperCase()}
          </span>
        </h1>

        {/* Subtexto con highlights */}
        <p className="max-w-md text-sm leading-relaxed text-slate-300 md:text-base">
          Gestioná <span className="font-semibold text-cyan-300">ventas</span>,{' '}
          <span className="font-semibold text-cyan-300">inventario</span> y{' '}
          <span className="font-semibold text-emerald-300">predicción de demanda</span>{' '}
          en tiempo real.
        </p>
      </div>

      {/* Store icon esquina bottom-left */}
      <div className="pointer-events-none absolute bottom-6 left-8 hidden opacity-60 md:block">
        <Store className="size-6 text-slate-500" />
      </div>
    </Card>
  );
}
