'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { X, CheckCircle, AlertCircle, Info, Undo2 } from 'lucide-react';
import type { Toast } from '@/hooks/use-toast';

interface ToastContainerProps {
  toasts: Toast[];
  dismiss: (id: string) => void;
}

const ICONS = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
  undo: Undo2,
};

const COLORS = {
  success: 'border-emerald-500/30 bg-emerald-500/10',
  error: 'border-red-500/30 bg-red-500/10',
  info: 'border-blue-500/30 bg-blue-500/10',
  undo: 'border-amber-500/30 bg-amber-500/10',
};

const ICON_COLORS = {
  success: 'text-emerald-400',
  error: 'text-red-400',
  info: 'text-blue-400',
  undo: 'text-amber-400',
};

export function ToastContainer({ toasts, dismiss }: ToastContainerProps) {
  return (
    <div
      className="fixed bottom-24 right-4 z-50 flex flex-col gap-2 lg:bottom-6"
      role="region"
      aria-label="Notificações"
      aria-live="polite"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => {
          const type = t.type || 'success';
          const Icon = ICONS[type];
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 shadow-lg backdrop-blur-sm ${COLORS[type]}`}
              role="alert"
            >
              <Icon className={`h-4 w-4 shrink-0 ${ICON_COLORS[type]}`} />
              <p className="flex-1 text-sm text-white">{t.message}</p>
              {t.action && (
                <button
                  onClick={t.action.onClick}
                  className="shrink-0 rounded-lg bg-white/10 px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-white/20"
                >
                  {t.action.label}
                </button>
              )}
              <button
                onClick={() => dismiss(t.id)}
                className="shrink-0 rounded-lg p-1 text-white/50 transition-colors hover:text-white"
                aria-label="Fechar notificação"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
