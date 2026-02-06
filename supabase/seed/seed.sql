-- ============================================
-- 50 Scripts 2.0 - Seed Data
-- Complete seed with categories, scripts,
-- microlearning tips, and AI prompts
-- ============================================

-- Clean existing seed data (in correct order due to FKs)
DELETE FROM collection_scripts;
DELETE FROM user_collections;
DELETE FROM script_usage;
DELETE FROM ai_generation_log;
DELETE FROM scripts WHERE is_ai_generated = false;
DELETE FROM script_categories;
DELETE FROM microlearning_tips WHERE created_by IS NULL;
DELETE FROM ai_prompts WHERE created_by IS NULL;

-- ============================================
-- 1. SCRIPT CATEGORIES (8 Trilhas)
-- ============================================
INSERT INTO script_categories (name, slug, description, icon, color, display_order, is_active) VALUES
  ('Abordagem Inicial',    'abordagem-inicial',    'Scripts para o primeiro contato com leads. Quebre o gelo e inicie conversas que convertem.',                '👋', '#10B981', 1, true),
  ('Ativação de Base',     'ativacao-base',         'Scripts para reativar contatos antigos e leads frios. Traga de volta quem sumiu.',                          '🔥', '#F59E0B', 2, true),
  ('Qualificação',         'qualificacao',          'Scripts para qualificar leads e entender se existe fit real com sua oferta.',                                '🎯', '#3B82F6', 3, true),
  ('Apresentação de Oferta','apresentacao-oferta',  'Scripts para apresentar seu produto/serviço de forma irresistível.',                                        '💎', '#8B5CF6', 4, true),
  ('Follow-up',            'follow-up',             'Scripts de acompanhamento para manter o lead engajado até a decisão.',                                      '🔄', '#06B6D4', 5, true),
  ('Contorno de Objeção',  'contorno-objecao',      'Scripts para lidar com objeções e transformar "não" em "sim".',                                             '🛡️', '#EF4444', 6, true),
  ('Fechamento',           'fechamento',            'Scripts para conduzir o lead até o fechamento da venda com confiança.',                                     '🏆', '#F97316', 7, true),
  ('Pós-venda',            'pos-venda',             'Scripts para fidelizar clientes, pedir indicações e gerar recompra.',                                       '❤️', '#EC4899', 8, true);


-- ============================================
-- 2. SCRIPTS (50 total)
-- ============================================

-- ------------------------------------------------
-- ABORDAGEM INICIAL (8 scripts)
-- ------------------------------------------------
INSERT INTO scripts (category_id, title, content, content_formal, content_direct, context_description, objection_keywords, tags, min_plan, display_order, is_active) VALUES

-- 1. Abordagem por indicação
((SELECT id FROM script_categories WHERE slug = 'abordagem-inicial'),
'Abordagem por Indicação',
'E aí, {{NOME_LEAD}}! Tudo bem? 😊

Olha, o(a) [NOME_INDICADOR] me passou seu contato e falou super bem de você. Eu sou o(a) {{MEU_NOME}}, da {{MINHA_EMPRESA}}.

A gente ajuda [NICHO/TIPO DE CLIENTE] a [RESULTADO PRINCIPAL] e eu achei que podia fazer sentido pra você também.

Posso te contar rapidinho como funciona? Leva menos de 2 minutos! ⏱️',

'Olá, {{NOME_LEAD}}! Tudo bem?

Meu nome é {{MEU_NOME}}, da {{MINHA_EMPRESA}}. Recebi seu contato através de [NOME_INDICADOR], que é nosso(a) cliente e me recomendou entrar em contato com você.

Trabalhamos com soluções para [NICHO/TIPO DE CLIENTE] que buscam [RESULTADO PRINCIPAL], e acredito que possa ser relevante para o seu momento.

Teria alguns minutos para conversarmos sobre como podemos ajudá-lo(a)?',

'{{NOME_LEAD}}, beleza? Sou {{MEU_NOME}} da {{MINHA_EMPRESA}}.

[NOME_INDICADOR] me indicou você. A gente faz [NICHO/TIPO DE CLIENTE] faturar mais com [RESULTADO PRINCIPAL].

Quer saber como? Me dá 2 minutos que eu te explico. 🚀',

'Use quando receber uma indicação de cliente ou parceiro. A indicação já cria um nível de confiança inicial que facilita a abertura da conversa.',
ARRAY[]::text[],
ARRAY['indicação', 'primeiro contato', 'confiança', 'referência'],
'starter', 1, true),

-- 2. Abordagem de lead inbound (formulário)
((SELECT id FROM script_categories WHERE slug = 'abordagem-inicial'),
'Lead de Formulário / Inbound',
'Oi, {{NOME_LEAD}}! Aqui é o(a) {{MEU_NOME}}, da {{MINHA_EMPRESA}} 👋

Vi que você se cadastrou pra saber mais sobre {{MEU_PRODUTO}}. Que bom que se interessou!

Me conta: o que mais chamou sua atenção? Assim eu já consigo te direcionar pro que faz mais sentido pra você 😉',

'Olá, {{NOME_LEAD}}! Sou {{MEU_NOME}}, da {{MINHA_EMPRESA}}.

Recebi sua solicitação de informações sobre {{MEU_PRODUTO}} e agradeço muito pelo seu interesse.

Para que eu possa oferecer o melhor atendimento, poderia me contar o que despertou sua atenção e qual é seu principal objetivo neste momento?',

'Fala, {{NOME_LEAD}}! {{MEU_NOME}} aqui, da {{MINHA_EMPRESA}}.

Você pediu informações sobre {{MEU_PRODUTO}} — ótima escolha! 🎯

Me fala rápido: qual seu maior desafio hoje em [ÁREA]? Quero te mostrar exatamente como a gente resolve isso.',

'Para leads que preencheram formulário ou solicitaram contato. Responda rápido (idealmente em até 5 minutos) para maximizar conversão.',
ARRAY[]::text[],
ARRAY['inbound', 'formulário', 'cadastro', 'lead quente'],
'starter', 2, true),

-- 3. Abordagem por conteúdo / redes sociais
((SELECT id FROM script_categories WHERE slug = 'abordagem-inicial'),
'Abordagem via Redes Sociais',
'Oi, {{NOME_LEAD}}! Vi que você curtiu/comentou no meu post sobre [TEMA DO POST] 📱

Que legal que esse assunto te interessa! Eu sou {{MEU_NOME}} e trabalho exatamente com isso na {{MINHA_EMPRESA}}.

Inclusive, tenho um material bem completo sobre [TEMA RELACIONADO] que acho que você ia gostar. Quer que eu te mande?',

'Olá, {{NOME_LEAD}}! Notei sua interação em nosso conteúdo sobre [TEMA DO POST] e gostaria de me apresentar.

Sou {{MEU_NOME}}, da {{MINHA_EMPRESA}}, e trabalhamos diretamente com [TEMA RELACIONADO].

Temos um material exclusivo que aprofunda este assunto e pode ser muito valioso para você. Posso compartilhá-lo?',

'E aí, {{NOME_LEAD}}! Vi que [TEMA DO POST] te chamou atenção no meu post.

Sou {{MEU_NOME}}, da {{MINHA_EMPRESA}}, e ajudo pessoas como você a [RESULTADO].

Tenho algo que vai te ajudar muito com isso. Posso te mandar? 🔥',

'Use quando um lead interage com seu conteúdo no Instagram, LinkedIn ou outra rede. Abordagem natural baseada no interesse demonstrado.',
ARRAY[]::text[],
ARRAY['redes sociais', 'instagram', 'linkedin', 'engajamento', 'conteúdo'],
'starter', 3, true),

-- 4. Abordagem fria com gatilho de curiosidade
((SELECT id FROM script_categories WHERE slug = 'abordagem-inicial'),
'Abordagem Fria com Curiosidade',
'Oi, {{NOME_LEAD}}! Tudo bem? 😊

Eu sou {{MEU_NOME}}, da {{MINHA_EMPRESA}}. Estou entrando em contato porque tenho ajudado [TIPO DE CLIENTE] a [RESULTADO ESPECÍFICO COM NÚMERO] nos últimos [PERÍODO].

Sei que essa mensagem chegou do nada, mas se [RESULTADO] faz sentido pra você, posso te mostrar como funciona em 3 minutos.

O que acha?',

'Olá, {{NOME_LEAD}}! Espero que esteja bem.

Meu nome é {{MEU_NOME}}, da {{MINHA_EMPRESA}}. Estou entrando em contato pois temos ajudado empresas do segmento de [NICHO] a alcançar [RESULTADO ESPECÍFICO COM NÚMERO] nos últimos [PERÍODO].

Compreendo que esta mensagem possa ser inesperada, mas se [RESULTADO] é relevante para sua empresa, gostaria de apresentar nossa metodologia. Teria disponibilidade para uma breve conversa?',

'{{NOME_LEAD}}, sou {{MEU_NOME}} da {{MINHA_EMPRESA}}.

Nos últimos [PERÍODO], ajudamos [NÚMERO] empresas como a sua a [RESULTADO COM NÚMERO]. Sem enrolação.

Quer ver como? É rápido. 🚀',

'Abordagem fria com desconhecidos. O gatilho de curiosidade e a prova social (resultado com número) aumentam a chance de resposta.',
ARRAY[]::text[],
ARRAY['prospecção fria', 'outbound', 'curiosidade', 'prova social'],
'starter', 4, true),

-- 5. Abordagem pós-evento/live
((SELECT id FROM script_categories WHERE slug = 'abordagem-inicial'),
'Abordagem Pós-Evento ou Live',
'E aí, {{NOME_LEAD}}! Que bom que participou da [NOME DO EVENTO/LIVE]! 🎉

Eu sou {{MEU_NOME}}, da {{MINHA_EMPRESA}}. O que achou do conteúdo?

Muita gente que assistiu já está aplicando [DICA PRINCIPAL] e tendo resultado. Se quiser, posso te ajudar a implementar isso de forma mais rápida.

Me conta: qual foi o ponto que mais fez sentido pra você?',

'Olá, {{NOME_LEAD}}! Agradeço sua participação em [NOME DO EVENTO/LIVE].

Sou {{MEU_NOME}}, da {{MINHA_EMPRESA}}. Gostaria de saber suas impressões sobre o conteúdo apresentado.

Diversos participantes já estão implementando as estratégias compartilhadas com resultados expressivos. Posso auxiliá-lo(a) na aplicação prática dessas técnicas. Qual ponto da apresentação considerou mais relevante?',

'{{NOME_LEAD}}! Participou da [NOME DO EVENTO/LIVE]?

Sou {{MEU_NOME}}, da {{MINHA_EMPRESA}}. O conteúdo foi bom, mas o resultado de verdade vem quando você aplica com acompanhamento.

Quer saber como acelerar isso? Me responde aqui. ⚡',

'Para leads que participaram de webinar, live, palestra ou workshop. Aproveite o engajamento recente para iniciar conversa.',
ARRAY[]::text[],
ARRAY['evento', 'live', 'webinar', 'workshop', 'engajamento'],
'starter', 5, true),

-- 6. Abordagem por áudio curto
((SELECT id FROM script_categories WHERE slug = 'abordagem-inicial'),
'Abordagem por Áudio (roteiro)',
'[ENVIAR COMO ÁUDIO - Máximo 40 segundos]

"Oi {{NOME_LEAD}}, tudo bem? Aqui é o(a) {{MEU_NOME}}, da {{MINHA_EMPRESA}}.

To te mandando esse áudio rapidinho porque vi que você [CONTEXTO - se cadastrou / curtiu / foi indicado] e queria bater um papo contigo.

A gente ajuda [TIPO DE CLIENTE] a [RESULTADO] e acho que pode fazer muito sentido pra você.

Me manda um oi aqui que eu te explico melhor, combinado?"',

'[ENVIAR COMO ÁUDIO - Máximo 40 segundos]

"Olá {{NOME_LEAD}}, tudo bem? Aqui é o(a) {{MEU_NOME}}, da {{MINHA_EMPRESA}}.

Estou entrando em contato porque [CONTEXTO] e gostaria de conversar sobre como nossas soluções podem beneficiá-lo(a).

Trabalhamos com [TIPO DE CLIENTE] ajudando a alcançar [RESULTADO]. Posso explicar com mais detalhes quando for conveniente. Aguardo seu retorno."',

'[ENVIAR COMO ÁUDIO - Máximo 30 segundos]

"Fala {{NOME_LEAD}}! {{MEU_NOME}}, da {{MINHA_EMPRESA}}.

[CONTEXTO] e vim direto ao ponto: a gente faz [TIPO DE CLIENTE] alcançar [RESULTADO]. Simples assim.

Me responde aqui que te mostro como."',

'Áudios curtos geram até 3x mais respostas que texto. Grave com energia, sorria e mantenha no máximo 40 segundos.',
ARRAY[]::text[],
ARRAY['áudio', 'voz', 'pessoal', 'humanizado'],
'starter', 6, true),

-- 7. Abordagem pelo WhatsApp Business (catálogo)
((SELECT id FROM script_categories WHERE slug = 'abordagem-inicial'),
'Abordagem com Link de Catálogo',
'Oi, {{NOME_LEAD}}! Tudo certo? 😊

Sou {{MEU_NOME}}, da {{MINHA_EMPRESA}}. Preparei um catálogo especial com nossas principais soluções pra você dar uma olhada:

[LINK DO CATÁLOGO]

Tem opções pra vários perfis e orçamentos. Dá uma espiadinha e me conta qual chamou mais sua atenção que eu te passo todos os detalhes! 🛒',

'Olá, {{NOME_LEAD}}! Sou {{MEU_NOME}}, da {{MINHA_EMPRESA}}.

Preparei um catálogo com nossas principais soluções para sua apreciação:

[LINK DO CATÁLOGO]

Estou à disposição para esclarecer qualquer dúvida e apresentar a opção mais adequada ao seu perfil. Qual das soluções despertou maior interesse?',

'{{NOME_LEAD}}, {{MEU_NOME}} aqui da {{MINHA_EMPRESA}}.

Olha o que tenho pra você: [LINK DO CATÁLOGO]

Escolhe o que mais te interessa e me manda aqui. Te falo tudo sobre condições e prazo. 🔥',

'Ideal para quem usa WhatsApp Business com catálogo configurado. Direcione o lead para ver os produtos antes de aprofundar.',
ARRAY[]::text[],
ARRAY['catálogo', 'whatsapp business', 'produtos', 'vitrine'],
'starter', 7, true),

-- 8. Abordagem com prova social
((SELECT id FROM script_categories WHERE slug = 'abordagem-inicial'),
'Abordagem com Prova Social',
'Oi, {{NOME_LEAD}}! Tudo bem? Sou {{MEU_NOME}}, da {{MINHA_EMPRESA}} 😊

Olha que legal: o(a) [NOME DO CLIENTE] usou nosso {{MEU_PRODUTO}} e conseguiu [RESULTADO ESPECÍFICO] em apenas [TEMPO].

E não é caso isolado, já são mais de [NÚMERO] clientes com resultados parecidos!

Quer entender se faz sentido pra você também? É rapidinho! 🚀',

'Olá, {{NOME_LEAD}}! Sou {{MEU_NOME}}, da {{MINHA_EMPRESA}}.

Gostaria de compartilhar o caso do(a) [NOME DO CLIENTE], que utilizou nosso {{MEU_PRODUTO}} e alcançou [RESULTADO ESPECÍFICO] em [TEMPO].

Este resultado é consistente com o que temos observado em nossa base de mais de [NÚMERO] clientes satisfeitos.

Posso explicar como esse resultado pode ser replicado na sua realidade?',

'{{NOME_LEAD}}! {{MEU_NOME}}, {{MINHA_EMPRESA}}.

[NOME DO CLIENTE] fez [RESULTADO ESPECÍFICO] em [TEMPO] com nosso {{MEU_PRODUTO}}. Mais de [NÚMERO] clientes fizeram o mesmo.

Quer ser o próximo? Me chama aqui. 💪',

'Muito eficaz quando você tem cases reais. Use nomes reais (com permissão) e resultados específicos. Quanto mais concreto, melhor.',
ARRAY[]::text[],
ARRAY['prova social', 'depoimento', 'case', 'resultado', 'confiança'],
'starter', 8, true),


-- ------------------------------------------------
-- ATIVAÇÃO DE BASE (7 scripts)
-- ------------------------------------------------

-- 9. Reativação com novidade
((SELECT id FROM script_categories WHERE slug = 'ativacao-base'),
'Reativação com Novidade',
'Oi, {{NOME_LEAD}}! Quanto tempo, né? 😊

Aqui é o(a) {{MEU_NOME}}, da {{MINHA_EMPRESA}}. Lembrei de você porque acabamos de lançar [NOVIDADE] e eu pensei: "isso é a cara do(a) {{NOME_LEAD}}!"

É diferente de tudo que a gente já fez e os primeiros resultados estão surpreendentes.

Quer saber mais? Posso te contar os detalhes rapidinho! 🚀',

'Olá, {{NOME_LEAD}}! Espero que esteja bem.

Sou {{MEU_NOME}}, da {{MINHA_EMPRESA}}. Entro em contato para informá-lo(a) sobre nosso recente lançamento: [NOVIDADE].

Trata-se de uma solução desenvolvida com base no feedback de nossos clientes, e os resultados iniciais têm sido muito expressivos.

Gostaria de apresentar os detalhes? Acredito que possa ser bastante relevante para você.',

'{{NOME_LEAD}}! {{MEU_NOME}} da {{MINHA_EMPRESA}} aqui.

Lançamos algo novo e pensei em você: [NOVIDADE].

Os primeiros clientes já estão tendo resultado. Quer ver? Me responde aqui. 🔥',

'Para reativar leads que já conversaram com você mas não compraram. Use novidades reais para justificar o contato.',
ARRAY[]::text[],
ARRAY['reativação', 'novidade', 'lançamento', 'base fria'],
'starter', 1, true),

-- 10. Reativação com conteúdo gratuito
((SELECT id FROM script_categories WHERE slug = 'ativacao-base'),
'Reativação com Conteúdo Gratuito',
'Oi, {{NOME_LEAD}}! Tudo certo? Aqui é o(a) {{MEU_NOME}} 😊

Lembrei de você porque preparei um [TIPO DE CONTEÚDO: e-book / checklist / aula] sobre [TEMA] que tá ajudando muita gente.

É 100% gratuito e sem compromisso! Achei que ia ser útil pra você.

Quer que eu te mande? 📚',

'Olá, {{NOME_LEAD}}! Aqui é {{MEU_NOME}}, da {{MINHA_EMPRESA}}.

Preparamos um [TIPO DE CONTEÚDO] sobre [TEMA] que tem recebido feedback bastante positivo de nossos contatos.

O material é totalmente gratuito e sem compromisso. Acredito que possa agregar valor para você.

Posso enviar?',

'{{NOME_LEAD}}! {{MEU_NOME}} aqui.

Criei um [TIPO DE CONTEÚDO] gratuito sobre [TEMA] que tá bombando. Mais de [NÚMERO] pessoas já baixaram.

Mando pra você? É de graça! 📲',

'Ofereça valor antes de vender. Conteúdo gratuito reabre a conversa sem pressão e posiciona você como autoridade.',
ARRAY[]::text[],
ARRAY['reativação', 'conteúdo', 'gratuito', 'e-book', 'valor'],
'starter', 2, true),

-- 11. Reativação com condição especial
((SELECT id FROM script_categories WHERE slug = 'ativacao-base'),
'Reativação com Oferta Exclusiva',
'Oi, {{NOME_LEAD}}! Tudo bem? Aqui é o(a) {{MEU_NOME}}, da {{MINHA_EMPRESA}} ✨

Lembra que a gente conversou sobre {{MEU_PRODUTO}}? Então, surgiu uma condição especial que é válida só até [DATA].

Como você já tinha demonstrado interesse, quis te avisar antes de abrir pra todo mundo.

Quer saber os detalhes dessa condição? 🎁',

'Olá, {{NOME_LEAD}}! Sou {{MEU_NOME}}, da {{MINHA_EMPRESA}}.

Recordo que conversamos anteriormente sobre {{MEU_PRODUTO}} e gostaria de informá-lo(a) sobre uma condição especial que estamos oferecendo por tempo limitado, válida até [DATA].

Dado seu interesse anterior, considerei justo comunicá-lo(a) com prioridade. Posso apresentar os detalhes?',

'{{NOME_LEAD}}! {{MEU_NOME}} da {{MINHA_EMPRESA}}.

Aquela conversa sobre {{MEU_PRODUTO}}? Surgiu uma condição especial que acaba em [DATA].

Tô te avisando antes de todo mundo. Quer saber? ⏳',

'Para leads que demonstraram interesse mas não fecharam. A exclusividade e urgência temporal ajudam a reativar.',
ARRAY[]::text[],
ARRAY['reativação', 'oferta', 'exclusividade', 'urgência', 'desconto'],
'starter', 3, true),

-- 12. Reativação com pesquisa rápida
((SELECT id FROM script_categories WHERE slug = 'ativacao-base'),
'Reativação com Pesquisa Rápida',
'Oi, {{NOME_LEAD}}! Aqui é o(a) {{MEU_NOME}}, da {{MINHA_EMPRESA}} 😊

Estou fazendo uma pesquisa rápida com pessoas que já conversaram comigo e queria muito a sua opinião.

É só uma pergunta: Qual é o maior desafio que você enfrenta hoje em [ÁREA]?

Sua resposta vai me ajudar a criar soluções melhores. E quem responder ganha [BENEFÍCIO] 🎁',

'Olá, {{NOME_LEAD}}! Sou {{MEU_NOME}}, da {{MINHA_EMPRESA}}.

Estamos realizando uma breve pesquisa com nossos contatos para aprimorar nossos serviços, e sua participação seria muito valiosa.

Gostaria de saber: qual é o principal desafio que você enfrenta atualmente em [ÁREA]?

Como agradecimento pela sua contribuição, oferecemos [BENEFÍCIO].',

'{{NOME_LEAD}}! {{MEU_NOME}} aqui.

Preciso da sua ajuda — 1 pergunta rápida: Qual seu maior desafio em [ÁREA] hoje?

Quem responder ganha [BENEFÍCIO]. Me fala aí! 📊',

'Pesquisas reativam leads de forma leve. A resposta deles dá informações valiosas para personalizar o próximo contato.',
ARRAY[]::text[],
ARRAY['reativação', 'pesquisa', 'engajamento', 'feedback'],
'starter', 4, true),

-- 13. Reativação com case de sucesso
((SELECT id FROM script_categories WHERE slug = 'ativacao-base'),
'Reativação com Case de Sucesso',
'Oi, {{NOME_LEAD}}! Aqui é o(a) {{MEU_NOME}} 🙂

Olha, eu tinha que te contar isso: o(a) [NOME DO CLIENTE], que estava numa situação parecida com a sua, começou a usar {{MEU_PRODUTO}} e em [TEMPO] conseguiu [RESULTADO ESPECÍFICO].

Lembrei na hora de você porque a gente tinha conversado sobre desafios bem similares.

Quer que eu te conte o que ele(a) fez de diferente? 💡',

'Olá, {{NOME_LEAD}}! Sou {{MEU_NOME}}, da {{MINHA_EMPRESA}}.

Gostaria de compartilhar um caso recente que me fez lembrar de nossa conversa: [NOME DO CLIENTE] adotou {{MEU_PRODUTO}} e obteve [RESULTADO ESPECÍFICO] em [TEMPO].

As circunstâncias eram bastante semelhantes às que você mencionou. Posso detalhar a estratégia utilizada?',

'{{NOME_LEAD}}! Olha esse resultado:

[NOME DO CLIENTE] → [RESULTADO ESPECÍFICO] em [TEMPO] com {{MEU_PRODUTO}}.

Situação parecida com a sua. Quer saber como? 📈',

'Cases reais de clientes em situação similar criam identificação. Use dados específicos para máximo impacto.',
ARRAY[]::text[],
ARRAY['reativação', 'case', 'prova social', 'resultado', 'identificação'],
'starter', 5, true),

-- 14. Reativação por data comemorativa
((SELECT id FROM script_categories WHERE slug = 'ativacao-base'),
'Reativação por Data Comemorativa',
'Oi, {{NOME_LEAD}}! Tudo bem? 🎉

Aqui é o(a) {{MEU_NOME}}, da {{MINHA_EMPRESA}}. Passando pra te desejar um ótimo [DATA/OCASIÃO]!

E aproveitando: estamos com uma ação especial de [DATA/OCASIÃO] com condições que a gente nunca fez antes.

Quer dar uma olhada? Vai que é exatamente o que você precisava! 😉',

'Olá, {{NOME_LEAD}}! Sou {{MEU_NOME}}, da {{MINHA_EMPRESA}}.

Em primeiro lugar, desejo a você um excelente [DATA/OCASIÃO].

Aproveito para informá-lo(a) de que estamos com condições especiais em comemoração a esta data. São oportunidades exclusivas que preparamos para nossos contatos mais especiais.

Posso apresentar as opções disponíveis?',

'{{NOME_LEAD}}! Feliz [DATA/OCASIÃO]! 🎁

{{MEU_NOME}} da {{MINHA_EMPRESA}} aqui. Temos uma ação especial por tempo limitado.

Quer ver as condições? Me chama!',

'Datas comemorativas (aniversário, Natal, Black Friday, Dia do Cliente) são ótimas desculpas para reativar contatos de forma natural.',
ARRAY[]::text[],
ARRAY['reativação', 'data comemorativa', 'sazonal', 'oferta especial'],
'starter', 6, true),

-- 15. Reativação com senso de comunidade
((SELECT id FROM script_categories WHERE slug = 'ativacao-base'),
'Reativação com Comunidade / Grupo',
'Oi, {{NOME_LEAD}}! Aqui é o(a) {{MEU_NOME}} 😊

Criei um grupo exclusivo no WhatsApp com [TIPO DE PESSOAS] que querem [OBJETIVO]. Estou selecionando as pessoas com cuidado e pensei em você.

No grupo a gente compartilha [TIPO DE CONTEÚDO], dicas práticas e já tem bastante gente tendo resultado.

Quer participar? É gratuito! Vaga limitada 🔒',

'Olá, {{NOME_LEAD}}! Sou {{MEU_NOME}}, da {{MINHA_EMPRESA}}.

Estamos formando uma comunidade exclusiva de [TIPO DE PESSOAS] focados em [OBJETIVO]. O grupo oferece [TIPO DE CONTEÚDO], networking e acompanhamento.

Estamos selecionando os participantes criteriosamente e acredito que seu perfil se encaixa muito bem. Gostaria de participar? A adesão é gratuita, porém as vagas são limitadas.',

'{{NOME_LEAD}}! Criei um grupo VIP com [TIPO DE PESSOAS] focado em [OBJETIVO].

Conteúdo exclusivo + networking + resultado. Gratuito, mas vaga limitada.

Quer entrar? Me confirma aqui. 🔒',

'Grupos e comunidades geram pertencimento e são excelentes para nutrir leads antes da venda. Ofereça valor real no grupo.',
ARRAY[]::text[],
ARRAY['reativação', 'comunidade', 'grupo', 'WhatsApp', 'exclusividade'],
'starter', 7, true),


-- ------------------------------------------------
-- QUALIFICAÇÃO (6 scripts)
-- ------------------------------------------------

-- 16. Qualificação por situação atual
((SELECT id FROM script_categories WHERE slug = 'qualificacao'),
'Diagnóstico da Situação Atual',
'Que bom que topou conversar, {{NOME_LEAD}}! 😊

Antes de te falar sobre {{MEU_PRODUTO}}, quero entender melhor sua situação. Me responde rapidinho:

1️⃣ Como você faz [PROCESSO] hoje?
2️⃣ Qual é o resultado que você tem atualmente?
3️⃣ Se pudesse mudar UMA coisa nessa área, o que seria?

Assim consigo te mostrar exatamente o que faz sentido pra você! 🎯',

'Agradeço pela disponibilidade, {{NOME_LEAD}}.

Antes de apresentar {{MEU_PRODUTO}} em detalhes, gostaria de compreender melhor seu cenário atual. Poderia responder três breves perguntas?

1. Como é realizado o processo de [PROCESSO] atualmente?
2. Quais resultados têm sido obtidos?
3. Se pudesse aprimorar um aspecto nessa área, qual seria?

Com essas informações, poderei direcionar nossa conversa para o que é mais relevante para você.',

'Legal, {{NOME_LEAD}}! Antes de qualquer coisa:

1. Como você faz [PROCESSO] hoje?
2. Que resultado tá tendo?
3. O que mais te incomoda nisso?

Me responde que eu monto algo sob medida pra você. ⚡',

'Qualifique antes de apresentar. Essas 3 perguntas revelam o nível de consciência e a dor real do lead.',
ARRAY[]::text[],
ARRAY['qualificação', 'diagnóstico', 'perguntas', 'descoberta'],
'starter', 1, true),

-- 17. Qualificação por orçamento
((SELECT id FROM script_categories WHERE slug = 'qualificacao'),
'Qualificação por Orçamento',
'Entendi sua situação, {{NOME_LEAD}}! Já consigo ver que a gente pode te ajudar bastante 💪

Uma pergunta importante pra eu te direcionar pra melhor opção: você já tem uma ideia de investimento pra resolver isso?

A gente tem opções a partir de [VALOR MENOR] até [VALOR MAIOR], dependendo do nível de acompanhamento.

Assim eu te mostro exatamente a que faz mais sentido pro seu momento! 😉',

'Compreendo perfeitamente sua situação, {{NOME_LEAD}}. Acredito que temos soluções muito adequadas.

Para direcioná-lo(a) à melhor opção, poderia me informar qual faixa de investimento está considerando para esta solução?

Dispomos de alternativas que variam de [VALOR MENOR] a [VALOR MAIOR], conforme o nível de personalização e acompanhamento. Dessa forma, posso apresentar a proposta mais alinhada ao seu momento.',

'{{NOME_LEAD}}, tenho a solução certa. Mas preciso saber: qual faixa de investimento funciona pra você?

Temos de [VALOR MENOR] a [VALOR MAIOR]. Me fala que te mostro a melhor opção. 💰',

'Pergunta direta sobre orçamento filtra leads qualificados. Apresente uma faixa para facilitar a resposta do lead.',
ARRAY[]::text[],
ARRAY['qualificação', 'orçamento', 'investimento', 'budget'],
'starter', 2, true),

-- 18. Qualificação por urgência
((SELECT id FROM script_categories WHERE slug = 'qualificacao'),
'Qualificação por Urgência / Timeline',
'{{NOME_LEAD}}, me tira uma dúvida: resolver [PROBLEMA/OBJETIVO] é algo que você precisa pra agora ou tá planejando mais pro futuro? ⏰

Pergunto porque dependendo do timing, eu consigo montar uma estratégia diferente pra você.

Se for urgente, inclusive, temos uma forma de acelerar o processo! 🚀',

'{{NOME_LEAD}}, uma questão importante: a resolução de [PROBLEMA/OBJETIVO] é uma prioridade imediata ou está em fase de planejamento para os próximos meses?

Esta informação é relevante pois nos permite adequar nossa proposta ao seu cronograma e, caso seja urgente, dispomos de processos acelerados.',

'{{NOME_LEAD}}, direto ao ponto: precisa resolver [PROBLEMA/OBJETIVO] agora ou tá só pesquisando?

Se for agora, tenho como acelerar. Me fala. ⚡',

'Entender a urgência ajuda a priorizar leads quentes. Quem precisa pra agora tem muito mais chance de fechar rápido.',
ARRAY[]::text[],
ARRAY['qualificação', 'urgência', 'timeline', 'prazo', 'prioridade'],
'starter', 3, true),

-- 19. Qualificação por decisão
((SELECT id FROM script_categories WHERE slug = 'qualificacao'),
'Qualificação por Tomador de Decisão',
'{{NOME_LEAD}}, só pra eu organizar tudo certinho: a decisão sobre [TIPO DE INVESTIMENTO] é sua ou tem mais alguém envolvido? 🤔

Pergunto pra que, quando eu montar a proposta, já inclua tudo que cada pessoa precisa saber. Assim a gente agiliza o processo e não perde tempo! ⚡',

'{{NOME_LEAD}}, para que eu possa preparar uma proposta completa: a decisão referente a [TIPO DE INVESTIMENTO] é exclusivamente sua ou envolve outros decisores?

Essa informação nos permite estruturar a apresentação de forma a contemplar as necessidades de todos os envolvidos no processo decisório.',

'{{NOME_LEAD}}, quem decide sobre [TIPO DE INVESTIMENTO]? Só você ou mais alguém?

Preciso saber pra montar a proposta certa e não atrasar o processo. Me fala! 🎯',

'Identificar o decisor evita propostas que ficam "travadas". Se há mais decisores, inclua-os na próxima etapa.',
ARRAY[]::text[],
ARRAY['qualificação', 'decisor', 'decisão', 'stakeholder'],
'starter', 4, true),

-- 20. Qualificação por dor principal
((SELECT id FROM script_categories WHERE slug = 'qualificacao'),
'Qualificação por Dor / Problema',
'{{NOME_LEAD}}, de tudo que você me falou, o que mais te incomoda hoje: é [DOR A], [DOR B] ou [DOR C]? 🤔

Quero focar exatamente no que mais importa pra você, porque cada uma dessas situações tem uma solução diferente.

Me conta qual tá tirando mais seu sono que eu te mostro o caminho mais rápido pra resolver! 💡',

'{{NOME_LEAD}}, dentre os pontos que mencionou, qual representa o maior desafio atualmente: [DOR A], [DOR B] ou [DOR C]?

Cada uma dessas situações demanda uma abordagem específica, e identificar a prioridade nos permitirá direcionar a solução mais adequada de forma eficiente.',

'{{NOME_LEAD}}, me fala: o que mais dói hoje? [DOR A], [DOR B] ou [DOR C]?

Cada problema tem uma solução diferente. Me aponta o principal que eu resolvo. 🎯',

'Forçar o lead a escolher a dor principal facilita a apresentação focada. Sempre ofereça 3 opções para facilitar a resposta.',
ARRAY[]::text[],
ARRAY['qualificação', 'dor', 'problema', 'prioridade', 'diagnóstico'],
'starter', 5, true),

-- 21. Qualificação por experiência anterior
((SELECT id FROM script_categories WHERE slug = 'qualificacao'),
'Qualificação por Experiência Anterior',
'{{NOME_LEAD}}, antes de seguir: você já tentou resolver [PROBLEMA] antes? Se sim, o que usou e por que não funcionou? 🤔

Não tô perguntando pra julgar, viu! É que isso me ajuda a entender o que NÃO fazer pra não repetir o erro. Assim a gente já começa diferente! 🎯',

'{{NOME_LEAD}}, uma informação que considero importante: já utilizou alguma solução anteriormente para [PROBLEMA]? Em caso positivo, poderia compartilhar sua experiência e os motivos pelos quais não atendeu às expectativas?

Essa compreensão nos permite evitar abordagens que já se mostraram ineficazes e propor algo genuinamente diferenciado.',

'{{NOME_LEAD}}, já tentou resolver [PROBLEMA] antes? O que usou? Por que não deu certo?

Me conta que eu te mostro uma abordagem completamente diferente. 💪',

'Saber o histórico do lead evita objeções futuras e permite posicionar sua solução como diferente das anteriores.',
ARRAY[]::text[],
ARRAY['qualificação', 'experiência', 'histórico', 'concorrência', 'objeção'],
'starter', 6, true),


-- ------------------------------------------------
-- APRESENTAÇÃO DE OFERTA (6 scripts)
-- ------------------------------------------------

-- 22. Apresentação com storytelling
((SELECT id FROM script_categories WHERE slug = 'apresentacao-oferta'),
'Apresentação com Storytelling',
'{{NOME_LEAD}}, deixa eu te contar uma história rápida... 📖

O(a) [NOME] estava exatamente na mesma situação que você: [DESCREVER SITUAÇÃO SIMILAR]. Ele(a) estava frustrado(a) e já tinha tentado [TENTATIVAS ANTERIORES].

Aí ele(a) conheceu {{MEU_PRODUTO}} e em [TEMPO]:
✅ [RESULTADO 1]
✅ [RESULTADO 2]
✅ [RESULTADO 3]

O que mudou? [DIFERENCIAL DO PRODUTO].

Quer que eu te mostre como você pode ter o mesmo resultado? 🚀',

'{{NOME_LEAD}}, permita-me compartilhar um caso que considero muito relevante para sua situação.

[NOME] enfrentava desafios semelhantes aos seus: [DESCREVER SITUAÇÃO SIMILAR]. Após diversas tentativas sem sucesso com [TENTATIVAS ANTERIORES], decidiu adotar {{MEU_PRODUTO}}.

Em [TEMPO], os resultados foram expressivos:
- [RESULTADO 1]
- [RESULTADO 2]
- [RESULTADO 3]

O diferencial foi [DIFERENCIAL DO PRODUTO]. Posso apresentar como replicar esses resultados no seu contexto?',

'{{NOME_LEAD}}, olha esse caso:

[NOME] → mesma situação que você. Começou com {{MEU_PRODUTO}} e em [TEMPO]:
✅ [RESULTADO 1]
✅ [RESULTADO 2]
✅ [RESULTADO 3]

Segredo? [DIFERENCIAL]. Quer o mesmo resultado? Me chama. 🎯',

'Storytelling cria conexão emocional. Use um case real com situação similar à do lead para máxima identificação.',
ARRAY[]::text[],
ARRAY['apresentação', 'storytelling', 'case', 'resultado', 'narrativa'],
'starter', 1, true),

-- 23. Apresentação com comparação antes/depois
((SELECT id FROM script_categories WHERE slug = 'apresentacao-oferta'),
'Apresentação Antes vs Depois',
'{{NOME_LEAD}}, olha a diferença que {{MEU_PRODUTO}} faz:

❌ ANTES:
• [DOR/SITUAÇÃO ATUAL 1]
• [DOR/SITUAÇÃO ATUAL 2]
• [DOR/SITUAÇÃO ATUAL 3]

✅ DEPOIS:
• [RESULTADO 1]
• [RESULTADO 2]
• [RESULTADO 3]

E o investimento? A partir de {{MEU_PRECO}} — que se paga em [TEMPO DE PAYBACK] com [MÉTRICA].

Faz sentido pra você? Posso te explicar o passo a passo? 💡',

'{{NOME_LEAD}}, gostaria de ilustrar o impacto de {{MEU_PRODUTO}} em seu cenário:

Situação Atual:
• [DOR/SITUAÇÃO ATUAL 1]
• [DOR/SITUAÇÃO ATUAL 2]
• [DOR/SITUAÇÃO ATUAL 3]

Com {{MEU_PRODUTO}}:
• [RESULTADO 1]
• [RESULTADO 2]
• [RESULTADO 3]

O investimento inicia em {{MEU_PRECO}}, com retorno estimado em [TEMPO DE PAYBACK]. Posso detalhar o processo de implementação?',

'{{NOME_LEAD}}, visualiza isso:

SEM {{MEU_PRODUTO}}: [DOR 1], [DOR 2], [DOR 3]
COM {{MEU_PRODUTO}}: [RESULTADO 1], [RESULTADO 2], [RESULTADO 3]

Investimento: {{MEU_PRECO}}. ROI em [TEMPO].

Bora? 🚀',

'Comparação antes/depois é visual e persuasiva. Use as dores que o lead mencionou na qualificação.',
ARRAY[]::text[],
ARRAY['apresentação', 'antes depois', 'comparação', 'transformação', 'oferta'],
'starter', 2, true),

-- 24. Apresentação com ancoragem de preço
((SELECT id FROM script_categories WHERE slug = 'apresentacao-oferta'),
'Apresentação com Ancoragem de Preço',
'{{NOME_LEAD}}, vou te apresentar {{MEU_PRODUTO}} de um jeito diferente 😊

Imagina que pra resolver [PROBLEMA] por conta própria, você gastaria:
💸 [CUSTO 1] com [ITEM 1]
💸 [CUSTO 2] com [ITEM 2]
💸 [CUSTO 3] com [ITEM 3]
Total: [SOMA DOS CUSTOS]

Com {{MEU_PRODUTO}}, você tem TUDO isso (e mais!) por apenas {{MEU_PRECO}}.

Ou seja, você economiza [VALOR DA ECONOMIA] e ainda tem [BENEFÍCIO EXTRA].

Quer que eu te mostre tudo que está incluso? 🎁',

'{{NOME_LEAD}}, permita-me contextualizar o valor de {{MEU_PRODUTO}}.

Para alcançar os mesmos resultados de forma independente, o investimento seria:
• [CUSTO 1] em [ITEM 1]
• [CUSTO 2] em [ITEM 2]
• [CUSTO 3] em [ITEM 3]
Total estimado: [SOMA DOS CUSTOS]

{{MEU_PRODUTO}} integra todas essas soluções por {{MEU_PRECO}}, representando uma economia de [VALOR DA ECONOMIA], além de [BENEFÍCIO EXTRA].

Posso detalhar o que está incluso em cada plano?',

'{{NOME_LEAD}}, faz a conta:

Resolver [PROBLEMA] sozinho = [SOMA DOS CUSTOS]
{{MEU_PRODUTO}} com TUDO incluso = {{MEU_PRECO}}

Economia de [VALOR DA ECONOMIA]. E ainda ganha [BENEFÍCIO EXTRA].

Faz sentido? Me responde. 💰',

'Ancoragem de preço mostra o valor comparando com alternativas mais caras. O lead percebe o investimento como uma barganha.',
ARRAY[]::text[],
ARRAY['apresentação', 'ancoragem', 'preço', 'valor', 'comparação'],
'starter', 3, true),

-- 25. Apresentação com oferta limitada
((SELECT id FROM script_categories WHERE slug = 'apresentacao-oferta'),
'Apresentação com Escassez / Urgência',
'{{NOME_LEAD}}, tenho uma notícia boa e uma "ruim" 😅

A boa: preparei uma condição especial de {{MEU_PRODUTO}} pra você:
🎁 [BÔNUS 1]
🎁 [BÔNUS 2]
🎁 [BÔNUS 3]
Tudo isso + {{MEU_PRODUTO}} por apenas {{MEU_PRECO}}

A "ruim": essa condição vale só até [DATA/LIMITE] e já estamos com [NÚMERO]% das vagas preenchidas.

Quer garantir a sua? ⏳',

'{{NOME_LEAD}}, tenho uma oportunidade que gostaria de compartilhar.

Preparamos uma condição diferenciada para {{MEU_PRODUTO}} que inclui:
• [BÔNUS 1]
• [BÔNUS 2]
• [BÔNUS 3]
O investimento total é de {{MEU_PRECO}}.

Entretanto, esta condição é válida apenas até [DATA/LIMITE] e as vagas são limitadas. Gostaria de reservar a sua?',

'{{NOME_LEAD}}, oferta relâmpago:

{{MEU_PRODUTO}} + [BÔNUS 1] + [BÔNUS 2] + [BÔNUS 3] = {{MEU_PRECO}}

Válido até [DATA]. [NÚMERO]% das vagas já foram.

Vai perder? Me fala agora. ⚡',

'Escassez e urgência reais (nunca falsos!) aceleram decisão. Combine com bônus para aumentar o valor percebido.',
ARRAY[]::text[],
ARRAY['apresentação', 'escassez', 'urgência', 'bônus', 'oferta limitada'],
'starter', 4, true),

-- 26. Apresentação com garantia
((SELECT id FROM script_categories WHERE slug = 'apresentacao-oferta'),
'Apresentação com Garantia de Resultado',
'{{NOME_LEAD}}, eu sei que investir em algo novo dá um frio na barriga 😅

Por isso, {{MEU_PRODUTO}} vem com uma garantia de [PRAZO] dias. Se você não tiver [RESULTADO MÍNIMO] nesse período, devolvemos 100% do seu investimento.

Ou seja: ou você tem resultado, ou seu dinheiro de volta. Sem risco nenhum pra você.

Investimento: {{MEU_PRECO}}. Quer que eu te explique como funciona? 🛡️',

'{{NOME_LEAD}}, compreendo que tomar uma decisão de investimento requer confiança.

Por esta razão, {{MEU_PRODUTO}} oferece uma garantia de satisfação de [PRAZO] dias. Caso não alcance [RESULTADO MÍNIMO] neste período, realizamos o reembolso integral.

Nosso compromisso é com seu resultado. O investimento é de {{MEU_PRECO}}. Posso explicar os termos da garantia em detalhes?',

'{{NOME_LEAD}}, sem risco:

{{MEU_PRODUTO}} por {{MEU_PRECO}} + garantia de [PRAZO] dias. Se não funcionar, devolvemos tudo. Simples.

Topa? 🛡️',

'A garantia elimina o risco percebido. Quando o lead não tem nada a perder, a decisão fica muito mais fácil.',
ARRAY[]::text[],
ARRAY['apresentação', 'garantia', 'risco zero', 'confiança', 'reembolso'],
'starter', 5, true),

-- 27. Apresentação com demonstração
((SELECT id FROM script_categories WHERE slug = 'apresentacao-oferta'),
'Apresentação com Demonstração / Amostra',
'{{NOME_LEAD}}, sabe o que vai te convencer mais do que qualquer coisa que eu diga? Ver {{MEU_PRODUTO}} funcionando! 😊

Quero te dar acesso a [DEMONSTRAÇÃO / AMOSTRA / TRIAL] por [PERÍODO] pra você testar sem compromisso.

Assim você vê na prática como funciona e toma sua decisão com segurança.

Topa experimentar? É por minha conta! 🎁',

'{{NOME_LEAD}}, acredito que a melhor forma de avaliar {{MEU_PRODUTO}} é experimentando na prática.

Gostaria de oferecer-lhe acesso a [DEMONSTRAÇÃO / AMOSTRA / TRIAL] por [PERÍODO], sem compromisso algum.

Dessa forma, poderá avaliar pessoalmente os benefícios e tomar uma decisão informada. Tem interesse?',

'{{NOME_LEAD}}, para de imaginar e experimenta:

[DEMONSTRAÇÃO / TRIAL] de {{MEU_PRODUTO}} grátis por [PERÍODO]. Sem compromisso.

Teste, veja resultado, e depois a gente conversa. Topa? 🔥',

'Demonstrações reduzem objeções drasticamente. Se possível, sempre ofereça um "test drive" do seu produto.',
ARRAY[]::text[],
ARRAY['apresentação', 'demonstração', 'trial', 'teste', 'amostra grátis'],
'starter', 6, true),


-- ------------------------------------------------
-- FOLLOW-UP (7 scripts)
-- ------------------------------------------------

-- 28. Follow-up após primeiro contato
((SELECT id FROM script_categories WHERE slug = 'follow-up'),
'Follow-up Pós Primeiro Contato',
'Oi, {{NOME_LEAD}}! Tudo bem? 😊

Mandei uma mensagem ontem/há alguns dias sobre [ASSUNTO] e imagino que você deve estar corrido(a).

Só queria saber: conseguiu dar uma olhada? Se tiver qualquer dúvida, é só me chamar aqui!

Sem pressão nenhuma, tá? Tô aqui quando precisar 🙂',

'Olá, {{NOME_LEAD}}! Espero que esteja bem.

Entrei em contato anteriormente sobre [ASSUNTO] e gostaria de saber se teve oportunidade de considerar a informação.

Estou à disposição para esclarecer quaisquer dúvidas, no momento que for mais conveniente.',

'{{NOME_LEAD}}, mandei uma mensagem sobre [ASSUNTO]. Viu?

Me dá um retorno rápido — se faz sentido, a gente avança. Se não, sem problema. 👍',

'Primeiro follow-up deve ser leve e sem pressão. Espere 24-48h após o primeiro contato para enviar.',
ARRAY[]::text[],
ARRAY['follow-up', 'primeiro contato', 'retorno', 'lembrete'],
'starter', 1, true),

-- 29. Follow-up com conteúdo de valor
((SELECT id FROM script_categories WHERE slug = 'follow-up'),
'Follow-up com Valor Agregado',
'Oi, {{NOME_LEAD}}! Lembrei de você agora 😊

Encontrei esse [ARTIGO / VÍDEO / DADO] sobre [TEMA RELACIONADO AO INTERESSE DO LEAD] e achei que ia te ajudar:

[LINK OU CONTEÚDO]

Vi que é exatamente a situação que você mencionou. O que achou?

E sobre {{MEU_PRODUTO}}, ficou com alguma dúvida? 💡',

'Olá, {{NOME_LEAD}}! Espero que esteja bem.

Encontrei um material sobre [TEMA RELACIONADO] que acredito ser muito pertinente para sua situação:

[LINK OU CONTEÚDO]

Relaciona-se diretamente ao que conversamos. Qual sua avaliação?

Adicionalmente, caso tenha surgido alguma dúvida sobre {{MEU_PRODUTO}}, estou à disposição.',

'{{NOME_LEAD}}! Olha isso: [LINK OU CONTEÚDO]

Totalmente a ver com o que você me falou. Dá uma olhada.

E sobre {{MEU_PRODUTO}}: alguma dúvida? Me fala! 📲',

'Follow-up com valor: em vez de só cobrar resposta, entregue algo útil. Mostra que você se importa com o lead.',
ARRAY[]::text[],
ARRAY['follow-up', 'valor', 'conteúdo', 'nutrição', 'relacionamento'],
'starter', 2, true),

-- 30. Follow-up com urgência sutil
((SELECT id FROM script_categories WHERE slug = 'follow-up'),
'Follow-up com Urgência Sutil',
'{{NOME_LEAD}}, tudo certo? 😊

Passando rapidinho porque lembrei que aquela condição especial de {{MEU_PRODUTO}} que te mostrei tem prazo.

Não quero te pressionar de jeito nenhum, mas não queria que você perdesse por não ficar sabendo.

Se ainda tiver interesse, me fala aqui que a gente resolve! Se não fizer mais sentido, tudo bem também 🙂',

'{{NOME_LEAD}}, espero encontrá-lo(a) bem.

Estou entrando em contato para informá-lo(a) de que a condição especial que apresentamos para {{MEU_PRODUTO}} possui prazo de validade.

Não desejo pressioná-lo(a), porém considero importante que tenha esta informação para tomar sua decisão. Caso mantenha interesse, estou à disposição.',

'{{NOME_LEAD}}, a condição especial de {{MEU_PRODUTO}} tá acabando.

Quero garantir a sua antes que expire. Me confirma aqui se quer seguir. ⏳',

'Urgência sutil funciona melhor que pressão explícita. Sempre dê uma "saída" para o lead — isso aumenta a confiança.',
ARRAY[]::text[],
ARRAY['follow-up', 'urgência', 'prazo', 'condição especial'],
'starter', 3, true),

-- 31. Follow-up com pergunta aberta
((SELECT id FROM script_categories WHERE slug = 'follow-up'),
'Follow-up com Pergunta Aberta',
'{{NOME_LEAD}}, sei que você tá avaliando e respeito seu tempo! 😊

Só queria entender melhor: o que falta pra você tomar uma decisão sobre {{MEU_PRODUTO}}?

Se tiver alguma dúvida, preocupação ou se simplesmente não é o momento, me fala sem receio. Prefiro ouvir um "não" honesto do que ficar no escuro 😄

Me ajuda a te ajudar! 💬',

'{{NOME_LEAD}}, compreendo que está em processo de avaliação e respeito seu tempo.

Gostaria de entender: existe alguma questão pendente que esteja impedindo sua decisão sobre {{MEU_PRODUTO}}?

Caso haja dúvidas ou preocupações, terei prazer em esclarecê-las. E se este não for o momento adequado, compreendo perfeitamente.',

'{{NOME_LEAD}}, direto: o que falta pra você decidir sobre {{MEU_PRODUTO}}?

Me fala a real. Se é preço, timing, dúvida — a gente resolve. Se não faz sentido, beleza também. 🤝',

'Perguntas abertas descobrem objeções ocultas. O lead geralmente revela o real motivo da hesitação.',
ARRAY[]::text[],
ARRAY['follow-up', 'pergunta aberta', 'objeção oculta', 'decisão'],
'starter', 4, true),

-- 32. Follow-up último contato
((SELECT id FROM script_categories WHERE slug = 'follow-up'),
'Follow-up de Último Contato',
'{{NOME_LEAD}}, esse é meu último follow-up sobre {{MEU_PRODUTO}} 🙂

Não quero ser inconveniente, mas também não queria deixar de te ajudar se fizer sentido.

Se tiver interesse, me manda um "sim" aqui que eu retomo a conversa.

Se não for o momento, tudo bem! Fica meu contato salvo pra quando precisar. Sucesso pra você! 💛',

'{{NOME_LEAD}}, este será meu último contato a respeito de {{MEU_PRODUTO}}.

Respeito enormemente seu tempo e não desejo ser insistente. Contudo, gostaria de manter a porta aberta caso venha a ser relevante no futuro.

Se desejar retomar a conversa, basta responder esta mensagem. Desejo-lhe muito sucesso!',

'{{NOME_LEAD}}, última mensagem sobre {{MEU_PRODUTO}}.

Quer continuar? Me manda "sim".
Não quer? Sem problema. Boa sorte! 🤝',

'O "último follow-up" geralmente gera mais respostas que todos os anteriores. Funciona pelo medo de perder a oportunidade (FOMO) e pela transparência.',
ARRAY[]::text[],
ARRAY['follow-up', 'último contato', 'break-up', 'FOMO'],
'starter', 5, true),

-- 33. Follow-up pós proposta enviada
((SELECT id FROM script_categories WHERE slug = 'follow-up'),
'Follow-up Pós Proposta Enviada',
'{{NOME_LEAD}}, tudo bem? 😊

Enviei a proposta de {{MEU_PRODUTO}} [ontem/há X dias] e queria saber: o que achou?

Se quiser, posso te passar tudo em detalhes por [ÁUDIO / CHAMADA / VÍDEO]. Às vezes fica mais fácil do que ler, né? 😄

Tô aqui pra tirar qualquer dúvida!',

'{{NOME_LEAD}}, espero que esteja bem.

Gostaria de saber se teve oportunidade de analisar a proposta referente a {{MEU_PRODUTO}} que enviei anteriormente.

Caso prefira, posso apresentar os detalhes em uma breve reunião ou chamada. Fico à disposição para esclarecer qualquer ponto.',

'{{NOME_LEAD}}, viu a proposta de {{MEU_PRODUTO}}?

Me fala o que achou. Se precisar explicar algo, posso te ligar em 5 min. 📞',

'Sempre faça follow-up após enviar proposta. Muitos leads leem mas não respondem — o follow-up reativa a conversa.',
ARRAY[]::text[],
ARRAY['follow-up', 'proposta', 'retorno', 'fechamento'],
'starter', 6, true),

-- 34. Follow-up de reengajamento com novidade
((SELECT id FROM script_categories WHERE slug = 'follow-up'),
'Follow-up com Atualização / Novidade',
'Oi, {{NOME_LEAD}}! Tudo bem? 😊

Sei que a gente conversou faz um tempo, mas tenho uma novidade que pode mudar o jogo pra você:

📢 [DESCREVER NOVIDADE RELEVANTE]

Lembrei de você na hora porque encaixa perfeitamente com o que você me contou sobre [SITUAÇÃO DO LEAD].

Quer que eu te explique como isso te beneficia? 🚀',

'Olá, {{NOME_LEAD}}. Reconheço que conversamos há algum tempo, porém surgiu uma novidade que acredito ser muito relevante para você:

[DESCREVER NOVIDADE RELEVANTE]

Esta atualização relaciona-se diretamente com a situação que mencionou sobre [SITUAÇÃO DO LEAD]. Posso detalhar os benefícios para seu caso específico?',

'{{NOME_LEAD}}! Novidade: [DESCREVER NOVIDADE].

Encaixa certinho com o que você precisa. Quer saber mais? Me responde. 📢',

'Novidades reais justificam o retorno do contato mesmo após semanas sem resposta. Sempre conecte a novidade com a situação do lead.',
ARRAY[]::text[],
ARRAY['follow-up', 'novidade', 'atualização', 'reengajamento'],
'starter', 7, true),


-- ------------------------------------------------
-- CONTORNO DE OBJEÇÃO (8 scripts)
-- ------------------------------------------------

-- 35. Objeção: "Está caro"
((SELECT id FROM script_categories WHERE slug = 'contorno-objecao'),
'Contorno: "Está caro"',
'Entendo sua preocupação com o investimento, {{NOME_LEAD}}! É normal avaliar com cuidado 😊

Mas me deixa te fazer uma pergunta: quanto tá custando pra você NÃO resolver [PROBLEMA] por mês?

Se a gente colocar na ponta do lápis, você provavelmente tá perdendo [VALOR/RESULTADO] todo mês. Em [PERÍODO], isso dá [VALOR ACUMULADO].

{{MEU_PRODUTO}} por {{MEU_PRECO}} se paga em [TEMPO] e depois é só lucro. Faz sentido quando a gente vê assim, né? 😉

Quer que eu te mostre as opções de pagamento?',

'Compreendo perfeitamente sua consideração sobre o investimento, {{NOME_LEAD}}.

Permita-me propor uma reflexão: qual é o custo mensal de não solucionar [PROBLEMA]? Considerando [VALOR/RESULTADO] mensais, ao longo de [PERÍODO] isso representa [VALOR ACUMULADO].

{{MEU_PRODUTO}}, ao investimento de {{MEU_PRECO}}, oferece retorno estimado em [TEMPO]. Analisando sob esta perspectiva, trata-se de uma decisão financeiramente inteligente.

Posso apresentar as condições de pagamento disponíveis?',

'{{NOME_LEAD}}, entendo. Mas pensa comigo:

Não resolver [PROBLEMA] te custa [VALOR] por mês. Em [PERÍODO] = [VALOR ACUMULADO].

{{MEU_PRODUTO}} = {{MEU_PRECO}}. Se paga em [TEMPO].

Caro é continuar perdendo dinheiro. Quer ver as formas de pagamento? 💰',

'A objeção de preço geralmente esconde falta de valor percebido. Reposicione mostrando o custo de não agir.',
ARRAY['caro', 'preço', 'investimento', 'dinheiro', 'não tenho', 'valor alto', 'puxado', 'pesado'],
ARRAY['objeção', 'preço', 'caro', 'valor', 'ROI'],
'starter', 1, true),

-- 36. Objeção: "Vou pensar"
((SELECT id FROM script_categories WHERE slug = 'contorno-objecao'),
'Contorno: "Vou pensar"',
'Claro, {{NOME_LEAD}}! Pensar bem antes de decidir é muito inteligente 👏

Mas me fala uma coisa: quando você diz "vou pensar", é sobre o quê exatamente? É sobre:

A) O investimento?
B) Se vai funcionar pra você?
C) Precisa falar com alguém?
D) Outro motivo?

Pergunto porque dependendo do que for, talvez eu consiga te ajudar a ter mais clareza agora mesmo! 💡',

'Naturalmente, {{NOME_LEAD}}. É uma decisão importante e merece consideração.

Para que eu possa auxiliá-lo(a) nessa reflexão, poderia me dizer qual aspecto específico está ponderando?

A) O investimento financeiro
B) A adequação da solução ao seu caso
C) Necessidade de consultar outros decisores
D) Outra questão

Talvez eu possa fornecer informações adicionais que facilitem sua análise.',

'{{NOME_LEAD}}, respeito. Mas me ajuda: pensar sobre o quê?

A) Preço B) Se funciona C) Precisa consultar alguém D) Outro

Me fala que eu resolvo agora. 🎯',

'"Vou pensar" quase sempre esconde uma objeção real. Use opções A/B/C/D para descobrir o verdadeiro motivo.',
ARRAY['pensar', 'vou pensar', 'pensando', 'avaliar', 'analisar', 'refletir', 'ver com calma'],
ARRAY['objeção', 'vou pensar', 'indecisão', 'diagnóstico'],
'starter', 2, true),

-- 37. Objeção: "Não tenho tempo"
((SELECT id FROM script_categories WHERE slug = 'contorno-objecao'),
'Contorno: "Não tenho tempo"',
'Olha, {{NOME_LEAD}}, justamente por você não ter tempo que {{MEU_PRODUTO}} faz tanto sentido! 😄

Nossos clientes mais ocupados são os que mais se beneficiam, porque:

⏱️ Leva só [TEMPO DE IMPLEMENTAÇÃO] pra começar
📱 Funciona em [TEMPO DIÁRIO] por dia
🤖 [AUTOMAÇÃO/FACILIDADE PRINCIPAL]

Na real, {{MEU_PRODUTO}} te ECONOMIZA tempo. O(a) [NOME DO CLIENTE] falou que recuperou [HORAS] horas por semana.

Posso te mostrar como funciona na prática? É rápido, prometo! 😉',

'Compreendo que seu tempo é valioso, {{NOME_LEAD}}. E é exatamente por isso que {{MEU_PRODUTO}} foi desenvolvido.

Nossos clientes mais ocupados relatam os maiores benefícios:
• Implementação em [TEMPO DE IMPLEMENTAÇÃO]
• Dedicação de apenas [TEMPO DIÁRIO] diários
• [AUTOMAÇÃO/FACILIDADE PRINCIPAL]

Na prática, {{MEU_PRODUTO}} gera economia de tempo. Posso demonstrar o funcionamento em uma apresentação breve?',

'{{NOME_LEAD}}, tempo é exatamente o problema que a gente resolve.

[TEMPO DE IMPLEMENTAÇÃO] pra começar. [TEMPO DIÁRIO] por dia. [AUTOMAÇÃO].

Resultado: [HORAS] horas a mais por semana. Quer ver? ⏱️',

'Transforme a objeção de tempo em argumento de venda. Mostre que seu produto RESOLVE o problema de falta de tempo.',
ARRAY['tempo', 'não tenho tempo', 'ocupado', 'corrido', 'sem tempo', 'agenda cheia', 'depois'],
ARRAY['objeção', 'tempo', 'produtividade', 'praticidade'],
'starter', 3, true),

-- 38. Objeção: "Preciso falar com meu sócio/esposa"
((SELECT id FROM script_categories WHERE slug = 'contorno-objecao'),
'Contorno: "Preciso consultar alguém"',
'Faz super sentido, {{NOME_LEAD}}! Decisões importantes devem ser tomadas em conjunto mesmo 🤝

Que tal a gente fazer assim: eu preparo um resumo bem completo com tudo que conversamos pra você mostrar pro(a) [PESSOA]. Assim fica mais fácil de explicar!

Ou, se preferir, posso participar de uma conversa rápida com vocês dois. Muitos dos nossos clientes fizeram assim e funcionou super bem.

O que acha melhor? 📋',

'Compreendo perfeitamente, {{NOME_LEAD}}. É prudente envolver as pessoas relevantes na decisão.

Para facilitar essa conversa, posso preparar um material resumido com os principais pontos da nossa discussão.

Alternativamente, posso participar de uma breve reunião conjunta para esclarecer eventuais dúvidas. Qual opção seria mais conveniente?',

'{{NOME_LEAD}}, entendido. Duas opções:

1. Te mando um resumo completo pra mostrar pro(a) [PESSOA]
2. Faço uma call rápida com vocês dois

Qual prefere? 📋',

'Nunca desvalorize a necessidade de consultar outras pessoas. Facilite o processo oferecendo material ou reunião conjunta.',
ARRAY['sócio', 'esposa', 'marido', 'parceiro', 'consultar', 'falar com', 'não decido sozinho', 'família'],
ARRAY['objeção', 'decisor', 'sócio', 'cônjuge', 'consulta'],
'starter', 4, true),

-- 39. Objeção: "Já tentei e não funcionou"
((SELECT id FROM script_categories WHERE slug = 'contorno-objecao'),
'Contorno: "Já tentei algo parecido"',
'Entendo totalmente, {{NOME_LEAD}}! E é normal ficar com o pé atrás depois de uma experiência ruim 😔

Me conta: o que exatamente você tentou e o que deu errado?

Pergunto porque provavelmente o que você usou antes não tinha:
❌ [DIFERENCIAL 1 DO SEU PRODUTO]
❌ [DIFERENCIAL 2 DO SEU PRODUTO]
❌ [DIFERENCIAL 3 DO SEU PRODUTO]

Essas são exatamente as coisas que fazem {{MEU_PRODUTO}} ter [TAXA DE SUCESSO]% de satisfação.

Quer que eu te mostre a diferença na prática? 🔍',

'Compreendo sua cautela, {{NOME_LEAD}}. Uma experiência anterior negativa gera natural desconfiança.

Poderia compartilhar o que utilizou anteriormente e quais foram os pontos de insatisfação?

{{MEU_PRODUTO}} se diferencia por:
• [DIFERENCIAL 1]
• [DIFERENCIAL 2]
• [DIFERENCIAL 3]

Esses diferenciais são responsáveis por nossa taxa de [TAXA DE SUCESSO]% de satisfação. Posso demonstrar?',

'{{NOME_LEAD}}, o que deu errado antes?

{{MEU_PRODUTO}} é diferente: [DIFERENCIAL 1], [DIFERENCIAL 2], [DIFERENCIAL 3].

[TAXA DE SUCESSO]% dos clientes aprovam. Quer ver a diferença? 🔍',

'Valide a frustração do lead antes de argumentar. Depois mostre como seu produto é fundamentalmente diferente.',
ARRAY['tentei', 'já tentei', 'não funcionou', 'experiência ruim', 'não deu certo', 'perdi dinheiro', 'decepção', 'parecido'],
ARRAY['objeção', 'experiência anterior', 'concorrência', 'diferencial'],
'starter', 5, true),

-- 40. Objeção: "Não confio em comprar online"
((SELECT id FROM script_categories WHERE slug = 'contorno-objecao'),
'Contorno: "Não confio / É golpe?"',
'Entendo total, {{NOME_LEAD}}! Hoje em dia tem que desconfiar mesmo 😅

Olha, pra você ficar tranquilo(a):

✅ {{MINHA_EMPRESA}} tem [TEMPO] no mercado
✅ Mais de [NÚMERO] clientes atendidos
✅ Nota [NOTA] no [RECLAME AQUI / GOOGLE / TRUSTPILOT]
✅ CNPJ: [NÚMERO DO CNPJ]
✅ Garantia de [PRAZO] dias — se não gostar, devolvemos tudo

Posso te mandar depoimentos reais de clientes? E se quiser, a gente pode fazer uma videochamada pra você conhecer quem está por trás! 📹',

'Sua cautela é muito prudente, {{NOME_LEAD}}, e a respeito por completo.

Para sua segurança, apresento nossas credenciais:
• [TEMPO] de atuação no mercado
• Mais de [NÚMERO] clientes atendidos
• Avaliação [NOTA] em [PLATAFORMA]
• CNPJ: [NÚMERO DO CNPJ]
• Garantia incondicional de [PRAZO] dias

Posso enviar depoimentos de clientes e, se preferir, agendar uma videoconferência para apresentá-lo(a) à nossa equipe.',

'{{NOME_LEAD}}, justo! Mas olha os fatos:

[TEMPO] no mercado. [NÚMERO] clientes. Nota [NOTA]. CNPJ: [NÚMERO]. Garantia de [PRAZO] dias.

Quer ver depoimentos reais? Te mando agora. ✅',

'Desconfiança online é legítima. Apresente todas as provas de credibilidade possíveis: CNPJ, avaliações, tempo de mercado, garantia.',
ARRAY['confio', 'golpe', 'confiança', 'verdade', 'real', 'seguro', 'medo', 'desconfiado', 'fraude', 'piramide'],
ARRAY['objeção', 'confiança', 'credibilidade', 'prova', 'segurança'],
'starter', 6, true),

-- 41. Objeção: "Vou ver com a concorrência"
((SELECT id FROM script_categories WHERE slug = 'contorno-objecao'),
'Contorno: "Vou pesquisar outras opções"',
'Faz super sentido pesquisar, {{NOME_LEAD}}! Eu faria o mesmo 😊

Inclusive, pra te ajudar nessa comparação, olha o que nossos clientes que vieram da concorrência mais destacam:

🏆 [DIFERENCIAL 1] — ninguém mais oferece isso
🏆 [DIFERENCIAL 2] — exclusivo nosso
🏆 [DIFERENCIAL 3] — só aqui

E não sou eu quem diz — são [NÚMERO] clientes que já compararam e escolheram a gente.

Quer que eu te mande um comparativo? Assim fica mais fácil decidir! 📊',

'É uma atitude inteligente pesquisar o mercado, {{NOME_LEAD}}.

Para contribuir com sua análise, destaco os diferenciais que nossos clientes, muitos vindos de concorrentes, mais valorizam:
• [DIFERENCIAL 1]
• [DIFERENCIAL 2]
• [DIFERENCIAL 3]

Posso preparar um material comparativo que facilite sua avaliação?',

'{{NOME_LEAD}}, pesquisa sim! Mas compara direito:

[DIFERENCIAL 1] — só a gente tem
[DIFERENCIAL 2] — exclusivo
[DIFERENCIAL 3] — ninguém faz igual

[NÚMERO] clientes compararam e nos escolheram. Quer um comparativo? 📊',

'Não combata a concorrência — posicione seus diferenciais. Oferecer um comparativo mostra confiança no próprio produto.',
ARRAY['concorrência', 'pesquisar', 'comparar', 'outro', 'opções', 'alternativa', 'mercado', 'cotação'],
ARRAY['objeção', 'concorrência', 'diferencial', 'comparação'],
'starter', 7, true),

-- 42. Objeção: "Agora não é o momento"
((SELECT id FROM script_categories WHERE slug = 'contorno-objecao'),
'Contorno: "Não é o momento"',
'Entendo, {{NOME_LEAD}}! Timing é tudo mesmo 🕐

Posso te perguntar: o que precisa acontecer pra ser o momento certo? É questão de:

A) 💰 Dinheiro/fluxo de caixa?
B) 📅 Outra prioridade no momento?
C) ⏰ Período do ano (vai começar depois)?
D) 🤔 Ainda não tem certeza se precisa?

Pergunto porque muitos clientes nossos achavam que "não era o momento" e quando começaram perceberam que já tinham perdido [RESULTADO] esperando.

Me conta sua situação que a gente vê juntos! 😉',

'Compreendo, {{NOME_LEAD}}. O timing adequado é fundamental.

Para que eu possa melhor auxiliá-lo(a), poderia especificar o que determinaria o momento ideal?

A) Questão financeira
B) Outras prioridades em andamento
C) Planejamento para período futuro
D) Necessidade de mais informações

Esta compreensão me permite oferecer a melhor orientação. Muitos de nossos clientes reportaram que o adiamento resultou em perda de [RESULTADO].',

'{{NOME_LEAD}}, ok. Mas me fala: o que precisa mudar pra ser o momento?

A) Grana B) Outra prioridade C) Vai começar depois D) Não tem certeza

Muita gente esperou e perdeu [RESULTADO]. Me conta o que rola. 🕐',

'Descubra o motivo real por trás de "não é o momento". Geralmente é preço, medo ou outra objeção disfarçada.',
ARRAY['momento', 'agora não', 'depois', 'não é hora', 'mês que vem', 'próximo mês', 'ano que vem', 'mais pra frente'],
ARRAY['objeção', 'timing', 'momento', 'adiamento', 'procrastinação'],
'starter', 8, true),


-- ------------------------------------------------
-- FECHAMENTO (5 scripts)
-- ------------------------------------------------

-- 43. Fechamento por alternativas
((SELECT id FROM script_categories WHERE slug = 'fechamento'),
'Fechamento por Alternativas',
'{{NOME_LEAD}}, com base em tudo que conversamos, eu tenho duas opções perfeitas pra você:

📦 Opção 1 — [PLANO/PRODUTO A]:
• [BENEFÍCIO 1A]
• [BENEFÍCIO 2A]
• Investimento: [PREÇO A]

📦 Opção 2 — [PLANO/PRODUTO B]:
• [BENEFÍCIO 1B]
• [BENEFÍCIO 2B]
• [BENEFÍCIO EXTRA B]
• Investimento: [PREÇO B]

A maioria dos nossos clientes na sua situação vai de Opção 2, mas as duas são excelentes.

Qual faz mais sentido pra você? 😊',

'{{NOME_LEAD}}, com base em nossa conversa, selecionei duas opções que considero mais adequadas ao seu perfil:

Opção 1 — [PLANO/PRODUTO A]:
• [BENEFÍCIO 1A]
• [BENEFÍCIO 2A]
• Investimento: [PREÇO A]

Opção 2 — [PLANO/PRODUTO B]:
• [BENEFÍCIO 1B]
• [BENEFÍCIO 2B]
• [BENEFÍCIO EXTRA B]
• Investimento: [PREÇO B]

A maioria dos clientes em situação semelhante opta pela Opção 2. Qual lhe parece mais adequada?',

'{{NOME_LEAD}}, duas opções pra você:

Opção 1: [PLANO A] → [PREÇO A]
Opção 2: [PLANO B] → [PREÇO B] (mais popular)

Qual vai ser? 🎯',

'O fechamento por alternativas pressupõe que o lead vai comprar — a questão é qual opção. Sempre destaque a opção preferida.',
ARRAY[]::text[],
ARRAY['fechamento', 'alternativas', 'opções', 'decisão', 'escolha'],
'starter', 1, true),

-- 44. Fechamento direto
((SELECT id FROM script_categories WHERE slug = 'fechamento'),
'Fechamento Direto / Pedido de Ação',
'{{NOME_LEAD}}, resumindo tudo que conversamos:

✅ Você precisa de [NECESSIDADE]
✅ {{MEU_PRODUTO}} resolve isso com [DIFERENCIAL]
✅ O investimento é {{MEU_PRECO}}
✅ Você tem garantia de [PRAZO] dias

Eu sinceramente acredito que faz total sentido pra você. 💯

Vamos fechar? Posso te enviar o link de pagamento agora e você começa [HOJE/AMANHÃ MESMO]! 🚀',

'{{NOME_LEAD}}, permita-me resumir nossa conversa:

• Sua necessidade: [NECESSIDADE]
• Nossa solução: {{MEU_PRODUTO}} com [DIFERENCIAL]
• Investimento: {{MEU_PRECO}}
• Garantia: [PRAZO] dias

Acredito genuinamente que esta é a decisão certa para você. Posso prosseguir com a formalização?',

'{{NOME_LEAD}}, vamos direto:

Você precisa de [NECESSIDADE]. {{MEU_PRODUTO}} resolve. {{MEU_PRECO}} com garantia.

Te mando o link agora? 🚀',

'Fechamento direto funciona quando o lead já demonstrou interesse claro. Resuma os pontos e peça a ação.',
ARRAY[]::text[],
ARRAY['fechamento', 'direto', 'link', 'pagamento', 'ação'],
'starter', 2, true),

-- 45. Fechamento com bônus exclusivo
((SELECT id FROM script_categories WHERE slug = 'fechamento'),
'Fechamento com Bônus Surpresa',
'{{NOME_LEAD}}, antes de você decidir, tenho uma surpresa 🎁

Se você fechar {{MEU_PRODUTO}} hoje, além de tudo que te mostrei, vou incluir:

🎁 Bônus 1: [BÔNUS 1] (vale [VALOR 1])
🎁 Bônus 2: [BÔNUS 2] (vale [VALOR 2])
🎁 Bônus 3: [BÔNUS 3] (vale [VALOR 3])

Ou seja: você leva [VALOR TOTAL DOS BÔNUS] em bônus de graça!

Mas atenção: essa condição é só pra quem fechar até [DATA/HORA]. Vamos? 🚀',

'{{NOME_LEAD}}, tenho uma proposta adicional que acredito ser muito atrativa.

Ao confirmar {{MEU_PRODUTO}} hoje, incluiremos gratuitamente:
• [BÔNUS 1] (valor de [VALOR 1])
• [BÔNUS 2] (valor de [VALOR 2])
• [BÔNUS 3] (valor de [VALOR 3])

São [VALOR TOTAL DOS BÔNUS] em benefícios adicionais. Esta condição é válida até [DATA/HORA]. Gostaria de prosseguir?',

'{{NOME_LEAD}}, fecha hoje e ganha:

🎁 [BÔNUS 1] ([VALOR 1])
🎁 [BÔNUS 2] ([VALOR 2])
🎁 [BÔNUS 3] ([VALOR 3])

[VALOR TOTAL] em bônus. Grátis. Só até [DATA].

Bora? 🔥',

'Bônus no fechamento aumentam o valor percebido e criam urgência. Use bônus reais com valor específico.',
ARRAY[]::text[],
ARRAY['fechamento', 'bônus', 'surpresa', 'urgência', 'exclusivo'],
'starter', 3, true),

-- 46. Fechamento com facilitação de pagamento
((SELECT id FROM script_categories WHERE slug = 'fechamento'),
'Fechamento com Facilitação de Pagamento',
'{{NOME_LEAD}}, quero facilitar ao máximo pra você! 💳

Olha as opções:

💰 À vista: {{MEU_PRECO}} com [DESCONTO]% de desconto = [PREÇO COM DESCONTO]
💳 Parcelado: [NÚMERO]x de [VALOR DA PARCELA] sem juros
📱 PIX: [PREÇO PIX] (desconto especial)

Pra começar, é super simples: eu te mando o link, você escolhe a forma de pagamento e já pode começar a usar [HOJE/IMEDIATAMENTE].

Qual forma de pagamento prefere? 😊',

'{{NOME_LEAD}}, apresento as condições de pagamento para {{MEU_PRODUTO}}:

• À vista: {{MEU_PRECO}} com [DESCONTO]% de desconto, totalizando [PREÇO COM DESCONTO]
• Parcelado: [NÚMERO] parcelas de [VALOR DA PARCELA] sem acréscimo
• PIX: [PREÇO PIX] com desconto especial

Qual modalidade seria mais conveniente? Prossigo com o envio do link de pagamento.',

'{{NOME_LEAD}}, escolhe:

À vista: [PREÇO COM DESCONTO] ([DESCONTO]% off)
Parcelado: [NÚMERO]x [VALOR PARCELA]
PIX: [PREÇO PIX]

Qual vai ser? Te mando o link agora. 💳',

'Facilitação de pagamento remove a barreira financeira. Sempre ofereça múltiplas opções — PIX geralmente tem mais desconto.',
ARRAY[]::text[],
ARRAY['fechamento', 'pagamento', 'parcelamento', 'PIX', 'desconto'],
'starter', 4, true),

-- 47. Fechamento com compromisso menor
((SELECT id FROM script_categories WHERE slug = 'fechamento'),
'Fechamento com Compromisso Menor',
'{{NOME_LEAD}}, entendo que você quer ter certeza antes de se comprometer. Que tal começar pequeno? 😊

A gente tem o [PLANO MENOR/STARTER] por apenas [PREÇO MENOR]:
✅ [BENEFÍCIO 1]
✅ [BENEFÍCIO 2]
✅ [BENEFÍCIO 3]

Assim você testa, vê resultado, e depois decide se quer fazer upgrade.

Zero risco. Se não curtir, cancela quando quiser.

Topa começar por aí? 🚀',

'{{NOME_LEAD}}, compreendo a importância de uma decisão segura.

Sugerimos iniciar com nosso [PLANO MENOR/STARTER] por [PREÇO MENOR], que inclui:
• [BENEFÍCIO 1]
• [BENEFÍCIO 2]
• [BENEFÍCIO 3]

Desta forma, pode avaliar os resultados antes de considerar um upgrade. Cancelamento disponível a qualquer momento.

Gostaria de iniciar por esta opção?',

'{{NOME_LEAD}}, começa com o básico:

[PLANO MENOR] por [PREÇO MENOR]. Testa, vê resultado, e decide depois.

Sem contrato. Cancela quando quiser. Topa? 🚀',

'Para leads indecisos, reduza o compromisso. Um "sim pequeno" é melhor que um "vou pensar" e pode virar upgrade depois.',
ARRAY[]::text[],
ARRAY['fechamento', 'compromisso menor', 'starter', 'teste', 'upgrade'],
'starter', 5, true),


-- ------------------------------------------------
-- PÓS-VENDA (3 scripts)
-- ------------------------------------------------

-- 48. Onboarding / Boas-vindas
((SELECT id FROM script_categories WHERE slug = 'pos-venda'),
'Boas-vindas / Onboarding',
'{{NOME_LEAD}}, seja MUITO bem-vindo(a) à {{MINHA_EMPRESA}}! 🎉🎉🎉

Parabéns pela decisão — você vai amar {{MEU_PRODUTO}}!

Seus próximos passos:
1️⃣ [PASSO 1 - ex: Acessar a plataforma em [LINK]]
2️⃣ [PASSO 2 - ex: Completar seu perfil]
3️⃣ [PASSO 3 - ex: Assistir a aula de boas-vindas]

Qualquer dúvida, pode me chamar aqui MESMO. Eu sou seu contato direto e vou te acompanhar nessa jornada.

Bora começar? 💪',

'{{NOME_LEAD}}, é com grande satisfação que lhe damos as boas-vindas à {{MINHA_EMPRESA}}!

Parabéns por sua decisão. Para iniciar sua experiência com {{MEU_PRODUTO}}, seguem os próximos passos:

1. [PASSO 1]
2. [PASSO 2]
3. [PASSO 3]

Estou à disposição para auxiliá-lo(a) em cada etapa. Não hesite em entrar em contato a qualquer momento.',

'{{NOME_LEAD}}, bem-vindo(a)! 🎉

Faz isso agora:
1. [PASSO 1]
2. [PASSO 2]
3. [PASSO 3]

Qualquer coisa, me chama. Bora! 💪',

'O onboarding é o momento mais crítico. Um bom acolhimento reduz cancelamentos em até 60%. Responda rápido!',
ARRAY[]::text[],
ARRAY['pós-venda', 'onboarding', 'boas-vindas', 'ativação', 'primeiro acesso'],
'starter', 1, true),

-- 49. Pedido de indicação
((SELECT id FROM script_categories WHERE slug = 'pos-venda'),
'Pedido de Indicação',
'Oi, {{NOME_LEAD}}! Tudo bem? 😊

Fiquei muito feliz em saber que você está tendo resultado com {{MEU_PRODUTO}}! [MENCIONAR RESULTADO ESPECÍFICO SE POSSÍVEL]

Olha, vou ser direto: você conhece alguém que também poderia se beneficiar disso?

Se me indicar 3 pessoas, eu te dou [BENEFÍCIO DA INDICAÇÃO] como agradecimento! 🎁

É simples: me manda o nome e WhatsApp, e eu entro em contato mencionando que veio de você.

Quem vem à mente? 🤔',

'{{NOME_LEAD}}, é gratificante saber dos resultados que está obtendo com {{MEU_PRODUTO}}.

Gostaria de fazer uma solicitação: conhece profissionais que poderiam se beneficiar da mesma forma?

Como forma de agradecimento, para cada indicação efetivada, oferecemos [BENEFÍCIO DA INDICAÇÃO].

Basta compartilhar o nome e contato que faremos a abordagem mencionando sua indicação.',

'{{NOME_LEAD}}, tá tendo resultado com {{MEU_PRODUTO}}, certo?

Me indica 3 pessoas que precisam disso e ganha [BENEFÍCIO]. Manda nome e WhatsApp aqui. 🎁',

'O melhor momento para pedir indicação é quando o cliente está tendo resultado. Ofereça um benefício claro em troca.',
ARRAY[]::text[],
ARRAY['pós-venda', 'indicação', 'referência', 'boca a boca', 'recompensa'],
'starter', 2, true),

-- 50. Pesquisa de satisfação + upsell
((SELECT id FROM script_categories WHERE slug = 'pos-venda'),
'Pesquisa de Satisfação + Upsell',
'Oi, {{NOME_LEAD}}! Aqui é o(a) {{MEU_NOME}} 😊

Faz [TEMPO] que você tá com a gente e eu queria saber: de 0 a 10, o quanto você recomendaria {{MEU_PRODUTO}} pra um amigo?

E uma pergunta bônus: se pudesse melhorar UMA coisa, o que seria?

Ah, e por falar em melhorar... sabia que temos o [PRODUTO/PLANO SUPERIOR] que inclui [BENEFÍCIO EXTRA 1] e [BENEFÍCIO EXTRA 2]? Pode ser exatamente o próximo passo pra você! 😉

Me conta o que acha!',

'{{NOME_LEAD}}, espero que esteja bem.

Como parte do nosso compromisso com a excelência, gostaria de sua avaliação:

Em uma escala de 0 a 10, qual a probabilidade de recomendar {{MEU_PRODUTO}} a um colega?

Adicionalmente, há algum aspecto que considere passível de melhoria?

Aproveito para informar que dispomos do [PRODUTO/PLANO SUPERIOR] com [BENEFÍCIO EXTRA 1] e [BENEFÍCIO EXTRA 2], que pode complementar perfeitamente sua experiência atual.',

'{{NOME_LEAD}}! De 0 a 10, o quanto recomenda {{MEU_PRODUTO}}?

E já que tá mandando bem, conhece nosso [PLANO SUPERIOR]? Tem [BENEFÍCIO 1] + [BENEFÍCIO 2].

Me fala! 📊',

'A pesquisa NPS (0-10) revela promotores e detratores. Combine com upsell natural para aumentar o ticket médio.',
ARRAY[]::text[],
ARRAY['pós-venda', 'NPS', 'satisfação', 'upsell', 'upgrade', 'feedback'],
'starter', 3, true);


-- ============================================
-- 3. MICROLEARNING TIPS (30 dicas)
-- ============================================
INSERT INTO microlearning_tips (content, category, is_active) VALUES

-- Timing e Horários
('Mensagens enviadas entre 9h-11h têm 23% mais taxa de resposta. Planeje suas abordagens para esse horário!',
'timing', true),

('Terça e quarta-feira são os dias com maior taxa de resposta no WhatsApp comercial. Evite segundas e sextas.',
'timing', true),

('Responder um lead inbound em até 5 minutos aumenta em 21x a chance de qualificá-lo. Velocidade vende!',
'timing', true),

('Evite enviar mensagens comerciais após as 20h. Além de menos efetivo, pode ser percebido como invasivo.',
'timing', true),

-- Personalização
('Use o nome do lead nos primeiros 7 segundos da mensagem. Personalização aumenta a taxa de resposta em 26%.',
'personalização', true),

('Mensagens que mencionam um detalhe específico do lead (empresa, cargo, interesse) têm 3x mais engajamento.',
'personalização', true),

('Antes de abordar, pesquise o perfil do lead nas redes sociais por 2 minutos. Esse investimento aumenta sua taxa de conversão em até 30%.',
'personalização', true),

-- Formato de Mensagem
('Áudios de até 40 segundos têm taxa de escuta 3x maior que áudios longos. Seja breve e objetivo!',
'formato', true),

('Mensagens com no máximo 3 parágrafos curtos têm 40% mais taxa de resposta do que textos longos.',
'formato', true),

('Emojis estratégicos (1-3 por mensagem) aumentam engajamento em 25%. Mas cuidado: excesso reduz credibilidade.',
'formato', true),

('Termine sempre com uma pergunta. Mensagens que terminam com pergunta têm 2x mais chance de receber resposta.',
'formato', true),

('Quebre o texto em parágrafos curtos. Blocos de texto no WhatsApp parecem intimidadores e reduzem leitura em 60%.',
'formato', true),

-- Psicologia de Vendas
('O efeito "porta na cara": comece mostrando a opção mais cara, depois apresente a que você realmente quer vender. Ela parecerá uma barganha.',
'psicologia', true),

('Pessoas decidem em 7 segundos se vão continuar lendo sua mensagem. Capriche na primeira linha!',
'psicologia', true),

('O princípio da reciprocidade: ofereça algo de valor gratuitamente antes de pedir a venda. Leads que recebem valor primeiro convertem 47% mais.',
'psicologia', true),

('Use números ímpares em seus argumentos. "3 motivos" ou "5 benefícios" parecem mais autênticos e memoráveis que números pares.',
'psicologia', true),

('Escassez real funciona: ofertas com prazo definido convertem 33% mais que ofertas "sempre disponíveis". Mas nunca minta sobre escassez!',
'psicologia', true),

-- Follow-up
('80% das vendas acontecem entre o 5º e o 12º follow-up, mas 44% dos vendedores desistem após o primeiro "não".',
'follow-up', true),

('Varie o formato nos follow-ups: texto, áudio, imagem, vídeo curto. A variedade evita que suas mensagens pareçam robóticas.',
'follow-up', true),

('O melhor follow-up agrega valor. Em vez de "Viu minha mensagem?", envie um conteúdo útil relacionado à dor do lead.',
'follow-up', true),

('Espere 24-48h para o primeiro follow-up, 3-5 dias para o segundo, e 7 dias para o terceiro. Respeite o timing.',
'follow-up', true),

-- Objeções
('Quando o lead diz "tá caro", em 68% dos casos a real objeção é falta de valor percebido, não falta de dinheiro.',
'objeções', true),

('"Vou pensar" é a objeção mais comum e quase nunca significa que a pessoa vai realmente pensar. Descubra a objeção real com perguntas abertas.',
'objeções', true),

('Nunca descarte uma objeção. Valide primeiro ("entendo"), depois redirecione. Isso reduz resistência em 40%.',
'objeções', true),

-- Produtividade
('Dedique blocos de 90 minutos para prospecção sem interrupção. Vendedores que fazem isso convertem 28% mais.',
'produtividade', true),

('Tenha templates prontos mas sempre personalize pelo menos 20% da mensagem. Automatização total reduz conversão em 35%.',
'produtividade', true),

-- Fechamento
('A técnica de "assumir o fechamento" (agir como se a venda já estivesse feita) aumenta a taxa de conversão em 22%.',
'fechamento', true),

('Silêncio é poder: depois de apresentar o preço, fique em silêncio. Quem fala primeiro geralmente perde poder na negociação.',
'fechamento', true),

-- Métricas
('Vendedores de alta performance monitoram pelo menos 3 métricas: taxa de resposta, taxa de qualificação e taxa de conversão.',
'métricas', true),

('Revise seus scripts semanalmente. Os melhores vendedores atualizam suas abordagens a cada 15 dias com base em dados reais de conversão.',
'métricas', true);


-- ============================================
-- 4. AI PROMPTS (4 tipos)
-- ============================================
INSERT INTO ai_prompts (name, type, system_prompt, user_prompt_template, model, temperature, max_tokens, is_active, version) VALUES

-- 1. GENERATION - Gerar novos scripts
('Gerador de Scripts de Vendas',
'generation',
'Você é um especialista em copywriting e vendas pelo WhatsApp no mercado brasileiro. Sua função é gerar scripts de vendas altamente persuasivos, práticos e prontos para uso.

REGRAS OBRIGATÓRIAS:
1. Escreva sempre em Português do Brasil, tom conversacional e natural para WhatsApp.
2. Use as variáveis {{NOME_LEAD}}, {{MEU_NOME}}, {{MEU_PRODUTO}}, {{MEU_PRECO}}, {{MINHA_EMPRESA}} quando apropriado.
3. Gere TRÊS variações de tom: casual (padrão), formal e direto.
4. Cada script deve ter no máximo 4-5 parágrafos curtos.
5. Termine sempre com uma pergunta ou call-to-action claro.
6. Use emojis de forma estratégica (2-4 por mensagem no tom casual).
7. Inclua gatilhos mentais relevantes (escassez, prova social, reciprocidade, autoridade, etc.).
8. Nunca use linguagem agressiva, enganosa ou que prometa resultados irreais.
9. Considere o contexto do nicho do usuário para adaptar a linguagem e exemplos.
10. Gere também: título do script, descrição de contexto, tags relevantes e palavras-chave de objeção (se aplicável).

FORMATO DE SAÍDA (JSON):
{
  "title": "Título do Script",
  "content": "Script tom casual...",
  "content_formal": "Script tom formal...",
  "content_direct": "Script tom direto...",
  "context_description": "Quando usar este script...",
  "tags": ["tag1", "tag2"],
  "objection_keywords": ["palavra1", "palavra2"],
  "suggested_category": "slug-da-categoria"
}',

'Gere um script de vendas para WhatsApp com as seguintes especificações:

**Nicho/Produto:** {{nicho}}
**Tipo de script:** {{tipo}} (abordagem/qualificação/apresentação/follow-up/objeção/fechamento/pós-venda)
**Situação específica:** {{situacao}}
**Tom preferido:** {{tom}}
**Informações adicionais:** {{info_adicional}}

Gere o script completo com as 3 variações de tom.',

'claude-sonnet-4-5-20250929', 0.7, 2000, true, 1),


-- 2. CONVERSATION - Analisar conversas
('Analisador de Conversas',
'conversation',
'Você é um consultor especialista em vendas pelo WhatsApp. Sua função é analisar conversas de vendas e sugerir a próxima melhor mensagem.

REGRAS:
1. Analise o histórico da conversa fornecido e identifique:
   - Em qual etapa do funil o lead está (abordagem, qualificação, apresentação, objeção, fechamento)
   - O nível de interesse demonstrado (frio, morno, quente)
   - Objeções explícitas ou implícitas
   - Sinais de compra ou rejeição
   - Oportunidades perdidas na conversa

2. Sugira a próxima mensagem ideal com:
   - Versão casual e versão formal
   - Explicação de por que essa abordagem é a melhor
   - Gatilho mental utilizado
   - O que NÃO fazer neste momento

3. Dê uma nota de 1-10 para a probabilidade de fechamento e explique.

4. Se a conversa estiver "travada", sugira uma estratégia de reengajamento.

FORMATO DE SAÍDA (JSON):
{
  "analysis": {
    "funnel_stage": "etapa",
    "interest_level": "nível",
    "detected_objections": ["objeção1"],
    "buying_signals": ["sinal1"],
    "missed_opportunities": ["oportunidade1"]
  },
  "suggested_message": {
    "casual": "mensagem casual...",
    "formal": "mensagem formal...",
    "reasoning": "explicação...",
    "mental_trigger": "gatilho usado",
    "what_not_to_do": "evite..."
  },
  "closing_probability": 7,
  "closing_explanation": "explicação da nota..."
}',

'Analise a seguinte conversa de WhatsApp e sugira a próxima mensagem:

**Meu nicho:** {{nicho}}
**Meu produto:** {{produto}}
**Preço:** {{preco}}

**Histórico da conversa:**
{{conversa}}

**Contexto adicional:** {{contexto}}

Analise e sugira a melhor próxima mensagem.',

'claude-sonnet-4-5-20250929', 0.5, 1500, true, 1),


-- 3. ANALYSIS - Análise mensal de padrões
('Análise de Padrões e Insights',
'analysis',
'Você é um analista de dados especializado em vendas e performance comercial. Sua função é analisar métricas de uso de scripts de vendas e gerar insights acionáveis.

REGRAS:
1. Analise os dados fornecidos e identifique:
   - Scripts com melhor e pior performance
   - Padrões de horário e dia mais eficazes
   - Categorias mais e menos utilizadas
   - Tendências de melhoria ou piora ao longo do tempo
   - Correlações entre tipo de script e taxa de conversão

2. Gere recomendações práticas:
   - Top 3 ações para melhorar resultados no próximo mês
   - Scripts que devem ser mais utilizados
   - Scripts que precisam ser ajustados ou substituídos
   - Sugestões de novos tipos de scripts baseados nos gaps identificados

3. Use linguagem clara, direta e motivacional em Português do Brasil.

4. Inclua comparação com benchmarks do mercado quando relevante.

FORMATO DE SAÍDA (JSON):
{
  "summary": "Resumo executivo em 2-3 frases",
  "highlights": {
    "best_performing_scripts": [{"title": "...", "metric": "..."}],
    "worst_performing_scripts": [{"title": "...", "metric": "..."}],
    "best_times": ["horário1", "horário2"],
    "best_days": ["dia1", "dia2"]
  },
  "insights": ["insight1", "insight2", "insight3"],
  "recommendations": [
    {"action": "ação", "priority": "alta/média/baixa", "expected_impact": "impacto esperado"}
  ],
  "trends": {
    "improving": ["tendência positiva"],
    "declining": ["tendência negativa"]
  }
}',

'Analise os seguintes dados de uso de scripts e gere insights:

**Período:** {{periodo}}
**Nicho do usuário:** {{nicho}}

**Dados de uso:**
{{dados_uso}}

**Métricas de conversão:**
{{metricas_conversao}}

**Metas do usuário:** {{metas}}

Gere uma análise completa com insights e recomendações acionáveis.',

'claude-sonnet-4-5-20250929', 0.3, 2000, true, 1),


-- 4. OBJECTION - Contornar objeções específicas
('Especialista em Contorno de Objeções',
'objection',
'Você é um especialista em negociação e contorno de objeções em vendas pelo WhatsApp. Sua função é analisar uma objeção específica e gerar a melhor resposta possível.

REGRAS:
1. Identifique o tipo de objeção:
   - Preço (caro, sem dinheiro, orçamento)
   - Tempo (sem tempo, depois, agora não)
   - Confiança (não confio, é golpe, funciona mesmo?)
   - Necessidade (não preciso, não é pra mim)
   - Autoridade (preciso consultar alguém)
   - Concorrência (vou ver outras opções)
   - Procrastinação (vou pensar, deixa pra depois)

2. Para cada objeção, gere:
   - Resposta em tom casual (padrão WhatsApp)
   - Resposta em tom formal
   - Resposta em tom direto
   - Explicação da técnica utilizada
   - O que NÃO responder (erros comuns)
   - Pergunta de follow-up caso a objeção persista

3. Use técnicas comprovadas:
   - Validação + Redirecionamento
   - Espelhamento
   - Reformulação
   - Pergunta socrática
   - Prova social
   - Inversão de risco

4. Adapte a linguagem ao nicho e perfil do lead.

FORMATO DE SAÍDA (JSON):
{
  "objection_type": "tipo",
  "objection_analysis": "análise da real motivação por trás da objeção",
  "responses": {
    "casual": "resposta casual...",
    "formal": "resposta formal...",
    "direct": "resposta direta..."
  },
  "technique_used": "nome da técnica",
  "technique_explanation": "por que essa técnica funciona...",
  "common_mistakes": ["erro1", "erro2"],
  "follow_up_question": "pergunta caso a objeção persista...",
  "success_rate": "taxa estimada de sucesso da abordagem"
}',

'O lead apresentou a seguinte objeção e preciso contorná-la:

**Objeção do lead:** "{{objecao}}"
**Meu nicho:** {{nicho}}
**Meu produto:** {{produto}}
**Preço:** {{preco}}
**Contexto da conversa:** {{contexto}}
**O que já tentei:** {{tentativas_anteriores}}

Gere a melhor resposta para contornar essa objeção.',

'claude-sonnet-4-5-20250929', 0.6, 1500, true, 1);


-- ============================================
-- VERIFICATION QUERIES (optional - run to check)
-- ============================================
-- SELECT 'Categories' as entity, COUNT(*) as total FROM script_categories;
-- SELECT 'Scripts' as entity, COUNT(*) as total FROM scripts WHERE is_ai_generated = false;
-- SELECT 'Tips' as entity, COUNT(*) as total FROM microlearning_tips;
-- SELECT 'AI Prompts' as entity, COUNT(*) as total FROM ai_prompts;
-- SELECT sc.name, COUNT(s.id) as script_count
--   FROM script_categories sc
--   LEFT JOIN scripts s ON s.category_id = sc.id
--   GROUP BY sc.name, sc.display_order
--   ORDER BY sc.display_order;
