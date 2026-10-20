-- ============================================================
-- Migration 027: normaliza user_onboarding para o novo modelo de respostas
-- ============================================================
-- As perguntas "Qual é o seu negócio?", "Função no negócio", "Faturamento mensal"
-- e "Principais desafios" viraram 100% múltipla escolha com listas novas
-- (fonte única no app: src/lib/onboarding/options.ts). Esta migration converte
-- TODAS as respostas já gravadas para essas listas, para que a base inteira fale
-- o mesmo idioma.
--
-- Como é feita:
--   1. Backup completo em user_onboarding_pre_027 (criado uma única vez).
--   2. Mapeamento ANTES -> DEPOIS em tabelas temporárias. Cada destino tem FK para
--      a lista canônica (_canon): erro de digitação aqui derruba a migration.
--      A comparação ignora acento, caixa e espaços nas pontas ("Saude" = "Saúde").
--   3. Texto livre do antigo "Outros"/"Outro" é reclassificado por palavra-chave
--      (_regra_negocio / _regra_desafio). Sem correspondência: negócio cai em
--      "Serviços especializados"; desafio não ganha item. O texto original fica
--      preservado em business_type_custom / main_challenges_custom.
--   4. Guarda final: se sobrar qualquer valor fora das listas novas, a migration
--      ABORTA inteira (nada é gravado) e mostra quais valores faltam mapear.
--
-- É idempotente: rodar de novo não muda nada (valores já canônicos passam direto)
-- e não sobrescreve o backup. Pode rodar de novo depois do deploy do app para
-- pegar respostas gravadas pelo formulário antigo no intervalo.
--
-- updated_at NÃO é alterado: é limpeza de dados, não edição do usuário.
--
-- Reverter (enquanto o backup existir):
--   UPDATE public.user_onboarding o
--      SET business_type = b.business_type,
--          role_in_business = b.role_in_business,
--          faturamento_mensal = b.faturamento_mensal,
--          main_challenges = b.main_challenges
--     FROM public.user_onboarding_pre_027 b WHERE b.id = o.id;
--
-- Descartar o backup depois de validar:  DROP TABLE public.user_onboarding_pre_027;
-- As colunas business_type_custom e main_challenges_custom deixam de ser
-- escritas pelo app; ficam como histórico até um drop futuro.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. Backup (PII: RLS ligada e sem policy = ninguém lê via API)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_onboarding_pre_027 AS
  TABLE public.user_onboarding;

ALTER TABLE public.user_onboarding_pre_027 ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- 2. Listas canônicas (espelho de src/lib/onboarding/options.ts)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION pg_temp.sem_acento(texto text) RETURNS text
LANGUAGE sql IMMUTABLE AS $$
  SELECT translate(lower(btrim(texto)),
    'áàâãäéèêëíìîïóòôõöúùûüç',
    'aaaaaeeeeiiiiooooouuuuc')
$$;

CREATE TEMP TABLE _canon (
  campo text NOT NULL,
  valor text NOT NULL,
  ord   int  NOT NULL,
  PRIMARY KEY (campo, valor)
) ON COMMIT DROP;

INSERT INTO _canon (campo, valor, ord) VALUES
  ('business_type', 'Saúde (clínicas, médicos, profissionais da saúde)', 1),
  ('business_type', 'Estética (facial, corporal ou avançada)', 2),
  ('business_type', 'Odontologia', 3),
  ('business_type', 'Fisioterapia e bem-estar', 4),
  ('business_type', 'Fitness e esportes', 5),
  ('business_type', 'Automotivo (oficina, elétrica, estética automotiva)', 6),
  ('business_type', 'Comércio (loja física ou online)', 7),
  ('business_type', 'Marketing e aquisição (agência, tráfego, social media)', 8),
  ('business_type', 'Mentorias, consultorias e infoprodutos', 9),
  ('business_type', 'Serviços especializados (jurídico, contábil, arquitetura, etc.)', 10),
  ('business_type', 'Serviços operacionais B2B (limpeza, segurança, terceirização)', 11),
  ('business_type', 'Negócios locais (alimentação, barbearia, serviços do dia a dia)', 12),
  ('business_type', 'Construção, engenharia e imobiliário', 13),
  ('business_type', 'Agronegócio', 14),
  ('business_type', 'Educação (presencial ou cursos físicos)', 15),
  ('business_type', 'Turismo e viagens', 16),
  ('business_type', 'Fotografia e produção de conteúdo', 17),
  ('role_in_business', 'Dono', 1),
  ('role_in_business', 'Sócio', 2),
  ('role_in_business', 'Gerente', 3),
  ('role_in_business', 'Colaborador', 4),
  ('role_in_business', 'Vendedor', 5),
  ('faturamento_mensal', 'Até R$ 10 mil', 1),
  ('faturamento_mensal', 'Entre R$ 10 mil e R$ 30 mil', 2),
  ('faturamento_mensal', 'Entre R$ 30 mil e R$ 50 mil', 3),
  ('faturamento_mensal', 'Entre R$ 50 mil e R$ 100 mil', 4),
  ('faturamento_mensal', 'Entre R$ 100 mil e R$ 250 mil', 5),
  ('faturamento_mensal', 'Entre R$ 250 mil e R$ 500 mil', 6),
  ('faturamento_mensal', 'Entre R$ 500 mil e R$ 1 milhão', 7),
  ('faturamento_mensal', 'Acima de R$ 1 milhão', 8),
  ('main_challenges', 'Atrair clientes qualificados de forma previsível', 1),
  ('main_challenges', 'Converter mais vendas sem depender de descontos ou indicação', 2),
  ('main_challenges', 'Aumentar lucro e escalar sem perder margem financeira', 3),
  ('main_challenges', 'Construir um time forte com liderança e gestão eficiente', 4);

-- ------------------------------------------------------------
-- 3. Mapeamento ANTES -> DEPOIS (valores exatos que o formulário antigo gravava)
-- ------------------------------------------------------------
CREATE TEMP TABLE _map (
  campo  text NOT NULL,
  legacy text NOT NULL,
  novo   text NOT NULL,
  PRIMARY KEY (campo, legacy),
  FOREIGN KEY (campo, novo) REFERENCES _canon (campo, valor)
) ON COMMIT DROP;

INSERT INTO _map (campo, legacy, novo) VALUES
  -- business_type
  ('business_type', 'Saúde', 'Saúde (clínicas, médicos, profissionais da saúde)'),
  ('business_type', 'Estética', 'Estética (facial, corporal ou avançada)'),
  ('business_type', 'Marketing', 'Marketing e aquisição (agência, tráfego, social media)'),
  ('business_type', 'Loja de roupas', 'Comércio (loja física ou online)'),
  ('business_type', 'Comércio de produtos', 'Comércio (loja física ou online)'),
  ('business_type', 'Advocacia', 'Serviços especializados (jurídico, contábil, arquitetura, etc.)'),
  ('business_type', 'Finanças', 'Serviços especializados (jurídico, contábil, arquitetura, etc.)'),
  ('business_type', 'Corretor de imóveis', 'Construção, engenharia e imobiliário'),
  ('business_type', 'Engenharia e arquitetura', 'Construção, engenharia e imobiliário'),
  ('business_type', 'Fotografia', 'Fotografia e produção de conteúdo'),
  ('business_type', 'Mentorias e consultorias', 'Mentorias, consultorias e infoprodutos'),
  -- role_in_business ("Autônomo" saiu da lista)
  ('role_in_business', 'Autônomo', 'Gerente'),
  -- faturamento_mensal, versão atual (desde 22/02) — faixa que cruza duas novas vai para a menor
  ('faturamento_mensal', 'Até R$ 5.000,00', 'Até R$ 10 mil'),
  ('faturamento_mensal', 'De R$ 5.000,00 até R$ 10.000,00', 'Até R$ 10 mil'),
  ('faturamento_mensal', 'De R$ 10.000,00 até R$ 20.000,00', 'Entre R$ 10 mil e R$ 30 mil'),
  ('faturamento_mensal', 'De R$ 20.000,00 até R$ 50.000,00', 'Entre R$ 10 mil e R$ 30 mil'),
  ('faturamento_mensal', 'De R$ 50.000,00 até R$ 100.000,00', 'Entre R$ 50 mil e R$ 100 mil'),
  ('faturamento_mensal', 'De R$ 100.000,00 até R$ 250.000,00', 'Entre R$ 100 mil e R$ 250 mil'),
  ('faturamento_mensal', 'De R$ 250.000,00 até R$ 500.000,00', 'Entre R$ 250 mil e R$ 500 mil'),
  ('faturamento_mensal', 'De R$ 500.000,00 até R$ 1.000.000,00', 'Entre R$ 500 mil e R$ 1 milhão'),
  ('faturamento_mensal', 'Acima de R$ 1.000.000,00', 'Acima de R$ 1 milhão'),
  -- faturamento_mensal, versão de 21/02 (sem ",00")
  ('faturamento_mensal', 'Até R$ 5.000', 'Até R$ 10 mil'),
  ('faturamento_mensal', 'De R$ 5.000 até R$ 10.000', 'Até R$ 10 mil'),
  ('faturamento_mensal', 'De R$ 10.000 até R$ 15.000', 'Entre R$ 10 mil e R$ 30 mil'),
  ('faturamento_mensal', 'De R$ 15.000 até R$ 20.000', 'Entre R$ 10 mil e R$ 30 mil'),
  ('faturamento_mensal', 'De R$ 20.000 até R$ 50.000', 'Entre R$ 10 mil e R$ 30 mil'),
  ('faturamento_mensal', 'De R$ 50.000 até R$ 100.000', 'Entre R$ 50 mil e R$ 100 mil'),
  ('faturamento_mensal', 'De R$ 100.000 até R$ 500.000', 'Entre R$ 100 mil e R$ 250 mil'),
  ('faturamento_mensal', 'Acima de R$ 500.000', 'Entre R$ 500 mil e R$ 1 milhão'),
  -- main_challenges: itens novos passam por si mesmos; antigos viram os novos
  ('main_challenges', 'Atrair clientes qualificados de forma previsível', 'Atrair clientes qualificados de forma previsível'),
  ('main_challenges', 'Converter mais vendas sem depender de descontos ou indicação', 'Converter mais vendas sem depender de descontos ou indicação'),
  ('main_challenges', 'Aumentar lucro e escalar sem perder margem financeira', 'Aumentar lucro e escalar sem perder margem financeira'),
  ('main_challenges', 'Construir um time forte com liderança e gestão eficiente', 'Construir um time forte com liderança e gestão eficiente'),
  ('main_challenges', 'Atração de clientes', 'Atrair clientes qualificados de forma previsível'),
  ('main_challenges', 'Vendas', 'Converter mais vendas sem depender de descontos ou indicação'),
  ('main_challenges', 'Processo comercial', 'Converter mais vendas sem depender de descontos ou indicação'),
  ('main_challenges', 'Liderança', 'Construir um time forte com liderança e gestão eficiente'),
  ('main_challenges', 'Pensamento estratégico', 'Aumentar lucro e escalar sem perder margem financeira');

-- ------------------------------------------------------------
-- 4. Reclassificação do texto livre de "Outros" / "Outro"
--    (padrão aplicado ao texto sem acento e em minúsculas; vale a menor prio)
-- ------------------------------------------------------------
CREATE TEMP TABLE _regra (
  campo  text NOT NULL,
  prio   int  NOT NULL,
  padrao text NOT NULL,
  novo   text NOT NULL,
  PRIMARY KEY (campo, prio),
  FOREIGN KEY (campo, novo) REFERENCES _canon (campo, valor)
) ON COMMIT DROP;

INSERT INTO _regra (campo, prio, padrao, novo) VALUES
  ('business_type',  1, 'odont|dentist|ortodont|implantodont', 'Odontologia'),
  ('business_type',  2, 'fisio|pilates|massag|nutri|bem.?estar|yoga|quiropra|acupunt', 'Fisioterapia e bem-estar'),
  ('business_type',  3, 'academia|\mpersonal\M|crossfit|fitness|muscula|esporte|atleta', 'Fitness e esportes'),
  ('business_type',  4, 'automotiv|oficina|mecanic|funilaria|lava.?jato|auto.?pecas|auto.?eletric|\mveiculo|\mcarros?\M|\mmotos?\M|concession', 'Automotivo (oficina, elétrica, estética automotiva)'),
  ('business_type',  5, 'limpeza|seguranca|terceiriz|portaria|facilities', 'Serviços operacionais B2B (limpeza, segurança, terceirização)'),
  ('business_type',  6, 'restaurante|lanchonete|padaria|pizzaria|hamburguer|barbearia|barbeiro|salao|cabeleir|delivery|mercadinho|cafeteria|confeitaria|marmit|buffet', 'Negócios locais (alimentação, barbearia, serviços do dia a dia)'),
  ('business_type',  7, 'agro|fazenda|pecuari|rural|lavoura|agricult|\mgado', 'Agronegócio'),
  ('business_type',  8, 'escola|professor|\maulas?\M|idioma|ingles|colegio|faculdade|educac|ensino|reforco', 'Educação (presencial ou cursos físicos)'),
  ('business_type',  9, 'turismo|viagem|viagens|hotel|pousada|hospedagem|passagem', 'Turismo e viagens'),
  ('business_type', 10, 'construc|engenhar|\mobras?\M|imobili|corretor|incorporad|reforma|empreiteir', 'Construção, engenharia e imobiliário'),
  ('business_type', 11, 'estetic|harmoniza|depila|sobrancelh|micropigment|unhas|manicure|maquiagem|cilios|\mlash', 'Estética (facial, corporal ou avançada)'),
  ('business_type', 12, 'medic|clinica|hospital|psicolog|veterin|enferm|saude|laborat|terapeut|fonoaudi|dermato', 'Saúde (clínicas, médicos, profissionais da saúde)'),
  ('business_type', 13, '\mloja|comercio|varejo|e.?commerce|atacado|revenda|boutique|distribuidora', 'Comércio (loja física ou online)'),
  ('business_type', 14, 'marketing|trafego|agencia|social media|publicidade|\mdesign|\mmidia|copywrit', 'Marketing e aquisição (agência, tráfego, social media)'),
  ('business_type', 15, 'mentor|consultor|infoproduto|curso online|coach|treinamento|palestr', 'Mentorias, consultorias e infoprodutos'),
  ('business_type', 16, '\mfoto|video|filmagem|conteudo|audiovisual', 'Fotografia e produção de conteúdo'),
  -- última regra = fallback (padrão vazio casa com qualquer texto, inclusive vazio)
  ('business_type', 99, '', 'Serviços especializados (jurídico, contábil, arquitetura, etc.)'),
  -- "Outro" em desafios: pode casar mais de uma; sem casar, não ganha item
  ('main_challenges', 1, 'atrair|atracao|captac|captar|trafego|\mleads?\M|divulgac|visibilidade|mais clientes|novos clientes', 'Atrair clientes qualificados de forma previsível'),
  ('main_challenges', 2, 'venda|vender|convers|fechar|fechamento|follow|funil|comercial|negocia|objec|prospec', 'Converter mais vendas sem depender de descontos ou indicação'),
  ('main_challenges', 3, 'lucro|margem|escal|financ|caixa|custo|crescer|crescimento|precific', 'Aumentar lucro e escalar sem perder margem financeira'),
  ('main_challenges', 4, 'time\M|equipe|lideranc|gestao|contrat|funcionario|delegar|colaborador', 'Construir um time forte com liderança e gestão eficiente');

-- ------------------------------------------------------------
-- 5. Aplicação
-- ------------------------------------------------------------
-- 5.1 business_type: mapeamento direto
UPDATE public.user_onboarding o
   SET business_type = m.novo
  FROM _map m
 WHERE m.campo = 'business_type'
   AND pg_temp.sem_acento(m.legacy) = pg_temp.sem_acento(o.business_type);

-- 5.2 business_type: "Outros" -> reclassifica pelo texto livre (menor prio que casar)
UPDATE public.user_onboarding o
   SET business_type = (
     SELECT r.novo
       FROM _regra r
      WHERE r.campo = 'business_type'
        AND pg_temp.sem_acento(coalesce(o.business_type_custom, '')) ~ r.padrao
      ORDER BY r.prio
      LIMIT 1
   )
 WHERE pg_temp.sem_acento(o.business_type) = 'outros';

-- 5.3 role_in_business e faturamento_mensal: mapeamento direto
UPDATE public.user_onboarding o
   SET role_in_business = m.novo
  FROM _map m
 WHERE m.campo = 'role_in_business'
   AND pg_temp.sem_acento(m.legacy) = pg_temp.sem_acento(o.role_in_business);

UPDATE public.user_onboarding o
   SET faturamento_mensal = m.novo
  FROM _map m
 WHERE m.campo = 'faturamento_mensal'
   AND pg_temp.sem_acento(m.legacy) = pg_temp.sem_acento(o.faturamento_mensal);

-- 5.4 main_challenges: converte item a item, junta repetidos e mantém a ordem da lista nova.
--     "Outro" entra pelas regras de palavra-chave sobre main_challenges_custom.
CREATE TEMP TABLE _desafios ON COMMIT DROP AS
SELECT o.id,
       coalesce(array_agg(c.valor ORDER BY c.ord) FILTER (WHERE c.valor IS NOT NULL), '{}') AS novo
  FROM public.user_onboarding o
  LEFT JOIN _canon c
    ON c.campo = 'main_challenges'
   AND (
     EXISTS (
       SELECT 1
         FROM unnest(o.main_challenges) AS item(valor)
         JOIN _map m ON m.campo = 'main_challenges'
                    AND pg_temp.sem_acento(m.legacy) = pg_temp.sem_acento(item.valor)
        WHERE m.novo = c.valor
     )
     OR (
       EXISTS (
         SELECT 1 FROM unnest(o.main_challenges) AS item(valor)
          WHERE pg_temp.sem_acento(item.valor) = 'outro'
       )
       AND EXISTS (
         SELECT 1 FROM _regra r
          WHERE r.campo = 'main_challenges'
            AND r.novo = c.valor
            AND pg_temp.sem_acento(coalesce(o.main_challenges_custom, '')) ~ r.padrao
       )
     )
   )
 GROUP BY o.id;

UPDATE public.user_onboarding o
   SET main_challenges = d.novo
  FROM _desafios d
 WHERE d.id = o.id
   AND o.main_challenges IS DISTINCT FROM d.novo;

-- ------------------------------------------------------------
-- 6. Guarda: nenhum valor fora das listas novas pode sobrar (NULL é ausência, não erro).
--    Se sobrar, aborta tudo e lista o que falta mapear.
-- ------------------------------------------------------------
DO $$
DECLARE
  sobras text;
BEGIN
  SELECT string_agg(format('%s = %L (%s linhas)', campo, valor, qtd), E'\n' ORDER BY campo, valor)
    INTO sobras
    FROM (
      SELECT 'business_type' AS campo, o.business_type AS valor, count(*) AS qtd
        FROM public.user_onboarding o
       WHERE NOT EXISTS (SELECT 1 FROM _canon c WHERE c.campo = 'business_type' AND c.valor = o.business_type)
       GROUP BY 1, 2
      UNION ALL
      SELECT 'role_in_business', o.role_in_business, count(*)
        FROM public.user_onboarding o
       WHERE o.role_in_business IS NOT NULL
         AND NOT EXISTS (SELECT 1 FROM _canon c WHERE c.campo = 'role_in_business' AND c.valor = o.role_in_business)
       GROUP BY 1, 2
      UNION ALL
      SELECT 'faturamento_mensal', o.faturamento_mensal, count(*)
        FROM public.user_onboarding o
       WHERE o.faturamento_mensal IS NOT NULL
         AND NOT EXISTS (SELECT 1 FROM _canon c WHERE c.campo = 'faturamento_mensal' AND c.valor = o.faturamento_mensal)
       GROUP BY 1, 2
      UNION ALL
      SELECT 'main_challenges', item.valor, count(*)
        FROM public.user_onboarding o
       CROSS JOIN LATERAL unnest(o.main_challenges) AS item(valor)
       WHERE NOT EXISTS (SELECT 1 FROM _canon c WHERE c.campo = 'main_challenges' AND c.valor = item.valor)
       GROUP BY 1, 2
    ) fora;

  IF sobras IS NOT NULL THEN
    RAISE EXCEPTION E'Normalização abortada: valores fora das listas novas.\n%\nAcrescente-os ao mapeamento (_map) e rode de novo.', sobras;
  END IF;
END $$;

-- ------------------------------------------------------------
-- 7. Documenta as colunas que o app deixou de escrever
-- ------------------------------------------------------------
COMMENT ON COLUMN public.user_onboarding.business_type_custom IS
  'DEPRECADA (027): texto livre do antigo "Outros". Só histórico; o app não escreve mais.';
COMMENT ON COLUMN public.user_onboarding.main_challenges_custom IS
  'DEPRECADA (027): texto livre do antigo "Outro". Só histórico; o app não escreve mais.';

COMMIT;

-- ------------------------------------------------------------
-- Relatório ANTES -> DEPOIS (contagem de pessoas por transição)
-- ------------------------------------------------------------
SELECT campo, antes, depois, count(*) AS qtd
  FROM (
    SELECT 'business_type' AS campo, b.business_type AS antes, o.business_type AS depois
      FROM public.user_onboarding o JOIN public.user_onboarding_pre_027 b USING (id)
    UNION ALL
    SELECT 'role_in_business', b.role_in_business, o.role_in_business
      FROM public.user_onboarding o JOIN public.user_onboarding_pre_027 b USING (id)
    UNION ALL
    SELECT 'faturamento_mensal', b.faturamento_mensal, o.faturamento_mensal
      FROM public.user_onboarding o JOIN public.user_onboarding_pre_027 b USING (id)
    UNION ALL
    SELECT 'main_challenges', array_to_string(b.main_challenges, ' | '), array_to_string(o.main_challenges, ' | ')
      FROM public.user_onboarding o JOIN public.user_onboarding_pre_027 b USING (id)
  ) t
 GROUP BY campo, antes, depois
 ORDER BY campo, qtd DESC;
