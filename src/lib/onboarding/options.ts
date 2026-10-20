// Domínio: onboarding — opções das perguntas de múltipla escolha.
// Dono ÚNICO destas listas: formulário, validação da API e planilha leem daqui.
// Mudou um texto? Precisa de migration que normalize as respostas já gravadas.

export const BUSINESS_TYPES = [
  'Saúde (clínicas, médicos, profissionais da saúde)',
  'Estética (facial, corporal ou avançada)',
  'Odontologia',
  'Fisioterapia e bem-estar',
  'Fitness e esportes',
  'Automotivo (oficina, elétrica, estética automotiva)',
  'Comércio (loja física ou online)',
  'Marketing e aquisição (agência, tráfego, social media)',
  'Mentorias, consultorias e infoprodutos',
  'Serviços especializados (jurídico, contábil, arquitetura, etc.)',
  'Serviços operacionais B2B (limpeza, segurança, terceirização)',
  'Negócios locais (alimentação, barbearia, serviços do dia a dia)',
  'Construção, engenharia e imobiliário',
  'Agronegócio',
  'Educação (presencial ou cursos físicos)',
  'Turismo e viagens',
  'Fotografia e produção de conteúdo',
] as const;

export const BUSINESS_ROLES = [
  'Dono',
  'Sócio',
  'Gerente',
  'Colaborador',
  'Vendedor',
] as const;

export const FATURAMENTO_OPTIONS = [
  'Até R$ 10 mil',
  'Entre R$ 10 mil e R$ 30 mil',
  'Entre R$ 30 mil e R$ 50 mil',
  'Entre R$ 50 mil e R$ 100 mil',
  'Entre R$ 100 mil e R$ 250 mil',
  'Entre R$ 250 mil e R$ 500 mil',
  'Entre R$ 500 mil e R$ 1 milhão',
  'Acima de R$ 1 milhão',
] as const;

export const MAIN_CHALLENGES = [
  'Atrair clientes qualificados de forma previsível',
  'Converter mais vendas sem depender de descontos ou indicação',
  'Aumentar lucro e escalar sem perder margem financeira',
  'Construir um time forte com liderança e gestão eficiente',
] as const;

export const TIME_KNOWING_CLEITON_OPTIONS = [
  'Entre 1 a 3 semanas',
  'Entre 1 a 3 meses',
  'Entre 3 a 6 meses',
  'Entre 6 a 12 meses',
  'Acima de 1 ano',
] as const;
