import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { ModuleToggles } from '@/types/database';

const DEFAULT_TOGGLES: ModuleToggles = {
  gestao: true,
  scripts: true,
  personalizados: true,
  buscar: true,
};

export async function GET() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', 'module_toggles')
      .single();

    if (error || !data) {
      return NextResponse.json(DEFAULT_TOGGLES);
    }

    const toggles: ModuleToggles = {
      gestao: data.value?.gestao ?? true,
      scripts: data.value?.scripts ?? true,
      personalizados: data.value?.personalizados ?? true,
      buscar: data.value?.buscar ?? true,
    };

    return NextResponse.json(toggles);
  } catch {
    return NextResponse.json(DEFAULT_TOGGLES);
  }
}
