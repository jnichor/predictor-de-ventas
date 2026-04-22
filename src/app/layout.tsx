import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import '@/app/globals.css';

export const metadata: Metadata = {
  title: 'Sistema de inventario',
  description: 'Inventario, ventas y demanda para tienda con escaneo por camara.',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
