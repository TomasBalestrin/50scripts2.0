import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import fs from 'fs';
import path from 'path';

export async function POST() {
  // Auth check: must be admin
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }

  const adminClient = await createAdminClient();

  // Read the migration SQL file
  const migrationPath = path.join(process.cwd(), 'supabase/migrations/011_script_go.sql');

  let sql: string;
  try {
    sql = fs.readFileSync(migrationPath, 'utf-8');
  } catch {
    return NextResponse.json({ error: 'Migration file not found' }, { status: 404 });
  }

  // Split by major sections and execute each
  // We split on the section separator comments to handle errors per section
  const sections = sql
    .split(/-- ={60,}/)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('-- MIGRATION'));

  const results: Array<{ section: number; status: string; error?: string }> = [];

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    // Skip pure comment sections
    if (section.split('\n').every(line => line.trim().startsWith('--') || line.trim() === '')) {
      continue;
    }

    const { error } = await adminClient.rpc('exec_sql', { sql_text: section }).maybeSingle();

    if (error) {
      // Try direct SQL via REST if RPC not available
      const directResult = await adminClient.from('app_config').select('key').limit(0);
      if (directResult.error) {
        results.push({ section: i + 1, status: 'error', error: error.message });
      } else {
        // RPC not available, we'll need to run SQL statements individually
        results.push({ section: i + 1, status: 'skipped', error: 'exec_sql RPC not available - run SQL manually in Supabase Dashboard' });
      }
    } else {
      results.push({ section: i + 1, status: 'success' });
    }
  }

  return NextResponse.json({
    message: 'Migration processing complete. If exec_sql RPC is not available, copy the SQL from supabase/migrations/011_script_go.sql and run it in the Supabase SQL Editor.',
    results,
    sql_preview: sql.substring(0, 500) + '...',
  });
}
