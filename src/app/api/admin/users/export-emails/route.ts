import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { error, supabase } = await getAdminUser();
    if (error) return error;

    const { searchParams } = request.nextUrl;
    const format = searchParams.get('format') || 'csv';
    const plan = searchParams.get('plan') || null;

    // Fetch all users (no pagination - export all)
    async function fetchAllUsers() {
      // Strategy 1: Try RPC
      try {
        const { data: rpcResult, error: rpcError } = await supabase.rpc('admin_list_profiles', {
          p_plan: plan,
          p_search: null,
          p_limit: 10000,
          p_offset: 0,
        });
        if (!rpcError && rpcResult?.users) return rpcResult.users;
      } catch {
        // RPC not available
      }

      // Strategy 2: Service role client
      try {
        const adminClient = await createAdminClient();
        let query = adminClient
          .from('profiles')
          .select('id, email, full_name, plan, is_active, role, created_at, last_login_at')
          .order('created_at', { ascending: false });

        if (plan) query = query.eq('plan', plan);

        const { data, error: queryError } = await query;
        if (!queryError && data) return data;
      } catch {
        // Service role not available
      }

      // Strategy 3: Authenticated client
      let query = supabase
        .from('profiles')
        .select('id, email, full_name, plan, is_active, role, created_at, last_login_at')
        .order('created_at', { ascending: false });

      if (plan) query = query.eq('plan', plan);

      const { data, error: queryError } = await query;
      if (queryError) throw new Error(queryError.message);
      return data ?? [];
    }

    const users = await fetchAllUsers();

    if (format === 'json') {
      const jsonData = users.map((u: Record<string, unknown>) => ({
        email: u.email || '',
        nome: u.full_name || '',
        plano: u.plan || '',
        ativo: u.is_active ? 'Sim' : 'Não',
        role: u.role || '',
        criado_em: u.created_at || '',
        ultimo_login: u.last_login_at || '',
      }));

      return new NextResponse(JSON.stringify(jsonData, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="emails-usuarios-${new Date().toISOString().slice(0, 10)}.json"`,
        },
      });
    }

    // CSV format (default)
    const header = 'Email,Nome,Plano,Ativo,Role,Criado Em,Último Login';
    const rows = users.map((u: Record<string, unknown>) => {
      const email = String(u.email || '').replace(/"/g, '""');
      const name = String(u.full_name || '').replace(/"/g, '""');
      const planValue = String(u.plan || '');
      const active = u.is_active ? 'Sim' : 'Não';
      const role = String(u.role || '');
      const createdAt = u.created_at ? new Date(u.created_at as string).toLocaleDateString('pt-BR') : '';
      const lastLogin = u.last_login_at ? new Date(u.last_login_at as string).toLocaleDateString('pt-BR') : '';
      return `"${email}","${name}","${planValue}","${active}","${role}","${createdAt}","${lastLogin}"`;
    });

    const csv = [header, ...rows].join('\n');
    // BOM for proper Excel encoding
    const bom = '\uFEFF';

    return new NextResponse(bom + csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="emails-usuarios-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (err) {
    console.error('[admin/users/export-emails] Error:', err);
    return NextResponse.json(
      { error: 'Erro ao exportar emails' },
      { status: 500 }
    );
  }
}
