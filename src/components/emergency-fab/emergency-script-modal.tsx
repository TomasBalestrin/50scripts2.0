'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check } from 'lucide-react';
import type { Script } from '@/types/database';

interface EmergencyScriptModalProps {
  script: Script | null;
  isOpen: boolean;
  onClose: () => void;
}

export function EmergencyScriptModal({
  script,
  isOpen,
  onClose,
}: EmergencyScriptModalProps) {
  const [copied, setCopied] = useState(false);

  // Reset copied state when modal opens with new script
  useEffect(() => {
    if (isOpen) {
      setCopied(false);
    }
  }, [isOpen, script]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleCopy = useCallback(async () => {
    if (!script) return;
    try {
      await navigator.clipboard.writeText(script.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy script:', err);
    }
  }, [script]);

  if (!script) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60]"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Bottom sheet modal */}
          <motion.div
            initial={{ y: '100%', opacity: 0.5 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{
              type: 'spring',
              stiffness: 350,
              damping: 30,
            }}
            role="dialog"
            aria-modal="true"
            aria-label="Script de emergência"
            className="fixed bottom-0 left-0 right-0 z-[61] max-h-[85vh] flex flex-col
                       rounded-t-2xl bg-[#1A1A2E] border-t border-white/10 shadow-2xl
                       md:left-1/2 md:-translate-x-1/2 md:max-w-lg md:bottom-4 md:rounded-2xl
                       md:border md:max-h-[80vh]"
          >
            {/* Drag handle (mobile) */}
            <div className="flex justify-center pt-3 pb-1 md:hidden">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>

            {/* Header */}
            <div className="flex items-start justify-between px-5 pt-3 pb-3 border-b border-white/10">
              <div className="flex-1 min-w-0 pr-4">
                <h2 className="text-lg font-bold text-white leading-tight truncate">
                  {script.title}
                </h2>
                {script.category && (
                  <span
                    className="inline-flex items-center mt-1.5 px-2.5 py-0.5 rounded-full text-[11px]
                               font-semibold uppercase tracking-wide border"
                    style={{
                      color: script.category.color || '#E94560',
                      borderColor: `${script.category.color || '#E94560'}40`,
                      backgroundColor: `${script.category.color || '#E94560'}15`,
                    }}
                  >
                    {script.category.name}
                  </span>
                )}
              </div>

              <button
                onClick={onClose}
                className="flex items-center justify-center w-8 h-8 rounded-full
                           bg-white/5 hover:bg-white/10 transition-colors text-white/60
                           hover:text-white shrink-0"
                aria-label="Fechar"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content area */}
            <div className="flex-1 overflow-y-auto px-5 py-4 scrollbar-thin">
              {/* Context description */}
              {script.context_description && (
                <div className="mb-4 p-3 rounded-lg bg-[#0F3460]/20 border border-[#0F3460]/30">
                  <p className="text-xs font-semibold text-[#3B82F6] uppercase tracking-wide mb-1">
                    Contexto
                  </p>
                  <p className="text-sm text-white/80 leading-relaxed">
                    {script.context_description}
                  </p>
                </div>
              )}

              {/* Script content */}
              <div className="p-4 rounded-xl bg-[#252542] border border-white/5">
                <p className="text-sm text-white leading-relaxed whitespace-pre-wrap">
                  {script.content}
                </p>
              </div>
            </div>

            {/* Copy button (sticky bottom) */}
            <div className="px-5 pb-5 pt-3 border-t border-white/5">
              <button
                onClick={handleCopy}
                className="w-full flex items-center justify-center gap-2.5 h-12 rounded-xl
                           font-bold text-base text-white transition-all duration-200
                           focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
                           focus-visible:ring-offset-[#1A1A2E]"
                style={{
                  background: copied
                    ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
                    : 'linear-gradient(135deg, #E94560 0%, #c7374e 100%)',
                }}
              >
                {copied ? (
                  <>
                    <Check size={20} />
                    Copiado! &#10003;
                  </>
                ) : (
                  <>
                    <Copy size={20} />
                    COPIAR SCRIPT
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
