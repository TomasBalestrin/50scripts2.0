import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getAdminUser } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/server';

interface CsvRow {
  email: string;
  name: string;
}

function parseCsv(text: string): CsvRow[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length === 0) return [];

  // Detect separator (comma or semicolon)
  const firstLine = lines[0];
  const separator = firstLine.includes(';') ? ';' : ',';

  // Find email and name column indices from header
  const headers = lines[0].split(separator).map((h) => h.trim().toLowerCase().replace(/['"]/g, ''));

  const emailIdx = headers.findIndex((h) =>
    ['email', 'e-mail', 'e_mail', 'emailaddress', 'email_address'].includes(h)
  );
  const nameIdx = headers.findIndex((h) =>
    ['name', 'nome', 'full_name', 'fullname', 'nome_completo', 'nome completo'].includes(h)
  );

  if (emailIdx === -1) {
    // If no header found, assume first column is email, second is name
    // Check if first line looks like an email
    const possibleEmail = lines[0].split(separator)[0].trim().replace(/['"]/g, '');
    if (possibleEmail.includes('@')) {
      // No header row, parse all lines
      return lines.map((line) => {
        const cols = line.split(separator).map((c) => c.trim().replace(/['"]/g, ''));
        return {
          email: cols[0] || '',
          name: cols[1] || '',
        };
      }).filter((row) => row.email.includes('@'));
    }
    return [];
  }

  // Skip header, parse data rows
  return lines.slice(1).map((line) => {
    const cols = line.split(separator).map((c) => c.trim().replace(/['"]/g, ''));
    return {
      email: cols[emailIdx] || '',
      name: nameIdx >= 0 ? cols[nameIdx] || '' : '',
    };
  }).filter((row) => row.email.includes('@'));
}

export async function POST(request: NextRequest) {
  try {
    const { error } = await getAdminUser();
    if (error) return error;

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const password = (formData.get('password') as string) || 'performance123';
    const plan = (formData.get('plan') as string) || 'starter';

    if (!file) {
      return NextResponse.json({ error: 'Arquivo CSV é obrigatório' }, { status: 400 });
    }

    const text = await file.text();
    const rows = parseCsv(text);

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum usuário válido encontrado no CSV. Verifique se tem coluna "email" ou "nome".' },
        { status: 400 }
      );
    }

    if (rows.length > 5000) {
      return NextResponse.json(
        { error: `CSV tem ${rows.length} linhas. Máximo permitido: 5000.` },
        { status: 400 }
      );
    }

    const adminClient = await createAdminClient();

    const results = {
      total: rows.length,
      created: 0,
      duplicates: 0,
      errors: [] as { email: string; error: string }[],
    };

    // Process in batches of 10 to avoid rate limits
    const BATCH_SIZE = 10;
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);

      const promises = batch.map(async (row) => {
        const email = row.email.toLowerCase().trim();
        const name = row.name.trim();

        try {
          // Create auth user
          const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
          });

          if (authError) {
            const isDuplicate =
              authError.message?.toLowerCase().includes('already') ||
              authError.message?.toLowerCase().includes('duplicate');

            if (isDuplicate) {
              results.duplicates++;
              return;
            }

            results.errors.push({ email, error: authError.message });
            return;
          }

          if (!authData.user) {
            results.errors.push({ email, error: 'Auth user not returned' });
            return;
          }

          const userId = authData.user.id;
          const referralCode = crypto.randomBytes(4).toString('hex').toUpperCase();

          // Create profile
          const { error: profileError } = await adminClient.from('profiles').upsert({
            id: userId,
            email,
            full_name: name,
            plan,
            role: 'user',
            is_active: true,
            preferred_tone: 'casual',
            onboarding_completed: false,
            xp_points: 0,
            level: 'iniciante',
            current_streak: 0,
            longest_streak: 0,
            ai_credits_remaining: 0,
            ai_credits_monthly: 0,
            saved_variables: {},
            notification_prefs: {},
            referral_code: referralCode,
            password_changed: false,
          }, { onConflict: 'id' });

          if (profileError) {
            results.errors.push({ email, error: `Profile: ${profileError.message}` });
            return;
          }

          results.created++;
        } catch (err) {
          results.errors.push({
            email,
            error: err instanceof Error ? err.message : 'Unknown error',
          });
        }
      });

      await Promise.all(promises);
    }

    return NextResponse.json({
      success: true,
      ...results,
      errors: results.errors.slice(0, 50), // Limit error details
    });
  } catch (err) {
    console.error('[admin/users/bulk-import] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
