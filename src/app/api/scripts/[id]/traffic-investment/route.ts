import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET - list traffic investments for a script
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

    const { data: investments, error } = await supabase
      .from('traffic_investments')
      .select('*')
      .eq('script_id', scriptId)
      .eq('user_id', user.id)
      .order('investment_date', { ascending: false });

    if (error) {
      console.error('[scripts/id/traffic-investment] GET error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch investments' },
        { status: 500 }
      );
    }

    return NextResponse.json({ investments: investments ?? [] });
  } catch (error) {
    console.error('[scripts/id/traffic-investment] GET unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - create a new traffic investment
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
    const { investment_date, investment_value } = body;

    if (!investment_date || investment_value == null) {
      return NextResponse.json(
        { error: 'investment_date and investment_value are required' },
        { status: 400 }
      );
    }

    const { data: investment, error } = await supabase
      .from('traffic_investments')
      .insert({
        user_id: user.id,
        script_id: scriptId,
        investment_date,
        investment_value: Number(investment_value),
      })
      .select()
      .single();

    if (error) {
      console.error('[scripts/id/traffic-investment] POST error:', error.message, error.code);
      return NextResponse.json(
        { error: `Erro ao salvar investimento: ${error.message}` },
        { status: 500 }
      );
    }

    // Award +10 cyclic XP for registering an investment
    try {
      await supabase.rpc('add_cyclic_xp', { p_user_id: user.id, p_xp: 10 });
    } catch (xpError) {
      console.error('[scripts/id/traffic-investment] XP award error:', xpError);
    }

    return NextResponse.json({ investment }, { status: 201 });
  } catch (error) {
    console.error('[scripts/id/traffic-investment] POST unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - update a traffic investment
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
    const { id, investment_date, investment_value } = body;

    if (!id || !investment_date || investment_value == null) {
      return NextResponse.json(
        { error: 'id, investment_date, and investment_value are required' },
        { status: 400 }
      );
    }

    const { data: investment, error } = await supabase
      .from('traffic_investments')
      .update({
        investment_date,
        investment_value: Number(investment_value),
      })
      .eq('id', id)
      .eq('script_id', scriptId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('[scripts/id/traffic-investment] PUT error:', error);
      return NextResponse.json(
        { error: 'Failed to update investment' },
        { status: 500 }
      );
    }

    return NextResponse.json({ investment });
  } catch (error) {
    console.error('[scripts/id/traffic-investment] PUT unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - delete a traffic investment
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
      .from('traffic_investments')
      .delete()
      .eq('id', id)
      .eq('script_id', scriptId)
      .eq('user_id', user.id);

    if (error) {
      console.error('[scripts/id/traffic-investment] DELETE error:', error);
      return NextResponse.json(
        { error: 'Failed to delete investment' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[scripts/id/traffic-investment] DELETE unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
