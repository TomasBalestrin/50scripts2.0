import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/admin/auth';

export async function GET() {
  try {
    const { error, supabase } = await getAdminUser();
    if (error) return error;

    const { data: prompts, error: queryError } = await supabase
      .from('ai_prompts')
      .select('*')
      .order('created_at', { ascending: false });

    if (queryError) {
      console.error('[admin/prompts] Error fetching prompts:', queryError);
      return NextResponse.json(
        { error: 'Failed to fetch prompts' },
        { status: 500 }
      );
    }

    return NextResponse.json({ prompts: prompts ?? [] });
  } catch (err) {
    console.error('[admin/prompts] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { error, supabase, user } = await getAdminUser();
    if (error) return error;

    const body = await request.json();
    const {
      name,
      type,
      system_prompt,
      user_prompt_template,
      model,
      temperature,
      max_tokens,
      is_active,
    } = body as {
      name: string;
      type: string;
      system_prompt: string;
      user_prompt_template: string;
      model?: string;
      temperature?: number;
      max_tokens?: number;
      is_active?: boolean;
    };

    if (!name || !type || !system_prompt || !user_prompt_template) {
      return NextResponse.json(
        { error: 'name, type, system_prompt, and user_prompt_template are required' },
        { status: 400 }
      );
    }

    const insertData: Record<string, unknown> = {
      name,
      type,
      system_prompt,
      user_prompt_template,
      model: model ?? 'gpt-4o-mini',
      temperature: temperature ?? 0.7,
      max_tokens: max_tokens ?? 1024,
      is_active: is_active !== undefined ? is_active : true,
      version: 1,
      created_by: user.id,
    };

    const { data: prompt, error: insertError } = await supabase
      .from('ai_prompts')
      .insert(insertData)
      .select()
      .single();

    if (insertError) {
      console.error('[admin/prompts] Error creating prompt:', insertError);
      return NextResponse.json(
        { error: 'Failed to create prompt' },
        { status: 500 }
      );
    }

    return NextResponse.json({ prompt }, { status: 201 });
  } catch (err) {
    console.error('[admin/prompts] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { error, supabase } = await getAdminUser();
    if (error) return error;

    const body = await request.json();
    const { id, ...fields } = body as { id?: string; [key: string]: unknown };

    if (!id) {
      return NextResponse.json(
        { error: 'Prompt id is required' },
        { status: 400 }
      );
    }

    // Fetch current version to auto-increment
    const { data: existing } = await supabase
      .from('ai_prompts')
      .select('version')
      .eq('id', id)
      .single();

    const currentVersion = existing?.version ?? 0;

    const updates = {
      ...fields,
      version: currentVersion + 1,
      updated_at: new Date().toISOString(),
    };

    const { data: prompt, error: updateError } = await supabase
      .from('ai_prompts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('[admin/prompts] Error updating prompt:', updateError);
      return NextResponse.json(
        { error: 'Failed to update prompt' },
        { status: 500 }
      );
    }

    return NextResponse.json({ prompt });
  } catch (err) {
    console.error('[admin/prompts] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { error, supabase } = await getAdminUser();
    if (error) return error;

    const body = await request.json();
    const { id } = body as { id?: string };

    if (!id) {
      return NextResponse.json(
        { error: 'Prompt id is required' },
        { status: 400 }
      );
    }

    const { error: deleteError } = await supabase
      .from('ai_prompts')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('[admin/prompts] Error deleting prompt:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete prompt' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[admin/prompts] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
