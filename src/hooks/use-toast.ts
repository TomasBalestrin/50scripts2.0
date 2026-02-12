'use client';

import { useState, useCallback, useRef } from 'react';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface Toast {
  id: string;
  message: string;
  type?: 'success' | 'error' | 'info' | 'undo';
  duration?: number;
  action?: ToastAction;
}

interface UseToastReturn {
  toasts: Toast[];
  toast: (message: string, type?: Toast['type'], duration?: number) => void;
  toastWithUndo: (message: string, onUndo: () => void, duration?: number) => void;
  dismiss: (id: string) => void;
}

export function useToast(): UseToastReturn {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, type: Toast['type'] = 'success', duration = 3000) => {
      const id = crypto.randomUUID();
      const newToast: Toast = { id, message, type, duration };
      setToasts((prev) => [...prev, newToast]);

      const timer = setTimeout(() => {
        dismiss(id);
      }, duration);
      timersRef.current.set(id, timer);
    },
    [dismiss]
  );

  const toastWithUndo = useCallback(
    (message: string, onUndo: () => void, duration = 5000) => {
      const id = crypto.randomUUID();
      const newToast: Toast = {
        id,
        message,
        type: 'undo',
        duration,
        action: {
          label: 'Desfazer',
          onClick: () => {
            onUndo();
            dismiss(id);
          },
        },
      };
      setToasts((prev) => [...prev, newToast]);

      const timer = setTimeout(() => {
        dismiss(id);
      }, duration);
      timersRef.current.set(id, timer);
    },
    [dismiss]
  );

  return { toasts, toast, toastWithUndo, dismiss };
}
