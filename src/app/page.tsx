'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    async function decide() {
      if (!supabase) {
        if (!cancelled) router.replace('/login');
        return;
      }
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      router.replace(data.session ? '/dashboard' : '/login');
    }
    void decide();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="grid min-h-screen place-items-center bg-background">
      <Loader2 className="size-8 animate-spin text-muted-foreground" />
    </div>
  );
}
