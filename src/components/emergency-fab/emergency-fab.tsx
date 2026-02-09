'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap,
  HandMetal,
  Shield,
  RotateCcw,
  Target,
  X,
} from 'lucide-react';
import { EmergencyScriptModal } from './emergency-script-modal';
import type { Script } from '@/types/database';

interface EmergencyOption {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  endpoint: string;
}

const emergencyOptions: EmergencyOption[] = [
  {
    id: 'approach',
    label: 'Abordar',
    icon: HandMetal,
    color: '#10B981',
    bgColor: 'rgba(16, 185, 129, 0.2)',
    endpoint: '/api/scripts/emergency/approach',
  },
  {
    id: 'objection',
    label: 'Objeção',
    icon: Shield,
    color: '#F59E0B',
    bgColor: 'rgba(245, 158, 11, 0.2)',
    endpoint: '/api/scripts/emergency/objection',
  },
  {
    id: 'followup',
    label: 'Follow-up',
    icon: RotateCcw,
    color: '#3B82F6',
    bgColor: 'rgba(59, 130, 246, 0.2)',
    endpoint: '/api/scripts/emergency/followup',
  },
  {
    id: 'close',
    label: 'Fechar',
    icon: Target,
    color: '#8B5CF6',
    bgColor: 'rgba(139, 92, 246, 0.2)',
    endpoint: '/api/scripts/emergency/close',
  },
];

// Vertical positions – options stack straight above the FAB so nothing clips
const arcPositions = [
  { x: 0, y: -75 },
  { x: 0, y: -145 },
  { x: 0, y: -215 },
  { x: 0, y: -285 },
];

export function EmergencyFAB() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [modalScript, setModalScript] = useState<Script | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const toggleExpand = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  const closeExpand = useCallback(() => {
    setIsExpanded(false);
  }, []);

  const handleOptionClick = useCallback(async (option: EmergencyOption) => {
    setIsLoading(option.id);
    try {
      const response = await fetch(option.endpoint);
      if (!response.ok) {
        throw new Error('Falha ao buscar script de emergência');
      }
      const data = await response.json();
      setModalScript(data.script ?? data);
      setIsModalOpen(true);
      setIsExpanded(false);
    } catch (error) {
      console.error('Emergency script fetch error:', error);
    } finally {
      setIsLoading(null);
    }
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setModalScript(null);
  }, []);

  return (
    <>
      {/* Backdrop overlay */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={closeExpand}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* FAB container */}
      <div
        className="fixed z-50 bottom-6 right-6 md:bottom-8 md:right-8
                    max-md:bottom-20 max-md:right-1/2 max-md:translate-x-1/2"
      >
        {/* Radial option buttons */}
        <AnimatePresence>
          {isExpanded &&
            emergencyOptions.map((option, index) => {
              const Icon = option.icon;
              const pos = arcPositions[index];
              return (
                <motion.div
                  key={option.id}
                  initial={{ opacity: 0, x: 0, y: 0, scale: 0.3 }}
                  animate={{
                    opacity: 1,
                    x: pos.x,
                    y: pos.y,
                    scale: 1,
                  }}
                  exit={{ opacity: 0, x: 0, y: 0, scale: 0.3 }}
                  transition={{
                    type: 'spring',
                    stiffness: 400,
                    damping: 22,
                    delay: index * 0.06,
                  }}
                  className="absolute bottom-0 right-0 flex items-center gap-2"
                  style={{ zIndex: 51 }}
                >
                  {/* Tooltip label */}
                  <span
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg whitespace-nowrap
                               bg-[#0A0F1E] text-white border border-white/10 shadow-lg"
                  >
                    {option.label}
                  </span>

                  {/* Option button */}
                  <button
                    onClick={() => handleOptionClick(option)}
                    disabled={isLoading !== null}
                    className="relative flex items-center justify-center w-11 h-11 rounded-full
                               border-2 shadow-lg transition-transform hover:scale-110
                               active:scale-95 disabled:opacity-60 disabled:cursor-wait"
                    style={{
                      backgroundColor: option.bgColor,
                      borderColor: option.color,
                    }}
                    aria-label={option.label}
                  >
                    {isLoading === option.id ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{
                          repeat: Infinity,
                          duration: 0.8,
                          ease: 'linear',
                        }}
                        className="w-5 h-5 border-2 border-t-transparent rounded-full"
                        style={{ borderColor: option.color, borderTopColor: 'transparent' }}
                      />
                    ) : (
                      <Icon size={20} />
                    )}
                  </button>
                </motion.div>
              );
            })}
        </AnimatePresence>

        {/* Main FAB button */}
        <motion.button
          onClick={toggleExpand}
          whileTap={{ scale: 0.9 }}
          className="relative flex items-center justify-center w-14 h-14 rounded-full
                     shadow-2xl shadow-[#1D4ED8]/30 z-50 focus:outline-none focus-visible:ring-2
                     focus-visible:ring-[#1D4ED8] focus-visible:ring-offset-2 focus-visible:ring-offset-[#020617]"
          style={{
            background: 'linear-gradient(135deg, #1D4ED8 0%, #1E3A8A 100%)',
          }}
          aria-label={isExpanded ? 'Fechar menu de emergência' : 'Script de emergência'}
          aria-expanded={isExpanded}
        >
          {/* Pulse ring animation */}
          {!isExpanded && (
            <span className="absolute inset-0 rounded-full animate-ping bg-[#1D4ED8]/40" />
          )}

          <AnimatePresence mode="wait" initial={false}>
            {isExpanded ? (
              <motion.span
                key="close"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <X size={24} className="text-white" />
              </motion.span>
            ) : (
              <motion.span
                key="zap"
                initial={{ rotate: 90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -90, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <Zap size={24} className="text-white" fill="white" />
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </div>

      {/* Emergency script modal */}
      <EmergencyScriptModal
        script={modalScript}
        isOpen={isModalOpen}
        onClose={closeModal}
      />
    </>
  );
}
