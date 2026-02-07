import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/admin/auth';

export async function GET(request: NextRequest) {
  try {
    const { error, supabase } = await getAdminUser();
    if (error) return error;

    const { searchParams } = request.nextUrl;
    const search = searchParams.get('search');
    const category = searchParams.get('category');

    let query = supabase
      .from('scripts')
      .select(`
        *,
        script_categories ( name, slug ),
        usage_count:script_usage ( count )
      `)
      .order('created_at', { ascending: false });

    if (search) {
      query = query.ilike('title', `%${search}%`);
    }

    if (category) {
      // Filter by category slug via a subquery approach:
      // First get category ID, then filter
      const { data: catData } = await supabase
        .from('script_categories')
        .select('id')
        .eq('slug', category)
        .single();

      if (catData) {
        query = query.eq('category_id', catData.id);
      }
    }

    const { data: scripts, error: queryError } = await query;

    if (queryError) {
      console.error('[admin/scripts] Error fetching scripts:', queryError);
      return NextResponse.json(
        { error: 'Failed to fetch scripts' },
        { status: 500 }
      );
    }

    const transformed = (scripts ?? []).map((s) => {
      const cats = s.script_categories as unknown;
      const categoryInfo =
        Array.isArray(cats) && cats.length > 0
          ? (cats[0] as { name: string; slug: string })
          : cats && typeof cats === 'object' && 'name' in cats
            ? (cats as { name: string; slug: string })
            : null;

      const usageCount =
        Array.isArray(s.usage_count) && s.usage_count.length > 0
          ? (s.usage_count[0] as { count: number }).count
          : 0;

      const { script_categories: _sc, usage_count: _uc, ...rest } = s;

      return {
        ...rest,
        category_name: categoryInfo?.name ?? null,
        category_slug: categoryInfo?.slug ?? null,
        usage_count: usageCount,
      };
    });

    return NextResponse.json({ scripts: transformed });
  } catch (err) {
    console.error('[admin/scripts] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { error, supabase } = await getAdminUser();
    if (error) return error;

    const body = await request.json();
    const {
      title,
      content,
      content_formal,
      content_direct,
      category_id,
      min_plan,
      objection_keywords,
      tags,
      is_active,
      context_description,
      display_order,
    } = body as {
      title: string;
      content: string;
      content_formal?: string;
      content_direct?: string;
      category_id: string;
      min_plan?: string;
      objection_keywords?: string[];
      tags?: string[];
      is_active?: boolean;
      context_description?: string;
      display_order?: number;
    };

    if (!title || !content || !category_id) {
      return NextResponse.json(
        { error: 'title, content, and category_id are required' },
        { status: 400 }
      );
    }

    const insertData: Record<string, unknown> = {
      title,
      content,
      category_id,
      content_formal: content_formal ?? null,
      content_direct: content_direct ?? null,
      min_plan: min_plan ?? 'starter',
      objection_keywords: objection_keywords ?? [],
      tags: tags ?? [],
      is_active: is_active !== undefined ? is_active : true,
      context_description: context_description ?? '',
      display_order: display_order ?? 0,
    };

    const { data: script, error: insertError } = await supabase
      .from('scripts')
      .insert(insertData)
      .select()
      .single();

    if (insertError) {
      console.error('[admin/scripts] Error creating script:', insertError);
      return NextResponse.json(
        { error: 'Failed to create script' },
        { status: 500 }
      );
    }

    return NextResponse.json({ script }, { status: 201 });
  } catch (err) {
    console.error('[admin/scripts] Unexpected error:', err);
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
        { error: 'Script id is required' },
        { status: 400 }
      );
    }

    const updates = {
      ...fields,
      updated_at: new Date().toISOString(),
    };

    const { data: script, error: updateError } = await supabase
      .from('scripts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('[admin/scripts] Error updating script:', updateError);
      return NextResponse.json(
        { error: 'Failed to update script' },
        { status: 500 }
      );
    }

    return NextResponse.json({ script });
  } catch (err) {
    console.error('[admin/scripts] Unexpected error:', err);
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
        { error: 'Script id is required' },
        { status: 400 }
      );
    }

    const { error: deleteError } = await supabase
      .from('scripts')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('[admin/scripts] Error deleting script:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete script' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[admin/scripts] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
