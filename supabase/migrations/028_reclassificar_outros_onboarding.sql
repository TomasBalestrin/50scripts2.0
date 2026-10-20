-- ============================================================
-- Migration 028: segunda passada na reclassificação do antigo "Outros"
-- ============================================================
-- A 027 mandou para "Serviços especializados" (fallback) quem escolheu "Outros"
-- e escreveu algo que as regras dela não reconheceram. Esta migration reclassifica
-- SÓ essas pessoas, com regras ampliadas a partir dos textos reais da base
-- (marcenaria, esquadrias, farmácia de manipulação, máquinas agrícolas, etc.).
--
-- Só toca em linhas que:
--   - eram "Outros" no backup da 027 (user_onboarding_pre_027 — rode a 027 antes);
--   - ainda estão no fallback "Serviços especializados";
--   - têm texto livre em business_type_custom.
-- Sem regra que case, a pessoa continua onde está (texto em branco, "tecnologia",
-- "energia solar", "indústria", financeiro como "consórcio"/"seguros"...).
-- Rode logo depois da 027: o formulário não reabre para quem já respondeu, então
-- não há escolha nova a proteger.
--
-- É UM ÚNICO COMANDO (sem DO, sem tabela temporária, sem função): funciona igual
-- em qualquer cliente, inclusive no SQL Editor do Supabase, que não mantém sessão
-- entre comandos. O resultado é a lista do que foi alterado (categoria, quantidade
-- e exemplos de texto), para conferir na hora. Rodar de novo devolve só o TOTAL = 0.
--
-- Cada destino só vale se estiver na lista canônica (CTE canon, espelho de
-- src/lib/onboarding/options.ts): erro de digitação numa regra a desativa, nunca
-- grava valor fora da lista.
--
-- Reverter: restaurar business_type a partir de user_onboarding_pre_027.
-- ============================================================

WITH canon (valor) AS (
  VALUES
    ('Saúde (clínicas, médicos, profissionais da saúde)'),
    ('Estética (facial, corporal ou avançada)'),
    ('Odontologia'),
    ('Fisioterapia e bem-estar'),
    ('Fitness e esportes'),
    ('Automotivo (oficina, elétrica, estética automotiva)'),
    ('Comércio (loja física ou online)'),
    ('Marketing e aquisição (agência, tráfego, social media)'),
    ('Mentorias, consultorias e infoprodutos'),
    ('Serviços especializados (jurídico, contábil, arquitetura, etc.)'),
    ('Serviços operacionais B2B (limpeza, segurança, terceirização)'),
    ('Negócios locais (alimentação, barbearia, serviços do dia a dia)'),
    ('Construção, engenharia e imobiliário'),
    ('Agronegócio'),
    ('Educação (presencial ou cursos físicos)'),
    ('Turismo e viagens'),
    ('Fotografia e produção de conteúdo')
),
-- padrão aplicado ao texto sem acento e em minúsculas; vale a menor prio
regra (prio, padrao, novo) AS (
  VALUES
    (1,  'protese dent|odont|dentis', 'Odontologia'),
    (2,  'farmacia|manipulac|medic|clinica|laborat', 'Saúde (clínicas, médicos, profissionais da saúde)'),
    (3,  'agricol|bovin|boiadeir|agropec|agroneg', 'Agronegócio'),
    (4,  'automove', 'Automotivo (oficina, elétrica, estética automotiva)'),
    (5,  'vigilanc|higieniz|lavanderia|impermeabiliz', 'Serviços operacionais B2B (limpeza, segurança, terceirização)'),
    (6,  'alimento|sorvete|festa|evento|casamento', 'Negócios locais (alimentação, barbearia, serviços do dia a dia)'),
    (7,  'marcenar|moveis planejad|marmor|esquadria|serralher|pre.?moldad|argamassa|\mpisos?\M|paisagism|\mpocos?\M|sinalizacao viaria|instalacao eletrica|hidraulic|combate a incendio|iluminac|ar.?condicionad|loteament|\mmobiliaria|madeireir', 'Construção, engenharia e imobiliário'),
    (8,  'joalheria|\mjoias?\M|cosmetic|importac|representac', 'Comércio (loja física ou online)'),
    (9,  '\msites?\M|identidade visual', 'Marketing e aquisição (agência, tráfego, social media)'),
    (10, 'cursos? livres?', 'Educação (presencial ou cursos físicos)')
),
alvo AS (
  SELECT o.id,
         o.business_type_custom AS texto,
         translate(lower(btrim(o.business_type_custom)),
                   'áàâãäéèêëíìîïóòôõöúùûüç',
                   'aaaaaeeeeiiiiooooouuuuc') AS t
    FROM public.user_onboarding o
    JOIN public.user_onboarding_pre_027 b ON b.id = o.id
   WHERE lower(btrim(b.business_type)) = 'outros'
     AND o.business_type = 'Serviços especializados (jurídico, contábil, arquitetura, etc.)'
     AND btrim(coalesce(o.business_type_custom, '')) <> ''
),
decisao AS (
  SELECT DISTINCT ON (a.id) a.id, a.texto, r.novo
    FROM alvo a
    JOIN regra r ON a.t ~ r.padrao
    JOIN canon c ON c.valor = r.novo
   ORDER BY a.id, r.prio
),
alterada AS (
  UPDATE public.user_onboarding o
     SET business_type = d.novo
    FROM decisao d
   WHERE o.id = d.id
  RETURNING d.texto, d.novo
)
SELECT depois, qtd, exemplos
  FROM (
    SELECT novo AS depois,
           count(*) AS qtd,
           left(string_agg(DISTINCT lower(btrim(texto)), ' | ' ORDER BY lower(btrim(texto))), 400) AS exemplos,
           1 AS ord
      FROM alterada
     GROUP BY novo
    UNION ALL
    SELECT 'TOTAL reclassificadas', count(*), NULL, 2
      FROM alterada
  ) resultado
 ORDER BY ord, qtd DESC;
