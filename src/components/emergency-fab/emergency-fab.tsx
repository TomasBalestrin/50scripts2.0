'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, X, Copy, Loader2 } from 'lucide-react';
import { EMERGENCY_LABELS, EMERGENCY_ICONS, EMERGENCY_TYPES } from '@/lib/constants';

interface EmergencyScript {
  id: string;
  title: string;
  content: string;
}

export function EmergencyFab() {
  const [open, setOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [script, setScript] = useState<EmergencyScript | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchScript = useCallback(async (type: string) => {
    setLoading(true);
    setScript(null);
    try {
      const res = await fetch(`/api/scripts/search?emergency=${type}&limit=1`);
      if (res.ok) {
        const data = await res.json();
        if (data.scripts?.length > 0) {
          setScript(data.scripts[0]);
        }
      }
    } catch {
      // Silently ignore
    } finally {
      setLoading(false);
    }
  }, []);

  const handleTypeClick = (type: string) => {
    setSelectedType(type);
    fetchScript(type);
  };

  const handleCopy = async () => {
    if (!script) return;
    try {
      await navigator.clipboard.writeText(script.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedType(null);
    setScript(null);
  };

  // Close on escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      {/* Overlay */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
            onClick={handleClose}
          />
        )}
      </AnimatePresence>

      {/* Script detail modal */}
      <AnimatePresence>
        {selectedType && script && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className="fixed bottom-24 left-4 right-4 z-[70] mx-auto max-w-md rounded-2xl border border-[#131B35] bg-[#0A0F1E] p-5 shadow-2xl lg:left-auto lg:right-8"
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">{script.title}</h3>
              <button
                onClick={handleClose}
                className="rounded-lg p-1 text-[#94A3B8] hover:bg-[#131B35] hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mb-4 text-sm leading-relaxed text-[#CBD5E1] whitespace-pre-wrap">
              {script.content}
            </p>
            <button
              onClick={handleCopy}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1D4ED8] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#1D4ED8]/90"
            >
              {copied ? (
                <>
                  <Copy className="h-4 w-4" /> Copiado!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" /> Copiar Script
                </>
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading state */}
      <AnimatePresence>
        {selectedType && loading && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className="fixed bottom-24 left-4 right-4 z-[70] mx-auto flex max-w-md items-center justify-center rounded-2xl border border-[#131B35] bg-[#0A0F1E] p-8 shadow-2xl lg:left-auto lg:right-8"
          >
            <Loader2 className="h-6 w-6 animate-spin text-[#1D4ED8]" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Circular options */}
      <AnimatePresence>
        {open && !selectedType && (
          <div className="fixed bottom-24 right-6 z-[70] flex flex-col-reverse gap-3 lg:right-8">
            {EMERGENCY_TYPES.map((type, i) => (
              <motion.button
                key={type}
                initial={{ opacity: 0, y: 20, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.8 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => handleTypeClick(type)}
                className="flex items-center gap-3 rounded-full border border-[#131B35] bg-[#0A0F1E] px-4 py-2.5 shadow-lg transition-colors hover:border-[#1D4ED8]/30 hover:bg-[#131B35]"
              >
                <span className="text-lg">{EMERGENCY_ICONS[type]}</span>
                <span className="text-sm font-medium text-white">
                  {EMERGENCY_LABELS[type]}
                </span>
              </motion.button>
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* FAB Button */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => (open ? handleClose() : setOpen(true))}
        className="fixed bottom-20 right-4 z-[70] flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#1D4ED8] to-[#3B82F6] shadow-lg shadow-[#1D4ED8]/30 transition-transform lg:bottom-8 lg:right-8"
        aria-label="Modo Emergência"
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
            >
              <X className="h-6 w-6 text-white" />
            </motion.div>
          ) : (
            <motion.div
              key="open"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
            >
              <Zap className="h-6 w-6 text-white" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </>
  );
}
