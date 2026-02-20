import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Termos de Uso - Script Go',
};

export default function TermosPage() {
  return (
    <article className="prose prose-invert max-w-none">
      <h1 className="text-3xl font-heading font-bold text-white">Termos de Uso</h1>
      <p className="text-sm text-[#94A3B8]">Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>

      <h2>1. Aceitação dos Termos</h2>
      <p>
        Ao acessar e utilizar a plataforma <strong>Script Go</strong> (&quot;Plataforma&quot;), você concorda com estes
        Termos de Uso. Se não concordar, não utilize a Plataforma.
      </p>

      <h2>2. Descrição do Serviço</h2>
      <p>
        A Script Go é uma plataforma de scripts persuasivos para vendas via WhatsApp. Os serviços incluem:
      </p>
      <ul>
        <li>Acesso a scripts de vendas organizados por categoria</li>
        <li>Ferramentas de inteligência artificial para geração e análise de scripts</li>
        <li>Sistema de gamificação para acompanhamento de progresso</li>
        <li>Pipeline de gerenciamento de leads</li>
        <li>Métricas e analytics de vendas</li>
      </ul>

      <h2>3. Planos e Pagamento</h2>
      <p>
        A Plataforma oferece planos gratuitos e pagos. Os planos pagos são cobrados mensalmente via
        Hotmart. Ao assinar um plano pago, você concorda com:
      </p>
      <ul>
        <li>Cobrança recorrente mensal no valor do plano escolhido</li>
        <li>Renovação automática até o cancelamento</li>
        <li>Política de reembolso conforme as regras da plataforma Hotmart e do Código de Defesa do Consumidor</li>
      </ul>

      <h2>4. Uso Aceitável</h2>
      <p>Você concorda em NÃO utilizar a Plataforma para:</p>
      <ul>
        <li>Enviar spam ou mensagens não solicitadas em massa</li>
        <li>Violar leis ou regulamentações aplicáveis</li>
        <li>Compartilhar scripts ou conteúdo da plataforma com terceiros não autorizados</li>
        <li>Tentar acessar áreas restritas ou comprometer a segurança do sistema</li>
        <li>Falsificar dados de vendas ou métricas</li>
      </ul>

      <h2>5. Propriedade Intelectual</h2>
      <p>
        Todo o conteúdo da Plataforma, incluindo scripts, textos, design, código-fonte e marcas
        registradas, é de propriedade exclusiva da Script Go. Os scripts são licenciados para uso
        pessoal e comercial do assinante, mas não podem ser redistribuídos ou revendidos.
      </p>

      <h2>6. Limitação de Responsabilidade</h2>
      <p>
        A Script Go fornece ferramentas e scripts como sugestões. Os resultados de vendas dependem
        de múltiplos fatores e não garantimos resultados específicos. A Plataforma não se
        responsabiliza por:
      </p>
      <ul>
        <li>Resultados de vendas obtidos com os scripts</li>
        <li>Uso inadequado dos scripts pelos usuários</li>
        <li>Interrupções temporárias no serviço por manutenção</li>
      </ul>

      <h2>7. Cancelamento</h2>
      <p>
        Você pode cancelar sua assinatura a qualquer momento. Após o cancelamento, você terá acesso
        até o final do período já pago. O cancelamento é feito diretamente na plataforma Hotmart.
      </p>

      <h2>8. Alterações nos Termos</h2>
      <p>
        Podemos alterar estes termos a qualquer momento. Alterações significativas serão comunicadas
        por email. O uso continuado da Plataforma após alterações constitui aceitação dos novos termos.
      </p>

      <h2>9. Legislação Aplicável</h2>
      <p>
        Estes termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o foro da
        comarca do domicílio do consumidor para resolução de eventuais conflitos.
      </p>

      <h2>10. Contato</h2>
      <p>
        Para dúvidas sobre estes termos, entre em contato pelo email disponível na plataforma.
      </p>
    </article>
  );
}
