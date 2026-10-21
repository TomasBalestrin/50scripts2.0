import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminUser } from '@/lib/admin/auth';
import { lerConfig, salvarConfig } from '@/lib/bethel-forms/config';
import { buscarCampos, formsConfigurado, garantirMotorNoForms } from '@/lib/bethel-forms/cliente';
import { completarConfig, validarConfig } from '@/lib/bethel-forms/mapeamento';
import { PERGUNTAS, camposDoMotor } from '@/lib/bethel-forms/perguntas';
import type { ConfigBethelForms } from '@/lib/bethel-forms/tipos';

const texto = z.string().trim().min(1).max(200);
const bodySchema = z.object({
  ativo: z.boolean().optional(),
  destino: z
    .object({
      especialistaId: z.string().uuid(),
      especialistaNome: texto,
      grupoId: z.string().uuid(),
      grupoNome: texto,
      funilId: z.string().uuid(),
      funilNome: texto,
    })
    .optional(),
  campos: z
    .record(
      z.string(),
      z.object({ alvoId: z.string().uuid().nullable(), opcoes: z.record(z.string(), z.string()).default({}) })
    )
    .optional(),
  prioridadeDesafios: z.array(z.string()).optional(),
});

/** GET /api/admin/bethel-forms/config — configuração atual + se as envs da conta estão no ar. */
export async function GET() {
  const { error } = await getAdminUser();
  if (error) return error;
  try {
    return NextResponse.json({ config: await lerConfig(), formsConfigurado: formsConfigurado() });
  } catch (err) {
    console.error('[admin/bethel-forms/config] GET:', err);
    return NextResponse.json({ error: 'Erro ao ler a configuração' }, { status: 500 });
  }
}

/**
 * PUT /api/admin/bethel-forms/config
 * · com `destino`: grava destino + mapeamento. Confere tudo contra os campos ATUAIS do funil, garante o motor no Forms
 *   (cria se não existir) e só então salva;
 * · só com `ativo`: liga/desliga o envio ao vivo (precisa de destino já salvo). A primeira vez que liga grava `ativadoEm`
 *   — o corte do SQL do retroativo.
 */
export async function PUT(request: NextRequest) {
  const { error } = await getAdminUser();
  if (error) return error;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }, { status: 400 });
  }
  const body = parsed.data;

  try {
    const atual = await lerConfig();
    let proxima: ConfigBethelForms = { ...atual };
    let motor: { status: string; criado: boolean } | null = null;

    if (body.destino) {
      if (!formsConfigurado()) {
        return NextResponse.json({ error: 'Faltam BETHEL_FORMS_URL e BETHEL_FORMS_API_KEY nas variáveis de ambiente.' }, { status: 422 });
      }
      const chavesConhecidas = new Set<string>(PERGUNTAS.map((p) => p.chave));
      const campos: ConfigBethelForms['campos'] = {};
      for (const [chave, m] of Object.entries(body.campos ?? {})) {
        if (chavesConhecidas.has(chave)) {
          campos[chave as keyof ConfigBethelForms['campos']] = { alvoId: m.alvoId, alvoTipo: null, alvoTemOpcoes: false, opcoes: m.opcoes };
        }
      }

      const doFunil = await buscarCampos(body.destino.funilId);
      if (!doFunil.ok) return NextResponse.json({ error: doFunil.erro }, { status: 502 });

      proxima = completarConfig(
        { ...atual, destino: body.destino, campos, prioridadeDesafios: body.prioridadeDesafios ?? atual.prioridadeDesafios },
        doFunil.campos
      );
      const problemas = validarConfig(proxima, doFunil.campos);
      if (problemas.length > 0) return NextResponse.json({ error: 'Configuração incompleta', problemas }, { status: 422 });

      const garantido = await garantirMotorNoForms(body.destino.funilId, camposDoMotor(proxima.campos));
      if (!garantido.ok) return NextResponse.json({ error: garantido.erro }, { status: 502 });
      proxima.motorId = garantido.motorId;
      motor = { status: garantido.status, criado: garantido.criado };
    }

    if (body.ativo !== undefined) {
      if (body.ativo && (!proxima.motorId || !proxima.destino)) {
        return NextResponse.json({ error: 'Salve o destino e o mapeamento antes de ligar o envio.' }, { status: 422 });
      }
      if (body.ativo && !formsConfigurado()) {
        return NextResponse.json({ error: 'Faltam BETHEL_FORMS_URL e BETHEL_FORMS_API_KEY nas variáveis de ambiente.' }, { status: 422 });
      }
      proxima.ativo = body.ativo;
      if (body.ativo && !proxima.ativadoEm) proxima.ativadoEm = new Date().toISOString();
    }

    await salvarConfig(proxima);
    return NextResponse.json({ config: proxima, motor });
  } catch (err) {
    console.error('[admin/bethel-forms/config] PUT:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erro ao salvar a configuração' }, { status: 500 });
  }
}
