-- ============================================================
-- MIGRATION 019: Seed Daily Missions (Script Go)
-- Date: March 2026
-- Description: Populates the missions table with 24 daily
--              sales tasks for the Script Go system.
-- ============================================================

-- 🔵 ORIGINAIS (Tarefas 1–6)

INSERT INTO missions (title, description, is_active) VALUES
(
  'Orçamento Parado é Dinheiro Dormindo',
  'Separe todas as pessoas da semana passada que receberam orçamento e não fecharam. Ligue para cada uma delas e pergunte: "O que está faltando para a gente bater o martelo?" — Não mande mensagem. Ligue. A voz fecha o que o texto não consegue.',
  TRUE
),
(
  'Suas Objeções Valem Dinheiro',
  'Liste as 5 objeções que mais apareceram na semana passada e escreva um script de resposta para cada uma. Na próxima vez que elas aparecerem, você não vai improvisar — vai executar. Objeção sem resposta pronta é venda perdida.',
  TRUE
),
(
  'Prova Social no Momento Certo',
  'Envie mensagem para 5 clientes que já receberam seu produto ou serviço e pergunte como foi a experiência. Pegue esses depoimentos e envie para os clientes que ainda estão pensando no orçamento. Quem está em dúvida não precisa de mais argumento — precisa ver que alguém igual a ele já decidiu e deu certo.',
  TRUE
),
(
  'Seu Arsenal de Depoimentos',
  'Separe seus 10 melhores depoimentos de todos os tempos e deixe num lugar de fácil acesso. A partir de hoje, toda vez que um cliente hesitar, você não vai procurar — vai disparar. Depoimento certo na hora certa vale mais que qualquer desconto.',
  TRUE
),
(
  'Indicação Quente Vem de Cliente Feliz',
  'Envie uma mensagem para todos os clientes que enviaram depoimento ontem e hoje e peça no mínimo 5 indicações. Quem acabou de te elogiar está no pico da satisfação — é o melhor momento para pedir. Não deixe essa janela fechar.',
  TRUE
),
(
  'Cliente Antigo, Oferta Nova',
  'Seu cliente antigo já confia em você — ele só precisa de um motivo para comprar de novo. Pense em uma oferta exclusiva para quem já é cliente e envie hoje. Reativação custa 7x menos do que conquistar um cliente novo.',
  TRUE
),

-- 🟡 REESCRITAS (Tarefas 7–14)

(
  'Separe Seus Clientes por Temperatura',
  'Abra sua lista de contatos agora e divida em 3 grupos: 🔥 Quente (falou nos últimos 7 dias), 🌤️ Morno (entre 8 e 30 dias), ❄️ Frio (sumiu há mais de 30 dias). Todo dia, toque em pelo menos 1 de cada grupo. Funil parado é faturamento que não acontece.',
  TRUE
),
(
  'O Fechamento por Comparação',
  'Escolha 2 clientes que estão em dúvida e envie uma mensagem mostrando resultado real: "[Nome], o [cliente Y] tinha exatamente a mesma dúvida que você. Fechou em [mês] e hoje já [resultado concreto]. Faz sentido a gente conversar 10 minutos sobre isso?" Resultado concreto fecha mais do que qualquer argumento técnico.',
  TRUE
),
(
  'Indicação Passiva que Funciona',
  'Envie para 3 clientes satisfeitos a seguinte pergunta: "[Nome], você conhece alguém que está passando pelo mesmo problema que você tinha antes de a gente trabalhar junto?" Não peça indicação diretamente. Faça a pessoa pensar no problema de alguém — ela vai lembrar de alguém e te conectar naturalmente.',
  TRUE
),
(
  'Reviva uma Proposta com Novo Ângulo',
  'Escolha 1 orçamento parado e reapresente com foco na consequência, não no preço: "[Nome], revisitei sua situação e percebi que cada mês sem resolver isso está te custando [X]. Quero te mostrar isso em 10 minutos, pode ser?" O problema deles não sumiu — só precisa ser reacendido.',
  TRUE
),
(
  'Monte Seu Banco de Respostas Rápidas',
  'Anote as 5 perguntas que mais se repetem no seu atendimento e escreva uma resposta curta, clara e convincente para cada uma. Salve no WhatsApp Business como respostas rápidas. Atendimento padronizado transmite profissionalismo antes mesmo de apresentar o preço.',
  TRUE
),
(
  'O Upsell Silencioso',
  'Escolha 3 clientes ativos e pense: o que mais faz sentido oferecer para essa pessoa agora? Mande: "[Nome], tava pensando em você — tem uma solução nova que acho que encaixa exato no seu momento. Posso te contar em 2 minutos?" Cliente ativo já confia. Upsell é a venda mais barata e mais rápida que existe.',
  TRUE
),
(
  'Crie Sua Mensagem de Entrada Padrão',
  'Escreva hoje a mensagem que vai ser usada para responder todo cliente novo que chegar no WhatsApp. Precisa ter: saudação, 1 pergunta de qualificação e direcionamento claro. Exemplo: "Oi! Tudo bem? Para eu te ajudar melhor — você já tem [condição X] ou está começando agora?" Primeira impressão padronizada gera confiança antes da proposta.',
  TRUE
),
(
  'Proposta Enviada? Liga Junto',
  'A partir de hoje, toda vez que enviar uma proposta no WhatsApp, ligue para o cliente logo em seguida. Diga: "[Nome], acabei de te mandar o orçamento. Queria te explicar os 2 pontos principais em 3 minutos — pode ser agora?" Proposta acompanhada de ligação converte em média 3x mais do que proposta enviada sozinha.',
  TRUE
),

-- 🟢 NOVAS (Tarefas 15–24)

(
  'O Cliente Sumido Tem Motivo',
  'Escolha 3 contatos que pararam de responder depois da proposta e mande: "[Nome], percebi que a gente perdeu o contato. Sem problema nenhum — só queria saber se você resolveu o [problema] de outra forma ou se ainda está em aberto." Você vai descobrir se perdeu o cliente ou se ainda há chance — e muitas vezes há.',
  TRUE
),
(
  'Construa Sua Escada de Preços',
  'Você tem uma oferta de entrada, uma principal e uma premium? Se não, hoje você cria. Quem só tem uma opção perde o cliente que acha caro e o que toparia pagar mais. Defina os 3 níveis, o que inclui cada um e o preço. A partir de amanhã, você apresenta opções — não uma proposta fechada.',
  TRUE
),
(
  'Pergunte Antes de Apresentar',
  'Antes de enviar qualquer proposta hoje, faça 1 pergunta ao cliente: "Antes de te mandar os valores, me conta: o que seria o resultado ideal para você com esse [produto/serviço]?" Quem entende o resultado que o cliente quer, apresenta a solução certa. Proposta genérica perde para proposta personalizada toda vez.',
  TRUE
),
(
  'Mostre Bastidores para Gerar Confiança',
  'Escolha 2 clientes em negociação e envie uma foto, print ou vídeo curto de um trabalho em andamento com: "[Nome], aqui um projeto que estamos finalizando essa semana. Só para você ver como funciona na prática." Transparência no processo elimina objeção de desconfiança antes que ela apareça.',
  TRUE
),
(
  'Clone Seu Melhor Cliente',
  'Pense no seu melhor cliente — o que paga bem, indica, não dá trabalho. Descreva o perfil dele: segmento, porte, comportamento, problema que tinha. Agora liste 5 pessoas ou empresas que têm o mesmo perfil e entre em contato com cada uma esta semana. O cliente ideal não aparece por acaso — você vai buscar.',
  TRUE
),
(
  'Crie Urgência Verdadeira',
  'Identifique uma restrição real no seu negócio — vagas limitadas, agenda lotando, prazo de entrega, insumo com preço subindo — e use isso hoje numa mensagem para 3 leads mornos: "[Nome], te aviso porque acho justo: minha agenda para [mês] está quase fechada. Se quiser garantir, precisa ser essa semana." Urgência fabricada o cliente sente. Urgência real, ele respeita.',
  TRUE
),
(
  'Mapa Semanal do Funil',
  'Toda segunda-feira, liste quantos leads estão em cada etapa: primeiro contato, proposta enviada, em negociação, fechado. Se você não sabe onde estão seus leads, não sabe onde está seu próximo faturamento. 10 minutos de visão semanal valem mais do que 1 hora apagando incêndio.',
  TRUE
),
(
  'Reative com Conteúdo, Não com Oferta',
  'Escolha 5 leads frios e envie um conteúdo curto e relevante para o problema deles — um resultado de cliente, uma dica, um dado do mercado. Sem oferta. Só valor. Depois de 2 ou 3 envios assim, quando você fizer a oferta, eles já vão estar aquecidos. Relacionamento antes de proposta é pipeline inteligente.',
  TRUE
),
(
  'O Depoimento em Vídeo Vale 10x Mais',
  'Escolha 2 clientes satisfeitos e peça um vídeo curto de 30 segundos contando o resultado. Mande assim: "[Nome], você toparia gravar um vídeo rápido contando o que mudou depois que a gente trabalhou junto? Pode ser pelo celular mesmo, bem simples." Depoimento em vídeo elimina objeção de ceticismo que texto não elimina.',
  TRUE
),
(
  'Defina Sua Meta Diária de Contatos',
  'Quantos contatos comerciais você ou sua equipe fazem por dia? Defina um número mínimo — pode ser 10, pode ser 20 — e coloque no papel. A partir de hoje, esse número é inegociável. Faturamento previsível começa com volume de contato previsível. Quem não define meta, trabalha na sorte.',
  TRUE
);
