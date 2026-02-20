'use client';

import { useEffect, useState } from 'react';
import { Loader2, ClipboardList } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { createClient } from '@/lib/supabase/client';
import type { UserOnboarding } from '@/types/database';

interface OnboardingDetailModalProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function OnboardingDetailModal({ userId, isOpen, onClose }: OnboardingDetailModalProps) {
  const [data, setData] = useState<UserOnboarding | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const supabase = createClient();

  useEffect(() => {
    if (!isOpen || !userId) return;

    async function fetchOnboarding() {
      setLoading(true);
      setError('');
      try {
        const { data: onboarding, error: err } = await supabase
          .from('user_onboarding')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (err) {
          setError('Dados de onboarding não encontrados para este usuário.');
          setData(null);
        } else {
          setData(onboarding as UserOnboarding);
        }
      } catch {
        setError('Erro ao carregar dados de onboarding.');
      } finally {
        setLoading(false);
      }
    }

    fetchOnboarding();
  }, [isOpen, userId]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-[#131B35] bg-[#0A0F1E] text-white sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <ClipboardList className="h-5 w-5 text-[#1D4ED8]" />
            Dados do Onboarding
          </DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-[#1D4ED8]" />
          </div>
        )}

        {error && !loading && (
          <div className="rounded-lg border border-[#131B35] bg-[#131B35]/50 p-4 text-center">
            <p className="text-sm text-gray-400">{error}</p>
          </div>
        )}

        {data && !loading && (
          <div className="mt-4 space-y-6">
            {/* Personal Info */}
            <div>
              <h3 className="mb-3 text-sm font-semibold text-[#3B82F6]">Informações Pessoais</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <InfoField label="Nome Completo" value={data.full_name} />
                <InfoField label="Telefone" value={data.phone} />
                <InfoField label="Email" value={data.email} />
                <InfoField label="Instagram" value={data.instagram} />
              </div>
            </div>

            {/* Business Info */}
            <div>
              <h3 className="mb-3 text-sm font-semibold text-[#3B82F6]">Informações do Negócio</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <InfoField label="Empresa" value={data.company_name} />
                <InfoField label="Tipo de Negócio" value={data.business_type} />
                {data.business_type_custom && (
                  <InfoField label="Tipo (Personalizado)" value={data.business_type_custom} />
                )}
                <InfoField label="Cargo" value={data.role_in_business} />
                <InfoField label="Ticket Médio" value={data.average_ticket} />
                <InfoField label="Público Alvo" value={data.target_audience} />
              </div>
            </div>

            {/* Strategic Info */}
            <div>
              <h3 className="mb-3 text-sm font-semibold text-[#3B82F6]">Informações Estratégicas</h3>
              <div className="space-y-3 text-sm">
                <InfoField label="Principais Objeções" value={data.main_objections} fullWidth />
                <div>
                  <p className="text-gray-400">Principais Desafios</p>
                  {data.main_challenges && data.main_challenges.length > 0 ? (
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {data.main_challenges.map((challenge, i) => (
                        <span
                          key={i}
                          className="inline-block rounded-md border border-[#131B35] bg-[#131B35] px-2 py-0.5 text-xs text-gray-300"
                        >
                          {challenge}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="font-medium text-white">-</p>
                  )}
                </div>
                {data.main_challenges_custom && (
                  <InfoField label="Desafios (Personalizado)" value={data.main_challenges_custom} fullWidth />
                )}
                <div className="grid grid-cols-2 gap-3">
                  <InfoField label="Possui Sócio" value={data.has_partner ? 'Sim' : 'Não'} />
                  <InfoField label="Tempo conhecendo Cleiton" value={data.time_knowing_cleiton} />
                </div>
              </div>
            </div>

            {/* Timestamps */}
            <div className="border-t border-[#131B35] pt-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <InfoField
                  label="Criado em"
                  value={data.created_at ? new Date(data.created_at).toLocaleString('pt-BR') : null}
                />
                <InfoField
                  label="Atualizado em"
                  value={data.updated_at ? new Date(data.updated_at).toLocaleString('pt-BR') : null}
                />
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function InfoField({
  label,
  value,
  fullWidth,
}: {
  label: string;
  value: string | null | undefined;
  fullWidth?: boolean;
}) {
  return (
    <div className={fullWidth ? 'col-span-2' : ''}>
      <p className="text-gray-400">{label}</p>
      <p className="font-medium text-white">{value || '-'}</p>
    </div>
  );
}
