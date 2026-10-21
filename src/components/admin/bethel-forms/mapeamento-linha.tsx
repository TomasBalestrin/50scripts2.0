'use client';

import { Badge } from '@/components/ui/badge';
import { Seletor } from './seletor';
import type { PerguntaDef } from '@/lib/bethel-forms/perguntas';
import type { CampoDoFunil, MapeamentoPergunta } from '@/lib/bethel-forms/tipos';
import { SEM_CAMPO } from '@/lib/bethel-forms/view';

interface Props {
  pergunta: PerguntaDef;
  mapeamento: MapeamentoPergunta | undefined;
  campos: CampoDoFunil[];
  ligadas: number;
  onTrocarCampo: (alvoId: string | null) => void;
  onLigarOpcao: (opcao: string, ancora: string | null) => void;
}

/** Uma pergunta do 50 Scripts: o campo do Forms que a recebe e, se for campo de escolha, o de/para de cada opção. */
export function MapeamentoLinha({ pergunta, mapeamento, campos, ligadas, onTrocarCampo, onLigarOpcao }: Props) {
  const alvo = mapeamento?.alvoId ? campos.find((c) => c.id === mapeamento.alvoId) : undefined;
  const mostrarOpcoes = pergunta.tipo === 'escolha' && !!alvo?.opcoes;

  return (
    <div className="space-y-3 rounded-lg border border-[#131B35] p-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-[220px] flex-1">
          <p className="text-sm font-medium text-white">{pergunta.rotulo}</p>
          <p className="text-xs text-gray-500">
            {pergunta.tipo === 'escolha' ? `Escolha (${pergunta.opcoes.length} opções)` : 'Texto'} · chave <code>{pergunta.chave}</code>
          </p>
        </div>
        <div className="w-full sm:w-72">
          <Seletor
            ariaLabel={`Campo do Forms para ${pergunta.rotulo}`}
            valor={mapeamento?.alvoId ?? SEM_CAMPO}
            onChange={(v) => onTrocarCampo(v === SEM_CAMPO ? null : v)}
            opcoes={[
              { valor: SEM_CAMPO, rotulo: 'Dado adicional (sem campo)' },
              ...campos.map((c) => ({ valor: c.id, rotulo: `${c.titulo || '(sem título)'} · ${c.tipo}${c.interno ? ' · oculto' : ''}` })),
            ]}
          />
        </div>
        {mostrarOpcoes && (
          <Badge
            className={ligadas === pergunta.opcoes.length ? 'border-green-800 bg-green-900/30 text-green-400' : 'border-yellow-800 bg-yellow-900/30 text-yellow-400'}
          >
            {ligadas} de {pergunta.opcoes.length} opções ligadas
          </Badge>
        )}
      </div>

      {mostrarOpcoes && alvo?.opcoes && (
        <div className="grid gap-2 border-t border-[#131B35] pt-3 md:grid-cols-2">
          {pergunta.opcoes.map((opcao) => (
            <div key={opcao} className="flex items-center gap-2">
              <span className="min-w-0 flex-1 truncate text-xs text-gray-300" title={opcao}>
                {opcao}
              </span>
              <span className="text-gray-600">→</span>
              <div className="w-48 shrink-0">
                <Seletor
                  ariaLabel={`Opção do Forms para ${opcao}`}
                  className="h-8 text-xs"
                  valor={mapeamento?.opcoes[opcao] ?? SEM_CAMPO}
                  onChange={(v) => onLigarOpcao(opcao, v === SEM_CAMPO ? null : v)}
                  opcoes={[{ valor: SEM_CAMPO, rotulo: '— sem destino —' }, ...alvo.opcoes!.map((o) => ({ valor: o.valor, rotulo: o.rotulo }))]}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
