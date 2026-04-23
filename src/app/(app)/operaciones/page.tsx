'use client';

import { Suspense } from 'react';
import { OperationsClient } from '@/components/operations-client';

export default function OperacionesPage() {
  return (
    <Suspense fallback={null}>
      <OperationsClient />
    </Suspense>
  );
}
