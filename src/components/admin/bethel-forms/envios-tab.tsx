'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Loader2, RefreshCw, Send } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ROTULO_MODO, ROTULO_STATUS } from '@/lib/bethel-forms/status';
import { corDoStatus, formatarDataBR } from '@/lib/bethel-forms/view';
import type { EnvioRow, StatusEnvio } from '@/lib/bethel-forms/tipos';
import { Seletor } from './seletor';

const PAGE_SIZE = 20;
const STATUS: StatusEnvio[] = ['pendente', 'enviando', 'enviado', 'aviso', 'erro'];

type EnvioComPerfil = EnvioRow & { profiles?: { email: string | null; full_name: string | null } | null };
type Contagem = Record<StatusEnvio, number>;

export function EnviosTab() {
  const [envios, setEnvios] = useState<EnvioComPerfil[]>([]);
  const [total, setTotal] = useState(0);
  const [contagem, setContagem] = useState<Contagem | null>(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('all');
  const [modo, setModo] = useState('all');
  const [de, setDe] = useState('');
  const [ate, setAte] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [aberto, setAberto] = useState<string | null>(null);
  const [reenviando, setReenviando] = useState<string | null>(null);
  const [processando, setProcessando] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    const q = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
    if (status !== 'all') q.set('status', status);
    if (modo !== 'all') q.set('modo', modo);
    if (de) q.set('de', de);
    if (ate) q.set('ate', ate);
    try {
      const res = await fetch(`/api/admin/bethel-forms/envios?${q}`);
      const corpo = await res.json();
      if (res.ok) {
        setEnvios(corpo.envios);
        setTotal(corpo.total);
        setContagem(corpo.contagem);
      } else {
        setMensagem(corpo.error || 'Erro ao buscar os envios');
      }
    } catch {
      setMensagem('Erro de rede ao buscar os envios');
    } finally {
      setCarregando(false);
    }
  }, [page, status, modo, de, ate]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const reenviar = async (id: string) => {
    if (reenviando) return;
    setReenviando(id);
    setMensagem(null);
    try {
      const res = await fetch(`/api/admin/bethel-forms/envios/${id}/reenviar`, { method: 'POST' });
      const corpo = await res.json();
      setMensagem(res.ok ? `Reenviado: ${ROTULO_STATUS[corpo.status as StatusEnvio] ?? corpo.status}.` : corpo.error || 'Erro ao reenviar');
      await carregar();
    } catch {
      setMensagem('Erro de rede ao reenviar');
    } finally {
      setReenviando(null);
    }
  };

  /** Repete o lote (~45 s cada) até a fila zerar. Cada chamada manda do preenchimento mais antigo pro mais novo. */
  const enviarPendentes = async (comErros: boolean) => {
    if (processando) return;
    setProcessando(true);
    setMensagem(null);
    let enviados = 0;
    let avisos = 0;
    let erros = 0;
    let primeira = true;
    try {
      for (;;) {
        const res = await fetch('/api/admin/bethel-forms/envios/processar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reenfileirarErros: comErros && primeira }),
        });
        primeira = false;
        const corpo = await res.json();
        if (!res.ok) {
          setMensagem(corpo.error || 'Erro ao processar a fila');
          break;
        }
        enviados += corpo.enviados;
        avisos += corpo.avisos;
        erros += corpo.erros;
        setMensagem(`Enviando... ${enviados} enviados, ${avisos} com aviso, ${erros} com erro. Faltam ${corpo.restantes}.`);
        if (corpo.restantes === 0 || corpo.processados === 0) {
          setMensagem(`Pronto: ${enviados} enviados, ${avisos} com aviso, ${erros} com erro${corpo.restantes ? `. Ainda faltam ${corpo.restantes}.` : '.'}`);
          break;
        }
      }
    } catch {
      setMensagem('Erro de rede ao processar a fila');
    } finally {
      setProcessando(false);
      await carregar();
    }
  };

  const totalPaginas = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pendentes = contagem?.pendente ?? 0;
  const comErro = contagem?.erro ?? 0;
  const mudarFiltro = (fn: () => void) => {
    fn();
    setPage(1);
  };

  return (
    <div className="space-y-4">
      {/* Contadores */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {STATUS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => mudarFiltro(() => setStatus(status === s ? 'all' : s))}
            className={`rounded-lg border p-3 text-left transition-colors ${status === s ? 'border-[#1D4ED8] bg-[#1D4ED8]/10' : 'border-[#131B35] bg-[#0A0F1E] hover:bg-[#131B35]/50'}`}
          >
            <p className="text-xs text-gray-400">{ROTULO_STATUS[s]}</p>
            <p className="text-2xl font-bold text-white">{contagem ? contagem[s] : '-'}</p>
          </button>
        ))}
      </div>

      {/* Ações */}
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => enviarPendentes(false)} disabled={processando || pendentes === 0} className="bg-[#1D4ED8] text-white hover:bg-[#1E40AF]">
          {processando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
          Enviar pendentes ({pendentes})
        </Button>
        <Button onClick={() => enviarPendentes(true)} disabled={processando || comErro === 0} variant="ghost" className="text-gray-300 hover:text-white">
          <RefreshCw className="mr-2 h-4 w-4" />
          Reenviar os {comErro} com erro
        </Button>
        {mensagem && <span className="text-sm text-gray-300">{mensagem}</span>}
      </div>

      {/* Filtros */}
      <Card className="border-[#131B35] bg-[#0A0F1E]">
        <CardContent className="flex flex-wrap items-end gap-4 p-4">
          <div className="w-44">
            <label className="mb-1 block text-xs text-gray-500">Status</label>
            <Seletor
              ariaLabel="Status"
              valor={status}
              onChange={(v) => mudarFiltro(() => setStatus(v))}
              opcoes={[{ valor: 'all', rotulo: 'Todos' }, ...STATUS.map((s) => ({ valor: s, rotulo: ROTULO_STATUS[s] }))]}
            />
          </div>
          <div className="w-44">
            <label className="mb-1 block text-xs text-gray-500">Modo</label>
            <Seletor
              ariaLabel="Modo"
              valor={modo}
              onChange={(v) => mudarFiltro(() => setModo(v))}
              opcoes={[
                { valor: 'all', rotulo: 'Todos' },
                { valor: 'ao_vivo', rotulo: ROTULO_MODO.ao_vivo },
                { valor: 'retroativo', rotulo: ROTULO_MODO.retroativo },
              ]}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">Preenchido de</label>
            <Input type="date" value={de} onChange={(e) => mudarFiltro(() => setDe(e.target.value))} className="w-40 border-[#131B35] bg-[#131B35] text-white" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">até</label>
            <Input type="date" value={ate} onChange={(e) => mudarFiltro(() => setAte(e.target.value))} className="w-40 border-[#131B35] bg-[#131B35] text-white" />
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-400 hover:text-white"
            onClick={() => {
              setStatus('all');
              setModo('all');
              setDe('');
              setAte('');
              setPage(1);
            }}
          >
            Limpar
          </Button>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card className="border-[#131B35] bg-[#0A0F1E]">
        <CardContent className="p-0">
          {carregando ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-[#1D4ED8]" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#131B35] text-left text-gray-400">
                    <th className="w-8 px-4 py-3" />
                    <th className="px-4 py-3">Preenchido em</th>
                    <th className="px-4 py-3">Usuário</th>
                    <th className="px-4 py-3">Modo</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Tentativas</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {envios.map((e) => {
                    const expandido = aberto === e.id;
                    return (
                      <React.Fragment key={e.id}>
                        <tr className="cursor-pointer border-b border-[#131B35]/50 text-white transition-colors hover:bg-[#131B35]/50" onClick={() => setAberto(expandido ? null : e.id)}>
                          <td className="px-4 py-3">{expandido ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}</td>
                          <td className="px-4 py-3 text-gray-300">{formatarDataBR(e.ocorrido_em)}</td>
                          <td className="px-4 py-3">
                            <p>{e.profiles?.full_name || '-'}</p>
                            <p className="text-xs text-gray-500">{e.profiles?.email || e.external_id}</p>
                          </td>
                          <td className="px-4 py-3">
                            <Badge className="bg-[#131B35] text-gray-300">{ROTULO_MODO[e.modo]}</Badge>
                          </td>
                          <td className="px-4 py-3">
                            <Badge className={corDoStatus(e.status)}>{ROTULO_STATUS[e.status]}</Badge>
                          </td>
                          <td className="px-4 py-3 text-gray-400">{e.tentativas}</td>
                          <td className="px-4 py-3 text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-gray-300 hover:text-white"
                              disabled={reenviando === e.id || e.status === 'enviando'}
                              onClick={(ev) => {
                                ev.stopPropagation();
                                reenviar(e.id);
                              }}
                            >
                              {reenviando === e.id ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <RefreshCw className="mr-2 h-3 w-3" />}
                              Reenviar
                            </Button>
                          </td>
                        </tr>
                        {expandido && (
                          <tr className="border-b border-[#131B35]/50">
                            <td colSpan={7} className="space-y-3 bg-[#020617] px-4 py-4">
                              {e.erro && (
                                <div>
                                  <p className="text-xs font-medium uppercase text-red-400">{e.status === 'aviso' ? 'Aviso' : 'Erro'}</p>
                                  <p className="mt-1 text-sm text-red-300">{e.erro}</p>
                                </div>
                              )}
                              <div className="grid gap-4 text-sm md:grid-cols-4">
                                <Info rotulo="Resultado do Forms" valor={e.resultado} />
                                <Info rotulo="HTTP" valor={e.http_status?.toString()} />
                                <Info rotulo="Enviado em" valor={e.enviado_em ? formatarDataBR(e.enviado_em) : null} />
                                <Info rotulo="Resposta / lead no Forms" valor={e.forms_response_id ? `${e.forms_response_id.slice(0, 8)} / ${e.forms_lead_id?.slice(0, 8) ?? '-'}` : null} />
                              </div>
                              <Json titulo="O que foi enviado" valor={e.payload} />
                              <Json titulo="O que o Forms respondeu" valor={e.resposta} />
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                  {envios.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-gray-500">
                        Nenhum envio encontrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {totalPaginas > 1 && (
            <div className="flex items-center justify-between border-t border-[#131B35] px-4 py-3">
              <p className="text-sm text-gray-400">
                Mostrando {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, total)} de {total}
              </p>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="text-gray-400 hover:text-white" aria-label="Página anterior">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-gray-400">
                  {page} / {totalPaginas}
                </span>
                <Button variant="ghost" size="sm" disabled={page >= totalPaginas} onClick={() => setPage((p) => p + 1)} className="text-gray-400 hover:text-white" aria-label="Próxima página">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Info({ rotulo, valor }: { rotulo: string; valor: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{rotulo}</p>
      <p className="text-gray-300">{valor || '-'}</p>
    </div>
  );
}

function Json({ titulo, valor }: { titulo: string; valor: unknown }) {
  if (!valor) return null;
  return (
    <div>
      <p className="mb-1 text-xs font-medium uppercase text-gray-500">{titulo}</p>
      <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-lg border border-[#131B35] bg-[#0A0F1E] p-3 font-mono text-xs text-gray-300">{JSON.stringify(valor, null, 2)}</pre>
    </div>
  );
}
