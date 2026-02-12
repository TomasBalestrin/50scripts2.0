'use client';

import { useState, useEffect } from 'react';

type DeviceCapability = 'high' | 'medium' | 'low';

interface NavigatorExtended extends Navigator {
  deviceMemory?: number;
  connection?: {
    effectiveType: string;
    downlink: number;
    addEventListener: (event: string, handler: () => void) => void;
    removeEventListener: (event: string, handler: () => void) => void;
  };
}

/**
 * Detects device and network capability to adapt UX.
 * Returns 'high', 'medium', or 'low'.
 *
 * Usage:
 * - 'low': disable animations, smaller images, simpler UI
 * - 'medium': reduce animations, moderate quality
 * - 'high': full experience
 */
export function useDeviceCapability(): DeviceCapability {
  const [capability, setCapability] = useState<DeviceCapability>('high');

  useEffect(() => {
    const nav = navigator as NavigatorExtended;
    const conn = nav.connection;
    const mem = nav.deviceMemory;
    const cores = nav.hardwareConcurrency;

    function evaluate() {
      const slowNet = conn?.effectiveType === '2g' || (conn?.downlink !== undefined && conn.downlink < 1.5);
      const lowDevice = (mem !== undefined && mem <= 2) || (cores !== undefined && cores <= 2);

      if (slowNet || lowDevice) {
        setCapability('low');
      } else if (conn?.effectiveType === '3g' || (mem !== undefined && mem <= 4)) {
        setCapability('medium');
      } else {
        setCapability('high');
      }
    }

    evaluate();

    const handler = () => evaluate();
    conn?.addEventListener('change', handler);
    return () => conn?.removeEventListener('change', handler);
  }, []);

  return capability;
}
