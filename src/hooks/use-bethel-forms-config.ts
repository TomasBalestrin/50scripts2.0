'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  moverPrioridade,
  sugerirMapeamento,
  validarConfig,
  type ProblemaConfig,
} from '@/lib/bethel-forms/mapeamento';
import {
  configDoRascunho,
  definirAlvo,
  definirOpcao,
  rascunhoDaConfig,
  type Rascunho,
} from '@/lib/bethel-forms/view';
import {
  CONFIG_VAZIA,
  type CampoDoFunil,
  type CatalogoEspecialista,
  type ChavePergunta,
  type ConfigBethelForms,
  type DestinoForms,
} from '@/lib/bethel-forms/tipos';

async function chamar<T>(url: string, init?: RequestInit): Promise<{ ok: true; data: T } | { ok: false; erro: string; problemas?: ProblemaConfig[] }> {
  try {
    const res = await fetch(url, init);
    const corpo = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, erro: corpo.error || `Erro ${res.status}`, problemas: corpo.problemas };
    return { ok: true, data: corpo as T };
  } catch {
    return { ok: false, erro: 'Erro de rede' };
  }
}

/** Estado da tela "Configurar Bethel forms": configuração salva, rascunho, catálogo do Forms e campos do funil escolhido. */
export function useBethelFormsConfig() {
  const [config, setConfig] = useState<ConfigBethelForms>(CONFIG_VAZIA);
  const [formsConfigurado, setFormsConfigurado] = useState(true);
  const [rascunho, setRascunho] = useState<Rascunho>(rascunhoDaConfig(CONFIG_VAZIA));
  const [catalogo, setCatalogo] = useState<CatalogoEspecialista[]>([]);
  const [campos, setCampos] = useState<CampoDoFunil[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [carregandoCampos, setCarregandoCampos] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [problemasDoServidor, setProblemasDoServidor] = useState<ProblemaConfig[]>([]);

  const carregarCampos = useCallback(async (funilId: string, aplicarSugestao: boolean) => {
    setCarregandoCampos(true);
    const r = await chamar<{ campos: CampoDoFunil[]; sugestao: ConfigBethelForms['campos'] }>(`/api/admin/bethel-forms/campos?funnelId=${encodeURIComponent(funilId)}`);
    setCarregandoCampos(false);
    if (!r.ok) {
      setErro(r.erro);
      setCampos([]);
      return;
    }
    setErro(null);
    setCampos(r.data.campos);
    if (aplicarSugestao) setRascunho((atual) => ({ ...atual, campos: r.data.sugestao }));
  }, []);

  useEffect(() => {
    (async () => {
      setCarregando(true);
      const [c, cat] = await Promise.all([
        chamar<{ config: ConfigBethelForms; formsConfigurado: boolean }>('/api/admin/bethel-forms/config'),
        chamar<{ especialistas: CatalogoEspecialista[]; sugestao: DestinoForms | null }>('/api/admin/bethel-forms/catalogo'),
      ]);
      if (c.ok) {
        setConfig(c.data.config);
        setFormsConfigurado(c.data.formsConfigurado);
        setRascunho(rascunhoDaConfig(c.data.config));
      } else {
        setErro(c.erro);
      }
      if (cat.ok) {
        setCatalogo(cat.data.especialistas);
        // Primeira vez: já vem com o funil 50 Scripts marcado (dá pra trocar).
        if (c.ok && !c.data.config.destino && cat.data.sugestao) {
          setRascunho((atual) => ({ ...atual, destino: cat.data.sugestao }));
          await carregarCampos(cat.data.sugestao.funilId, true);
        }
      } else if (!c.ok || c.data.formsConfigurado) {
        setErro((atual) => atual ?? cat.erro);
      }
      if (c.ok && c.data.config.destino) await carregarCampos(c.data.config.destino.funilId, Object.keys(c.data.config.campos).length === 0);
      setCarregando(false);
    })();
  }, [carregarCampos]);

  const configRascunho = useMemo(() => configDoRascunho(config, rascunho, campos), [config, rascunho, campos]);
  const problemas = useMemo(
    () => (campos.length > 0 ? validarConfig(configRascunho, campos) : problemasDoServidor),
    [campos, configRascunho, problemasDoServidor]
  );

  const escolherDestino = useCallback(
    async (parcial: Partial<DestinoForms>) => {
      // Trocar um nível de cima zera os de baixo; o mapeamento é refeito quando o funil é escolhido.
      setRascunho((atual) => ({ ...atual, destino: { ...(atual.destino ?? ({} as DestinoForms)), ...parcial } }));
      if (parcial.funilId) await carregarCampos(parcial.funilId, true);
    },
    [carregarCampos]
  );

  const trocarCampo = useCallback(
    (chave: ChavePergunta, alvoId: string | null) =>
      setRascunho((atual) => ({ ...atual, campos: definirAlvo(atual.campos, chave, alvoId, campos) })),
    [campos]
  );
  const ligarOpcao = useCallback(
    (chave: ChavePergunta, opcao: string, ancora: string | null) =>
      setRascunho((atual) => ({ ...atual, campos: definirOpcao(atual.campos, chave, opcao, ancora) })),
    []
  );
  const moverDesafio = useCallback(
    (indice: number, direcao: -1 | 1) =>
      setRascunho((atual) => ({ ...atual, prioridadeDesafios: moverPrioridade(atual.prioridadeDesafios, indice, direcao) })),
    []
  );
  const refazerSugestao = useCallback(() => setRascunho((atual) => ({ ...atual, campos: sugerirMapeamento(campos) })), [campos]);

  const salvar = useCallback(async () => {
    if (!rascunho.destino?.funilId) return;
    setSalvando(true);
    setErro(null);
    setAviso(null);
    setProblemasDoServidor([]);
    const corpoCampos = Object.fromEntries(
      Object.entries(rascunho.campos).map(([chave, m]) => [chave, { alvoId: m?.alvoId ?? null, opcoes: m?.opcoes ?? {} }])
    );
    const r = await chamar<{ config: ConfigBethelForms; motor: { status: string; criado: boolean } | null }>('/api/admin/bethel-forms/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ destino: rascunho.destino, campos: corpoCampos, prioridadeDesafios: rascunho.prioridadeDesafios }),
    });
    setSalvando(false);
    if (!r.ok) {
      setErro(r.erro);
      if (r.problemas) setProblemasDoServidor(r.problemas);
      return;
    }
    setConfig(r.data.config);
    setRascunho(rascunhoDaConfig(r.data.config));
    const motor = r.data.motor;
    setAviso(
      motor?.status && motor.status !== 'published'
        ? 'Salvo, mas a entrada "50 Scripts — Onboarding" está pausada no Forms: reative-a lá para os envios entrarem.'
        : motor?.criado
          ? 'Salvo. A entrada "50 Scripts — Onboarding" foi criada no funil do Forms.'
          : 'Salvo.'
    );
  }, [rascunho]);

  const definirAtivo = useCallback(async (ativo: boolean) => {
    setSalvando(true);
    setErro(null);
    setAviso(null);
    const r = await chamar<{ config: ConfigBethelForms }>('/api/admin/bethel-forms/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ativo }),
    });
    setSalvando(false);
    if (!r.ok) {
      setErro(r.erro);
      return;
    }
    setConfig(r.data.config);
    setAviso(ativo ? 'Envio ao vivo ligado: cada onboarding novo vai para o Forms.' : 'Envio ao vivo desligado.');
  }, []);

  const mudouDesdeOSalvo = useMemo(
    () => JSON.stringify(configDoRascunho(config, rascunho, campos).campos) !== JSON.stringify(config.campos) ||
      JSON.stringify(rascunho.destino) !== JSON.stringify(config.destino) ||
      JSON.stringify(rascunho.prioridadeDesafios) !== JSON.stringify(config.prioridadeDesafios),
    [config, rascunho, campos]
  );

  return {
    config,
    rascunho,
    catalogo,
    campos,
    problemas,
    carregando,
    carregandoCampos,
    salvando,
    erro,
    aviso,
    formsConfigurado,
    mudouDesdeOSalvo,
    escolherDestino,
    trocarCampo,
    ligarOpcao,
    moverDesafio,
    refazerSugestao,
    salvar,
    definirAtivo,
  };
}
