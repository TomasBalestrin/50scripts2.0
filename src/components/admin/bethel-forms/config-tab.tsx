'use client';

import { AlertTriangle, ArrowDown, ArrowUp, CheckCircle, Loader2, Save, Wand2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useBethelFormsConfig } from '@/hooks/use-bethel-forms-config';
import { PERGUNTAS } from '@/lib/bethel-forms/perguntas';
import { progressoDasOpcoes, formatarDataBR } from '@/lib/bethel-forms/view';
import { MapeamentoLinha } from './mapeamento-linha';
import { Seletor } from './seletor';

export function ConfigTab() {
  const h = useBethelFormsConfig();
  const { rascunho, catalogo } = h;

  if (h.carregando) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#1D4ED8]" />
      </div>
    );
  }

  const especialista = catalogo.find((e) => e.id === rascunho.destino?.especialistaId);
  const grupo = especialista?.grupos.find((g) => g.id === rascunho.destino?.grupoId);
  const podeSalvar = !!rascunho.destino?.funilId && h.problemas.length === 0 && !h.salvando && !h.carregandoCampos && h.formsConfigurado;

  return (
    <div className="space-y-6">
      {!h.formsConfigurado && (
        <div className="flex items-start gap-2 rounded-lg border border-yellow-800 bg-yellow-900/20 p-3 text-sm text-yellow-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Faltam as variáveis <code>BETHEL_FORMS_URL</code> e <code>BETHEL_FORMS_API_KEY</code> no ambiente. Sem elas nada é enviado nem listado.
          </span>
        </div>
      )}
      {h.erro && <div className="rounded-lg border border-red-800 bg-red-900/20 p-3 text-sm text-red-300">{h.erro}</div>}
      {h.aviso && (
        <div className="flex items-center gap-2 rounded-lg border border-green-800 bg-green-900/20 p-3 text-sm text-green-300">
          <CheckCircle className="h-4 w-4 shrink-0" />
          {h.aviso}
        </div>
      )}

      {/* Envio ao vivo */}
      <Card className="border-[#131B35] bg-[#0A0F1E]">
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
          <div>
            <p className="font-medium text-white">Envio ao vivo</p>
            <p className="text-sm text-gray-400">
              Cada onboarding preenchido vai para o Forms.
              {h.config.ativadoEm && <> Ligado pela primeira vez em {formatarDataBR(h.config.ativadoEm)}.</>}
            </p>
          </div>
          <Switch
            checked={h.config.ativo}
            disabled={h.salvando || !h.config.motorId || !h.formsConfigurado}
            onCheckedChange={h.definirAtivo}
            aria-label="Envio ao vivo ligado"
          />
        </CardContent>
      </Card>

      {/* Destino */}
      <Card className="border-[#131B35] bg-[#0A0F1E]">
        <CardHeader>
          <CardTitle className="text-base text-white">Destino no Forms</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs text-gray-500">Especialista</label>
            <Seletor
              ariaLabel="Especialista"
              valor={rascunho.destino?.especialistaId ?? ''}
              opcoes={catalogo.map((e) => ({ valor: e.id, rotulo: e.nome }))}
              onChange={(id) => {
                const e = catalogo.find((x) => x.id === id);
                if (e) h.escolherDestino({ especialistaId: e.id, especialistaNome: e.nome, grupoId: '', grupoNome: '', funilId: '', funilNome: '' });
              }}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">Grupo</label>
            <Seletor
              ariaLabel="Grupo"
              desabilitado={!especialista}
              valor={rascunho.destino?.grupoId ?? ''}
              opcoes={(especialista?.grupos ?? []).map((g) => ({ valor: g.id, rotulo: g.nome }))}
              onChange={(id) => {
                const g = especialista?.grupos.find((x) => x.id === id);
                if (g) h.escolherDestino({ grupoId: g.id, grupoNome: g.nome, funilId: '', funilNome: '' });
              }}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">Funil</label>
            <Seletor
              ariaLabel="Funil"
              desabilitado={!grupo}
              valor={rascunho.destino?.funilId ?? ''}
              opcoes={(grupo?.funis ?? []).map((f) => ({ valor: f.id, rotulo: f.nome }))}
              onChange={(id) => {
                const f = grupo?.funis.find((x) => x.id === id);
                if (f) h.escolherDestino({ funilId: f.id, funilNome: f.nome });
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Mapeamento */}
      {rascunho.destino?.funilId && (
        <Card className="border-[#131B35] bg-[#0A0F1E]">
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base text-white">Perguntas do 50 Scripts → campos do Forms</CardTitle>
            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white" onClick={h.refazerSugestao} disabled={h.carregandoCampos}>
              <Wand2 className="mr-2 h-4 w-4" />
              Refazer sugestão
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {h.carregandoCampos ? (
              <div className="flex h-24 items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-[#1D4ED8]" />
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-400">
                  Escolha o campo do funil que recebe cada pergunta. Nos campos de escolha (Nicho, Faturamento, Posição, Dor...) ligue cada opção do 50 Scripts a uma
                  opção do Forms: é assim que o estado do lead é calculado.
                </p>
                {PERGUNTAS.map((p) => (
                  <MapeamentoLinha
                    key={p.chave}
                    pergunta={p}
                    mapeamento={rascunho.campos[p.chave]}
                    campos={h.campos}
                    ligadas={progressoDasOpcoes(p.chave, rascunho.campos).ligadas}
                    onTrocarCampo={(alvoId) => h.trocarCampo(p.chave, alvoId)}
                    onLigarOpcao={(opcao, ancora) => h.ligarOpcao(p.chave, opcao, ancora)}
                  />
                ))}

                <div className="space-y-2 rounded-lg border border-[#131B35] p-4">
                  <p className="text-sm font-medium text-white">Prioridade dos desafios</p>
                  <p className="text-xs text-gray-500">
                    O formulário aceita um desafio só. Respostas antigas com mais de um marcado usam o de cima desta lista; os outros ficam salvos como texto em
                    &quot;Desafios marcados&quot;.
                  </p>
                  {rascunho.prioridadeDesafios.map((d, i) => (
                    <div key={d} className="flex items-center gap-2 text-sm text-gray-200">
                      <span className="w-5 text-gray-500">{i + 1}.</span>
                      <span className="flex-1">{d}</span>
                      <Button variant="ghost" size="sm" aria-label={`Subir ${d}`} disabled={i === 0} onClick={() => h.moverDesafio(i, -1)}>
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Descer ${d}`}
                        disabled={i === rascunho.prioridadeDesafios.length - 1}
                        onClick={() => h.moverDesafio(i, 1)}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                {h.problemas.length > 0 && (
                  <div className="space-y-1 rounded-lg border border-yellow-800 bg-yellow-900/20 p-3 text-sm text-yellow-300">
                    <p className="flex items-center gap-2 font-medium">
                      <AlertTriangle className="h-4 w-4" />
                      Falta resolver para salvar
                    </p>
                    <ul className="list-inside list-disc space-y-0.5 text-yellow-200/90">
                      {h.problemas.map((p, i) => (
                        <li key={i}>{p.mensagem}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex items-center justify-end gap-3">
                  {!h.mudouDesdeOSalvo && h.config.motorId && <Badge className="border-green-800 bg-green-900/30 text-green-400">Salvo</Badge>}
                  <Button onClick={h.salvar} disabled={!podeSalvar} className="bg-[#1D4ED8] text-white hover:bg-[#1E40AF]">
                    {h.salvando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Salvar configuração
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
