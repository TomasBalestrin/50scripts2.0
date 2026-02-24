'use client';

import { useEffect, useState, useCallback, createContext, useContext } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, Download, Smartphone, Share, WifiOff, X, RefreshCw, Plus } from 'lucide-react';
import { subscribeToPush, isSubscribed as checkPushSubscribed } from '@/lib/notifications/push';

// ─── Context ────────────────────────────────────────────────────────────────
interface PWAContextValue {
  isInstallable: boolean;
  isOffline: boolean;
  promptInstall: () => Promise<void>;
  notifyScriptUsed: () => void;
}

const PWAContext = createContext<PWAContextValue>({
  isInstallable: false,
  isOffline: false,
  promptInstall: async () => {},
  notifyScriptUsed: () => {},
});

export const usePWA = () => useContext(PWAContext);

// ─── Helpers ────────────────────────────────────────────────────────────────
function isIOS(): boolean {
  if (typeof window === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in navigator && (navigator as Record<string, unknown>).standalone === true);
}

const INSTALL_PROMPT_KEY = 'install_guide_seen';
const SCRIPT_USE_COUNT_KEY = 'scripts_used_count';
const SCRIPTS_BEFORE_PROMPT = 3;

// ─── Provider ───────────────────────────────────────────────────────────────
export function PWAProvider({ children }: { children: React.ReactNode }) {
  const [isOffline, setIsOffline] = useState(false);
  const [isInstallable, setIsInstallable] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPushBanner, setShowPushBanner] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [isIOSDevice, setIsIOSDevice] = useState(false);

  // ── Service Worker Registration ──────────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });

        const checkInterval = setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000);

        registration.addEventListener('waiting', () => {
          const sw = registration.waiting;
          if (sw) {
            setWaitingWorker(sw);
            setShowUpdateBanner(true);
          }
        });

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

    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  }, []);

  // ── Install Prompt (Android/Chrome) ────────────────────────────────────
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    window.addEventListener('appinstalled', () => {
      setIsInstallable(false);
      setDeferredPrompt(null);
      setShowInstallGuide(false);
      localStorage.setItem(INSTALL_PROMPT_KEY, '1');
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  // ── Detect iOS ─────────────────────────────────────────────────────────
  useEffect(() => {
    setIsIOSDevice(isIOS());
  }, []);

  // ── Offline Detection ──────────────────────────────────────────────────
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

  // ── Push Notification Prompt ───────────────────────────────────────────
  useEffect(() => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return;
    if (Notification.permission !== 'default') return;

    const dismissed = localStorage.getItem('push_banner_dismissed');
    if (dismissed) return;

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

  // ── Script usage tracker → contextual install prompt ───────────────────
  const notifyScriptUsed = useCallback(() => {
    // Skip if already installed, already seen, or desktop
    if (isStandalone()) return;
    if (localStorage.getItem(INSTALL_PROMPT_KEY)) return;
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) return;

    const count = parseInt(localStorage.getItem(SCRIPT_USE_COUNT_KEY) || '0', 10) + 1;
    localStorage.setItem(SCRIPT_USE_COUNT_KEY, count.toString());

    if (count === SCRIPTS_BEFORE_PROMPT) {
      // Small delay so the copy toast shows first
      setTimeout(() => setShowInstallGuide(true), 1500);
    }
  }, []);

  // ── Actions ────────────────────────────────────────────────────────────
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

  const handleInstallGuideClose = useCallback(() => {
    setShowInstallGuide(false);
    localStorage.setItem(INSTALL_PROMPT_KEY, '1');
  }, []);

  const handleInstallGuideInstall = useCallback(async () => {
    if (deferredPrompt) {
      // Android: trigger native install
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstallable(false);
      }
      setDeferredPrompt(null);
    }
    setShowInstallGuide(false);
    localStorage.setItem(INSTALL_PROMPT_KEY, '1');
  }, [deferredPrompt]);

  return (
    <PWAContext.Provider value={{ isInstallable, isOffline, promptInstall, notifyScriptUsed }}>
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
            <span>Sem conexao - modo offline</span>
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

      {/* ── Contextual Install Guide (after 3rd script) ──────────────── */}
      <AnimatePresence>
        {showInstallGuide && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] bg-black/60"
              onClick={handleInstallGuideClose}
            />
            {/* Modal */}
            <motion.div
              initial={{ y: 40, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 40, opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="fixed left-4 right-4 bottom-28 z-[201] mx-auto max-w-sm rounded-2xl border border-[#1D4ED8]/30 bg-[#0A0F1E] p-5 shadow-2xl lg:bottom-auto lg:top-1/2 lg:-translate-y-1/2"
            >
              {/* Close */}
              <button
                onClick={handleInstallGuideClose}
                className="absolute right-3 top-3 rounded-full p-1 text-[#94A3B8] transition-colors hover:text-white"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1D4ED8]/20">
                  <Smartphone className="h-6 w-6 text-[#3B82F6]" />
                </div>
                <div>
                  <p className="text-base font-bold text-white">
                    Voce ta usando bastante!
                  </p>
                  <p className="text-xs text-[#94A3B8]">
                    Acesse em 1 toque pela tela inicial
                  </p>
                </div>
              </div>

              {isIOSDevice ? (
                /* ── iOS Instructions ─────────────────────────────────── */
                <div className="space-y-3">
                  <div className="flex items-start gap-3 rounded-lg bg-[#020617] p-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1D4ED8]/20 text-xs font-bold text-[#3B82F6]">
                      1
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <span>Toque em</span>
                      <Share className="h-4 w-4 text-[#3B82F6]" />
                      <span>no Safari</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-lg bg-[#020617] p-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1D4ED8]/20 text-xs font-bold text-[#3B82F6]">
                      2
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <span>Toque em</span>
                      <span className="inline-flex items-center gap-1 rounded bg-[#131B35] px-2 py-0.5 text-xs font-medium text-white">
                        <Plus className="h-3 w-3" />
                        Tela de Inicio
                      </span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-lg bg-[#020617] p-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1D4ED8]/20 text-xs font-bold text-[#3B82F6]">
                      3
                    </div>
                    <p className="text-sm text-gray-300">
                      Confirme tocando em <span className="font-medium text-white">Adicionar</span>
                    </p>
                  </div>
                  <button
                    onClick={handleInstallGuideClose}
                    className="mt-2 w-full rounded-lg bg-[#1D4ED8] py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#1E40AF]"
                  >
                    Entendi!
                  </button>
                </div>
              ) : (
                /* ── Android / Chrome ─────────────────────────────────── */
                <div className="space-y-3">
                  <p className="text-sm text-gray-300">
                    Adicione o Script Go na tela inicial do seu celular para abrir em 1 toque, como um app.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleInstallGuideInstall}
                      className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#1D4ED8] py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#1E40AF]"
                    >
                      <Download className="h-4 w-4" />
                      Instalar agora
                    </button>
                    <button
                      onClick={handleInstallGuideClose}
                      className="rounded-lg border border-[#131B35] px-4 py-2.5 text-sm text-gray-400 transition-colors hover:text-white"
                    >
                      Depois
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </>
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
