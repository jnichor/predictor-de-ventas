'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, CheckCircle2, ScanLine } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type BarcodeScannerProps = {
  onDetected: (value: string) => void;
};

type Status = 'idle' | 'scanning' | 'success' | 'error';

export function BarcodeScanner({ onDetected }: BarcodeScannerProps) {
  const [status, setStatus] = useState<Status>('idle');
  const [lastScan, setLastScan] = useState('');
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    return () => {
      void (async () => {
        try {
          await scannerRef.current?.stop();
        } catch {
          /* noop */
        }
        try {
          await scannerRef.current?.clear();
        } catch {
          /* noop */
        }
      })();
    };
  }, []);

  const startScanner = async () => {
    if (typeof window === 'undefined') return;

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
    try {
      await scannerRef.current?.stop();
    } catch {
      /* noop */
    }
    try {
      await scannerRef.current?.clear();
    } catch {
      /* noop */
    }
  };

  const StatusBadge = () => {
    if (status === 'scanning')
      return (
        <Badge variant="secondary" className="gap-1">
          <ScanLine className="size-3" /> Escaneando
        </Badge>
      );
    if (status === 'success')
      return (
        <Badge className="gap-1 bg-primary/15 text-primary hover:bg-primary/20">
          <CheckCircle2 className="size-3" /> Código leído
        </Badge>
      );
    if (status === 'error')
      return (
        <Badge variant="destructive" className="gap-1">
          <CameraOff className="size-3" /> Error de cámara
        </Badge>
      );
    return <Badge variant="outline">Cámara lista</Badge>;
  };

  const helpText =
    status === 'scanning'
      ? 'Apuntá el código dentro del marco.'
      : status === 'success'
        ? `Último código: ${lastScan}`
        : status === 'error'
          ? 'No se pudo abrir la cámara. Revisá permisos del navegador.'
          : 'Si el navegador pide permiso de cámara, aceptalo.';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <StatusBadge />
        <Button
          type="button"
          variant={status === 'scanning' ? 'secondary' : 'default'}
          onClick={status === 'scanning' ? stopScanner : startScanner}
          size="sm"
        >
          {status === 'scanning' ? (
            <>
              <CameraOff className="mr-2 size-4" /> Detener
            </>
          ) : (
            <>
              <Camera className="mr-2 size-4" /> Abrir cámara
            </>
          )}
        </Button>
      </div>
      <div className="relative aspect-video overflow-hidden rounded-lg border bg-muted/40">
        <div id="barcode-reader" className="absolute inset-0" />
        {status !== 'scanning' ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="text-center text-sm text-muted-foreground">
              <ScanLine className="mx-auto mb-2 size-8 opacity-40" />
              {status === 'success' ? 'Código capturado' : 'Preview del escáner'}
            </div>
          </div>
        ) : null}
        <div className="pointer-events-none absolute inset-6 rounded-md border-2 border-primary/40" />
      </div>
      <p className="text-xs text-muted-foreground">{helpText}</p>
    </div>
  );
}
