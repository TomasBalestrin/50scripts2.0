'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import {
  requestNotificationPermission,
  subscribeToPush,
  unsubscribeFromPush,
  isSubscribed,
  NOTIFICATION_LABELS,
  type NotificationType,
} from '@/lib/notifications/push';

const NOTIFICATION_TYPES: NotificationType[] = [
  'followup_overdue',
  'streak_at_risk',
  'challenge_available',
  'milestone_reached',
  'weekly_report',
];

export function NotificationSettings() {
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [prefs, setPrefs] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function load() {
      const sub = await isSubscribed();
      setSubscribed(sub);

      try {
        const res = await fetch('/api/notifications/preferences');
        const data = await res.json();
        setPrefs(data.prefs || {});
      } catch {
        // ignore
      }
      setLoading(false);
    }
    load();
  }, []);

  const handleTogglePush = async () => {
    setToggling(true);
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
    } catch {
      // ignore
    }
    setToggling(false);
  };

  const handleTogglePref = async (type: NotificationType, enabled: boolean) => {
    const newPrefs = { ...prefs, [type]: enabled };
    setPrefs(newPrefs);

    try {
      await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prefs: newPrefs }),
      });
    } catch {
      // revert on error
      setPrefs(prefs);
    }
  };

  if (loading) {
    return (
      <Card className="bg-[#1A1A2E] border-[#252542]">
        <CardContent className="pt-6 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-[#1A1A2E] border-[#252542]">
      <CardHeader>
        <CardTitle className="text-white text-lg flex items-center gap-2">
          <Bell className="w-5 h-5 text-[#E94560]" />
          Notificações Push
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Master toggle */}
        <div className="flex items-center justify-between p-3 bg-[#252542] rounded-lg">
          <div className="flex items-center gap-3">
            {subscribed ? (
              <Bell className="w-5 h-5 text-green-500" />
            ) : (
              <BellOff className="w-5 h-5 text-gray-500" />
            )}
            <div>
              <p className="text-sm font-medium text-white">
                {subscribed ? 'Notificações ativas' : 'Notificações desativadas'}
              </p>
              <p className="text-xs text-gray-400">
                {subscribed
                  ? 'Você receberá alertas no navegador'
                  : 'Ative para receber lembretes'}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant={subscribed ? 'outline' : 'default'}
            onClick={handleTogglePush}
            disabled={toggling}
            className={
              subscribed
                ? 'border-[#363660] text-gray-400 hover:bg-[#363660]'
                : 'bg-[#E94560] hover:bg-[#d63d56] text-white'
            }
          >
            {toggling ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : subscribed ? (
              'Desativar'
            ) : (
              'Ativar'
            )}
          </Button>
        </div>

        {/* Individual preferences */}
        {subscribed && (
          <div className="space-y-3">
            <p className="text-sm text-gray-400">Tipos de notificação</p>
            {NOTIFICATION_TYPES.map((type) => (
              <div
                key={type}
                className="flex items-center justify-between py-2"
              >
                <span className="text-sm text-gray-300">
                  {NOTIFICATION_LABELS[type]}
                </span>
                <Switch
                  checked={prefs[type] !== false}
                  onCheckedChange={(checked: boolean) => handleTogglePref(type, checked)}
                />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
