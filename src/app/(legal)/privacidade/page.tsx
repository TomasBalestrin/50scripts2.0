import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Política de Privacidade - 50 Scripts',
};

export default function PrivacidadePage() {
  return (
    <article className="prose prose-invert max-w-none">
      <h1 className="text-3xl font-heading font-bold text-white">Política de Privacidade</h1>
      <p className="text-sm text-[#94A3B8]">Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>

      <p>
        Esta Política de Privacidade descreve como a <strong>50 Scripts</strong> (&quot;nós&quot;, &quot;nosso&quot;) coleta,
        usa e protege seus dados pessoais, em conformidade com a Lei Geral de Proteção de Dados
        (LGPD - Lei nº 13.709/2018).
      </p>

      <h2>1. Dados Coletados</h2>
      <h3>1.1 Dados fornecidos por você</h3>
      <ul>
        <li><strong>Dados de cadastro:</strong> nome, email</li>
        <li><strong>Dados de perfil:</strong> nicho de atuação, tom de comunicação preferido</li>
        <li><strong>Dados de uso:</strong> scripts utilizados, avaliações, feedback</li>
        <li><strong>Dados de leads:</strong> informações de leads que você cadastra voluntariamente</li>
      </ul>

      <h3>1.2 Dados coletados automaticamente</h3>
      <ul>
        <li>Dados de navegação (páginas acessadas, tempo de uso)</li>
        <li>Dados do dispositivo (tipo de navegador, sistema operacional)</li>
        <li>Endereço IP</li>
      </ul>

      <h2>2. Base Legal e Finalidade do Tratamento</h2>
      <table>
        <thead>
          <tr>
            <th>Finalidade</th>
            <th>Base Legal (LGPD)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Fornecer o serviço contratado</td>
            <td>Execução de contrato (Art. 7º, V)</td>
          </tr>
          <tr>
            <td>Personalizar recomendações de scripts</td>
            <td>Legítimo interesse (Art. 7º, IX)</td>
          </tr>
          <tr>
            <td>Processar pagamentos</td>
            <td>Execução de contrato (Art. 7º, V)</td>
          </tr>
          <tr>
            <td>Enviar comunicações sobre o serviço</td>
            <td>Legítimo interesse (Art. 7º, IX)</td>
          </tr>
          <tr>
            <td>Melhorar o produto com analytics</td>
            <td>Legítimo interesse (Art. 7º, IX)</td>
          </tr>
          <tr>
            <td>Cumprir obrigações legais</td>
            <td>Cumprimento de obrigação legal (Art. 7º, II)</td>
          </tr>
        </tbody>
      </table>

      <h2>3. Compartilhamento de Dados</h2>
      <p>Seus dados podem ser compartilhados com:</p>
      <ul>
        <li><strong>Hotmart:</strong> processamento de pagamentos</li>
        <li><strong>Supabase:</strong> armazenamento de dados (servidores nos EUA com cláusulas contratuais padrão)</li>
        <li><strong>OpenAI:</strong> processamento de IA para geração de scripts (dados anonimizados)</li>
        <li><strong>Vercel:</strong> hospedagem da aplicação</li>
      </ul>
      <p>
        <strong>Não vendemos, alugamos ou compartilhamos seus dados pessoais com terceiros para fins
        de marketing.</strong>
      </p>

      <h2>4. Seus Direitos (LGPD Art. 18)</h2>
      <p>Você tem direito a:</p>
      <ul>
        <li><strong>Acesso:</strong> solicitar uma cópia de todos os seus dados pessoais</li>
        <li><strong>Correção:</strong> corrigir dados incompletos ou desatualizados</li>
        <li><strong>Exclusão:</strong> solicitar a eliminação dos seus dados pessoais</li>
        <li><strong>Portabilidade:</strong> receber seus dados em formato estruturado</li>
        <li><strong>Revogação:</strong> revogar o consentimento a qualquer momento</li>
        <li><strong>Informação:</strong> saber com quem seus dados foram compartilhados</li>
      </ul>
      <p>
        Para exercer esses direitos, acesse <strong>Perfil → Meus Dados</strong> na plataforma ou
        entre em contato pelo email disponível no aplicativo. O prazo para atendimento é de até 15
        dias úteis.
      </p>

      <h2>5. Exportação e Exclusão de Dados</h2>
      <p>
        A plataforma oferece ferramentas de autoatendimento para:
      </p>
      <ul>
        <li><strong>Exportar seus dados:</strong> disponível em Perfil → Exportar Dados (formato JSON)</li>
        <li><strong>Excluir sua conta:</strong> disponível em Perfil → Excluir Conta (exclusão completa e irreversível)</li>
      </ul>

      <h2>6. Segurança dos Dados</h2>
      <p>Adotamos medidas técnicas e organizacionais para proteger seus dados, incluindo:</p>
      <ul>
        <li>Criptografia em trânsito (HTTPS/TLS)</li>
        <li>Criptografia de senhas com hashing seguro</li>
        <li>Controle de acesso baseado em funções (RBAC)</li>
        <li>Row Level Security (RLS) no banco de dados</li>
        <li>Autenticação via tokens seguros</li>
      </ul>

      <h2>7. Retenção de Dados</h2>
      <p>
        Seus dados são mantidos enquanto sua conta estiver ativa. Após exclusão da conta, os dados
        pessoais são removidos em até 30 dias, exceto quando a retenção for necessária por obrigação
        legal.
      </p>

      <h2>8. Cookies</h2>
      <p>
        Utilizamos cookies essenciais para autenticação e funcionamento da plataforma. Não utilizamos
        cookies de rastreamento de terceiros para publicidade.
      </p>

      <h2>9. Transferência Internacional de Dados</h2>
      <p>
        Seus dados podem ser processados em servidores fora do Brasil (EUA). Garantimos que essas
        transferências são protegidas por cláusulas contratuais padrão conforme Art. 33 da LGPD.
      </p>

      <h2>10. Alterações nesta Política</h2>
      <p>
        Podemos atualizar esta política periodicamente. Alterações significativas serão comunicadas
        por email ou notificação na plataforma.
      </p>

      <h2>11. Encarregado de Dados (DPO)</h2>
      <p>
        Para questões relacionadas à proteção de dados, entre em contato através do email disponível
        na plataforma.
      </p>
    </article>
  );
}
