'use client';

import { useEffect } from 'react';

/**
 * Registra el service worker en cliente cuando la app ya está cargada.
 * Solo corre en producción (en dev, next tiene su propio HMR y el SW interfiere).
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;
    if (process.env.NODE_ENV !== 'production') return;

    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none',
        });
        // Chequeo de updates al cambiar de pestaña/volver a focusear
        reg.update().catch(() => undefined);
      } catch (error) {
        console.warn('SW registration failed', error);
      }
    };

    void register();
  }, []);

  return null;
}
