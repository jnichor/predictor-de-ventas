import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import '@/app/globals.css';

export const metadata: Metadata = {
  title: 'Sistema de inventario',
  description: 'Inventario, ventas y demanda para tienda con escaneo por camara.',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="es">
      <body>
        {children}
        <Toaster
          position="top-right"
          theme="dark"
          richColors
          closeButton
          expand
          duration={4000}
        />
      </body>
    </html>
  );
}
