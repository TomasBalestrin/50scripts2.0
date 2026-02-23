'use client';

import { useEffect, useState, useCallback, createContext, useContext } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, Download, WifiOff, X, RefreshCw } from 'lucide-react';
import { subscribeToPush, isSubscribed as checkPushSubscribed } from '@/lib/notifications/push';

// ─── Context ────────────────────────────────────────────────────────────────
interface PWAContextValue {
  isInstallable: boolean;
  isOffline: boolean;
  promptInstall: () => Promise<void>;
}

const PWAContext = createContext<PWAContextValue>({
  isInstallable: false,
  isOffline: false,
  promptInstall: async () => {},
});

export const usePWA = () => useContext(PWAContext);

// ─── Provider ───────────────────────────────────────────────────────────────
export function PWAProvider({ children }: { children: React.ReactNode }) {
  const [isOffline, setIsOffline] = useState(false);
  const [isInstallable, setIsInstallable] = useState(false);
  const [installDismissed, setInstallDismissed] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPushBanner, setShowPushBanner] = useState(false);

  // ── Service Worker Registration ──────────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });

        // Check for updates periodically (every 60 min)
        const checkInterval = setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000);

        // Detect waiting worker (new version available)
        registration.addEventListener('waiting', () => {
          const sw = registration.waiting;
          if (sw) {
            setWaitingWorker(sw);
            setShowUpdateBanner(true);
          }
        });

        // If there's already a waiting worker
        if (registration.waiting) {
          setWaitingWorker(registration.waiting);
          setShowUpdateBanner(true);
        }

        return () => clearInterval(checkInterval);
      } catch (err) {
        console.error('SW registration failed:', err);
      }
    };

    registerSW();

    // Reload when new SW takes control
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  }, []);

  // ── Install Prompt ───────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Hide install banner if app is already installed
    window.addEventListener('appinstalled', () => {
      setIsInstallable(false);
      setDeferredPrompt(null);
      setInstallDismissed(true);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  // ── Offline Detection ────────────────────────────────────────────────────
  useEffect(() => {
    setIsOffline(!navigator.onLine);

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ── Push Notification Prompt ────────────────────────────────────────────
  useEffect(() => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return;
    if (Notification.permission !== 'default') return; // Already granted/denied

    // Check if we already asked
    const dismissed = localStorage.getItem('push_banner_dismissed');
    if (dismissed) return;

    // Show banner after 10 seconds
    const timer = setTimeout(async () => {
      const alreadySubscribed = await checkPushSubscribed();
      if (!alreadySubscribed) {
        setShowPushBanner(true);
      }
    }, 10000);

    return () => clearTimeout(timer);
  }, []);

  const handleEnablePush = useCallback(async () => {
    setShowPushBanner(false);
    localStorage.setItem('push_banner_dismissed', '1');
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      await subscribeToPush();
    }
  }, []);

  const handleDismissPush = useCallback(() => {
    setShowPushBanner(false);
    localStorage.setItem('push_banner_dismissed', '1');
  }, []);

  // ── Actions ──────────────────────────────────────────────────────────────
  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstallable(false);
    }
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const handleUpdate = useCallback(() => {
    if (!waitingWorker) return;
    waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    setShowUpdateBanner(false);
  }, [waitingWorker]);

  // Check if install banner was previously dismissed in this session
  const showInstallBanner = isInstallable && !installDismissed;

  return (
    <PWAContext.Provider value={{ isInstallable, isOffline, promptInstall }}>
      {children}

      {/* ── Offline Indicator ─────────────────────────────────────────── */}
      <AnimatePresence>
        {isOffline && (
          <motion.div
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -60, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-center gap-2 bg-amber-600 px-4 py-2 text-sm font-medium text-white shadow-lg"
          >
            <WifiOff className="h-4 w-4" />
            <span>Sem conexão - modo offline</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Update Available Banner ───────────────────────────────────── */}
      <AnimatePresence>
        {showUpdateBanner && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed bottom-24 left-4 right-4 z-[100] mx-auto max-w-md rounded-xl border border-[#1D4ED8]/30 bg-[#0A0F1E] p-4 shadow-2xl lg:bottom-6"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1D4ED8]/20">
                <RefreshCw className="h-5 w-5 text-[#3B82F6]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">Atualizacao disponivel</p>
                <p className="text-xs text-[#94A3B8]">Uma nova versao esta pronta</p>
              </div>
              <button
                onClick={handleUpdate}
                className="shrink-0 rounded-lg bg-[#1D4ED8] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1E40AF]"
              >
                Atualizar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Install App Banner ────────────────────────────────────────── */}
      <AnimatePresence>
        {showInstallBanner && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed bottom-24 left-4 right-4 z-[90] mx-auto max-w-md rounded-xl border border-[#1D4ED8]/30 bg-[#0A0F1E] p-4 shadow-2xl lg:bottom-6"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1D4ED8]/20">
                <Download className="h-5 w-5 text-[#3B82F6]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">Instalar Script Go</p>
                <p className="text-xs text-[#94A3B8]">Acesse rapido direto da tela inicial</p>
              </div>
              <button
                onClick={promptInstall}
                className="shrink-0 rounded-lg bg-[#1D4ED8] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1E40AF]"
              >
                Instalar
              </button>
              <button
                onClick={() => setInstallDismissed(true)}
                className="shrink-0 rounded-full p-1 text-[#94A3B8] hover:text-white transition-colors"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* ── Push Notification Prompt ─────────────────────────────────── */}
      <AnimatePresence>
        {showPushBanner && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed bottom-24 left-4 right-4 z-[95] mx-auto max-w-md rounded-xl border border-[#1D4ED8]/30 bg-[#0A0F1E] p-4 shadow-2xl lg:bottom-6"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1D4ED8]/20">
                <Bell className="h-5 w-5 text-[#3B82F6]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">Ativar notificacoes?</p>
                <p className="text-xs text-[#94A3B8]">Receba alertas de streak, XP e novidades</p>
              </div>
              <button
                onClick={handleEnablePush}
                className="shrink-0 rounded-lg bg-[#1D4ED8] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1E40AF]"
              >
                Ativar
              </button>
              <button
                onClick={handleDismissPush}
                className="shrink-0 rounded-full p-1 text-[#94A3B8] hover:text-white transition-colors"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </PWAContext.Provider>
  );
}

// ─── Type for beforeinstallprompt event ─────────────────────────────────────
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
