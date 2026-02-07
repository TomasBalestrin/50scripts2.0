import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/admin/auth';

export async function GET() {
  try {
    const { error, supabase } = await getAdminUser();
    if (error) return error;

    const { data: categories, error: queryError } = await supabase
      .from('script_categories')
      .select(`
        *,
        scripts_count:scripts ( count )
      `)
      .order('display_order', { ascending: true });

    if (queryError) {
      console.error('[admin/categories] Error fetching categories:', queryError);
      return NextResponse.json(
        { error: 'Failed to fetch categories' },
        { status: 500 }
      );
    }

    const transformed = (categories ?? []).map((cat) => ({
      ...cat,
      scripts_count:
        Array.isArray(cat.scripts_count) && cat.scripts_count.length > 0
          ? (cat.scripts_count[0] as { count: number }).count
          : 0,
    }));

    return NextResponse.json({ categories: transformed });
  } catch (err) {
    console.error('[admin/categories] Unexpected error:', err);
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
    const { name, slug, description, emoji, display_order, icon, color } = body as {
      name: string;
      slug: string;
      description?: string;
      emoji?: string;
      display_order?: number;
      icon?: string;
      color?: string;
    };

    if (!name || !slug) {
      return NextResponse.json(
        { error: 'name and slug are required' },
        { status: 400 }
      );
    }

    const insertData: Record<string, unknown> = {
      name,
      slug,
      description: description ?? '',
      icon: emoji ?? icon ?? '',
      color: color ?? '#6B7280',
      display_order: display_order ?? 0,
      is_active: true,
    };

    const { data: category, error: insertError } = await supabase
      .from('script_categories')
      .insert(insertData)
      .select()
      .single();

    if (insertError) {
      console.error('[admin/categories] Error creating category:', insertError);
      return NextResponse.json(
        { error: 'Failed to create category' },
        { status: 500 }
      );
    }

    return NextResponse.json({ category }, { status: 201 });
  } catch (err) {
    console.error('[admin/categories] Unexpected error:', err);
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
        { error: 'Category id is required' },
        { status: 400 }
      );
    }

    // Map emoji to icon if provided
    if ('emoji' in fields && !('icon' in fields)) {
      fields.icon = fields.emoji;
      delete fields.emoji;
    }

    const { data: category, error: updateError } = await supabase
      .from('script_categories')
      .update(fields)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('[admin/categories] Error updating category:', updateError);
      return NextResponse.json(
        { error: 'Failed to update category' },
        { status: 500 }
      );
    }

    return NextResponse.json({ category });
  } catch (err) {
    console.error('[admin/categories] Unexpected error:', err);
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
        { error: 'Category id is required' },
        { status: 400 }
      );
    }

    // Check if category has scripts
    const { count } = await supabase
      .from('scripts')
      .select('id', { count: 'exact', head: true })
      .eq('category_id', id);

    if (count && count > 0) {
      return NextResponse.json(
        { error: `Cannot delete category with ${count} scripts. Move or delete scripts first.` },
        { status: 409 }
      );
    }

    const { error: deleteError } = await supabase
      .from('script_categories')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('[admin/categories] Error deleting category:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete category' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[admin/categories] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
