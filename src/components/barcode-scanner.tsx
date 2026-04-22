'use client';

import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

type BarcodeScannerProps = {
  onDetected: (value: string) => void;
};

export function BarcodeScanner({ onDetected }: BarcodeScannerProps) {
  const [status, setStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const [lastScan, setLastScan] = useState('');
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    return () => {
      void scannerRef.current?.stop().catch(() => undefined);
      scannerRef.current?.clear().catch(() => undefined);
    };
  }, []);

  const startScanner = async () => {
    if (typeof window === 'undefined') {
      return;
    }

    const id = 'barcode-reader';
    scannerRef.current = scannerRef.current ?? new Html5Qrcode(id);

    try {
      setStatus('scanning');
      await scannerRef.current.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        async (decodedText) => {
          setLastScan(decodedText);
          setStatus('success');
          onDetected(decodedText);
          await scannerRef.current?.stop().catch(() => undefined);
        },
        () => undefined,
      );
    } catch {
      setStatus('error');
    }
  };

  const stopScanner = async () => {
    setStatus('idle');
    await scannerRef.current?.stop().catch(() => undefined);
    scannerRef.current?.clear().catch(() => undefined);
  };

  return (
    <div className="scanner-card">
      <div className="scanner-header">
        <div>
          <p className="eyebrow">Escaneo por camara</p>
          <h3>Lee el codigo de barras desde el celular</h3>
        </div>
        <button type="button" className="secondary-button" onClick={status === 'scanning' ? stopScanner : startScanner}>
          {status === 'scanning' ? 'Detener' : 'Abrir camara'}
        </button>
      </div>
      <div className={`scanner-view scanner-state-${status}`}>
        <div id="barcode-reader" className="scanner-slot" />
        <div className="scanner-frame" />
        <div className="scanner-status">
          <span className="scanner-badge">{status === 'scanning' ? 'Escaneando' : status === 'success' ? 'Leido' : status === 'error' ? 'Error' : 'Listo'}</span>
          <p className="muted">
            {status === 'scanning'
              ? 'Apunta el codigo dentro del marco.'
              : status === 'success'
                ? `Ultimo codigo: ${lastScan}`
                : status === 'error'
                  ? 'No se pudo abrir la camara.'
                  : 'Si el navegador pide permiso, aceptalo.'}
          </p>
        </div>
      </div>
    </div>
  );
}
