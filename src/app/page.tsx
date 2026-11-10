'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { Home } from '@/components/Home';
import { RoomScreen } from '@/components/room/RoomScreen';

/**
 * Page unique (compatible GitHub Pages) :
 *   /             → accueil
 *   /?salle=CODE  → salon
 */
function Router() {
  const salle = useSearchParams().get('salle');
  return salle ? <RoomScreen code={salle.toUpperCase()} /> : <Home />;
}

export default function Page() {
  return (
    <Suspense>
      <Router />
    </Suspense>
  );
}
