import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Sistema de tienda',
    short_name: 'Tienda',
    description: 'Inventario, ventas y predicción de demanda con escáner por cámara.',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#0F172A',
    theme_color: '#10B981',
    orientation: 'portrait-primary',
    categories: ['business', 'productivity'],
    lang: 'es-PE',
    icons: [
      {
        src: '/icon',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/apple-icon',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  };
}
