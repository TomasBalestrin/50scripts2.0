-- ============================================================
-- Migration 014: Script Expansion
-- 5 Follow-up Chain scripts (sequential day 1→3→5→7→final)
-- 4 New Pós-venda scripts (expanding from 3 to 7)
-- 5 Aquecimento de Base scripts (inside ativacao-base)
-- ============================================================

INSERT INTO scripts (
  category_id, title, content, content_formal, content_direct,
  context_description, objection_keywords, tags, min_plan, display_order, is_active
) VALUES

-- ============================================================
-- FOLLOW-UP CHAIN (5 scripts, display_order 8-12)
-- Sequential follow-up: use all 5 in order for maximum conversion
-- ============================================================

-- Chain 1: Dia 1 - Primeiro Toque
((SELECT id FROM script_categories WHERE slug = 'follow-up'),
'Cadeia: Dia 1 - Primeiro Toque',
'Oi, {{NOME_LEAD}}! Tudo bem? 😊

Aqui é o {{MEU_NOME}} da {{MINHA_EMPRESA}}. Estou passando pra ver se ficou alguma duvida sobre o que conversamos!

Sei que no dia a dia tudo e correria, ne? Mas queria ter certeza de que voce tem todas as informacoes que precisa pra tomar sua decisao. 💡

Qualquer duvida, estou por aqui!',

'Ola, {{NOME_LEAD}}! Espero que esteja bem.

Meu nome e {{MEU_NOME}}, da {{MINHA_EMPRESA}}. Gostaria de verificar se restou alguma duvida em relacao a nossa conversa anterior.

Compreendo que sua rotina e bastante atarefada, por isso estou a disposicao para esclarecer qualquer ponto que seja necessario para sua tomada de decisao.

Fico no aguardo do seu retorno.',

'{{NOME_LEAD}}, {{MEU_NOME}} da {{MINHA_EMPRESA}} aqui.

Passando rapidamente pra saber se ficou alguma duvida. Sei que voce ta analisando, e quero garantir que voce tem tudo o que precisa.

Me responde aqui rapidinho que eu te ajudo!',

'Primeiro toque do follow-up em cadeia. Envie no dia seguinte ao primeiro contato. Objetivo: mostrar interesse genuino sem pressionar. Este e o script 1 de 5 da cadeia de follow-up.',
ARRAY['sem tempo', 'vou pensar', 'depois vejo']::text[],
ARRAY['follow-up', 'cadeia', 'dia 1', 'primeiro toque', 'sequencial']::text[],
'starter', 8, true),

-- Chain 2: Dia 3 - Valor Agregado
((SELECT id FROM script_categories WHERE slug = 'follow-up'),
'Cadeia: Dia 3 - Valor Agregado',
'{{NOME_LEAD}}, bom dia! ☀️

Lembrei de voce agora porque vi [CONTEUDO/CASO/RESULTADO RELEVANTE] que tem tudo a ver com o que voce me contou!

Muitos clientes nossos tinham exatamente o mesmo desafio que voce e conseguiram [RESULTADO ESPECIFICO].

Vou te mandar o material? Acho que vai te ajudar bastante na sua decisao! 📩',

'{{NOME_LEAD}}, bom dia!

Gostaria de compartilhar algo que acredito ser muito relevante para voce. Recentemente, [CONTEUDO/CASO/RESULTADO RELEVANTE] que se relaciona diretamente com a situacao que voce mencionou.

Diversos clientes que enfrentavam desafios semelhantes obtiveram resultados expressivos, como [RESULTADO ESPECIFICO].

Posso enviar esse material para sua analise?',

'{{NOME_LEAD}}! Tenho algo que vai te interessar.

Vi [CONTEUDO/CASO RELEVANTE] que bate direto com o que voce precisa. Clientes nossos na mesma situacao ja alcancaram [RESULTADO].

Quer ver? Te mando agora!',

'Segundo toque do follow-up em cadeia. Envie 3 dias apos o primeiro contato. Objetivo: entregar valor sem pedir nada em troca. Compartilhe um caso de sucesso, conteudo ou resultado relevante. Script 2 de 5.',
ARRAY['to sem tempo', 'nao preciso', 'ja tenho']::text[],
ARRAY['follow-up', 'cadeia', 'dia 3', 'valor', 'case', 'sequencial']::text[],
'starter', 9, true),

-- Chain 3: Dia 5 - Prova Social
((SELECT id FROM script_categories WHERE slug = 'follow-up'),
'Cadeia: Dia 5 - Prova Social',
'Oi, {{NOME_LEAD}}! Tudo certo? 😊

Queria te contar uma coisa rapida: o [NOME DO CLIENTE] estava numa situacao bem parecida com a sua. Ele tambem [OBJECAO/DUVIDA QUE O LEAD TINHA].

Sabe o que aconteceu? Em [PERIODO], ele conseguiu [RESULTADO CONCRETO]. Incrivel, ne?

Se quiser, posso te mostrar como ele fez isso! Seria otimo pra voce tambem. 💪',

'{{NOME_LEAD}}, bom dia!

Gostaria de compartilhar um caso que se assemelha muito a sua situacao. O cliente [NOME] enfrentava desafios similares, especialmente em relacao a [OBJECAO].

Apos implementar nossa solucao, em [PERIODO] ele alcancou [RESULTADO CONCRETO], o que representou uma mudanca significativa em seus resultados.

Teria interesse em conhecer mais detalhes sobre como replicar esse sucesso?',

'{{NOME_LEAD}}, olha so isso:

[NOME DO CLIENTE] tinha a mesma duvida que voce. Resultado? [RESULTADO CONCRETO] em [PERIODO].

Quer saber como? Te explico em 2 minutos!',

'Terceiro toque do follow-up em cadeia. Envie 5 dias apos o primeiro contato. Objetivo: usar prova social para eliminar duvidas. Adapte com um caso real de cliente. Script 3 de 5.',
ARRAY['nao sei se funciona', 'sera que da certo', 'tenho duvida']::text[],
ARRAY['follow-up', 'cadeia', 'dia 5', 'prova social', 'depoimento', 'sequencial']::text[],
'starter', 10, true),

-- Chain 4: Dia 7 - Urgencia Genuina
((SELECT id FROM script_categories WHERE slug = 'follow-up'),
'Cadeia: Dia 7 - Urgencia Genuina',
'{{NOME_LEAD}}, boa tarde! 👋

Estou passando por aqui porque queria te avisar de algo importante: [CONDICAO ESPECIAL / VAGAS LIMITADAS / MUDANCA DE PRECO / BONUS EXPIRANDO].

Nao quero te pressionar de jeito nenhum! Mas como voce demonstrou interesse, seria injusto da minha parte nao te avisar antes que essa oportunidade passe.

O que acha? Quer aproveitar enquanto da tempo? ⏰',

'{{NOME_LEAD}}, boa tarde!

Entro em contato para informa-lo(a) sobre uma atualizacao relevante: [CONDICAO ESPECIAL / VAGAS LIMITADAS / MUDANCA DE PRECO].

Compreendo que sua decisao requer analise cuidadosa, porem, diante do seu interesse anterior, considero importante que voce esteja ciente desta oportunidade antes de seu encerramento.

Gostaria de discutir como podemos viabilizar isso para voce?',

'{{NOME_LEAD}}, atencao rapida:

[CONDICAO ESPECIAL] e so ate [DATA/LIMITE]. Como voce ja demonstrou interesse, to te avisando primeiro.

Quer garantir? Me responde agora que resolvo pra voce!',

'Quarto toque do follow-up em cadeia. Envie 7 dias apos o primeiro contato. Objetivo: criar urgencia genuina com uma condicao real. NAO invente escassez falsa. Script 4 de 5.',
ARRAY['vou pensar', 'preciso de tempo', 'depois decido']::text[],
ARRAY['follow-up', 'cadeia', 'dia 7', 'urgencia', 'escassez', 'sequencial']::text[],
'starter', 11, true),

-- Chain 5: Dia 10 - Ultima Tentativa
((SELECT id FROM script_categories WHERE slug = 'follow-up'),
'Cadeia: Dia 10 - Ultima Tentativa',
'{{NOME_LEAD}}, tudo bem? 😊

Olha, vou ser bem sincero com voce: estou organizando minha lista de contatos e percebi que faz um tempo que conversamos.

Nao quero ser inconveniente! Se nao faz mais sentido pra voce neste momento, eu entendo perfeitamente. Mas se ainda tiver interesse, me avisa que a gente retoma de onde parou. 🤝

O que me diz? Fecho seu contato ou retomamos?',

'{{NOME_LEAD}}, espero que esteja bem.

Gostaria de fazer um contato final a respeito de nossa conversa anterior. Compreendo que as prioridades mudam e que talvez este nao seja o momento ideal.

Caso nao haja mais interesse, respeito inteiramente sua decisao. No entanto, se desejar retomar a conversa, estou a disposicao para dar continuidade.

Poderia me informar como prefere prosseguir?',

'{{NOME_LEAD}}, ultima mensagem sobre isso:

Faz sentido pra voce ou nao? Sem problema nenhum se nao for o momento. So preciso saber pra organizar meus contatos.

Me responde com um "sim" ou "nao" e ta resolvido! 👍',

'Ultimo toque do follow-up em cadeia. Envie 10 dias apos o primeiro contato. Objetivo: dar ao lead a chance de dizer nao (o que paradoxalmente aumenta respostas). Tom leve, sem rancor. Script 5 de 5.',
ARRAY['nao quero', 'para de mandar', 'nao tenho interesse']::text[],
ARRAY['follow-up', 'cadeia', 'dia 10', 'ultima tentativa', 'fechamento', 'sequencial']::text[],
'starter', 12, true),

-- ============================================================
-- POS-VENDA (4 new scripts, display_order 4-7)
-- Expanding from 3 to 7 total pos-venda scripts
-- ============================================================

-- Pos-venda 4: Pesquisa de Satisfacao
((SELECT id FROM script_categories WHERE slug = 'pos-venda'),
'Pesquisa de Satisfacao',
'Oi, {{NOME_LEAD}}! Tudo bem? 😊

Ja faz [PERIODO] que voce esta com a gente e queria saber: como esta sendo sua experiencia ate agora?

De 0 a 10, qual nota voce daria? Pode ser bem sincero(a), ta? A sua opiniao e super importante pra gente continuar melhorando! 💬

E se tiver alguma sugestao, manda sem medo!',

'Ola, {{NOME_LEAD}}!

Completamos [PERIODO] desde o inicio de nossa parceria e gostavamos de avaliar sua experiencia conosco.

Em uma escala de 0 a 10, como voce classificaria nosso atendimento e servico ate o momento? Sua avaliacao sincera e fundamental para nosso processo de melhoria continua.

Caso tenha sugestoes especificas, ficaremos gratos em recebe-las.',

'{{NOME_LEAD}}! Rapidinho:

De 0 a 10, como ta sua experiencia com a gente? Preciso saber pra garantir que voce esta tendo o melhor resultado possivel.

Me manda a nota e qualquer feedback!',

'Use apos 15-30 dias da compra. A pesquisa NPS e essencial para medir satisfacao, identificar problemas cedo e gerar depoimentos dos promotores (nota 9-10).',
ARRAY[]::text[],
ARRAY['pos-venda', 'nps', 'satisfacao', 'pesquisa', 'feedback']::text[],
'starter', 4, true),

-- Pos-venda 5: Upsell / Cross-sell
((SELECT id FROM script_categories WHERE slug = 'pos-venda'),
'Upsell / Cross-sell Natural',
'{{NOME_LEAD}}, que bom falar com voce! 😊

Olha, estava analisando seu perfil e percebi que voce pode se beneficiar muito de [PRODUTO/SERVICO COMPLEMENTAR].

Como voce ja tem [PRODUTO ATUAL], o [COMPLEMENTAR] vai potencializar seus resultados porque [BENEFICIO ESPECIFICO].

E pra quem ja e cliente, tenho uma condicao especial! Quer saber mais? 🎁',

'{{NOME_LEAD}}, bom dia!

Apos analisar sua utilizacao de [PRODUTO ATUAL], identifiquei uma oportunidade que pode ampliar significativamente seus resultados.

O [PRODUTO/SERVICO COMPLEMENTAR] foi desenvolvido para complementar exatamente o que voce ja possui, proporcionando [BENEFICIO ESPECIFICO].

Para clientes ativos, dispomos de condicoes diferenciadas. Gostaria de conhecer os detalhes?',

'{{NOME_LEAD}}, tenho uma oportunidade:

Voce ja tem [PRODUTO ATUAL] e ta indo bem. Mas com [COMPLEMENTAR] seus resultados vao [BENEFICIO].

Condicao especial pra quem ja e cliente. Quer saber?',

'Use quando o cliente ja esta satisfeito (NPS alto). Nunca ofereca upsell a clientes insatisfeitos. O timing ideal e apos um resultado positivo ou marco de sucesso.',
ARRAY['ja gasto muito', 'nao preciso', 'ta caro']::text[],
ARRAY['pos-venda', 'upsell', 'cross-sell', 'complementar', 'oferta']::text[],
'starter', 5, true),

-- Pos-venda 6: Pedido de Indicacao
((SELECT id FROM script_categories WHERE slug = 'pos-venda'),
'Pedido de Indicacao',
'{{NOME_LEAD}}, tudo bem? 🙌

Fico muito feliz em saber que voce esta gostando de [PRODUTO/SERVICO]! Seu resultado me deixa muito orgulhoso(a).

Queria te pedir uma coisa: voce conhece alguem que tambem poderia se beneficiar disso? Pode ser um amigo, colega de trabalho, familiar...

Se indicar, alem de ajudar alguem, voce [RECOMPENSA/BENEFICIO POR INDICACAO]! Todo mundo ganha! 🤝',

'{{NOME_LEAD}}, bom dia!

E muito gratificante acompanhar seus resultados com [PRODUTO/SERVICO]. Seu caso e um otimo exemplo de como nossa solucao pode fazer a diferenca.

Nesse sentido, gostaria de saber: ha algum colega ou conhecido que poderia se beneficiar de forma semelhante?

Temos um programa de indicacao que oferece [RECOMPENSA] para voce e condicoes especiais para o indicado.',

'{{NOME_LEAD}}, preciso da sua ajuda!

Voce ta tendo resultado com [PRODUTO], certo? Conhece alguem que tambem precisa disso?

Me indica e voce ganha [RECOMPENSA]. Me manda o contato que eu cuido de tudo!',

'Use apos confirmar que o cliente esta satisfeito. O melhor momento e logo apos o cliente relatar um resultado positivo. Indicacoes sao o canal de vendas com maior taxa de conversao.',
ARRAY[]::text[],
ARRAY['pos-venda', 'indicacao', 'referral', 'networking', 'programa']::text[],
'starter', 6, true),

-- Pos-venda 7: Reativacao de Cliente Inativo
((SELECT id FROM script_categories WHERE slug = 'pos-venda'),
'Reativacao de Cliente Inativo',
'Oi, {{NOME_LEAD}}! Quanto tempo! 😊

Percebi que faz um tempinho que a gente nao se fala e fiquei preocupado(a). Esta tudo bem?

Queria te contar que temos novidades incriveis: [NOVIDADE/MELHORIA/LANCAMENTO]. E como voce ja e da casa, preparei algo especial pra voce voltar com tudo!

Bora conversar? Sinto falta de te ver por aqui! 🚀',

'{{NOME_LEAD}}, bom dia! Espero que esteja bem.

Notamos que houve uma pausa em nossa interacao e gostavamos de entender se ha algo em que possamos ajuda-lo(a).

Aproveitamos para informa-lo(a) sobre atualizacoes recentes: [NOVIDADE/MELHORIA]. Como cliente, voce tem acesso a condicoes exclusivas para retomar nossa parceria.

Podemos agendar uma conversa rapida?',

'{{NOME_LEAD}}, sumiu! Ta tudo bem?

Temos [NOVIDADE] e separei uma condicao especial pra voce. Mas e por tempo limitado!

Me responde que eu te explico rapidinho.',

'Use para clientes que pararam de comprar ou usar o servico ha mais de 60 dias. E mais barato reativar um cliente existente do que conquistar um novo. Sempre traga uma novidade ou condicao especial.',
ARRAY['nao uso mais', 'cancelei', 'nao preciso']::text[],
ARRAY['pos-venda', 'reativacao', 'cliente inativo', 'winback', 'retorno']::text[],
'starter', 7, true),

-- ============================================================
-- AQUECIMENTO DE BASE (5 scripts, display_order 8-12)
-- Inside ativacao-base category
-- ============================================================

-- Aquecimento 1: Conteudo Educativo
((SELECT id FROM script_categories WHERE slug = 'ativacao-base'),
'Aquecimento: Conteudo Educativo',
'Oi, {{NOME_LEAD}}! Tudo bem? 😊

Estava preparando um conteudo sobre [TEMA RELEVANTE PRO LEAD] e lembrei de voce na hora!

Sabia que [DADO/ESTATISTICA INTERESSANTE]? A maioria das pessoas nao sabe disso, mas faz TODA a diferenca.

Preparei um resumo rapido pra voce. Quer que eu mande? 📚',

'{{NOME_LEAD}}, bom dia!

Desenvolvi recentemente um material sobre [TEMA RELEVANTE] que acredito ser de grande valor para voce.

Um dado que considero particularmente relevante: [DADO/ESTATISTICA]. Esta informacao pode impactar diretamente seus resultados.

Posso compartilhar este conteudo com voce?',

'{{NOME_LEAD}}! Tenho um conteudo que voce precisa ver.

[DADO/ESTATISTICA] sobre [TEMA]. Isso muda completamente o jogo.

Quer que eu te mande? E rapido e vai te ajudar muito!',

'Use para aquecer leads frios com conteudo de valor. NAO venda nada neste script. O objetivo e gerar reciprocidade e autoridade. Ideal para leads que ainda nao conhecem bem seu trabalho.',
ARRAY[]::text[],
ARRAY['aquecimento', 'conteudo', 'educativo', 'valor', 'autoridade']::text[],
'starter', 8, true),

-- Aquecimento 2: Enquete / Engajamento
((SELECT id FROM script_categories WHERE slug = 'ativacao-base'),
'Aquecimento: Enquete de Engajamento',
'Oi, {{NOME_LEAD}}! Posso te fazer uma pergunta rapida? 🤔

Estou fazendo uma pesquisa com [TIPO DE PUBLICO] e queria muito sua opiniao:

Qual e o maior desafio que voce enfrenta hoje em relacao a [AREA]?

A) [OPCAO 1]
B) [OPCAO 2]
C) [OPCAO 3]
D) Outro (me conta!)

E so me responder com a letra! Leva 2 segundos 😉',

'{{NOME_LEAD}}, bom dia!

Estou conduzindo uma pesquisa com profissionais de [AREA] e sua participacao seria muito valiosa.

Qual considera ser o principal desafio em [AREA] atualmente?

A) [OPCAO 1]
B) [OPCAO 2]
C) [OPCAO 3]
D) Outro

Basta responder com a letra correspondente. Agradeco sua contribuicao.',

'{{NOME_LEAD}}, me ajuda aqui:

Qual seu maior desafio em [AREA]?
A) [OPCAO 1]
B) [OPCAO 2]
C) [OPCAO 3]

Me responde com a letra. Depois te mando uma dica sobre isso!',

'Use para reengajar leads frios de forma interativa. Enquetes tem taxa de resposta muito maior que mensagens abertas. Apos a resposta, envie conteudo relevante baseado na escolha do lead.',
ARRAY[]::text[],
ARRAY['aquecimento', 'enquete', 'engajamento', 'pesquisa', 'interacao']::text[],
'starter', 9, true),

-- Aquecimento 3: Caso de Sucesso
((SELECT id FROM script_categories WHERE slug = 'ativacao-base'),
'Aquecimento: Caso de Sucesso',
'{{NOME_LEAD}}, preciso te contar uma historia rapida! 🌟

O [NOME CLIENTE] chegou ate a gente com o mesmo problema que muita gente tem: [PROBLEMA COMUM].

Sabe o que aconteceu? Em apenas [PERIODO], ele conseguiu [RESULTADO CONCRETO COM NUMEROS].

O mais legal? Ele comecou achando que nao ia dar certo tambem! 😄

Se quiser, te conto o que ele fez de diferente...',

'{{NOME_LEAD}}, gostaria de compartilhar um caso inspirador.

Nosso cliente [NOME] nos procurou enfrentando [PROBLEMA COMUM], situacao que sei ser frequente em [AREA].

Em [PERIODO], ele alcancou [RESULTADO CONCRETO COM NUMEROS], superando suas proprias expectativas.

O diferencial foi [ESTRATEGIA/ABORDAGEM]. Posso detalhar o processo utilizado, caso tenha interesse.',

'{{NOME_LEAD}}, olha esse resultado:

[NOME CLIENTE] tinha [PROBLEMA]. Em [PERIODO] conseguiu [RESULTADO COM NUMEROS].

Quer saber como? Te conto em 1 minuto!',

'Use casos de sucesso reais para aquecer leads que estao indecisos. Numeros concretos e periodos especificos geram mais credibilidade. Ideal para leads que ja conhecem voce mas ainda nao compraram.',
ARRAY['sera que funciona', 'nao acredito', 'parece bom demais']::text[],
ARRAY['aquecimento', 'caso de sucesso', 'prova social', 'resultado', 'depoimento']::text[],
'starter', 10, true),

-- Aquecimento 4: Dica Pratica
((SELECT id FROM script_categories WHERE slug = 'ativacao-base'),
'Aquecimento: Dica Pratica Rapida',
'{{NOME_LEAD}}, bom dia! 😊

Olha, vou te dar uma dica que vale ouro e que voce pode aplicar AGORA:

💡 [DICA PRATICA E ACIONAVEL SOBRE A AREA DO LEAD]

Parece simples, ne? Mas a maioria das pessoas nao faz isso e acaba [CONSEQUENCIA NEGATIVA].

Testa e depois me conta o resultado! Aposto que voce vai se surpreender 🚀',

'{{NOME_LEAD}}, bom dia!

Gostaria de compartilhar uma recomendacao pratica que pode gerar resultados imediatos:

[DICA PRATICA E ACIONAVEL]

Embora possa parecer simplificado, esta abordagem e negligenciada pela maioria dos profissionais, resultando em [CONSEQUENCIA NEGATIVA].

Sugiro que implemente e acompanhe os resultados. Estou a disposicao para discutir os desdobramentos.',

'{{NOME_LEAD}}, dica rapida:

Faz isso HOJE: [DICA PRATICA].

A maioria nao faz e perde [RESULTADO]. Testa e me conta depois!',

'Use para entregar valor gratuito e imediato. A dica deve ser especifica o suficiente para o lead aplicar sozinho. Isso gera reciprocidade e mostra expertise sem vender diretamente.',
ARRAY[]::text[],
ARRAY['aquecimento', 'dica', 'pratica', 'valor', 'rapida']::text[],
'starter', 11, true),

-- Aquecimento 5: Convite para Evento/Live
((SELECT id FROM script_categories WHERE slug = 'ativacao-base'),
'Aquecimento: Convite para Evento',
'{{NOME_LEAD}}, tudo bem? 🎯

Queria te fazer um convite especial: vou fazer uma [LIVE/AULA/WORKSHOP] sobre [TEMA] no dia [DATA] as [HORA].

Vai ser totalmente gratuito e vou mostrar na pratica como [BENEFICIO PRINCIPAL].

E o melhor: quem participar vai receber [BONUS/MATERIAL EXCLUSIVO]!

Posso te reservar uma vaga? Sao limitadas! 🔥',

'{{NOME_LEAD}}, bom dia!

Tenho o prazer de convida-lo(a) para uma [LIVE/AULA/WORKSHOP] sobre [TEMA], que sera realizada no dia [DATA] as [HORA].

O evento sera gratuito e abordaremos de forma pratica [BENEFICIO PRINCIPAL].

Os participantes receberao [BONUS/MATERIAL EXCLUSIVO] como cortesia.

As vagas sao limitadas. Posso confirmar sua participacao?',

'{{NOME_LEAD}}! Convite exclusivo:

[LIVE/WORKSHOP] gratis sobre [TEMA] - [DATA] as [HORA].

Vou mostrar como [BENEFICIO] na pratica. Vagas limitadas!

Confirma presenca?',

'Use para converter leads frios em leads quentes atraves de um evento. Lives e workshops tem alta taxa de comparecimento quando ha bonus exclusivo. Apos o evento, faca o follow-up de vendas.',
ARRAY['nao tenho tempo', 'depois vejo']::text[],
ARRAY['aquecimento', 'convite', 'evento', 'live', 'workshop', 'lancamento']::text[],
'starter', 12, true);
