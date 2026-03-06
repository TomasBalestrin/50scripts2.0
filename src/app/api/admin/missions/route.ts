import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/admin/auth';
import { cachedJson } from '@/lib/api-cache';

export async function GET() {
  try {
    const { error, supabase } = await getAdminUser();
    if (error) return error;

    const { data: missions, error: queryError } = await supabase
      .from('missions')
      .select('id, title, description, is_active, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(200);

    if (queryError) {
      console.error('[admin/missions] Error fetching missions:', queryError);
      return NextResponse.json(
        { error: 'Failed to fetch missions' },
        { status: 500 }
      );
    }

    return cachedJson({ missions: missions ?? [] }, { maxAge: 300, staleWhileRevalidate: 600 });
  } catch (err) {
    console.error('[admin/missions] Unexpected error:', err);
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
    const { title, description, is_active } = body as {
      title: string;
      description?: string;
      is_active?: boolean;
    };

    if (!title) {
      return NextResponse.json(
        { error: 'title is required' },
        { status: 400 }
      );
    }

    const { data: mission, error: insertError } = await supabase
      .from('missions')
      .insert({
        title,
        description: description ?? '',
        is_active: is_active !== undefined ? is_active : true,
        created_by: user.id,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[admin/missions] Error creating mission:', insertError);
      return NextResponse.json(
        { error: 'Failed to create mission' },
        { status: 500 }
      );
    }

    return NextResponse.json({ mission }, { status: 201 });
  } catch (err) {
    console.error('[admin/missions] Unexpected error:', err);
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
        { error: 'Mission id is required' },
        { status: 400 }
      );
    }

    const { data: mission, error: updateError } = await supabase
      .from('missions')
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('[admin/missions] Error updating mission:', updateError);
      return NextResponse.json(
        { error: 'Failed to update mission' },
        { status: 500 }
      );
    }

    return NextResponse.json({ mission });
  } catch (err) {
    console.error('[admin/missions] Unexpected error:', err);
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
        { error: 'Mission id is required' },
        { status: 400 }
      );
    }

    const { error: deleteError } = await supabase
      .from('missions')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('[admin/missions] Error deleting mission:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete mission' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[admin/missions] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
