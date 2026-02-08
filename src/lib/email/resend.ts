// Email service using Resend
// Requires: npm install resend
// Gracefully handles the case where resend is not installed

let ResendClient: any = null;

try {
  const mod = require('resend');
  ResendClient = mod.Resend || mod.default?.Resend;
} catch {
  // Resend not installed - email features will log instead of sending
}

function getResend() {
  if (!ResendClient || !process.env.RESEND_API_KEY) return null;
  return new ResendClient(process.env.RESEND_API_KEY);
}

const FROM_EMAIL = process.env.FROM_EMAIL || '50 Scripts <noreply@50scripts.com>';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://50scripts.com';

type EmailResult = { success: boolean; error?: string };

function baseTemplate(content: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>50 Scripts 2.0</title></head>
<body style="margin:0;padding:0;background-color:#0F0F14;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0F0F14;">
<tr><td align="center" style="padding:40px 16px;">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background-color:#0F1D32;border-radius:12px;overflow:hidden;border:1px solid #2A2A3E;">
<tr><td style="padding:32px 40px 24px;text-align:center;border-bottom:1px solid #2A2A3E;">
<h1 style="margin:0;font-size:28px;font-weight:800;"><span style="color:#C9A84C;">50</span><span style="color:#FFFFFF;"> Scripts </span><span style="color:#C9A84C;">2.0</span></h1>
</td></tr>
<tr><td style="padding:40px;">${content}</td></tr>
<tr><td style="padding:24px 40px;text-align:center;border-top:1px solid #2A2A3E;">
<p style="margin:0;font-size:12px;color:#6B7280;">Você está recebendo este email porque é usuário do 50 Scripts 2.0.</p>
</td></tr>
</table></td></tr></table></body></html>`;
}

function ctaButton(text: string, href: string): string {
  return `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:32px auto 0;">
<tr><td align="center" style="border-radius:8px;background-color:#C9A84C;">
<a href="${href}" target="_blank" style="display:inline-block;padding:14px 32px;font-size:16px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:8px;background-color:#C9A84C;">${text}</a>
</td></tr></table>`;
}

function heading(text: string): string {
  return `<h2 style="margin:0 0 16px;font-size:24px;font-weight:700;color:#FFFFFF;">${text}</h2>`;
}

function paragraph(text: string): string {
  return `<p style="margin:0 0 16px;font-size:16px;color:#D1D5DB;line-height:1.6;">${text}</p>`;
}

async function sendEmail(to: string, subject: string, html: string): Promise<EmailResult> {
  const resend = getResend();
  if (!resend) {
    console.log(`[email] Would send to ${to}: ${subject}`);
    return { success: true };
  }
  try {
    await resend.emails.send({ from: FROM_EMAIL, to, subject, html });
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[email] Error:', message);
    return { success: false, error: message };
  }
}

export async function sendWelcomeEmail(to: string, name: string): Promise<EmailResult> {
  const html = baseTemplate(`
    ${heading(`Bem-vindo ao 50 Scripts 2.0, ${name}!`)}
    ${paragraph('Estamos felizes em ter você conosco. Comece explorando as trilhas de scripts.')}
    ${ctaButton('Acessar Plataforma', APP_URL)}
  `);
  return sendEmail(to, 'Bem-vindo ao 50 Scripts 2.0!', html);
}

export async function sendPasswordResetEmail(to: string, resetLink: string): Promise<EmailResult> {
  const html = baseTemplate(`
    ${heading('Redefinir sua senha')}
    ${paragraph('Clique no botão abaixo para criar uma nova senha. O link expira em 24 horas.')}
    ${ctaButton('Redefinir Senha', resetLink)}
  `);
  return sendEmail(to, 'Redefinir sua senha - 50 Scripts 2.0', html);
}

export async function sendPlanUpgradeEmail(to: string, name: string, plan: string): Promise<EmailResult> {
  const html = baseTemplate(`
    ${heading(`Parabéns, ${name}! Agora você é ${plan}!`)}
    ${paragraph('Seu plano foi atualizado. Explore os novos recursos desbloqueados.')}
    ${ctaButton('Explorar Novidades', `${APP_URL}/`)}
  `);
  return sendEmail(to, `Parabéns! Agora você é ${plan}`, html);
}

export async function sendPlanDowngradeEmail(to: string, name: string): Promise<EmailResult> {
  const html = baseTemplate(`
    ${heading(`${name}, seu plano foi cancelado`)}
    ${paragraph('Lamentamos. Você pode reativar a qualquer momento.')}
    ${ctaButton('Reativar Plano', `${APP_URL}/upgrade`)}
  `);
  return sendEmail(to, 'Seu plano foi cancelado', html);
}

export async function sendWeeklyDigestEmail(
  to: string,
  name: string,
  stats: { scripts_used: number; sales: number; revenue: number; streak: number; xp_earned: number }
): Promise<EmailResult> {
  const rev = `R$ ${stats.revenue.toLocaleString('pt-BR')}`;
  const html = baseTemplate(`
    ${heading(`Resumo semanal, ${name}`)}
    ${paragraph(`Scripts: ${stats.scripts_used} | Vendas: ${stats.sales} | Receita: ${rev} | Streak: ${stats.streak} dias | XP: +${stats.xp_earned}`)}
    ${ctaButton('Ver Dashboard', `${APP_URL}/`)}
  `);
  return sendEmail(to, `Resumo semanal - ${stats.sales} vendas, ${rev}`, html);
}

export async function sendReferralRewardEmail(to: string, name: string, reward: string): Promise<EmailResult> {
  const html = baseTemplate(`
    ${heading(`${name}, você ganhou uma recompensa!`)}
    ${paragraph(`Sua indicação deu certo! Recompensa: ${reward}`)}
    ${ctaButton('Ver Indicações', `${APP_URL}/referrals`)}
  `);
  return sendEmail(to, 'Você ganhou uma recompensa!', html);
}

export async function sendPaymentFailedEmail(to: string, name: string): Promise<EmailResult> {
  const html = baseTemplate(`
    ${heading('Problema com seu pagamento')}
    ${paragraph(`${name}, houve uma falha na cobrança. Atualize seus dados de pagamento.`)}
    ${ctaButton('Atualizar Pagamento', `${APP_URL}/upgrade`)}
  `);
  return sendEmail(to, 'Problema com seu pagamento - Ação necessária', html);
}
