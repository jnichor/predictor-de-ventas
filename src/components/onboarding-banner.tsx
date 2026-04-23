'use client';

import Link from 'next/link';
import { Boxes, Check, PackagePlus, ReceiptText, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type OnboardingBannerProps = {
  hasProducts: boolean;
  hasStock: boolean;
  hasSales: boolean;
};

type Step = {
  key: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  cta: string;
  done: boolean;
};

export function OnboardingBanner({ hasProducts, hasStock, hasSales }: OnboardingBannerProps) {
  const steps: Step[] = [
    {
      key: 'product',
      title: 'Creá tu primer producto',
      description: 'Agregá un ítem al catálogo con nombre, código y precio.',
      icon: PackagePlus,
      href: '/productos',
      cta: 'Ir a Productos',
      done: hasProducts,
    },
    {
      key: 'stock',
      title: 'Cargá stock',
      description: 'Registrá una entrada de inventario con la cantidad recibida.',
      icon: Boxes,
      href: '/inventario',
      cta: 'Ir a Inventario',
      done: hasStock,
    },
    {
      key: 'sale',
      title: 'Registrá tu primera venta',
      description: 'Escaneá el código del producto y cobrá. El stock se descuenta solo.',
      icon: ReceiptText,
      href: '/ventas',
      cta: 'Ir a Ventas',
      done: hasSales,
    },
  ];

  const completed = steps.filter((s) => s.done).length;
  if (completed === steps.length) return null;

  const nextStep = steps.find((s) => !s.done);

  return (
    <Card className="not-glass relative overflow-hidden border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
      <div className="pointer-events-none absolute -top-12 -right-12 size-48 rounded-full bg-primary/20 blur-3xl" />
      <CardContent className="relative p-6">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary/20">
            <Sparkles className="size-4 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">Empezá con el sistema</h3>
            <p className="text-xs text-muted-foreground">
              {completed} de {steps.length} pasos completados
            </p>
          </div>
        </div>

        <ol className="space-y-3">
          {steps.map((step, i) => (
            <li
              key={step.key}
              className={cn(
                'flex items-center gap-3 rounded-lg border p-3 transition-colors',
                step.done
                  ? 'border-primary/20 bg-primary/5'
                  : nextStep?.key === step.key
                    ? 'border-primary/40 bg-primary/10'
                    : 'border-border bg-card/40',
              )}
            >
              <div
                className={cn(
                  'flex size-8 shrink-0 items-center justify-center rounded-full',
                  step.done
                    ? 'bg-primary text-primary-foreground'
                    : nextStep?.key === step.key
                      ? 'bg-primary/20 text-primary'
                      : 'bg-muted text-muted-foreground',
                )}
              >
                {step.done ? (
                  <Check className="size-4" />
                ) : (
                  <span className="text-sm font-semibold">{i + 1}</span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    'text-sm font-medium',
                    step.done ? 'text-muted-foreground line-through' : 'text-foreground',
                  )}
                >
                  {step.title}
                </p>
                {!step.done ? (
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                ) : null}
              </div>

              {!step.done ? (
                <Button
                  size="sm"
                  variant={nextStep?.key === step.key ? 'default' : 'outline'}
                  asChild
                >
                  <Link href={step.href}>
                    <step.icon className="mr-2 size-4" />
                    {step.cta}
                  </Link>
                </Button>
              ) : null}
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
