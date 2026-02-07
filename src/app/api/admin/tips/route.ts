import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/admin/auth';

export async function GET() {
  try {
    const { error, supabase } = await getAdminUser();
    if (error) return error;

    const { data: tips, error: queryError } = await supabase
      .from('microlearning_tips')
      .select('*')
      .order('created_at', { ascending: false });

    if (queryError) {
      console.error('[admin/tips] Error fetching tips:', queryError);
      return NextResponse.json(
        { error: 'Failed to fetch tips' },
        { status: 500 }
      );
    }

    return NextResponse.json({ tips: tips ?? [] });
  } catch (err) {
    console.error('[admin/tips] Unexpected error:', err);
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
    const { content, category, is_active } = body as {
      content: string;
      category?: string;
      is_active?: boolean;
    };

    if (!content) {
      return NextResponse.json(
        { error: 'content is required' },
        { status: 400 }
      );
    }

    const insertData: Record<string, unknown> = {
      content,
      category: category ?? null,
      is_active: is_active !== undefined ? is_active : true,
      display_count: 0,
      created_by: user.id,
    };

    const { data: tip, error: insertError } = await supabase
      .from('microlearning_tips')
      .insert(insertData)
      .select()
      .single();

    if (insertError) {
      console.error('[admin/tips] Error creating tip:', insertError);
      return NextResponse.json(
        { error: 'Failed to create tip' },
        { status: 500 }
      );
    }

    return NextResponse.json({ tip }, { status: 201 });
  } catch (err) {
    console.error('[admin/tips] Unexpected error:', err);
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
        { error: 'Tip id is required' },
        { status: 400 }
      );
    }

    const { data: tip, error: updateError } = await supabase
      .from('microlearning_tips')
      .update(fields)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('[admin/tips] Error updating tip:', updateError);
      return NextResponse.json(
        { error: 'Failed to update tip' },
        { status: 500 }
      );
    }

    return NextResponse.json({ tip });
  } catch (err) {
    console.error('[admin/tips] Unexpected error:', err);
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
        { error: 'Tip id is required' },
        { status: 400 }
      );
    }

    const { error: deleteError } = await supabase
      .from('microlearning_tips')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('[admin/tips] Error deleting tip:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete tip' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[admin/tips] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
