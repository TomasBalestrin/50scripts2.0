-- ============================================================
-- Migration 029: fila de envios do 50 Scripts para o Bethel Forms
-- ============================================================
-- Cada onboarding preenchido vira uma linha aqui (ao vivo) e é mandado ao Bethel Forms
-- (src/lib/bethel-forms/fila.ts). O histórico (retroativo) é só INSERT de linhas 'pendente'
-- feito à mão no SQL Editor — quem manda é o MESMO código do ao vivo. A tela
-- /admin/bethel-forms lista, mostra o erro e reenvia.
--
-- A configuração (destino, mapeamento, liga/desliga) NÃO tem tabela: mora em
-- system_config, key = 'bethel_forms' (objeto JSON).
--
-- Só o service role escreve (RLS ligada, sem policy de escrita); admin lê pela tela.
-- user_id é ON DELETE CASCADE de propósito: o payload guarda nome/e-mail/telefone e
-- precisa sumir junto com o usuário (exclusão de dados / LGPD).
--
-- O retroativo é idempotente: no máximo UMA linha 'retroativo' por usuário, então
-- rodar o INSERT de novo não duplica (ON CONFLICT DO NOTHING).
--
-- Aditiva e idempotente (IF NOT EXISTS / DROP POLICY IF EXISTS). São comandos
-- independentes: não depende de BEGIN, de tabela temporária nem de sessão.
--
-- Desfazer:  DROP TABLE public.bethel_forms_envios;
--            DELETE FROM public.system_config WHERE key = 'bethel_forms';
-- ============================================================

CREATE TABLE IF NOT EXISTS public.bethel_forms_envios (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid        REFERENCES public.profiles(id) ON DELETE CASCADE,
  external_id       text        NOT NULL,
  modo              text        NOT NULL CHECK (modo IN ('ao_vivo', 'retroativo')),
  ocorrido_em       timestamptz NOT NULL,
  status            text        NOT NULL DEFAULT 'pendente'
                                CHECK (status IN ('pendente', 'enviando', 'enviado', 'aviso', 'erro')),
  tentativas        integer     NOT NULL DEFAULT 0,
  resultado         text,
  http_status       integer,
  erro              text,
  payload           jsonb,
  resposta          jsonb,
  forms_response_id uuid,
  forms_lead_id     uuid,
  created_at        timestamptz NOT NULL DEFAULT now(),
  atualizado_em     timestamptz NOT NULL DEFAULT now(),
  enviado_em        timestamptz
);

CREATE INDEX IF NOT EXISTS idx_bethel_forms_envios_fila
  ON public.bethel_forms_envios (status, ocorrido_em);

CREATE INDEX IF NOT EXISTS idx_bethel_forms_envios_user
  ON public.bethel_forms_envios (user_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uq_bethel_forms_envios_retroativo
  ON public.bethel_forms_envios (user_id) WHERE modo = 'retroativo';

ALTER TABLE public.bethel_forms_envios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read bethel forms envios" ON public.bethel_forms_envios;
CREATE POLICY "Admins can read bethel forms envios" ON public.bethel_forms_envios
  FOR SELECT USING (public.is_admin());
