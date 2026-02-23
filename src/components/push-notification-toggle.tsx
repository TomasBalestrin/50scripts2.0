'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { subscribeToPush, unsubscribeFromPush, isSubscribed, requestNotificationPermission } from '@/lib/notifications/push';

export function PushNotificationToggle() {
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    const supported = 'Notification' in window && 'serviceWorker' in navigator;
    setSupported(supported);
    if (supported) {
      isSubscribed().then(setSubscribed);
    }
  }, []);

  const handleToggle = useCallback(async () => {
    setLoading(true);
    try {
      if (subscribed) {
        await unsubscribeFromPush();
        setSubscribed(false);
      } else {
        const granted = await requestNotificationPermission();
        if (granted) {
          const sub = await subscribeToPush();
          setSubscribed(!!sub);
        }
      }
    } catch (error) {
      console.error('[push] Toggle error:', error);
    } finally {
      setLoading(false);
    }
  }, [subscribed]);

  if (!supported) return null;

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-[#94A3B8] outline-none transition-colors hover:bg-[#131B35] hover:text-white focus:bg-[#131B35] focus:text-white disabled:opacity-50"
    >
      {subscribed ? (
        <>
          <Bell className="mr-0 h-4 w-4 text-[#3B82F6]" />
          <span>{loading ? 'Desativando...' : 'Notificacoes ativas'}</span>
        </>
      ) : (
        <>
          <BellOff className="mr-0 h-4 w-4" />
          <span>{loading ? 'Ativando...' : 'Ativar notificacoes'}</span>
        </>
      )}
    </button>
  );
}
