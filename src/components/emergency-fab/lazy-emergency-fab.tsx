'use client';

import dynamic from 'next/dynamic';

const EmergencyFAB = dynamic(
  () => import('./emergency-fab').then(m => ({ default: m.EmergencyFAB })),
  { ssr: false }
);

export function LazyEmergencyFAB() {
  return <EmergencyFAB />;
}
