import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    
    // Get user from auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('account_id')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = supabase
      .from('trades')
      .select(`
        *,
        mt_accounts!inner(
          id,
          account_login,
          broker_name,
          user_id
        )
      `)
      .eq('mt_accounts.user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (accountId) {
      query = query.eq('account_id', accountId)
    }

    const { data: trades, error } = await query

    if (error) {
      console.error('Error fetching trades:', error)
      return NextResponse.json({ error: 'Failed to fetch trades' }, { status: 500 })
    }

    return NextResponse.json({ trades })
  } catch (error) {
    console.error('Error in trades API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    
    // Get user from auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tradeData = await request.json()

    // Validate required fields
    const requiredFields = ['account_id', 'ticket', 'symbol', 'trade_type', 'lot_size']
    for (const field of requiredFields) {
      if (!tradeData[field]) {
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 })
      }
    }

    // Verify account belongs to user
    const { data: account, error: accountError } = await supabase
      .from('mt_accounts')
      .select('id')
      .eq('id', tradeData.account_id)
      .eq('user_id', user.id)
      .single()

    if (accountError || !account) {
      return NextResponse.json({ error: 'Account not found or unauthorized' }, { status: 403 })
    }

    // Insert trade
    const { data: trade, error } = await supabase
      .from('trades')
      .insert({
        account_id: tradeData.account_id,
        ticket: tradeData.ticket,
        symbol: tradeData.symbol,
        trade_type: tradeData.trade_type,
        lot_size: tradeData.lot_size,
        open_price: tradeData.open_price || null,
        close_price: tradeData.close_price || null,
        stop_loss: tradeData.stop_loss || null,
        take_profit: tradeData.take_profit || null,
        commission: tradeData.commission || 0,
        swap: tradeData.swap || 0,
        profit: tradeData.profit || 0,
        magic_number: tradeData.magic_number || 0,
        comment: tradeData.comment || null,
        open_time: tradeData.open_time || new Date().toISOString(),
        close_time: tradeData.close_time || null,
        status: tradeData.status || 'open',
        is_copied_trade: tradeData.is_copied_trade || false,
        master_trade_id: tradeData.master_trade_id || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating trade:', error)
      return NextResponse.json({ error: 'Failed to create trade' }, { status: 500 })
    }

    // If this is a master account trade, trigger copy operations
    if (!tradeData.is_copied_trade) {
      // This would trigger the copy engine in a real implementation
      console.log('Master trade detected, triggering copy operations:', trade)
    }

    return NextResponse.json({ trade })
  } catch (error) {
    console.error('Error in trades POST API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
