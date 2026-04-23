'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BarChart3,
  Boxes,
  LayoutDashboard,
  LogOut,
  MailPlus,
  Moon,
  Package,
  PackagePlus,
  ReceiptText,
  Settings,
  Sun,
  UserPlus,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command';
import type { CurrentUser } from '@/hooks/use-auth';
import type { Product } from '@/lib/types';

type CommandPaletteProps = {
  currentUser: CurrentUser | null;
  products: Product[];
  onSignOut: () => void | Promise<void>;
};

export function CommandPalette({ currentUser, products, onSignOut }: CommandPaletteProps) {
  const router = useRouter();
  const { setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  const runCommand = useCallback((command: () => void | Promise<void>) => {
    setOpen(false);
    void command();
  }, []);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Buscar productos, acciones, navegación..." />
      <CommandList>
        <CommandEmpty>Sin resultados.</CommandEmpty>

        <CommandGroup heading="Navegar">
          <CommandItem
            onSelect={() => runCommand(() => router.push('/dashboard'))}
            value="panel dashboard"
          >
            <LayoutDashboard className="mr-2 size-4" />
            Panel
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push('/ventas'))}
            value="ventas"
          >
            <ReceiptText className="mr-2 size-4" />
            Ventas
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push('/inventario'))}
            value="inventario"
          >
            <Boxes className="mr-2 size-4" />
            Inventario
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push('/reportes'))}
            value="reportes analítica"
          >
            <BarChart3 className="mr-2 size-4" />
            Reportes
          </CommandItem>
          {isAdmin ? (
            <>
              <CommandItem
                onSelect={() => runCommand(() => router.push('/productos'))}
                value="productos catálogo"
              >
                <Settings className="mr-2 size-4" />
                Productos
              </CommandItem>
              <CommandItem
                onSelect={() => runCommand(() => router.push('/usuarios'))}
                value="usuarios invitar"
              >
                <UserPlus className="mr-2 size-4" />
                Usuarios
              </CommandItem>
            </>
          ) : null}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Acciones rápidas">
          <CommandItem
            onSelect={() => runCommand(() => router.push('/ventas'))}
            value="nueva venta registrar"
          >
            <ReceiptText className="mr-2 size-4" />
            Nueva venta
            <CommandShortcut>G V</CommandShortcut>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push('/inventario'))}
            value="nuevo movimiento inventario"
          >
            <PackagePlus className="mr-2 size-4" />
            Nuevo movimiento
          </CommandItem>
          {isAdmin ? (
            <>
              <CommandItem
                onSelect={() => runCommand(() => router.push('/productos'))}
                value="nuevo producto alta"
              >
                <Package className="mr-2 size-4" />
                Nuevo producto
              </CommandItem>
              <CommandItem
                onSelect={() => runCommand(() => router.push('/usuarios'))}
                value="invitar usuario nuevo"
              >
                <MailPlus className="mr-2 size-4" />
                Invitar usuario
              </CommandItem>
            </>
          ) : null}
        </CommandGroup>

        {products.length > 0 ? (
          <>
            <CommandSeparator />
            <CommandGroup heading="Productos">
              {products.slice(0, 15).map((product) => (
                <CommandItem
                  key={product.id}
                  value={`${product.name} ${product.barcode} ${product.category}`}
                  onSelect={() =>
                    runCommand(() => router.push(`/ventas?barcode=${product.barcode}`))
                  }
                >
                  <Package className="mr-2 size-4" />
                  <div className="flex flex-1 flex-col">
                    <span>{product.name}</span>
                    <span className="font-mono text-xs text-muted-foreground tabular-nums">
                      {product.barcode}
                    </span>
                  </div>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {product.currentStock} u
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        ) : null}

        <CommandSeparator />

        <CommandGroup heading="Tema">
          <CommandItem onSelect={() => runCommand(() => setTheme('light'))} value="tema claro light">
            <Sun className="mr-2 size-4" />
            Claro
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setTheme('dark'))} value="tema oscuro dark">
            <Moon className="mr-2 size-4" />
            Oscuro
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Cuenta">
          <CommandItem
            onSelect={() => runCommand(onSignOut)}
            value="cerrar sesión logout salir"
            className="text-destructive focus:text-destructive"
          >
            <LogOut className="mr-2 size-4" />
            Cerrar sesión
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
