import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET - list sales for a script
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: scriptId } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { data: sales, error } = await supabase
      .from('script_sales')
      .select('*')
      .eq('script_id', scriptId)
      .eq('user_id', user.id)
      .order('sale_date', { ascending: false });

    if (error) {
      console.error('[scripts/id/sale] GET error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch sales' },
        { status: 500 }
      );
    }

    return NextResponse.json({ sales: sales ?? [] });
  } catch (error) {
    console.error('[scripts/id/sale] GET unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - create a new sale
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: scriptId } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { product_name, sale_date, sale_value } = body;

    if (!product_name || !sale_date || sale_value == null) {
      return NextResponse.json(
        { error: 'product_name, sale_date, and sale_value are required' },
        { status: 400 }
      );
    }

    const { data: sale, error } = await supabase
      .from('script_sales')
      .insert({
        user_id: user.id,
        script_id: scriptId,
        product_name,
        sale_date,
        sale_value: Number(sale_value),
      })
      .select()
      .single();

    if (error) {
      console.error('[scripts/id/sale] POST error:', error);
      return NextResponse.json(
        { error: 'Failed to create sale' },
        { status: 500 }
      );
    }

    // Award +5 cyclic XP
    try {
      await supabase.rpc('add_cyclic_xp', { p_user_id: user.id, p_xp: 5 });
    } catch (xpError) {
      console.error('[scripts/id/sale] XP award error:', xpError);
      // Non-blocking: sale was already created
    }

    return NextResponse.json({ sale }, { status: 201 });
  } catch (error) {
    console.error('[scripts/id/sale] POST unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - update a sale
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: scriptId } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { id, product_name, sale_date, sale_value } = body;

    if (!id || !product_name || !sale_date || sale_value == null) {
      return NextResponse.json(
        { error: 'id, product_name, sale_date, and sale_value are required' },
        { status: 400 }
      );
    }

    const { data: sale, error } = await supabase
      .from('script_sales')
      .update({
        product_name,
        sale_date,
        sale_value: Number(sale_value),
      })
      .eq('id', id)
      .eq('script_id', scriptId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('[scripts/id/sale] PUT error:', error);
      return NextResponse.json(
        { error: 'Failed to update sale' },
        { status: 500 }
      );
    }

    return NextResponse.json({ sale });
  } catch (error) {
    console.error('[scripts/id/sale] PUT unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - delete a sale
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: scriptId } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('script_sales')
      .delete()
      .eq('id', id)
      .eq('script_id', scriptId)
      .eq('user_id', user.id);

    if (error) {
      console.error('[scripts/id/sale] DELETE error:', error);
      return NextResponse.json(
        { error: 'Failed to delete sale' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[scripts/id/sale] DELETE unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
