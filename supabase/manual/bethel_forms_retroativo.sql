-- ============================================================
-- RETROATIVO — onboardings de 01/10/2026 em diante → Bethel Forms
-- ============================================================
-- NÃO é migration (fora de supabase/migrations de propósito: nenhum workflow roda isto) e NÃO é função do sistema.
-- Roda UMA vez, à mão, no SQL Editor do Supabase do 50 Scripts, DEPOIS de:
--   1. a migration 029 estar aplicada;
--   2. a tela /admin/bethel-forms estar salva e com o "Envio ao vivo" LIGADO (isso grava system_config.bethel_forms.ativadoEm);
--   3. um canário conferido no Forms (1 ou 2 usuários — ver a seção "Canário" abaixo).
--
-- O corte é o instante em que o envio ao vivo foi ligado: quem preencheu ANTES dele entra aqui (retroativo), quem
-- preencher DEPOIS entra sozinho pelo ao vivo — ninguém fica no buraco e ninguém é enviado duas vezes. Se o envio ao vivo
-- ainda não foi ligado, o corte é NULL e nenhuma linha entra (trava de segurança).
--
-- O INSERT só ENFILEIRA (status 'pendente', na data do preenchimento = user_onboarding.created_at). Quem manda é o mesmo
-- código do ao vivo: aba "Envios" → "Enviar pendentes" (do mais antigo pro mais novo). No Forms a resposta é gravada na data
-- do preenchimento, o estado é calculado e NADA sai do Forms (sem integração, sem regra de tag).
--
-- Idempotente: no máximo UMA linha 'retroativo' por usuário (índice único da 029) — rodar de novo não duplica.
-- Horários em Brasília (UTC−3).
-- ============================================================


-- ------------------------------------------------------------
-- 0. PRÉVIA — só leitura: quantos entrariam, por dia do preenchimento
-- ------------------------------------------------------------
SELECT
  (o.created_at AT TIME ZONE 'America/Sao_Paulo')::date AS dia,
  count(*)                                              AS onboardings,
  count(*) FILTER (WHERE p.role = 'admin')              AS admins_ignorados,
  count(*) FILTER (WHERE b.id IS NOT NULL)              AS ja_enfileirados
FROM public.user_onboarding o
JOIN public.profiles p ON p.id = o.user_id
LEFT JOIN public.bethel_forms_envios b ON b.user_id = o.user_id AND b.modo = 'retroativo'
WHERE o.created_at >= '2026-10-01 00:00:00-03'
  AND o.created_at <  (SELECT (value->>'ativadoEm')::timestamptz FROM public.system_config WHERE key = 'bethel_forms')
GROUP BY 1
ORDER BY 1;


-- ------------------------------------------------------------
-- 1. CANÁRIO (opcional, recomendado) — enfileira só 2 usuários, os mais antigos do mês.
--    Mande na aba Envios, confira no Forms e só depois rode o passo 2.
-- ------------------------------------------------------------
-- INSERT INTO public.bethel_forms_envios (user_id, external_id, modo, ocorrido_em, status)
-- SELECT o.user_id, 'scripts50:' || o.user_id, 'retroativo', o.created_at, 'pendente'
-- FROM public.user_onboarding o
-- JOIN public.profiles p ON p.id = o.user_id
-- WHERE o.created_at >= '2026-10-01 00:00:00-03'
--   AND o.created_at <  (SELECT (value->>'ativadoEm')::timestamptz FROM public.system_config WHERE key = 'bethel_forms')
--   AND p.role <> 'admin'
-- ORDER BY o.created_at
-- LIMIT 2
-- ON CONFLICT DO NOTHING;


-- ------------------------------------------------------------
-- 2. ENFILEIRAR TODOS (01/10 até o corte)
-- ------------------------------------------------------------
INSERT INTO public.bethel_forms_envios (user_id, external_id, modo, ocorrido_em, status)
SELECT o.user_id, 'scripts50:' || o.user_id, 'retroativo', o.created_at, 'pendente'
FROM public.user_onboarding o
JOIN public.profiles p ON p.id = o.user_id
WHERE o.created_at >= '2026-10-01 00:00:00-03'
  AND o.created_at <  (SELECT (value->>'ativadoEm')::timestamptz FROM public.system_config WHERE key = 'bethel_forms')
  AND p.role <> 'admin'
ON CONFLICT DO NOTHING;


-- ------------------------------------------------------------
-- 3. CONFERÊNCIA (depois de "Enviar pendentes" zerar) — todos os retroativos por status
--    O esperado: tudo 'enviado'. 'aviso' = entrou sem lead/valor sem par (veja o motivo na aba Envios); 'erro' = reenviar.
-- ------------------------------------------------------------
-- SELECT status, count(*) FROM public.bethel_forms_envios WHERE modo = 'retroativo' GROUP BY 1 ORDER BY 1;


-- ------------------------------------------------------------
-- DESFAZER a FILA (não desfaz o que já foi pro Forms — lá as respostas têm external_id LIKE 'scripts50:%')
-- ------------------------------------------------------------
-- DELETE FROM public.bethel_forms_envios WHERE modo = 'retroativo' AND status = 'pendente';
