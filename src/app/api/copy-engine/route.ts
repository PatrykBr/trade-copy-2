import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, supabaseAdmin } from '@/lib/supabase-server'
import { Database } from '@/lib/supabase-types'

interface CopyOperation {
  masterTradeId: string
  copyRuleId: string
  operationType: 'OPEN' | 'CLOSE' | 'MODIFY'
}

type Trade = Database['public']['Tables']['trades']['Row']
type CopyRule = Database['public']['Tables']['copy_rules']['Row']

export async function POST(request: NextRequest) {
  try {
    
    // This endpoint would typically be called by the VPS infrastructure
    // For now, we'll implement a basic copy engine logic
    
    const { masterTradeId, copyRuleId, operationType }: CopyOperation = await request.json()

    if (!masterTradeId || !copyRuleId || !operationType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get the master trade
    const { data: masterTrade, error: masterTradeError } = await supabaseAdmin
      .from('trades')
      .select('*')
      .eq('id', masterTradeId)
      .single()

    if (masterTradeError || !masterTrade) {
      return NextResponse.json({ error: 'Master trade not found' }, { status: 404 })
    }

    // Get the copy rule with account details
    const { data: copyRule, error: copyRuleError } = await supabaseAdmin
      .from('copy_rules')
      .select(`
        *,
        master_account:mt_accounts!copy_rules_master_account_id_fkey(*),
        slave_account:mt_accounts!copy_rules_slave_account_id_fkey(*)
      `)
      .eq('id', copyRuleId)
      .eq('is_active', true)
      .single()

    if (copyRuleError || !copyRule) {
      return NextResponse.json({ error: 'Copy rule not found or inactive' }, { status: 404 })
    }

    // Validate the master trade belongs to the master account
    if ((masterTrade as Trade).account_id !== copyRule.master_account_id) {
      return NextResponse.json({ error: 'Trade does not belong to master account' }, { status: 403 })
    }

    // Apply filters
    if (!passesFilters(masterTrade, copyRule)) {
      return NextResponse.json({ message: 'Trade filtered out', copied: false })
    }

    // Calculate lot size based on copy rule
    const calculatedLotSize = calculateLotSize(masterTrade.lot_size, copyRule)

    // Create copy operation record
    const { data: copyOperation, error: copyOpError } = await supabaseAdmin
      .from('copy_operations')
      .insert({
        master_trade_id: masterTradeId,
        copy_rule_id: copyRuleId,
        operation_type: operationType,
        status: 'pending',
      })
      .select()
      .single()

    if (copyOpError) {
      console.error('Error creating copy operation:', copyOpError)
      return NextResponse.json({ error: 'Failed to create copy operation' }, { status: 500 })
    }

    const startTime = Date.now()

    try {
      let slaveTradeData = null

      if (operationType === 'OPEN') {
        // Create new trade on slave account
        const { data: slaveTrade, error: slaveTradeError } = await supabaseAdmin
          .from('trades')
          .insert({
            account_id: copyRule.slave_account_id,
            ticket: generateSlaveTicket(), // Generate unique ticket for slave
            symbol: masterTrade.symbol,
            trade_type: masterTrade.trade_type,
            lot_size: calculatedLotSize,
            open_price: masterTrade.open_price,
            stop_loss: copyRule.copy_stop_loss ? masterTrade.stop_loss : null,
            take_profit: copyRule.copy_take_profit ? masterTrade.take_profit : null,
            magic_number: masterTrade.magic_number,
            comment: `Copy of ${masterTrade.ticket}`,
            open_time: new Date().toISOString(),
            status: 'open',
            is_copied_trade: true,
            master_trade_id: masterTradeId,
          })
          .select()
          .single()

        if (slaveTradeError) {
          throw new Error(`Failed to create slave trade: ${slaveTradeError.message}`)
        }

        slaveTradeData = slaveTrade
      } else if (operationType === 'CLOSE') {
        // Find and close corresponding slave trade
        const { data: slaveTrade, error: findError } = await supabaseAdmin
          .from('trades')
          .select('*')
          .eq('master_trade_id', masterTradeId)
          .eq('account_id', copyRule.slave_account_id)
          .eq('status', 'open')
          .single()

        if (findError || !slaveTrade) {
          throw new Error('Corresponding slave trade not found')
        }

        const { data: updatedSlaveTrade, error: updateError } = await supabaseAdmin
          .from('trades')
          .update({
            close_price: masterTrade.close_price,
            close_time: new Date().toISOString(),
            status: 'closed',
            profit: calculateSlaveProfit(masterTrade, slaveTrade, copyRule),
          })
          .eq('id', slaveTrade.id)
          .select()
          .single()

        if (updateError) {
          throw new Error(`Failed to close slave trade: ${updateError.message}`)
        }

        slaveTradeData = updatedSlaveTrade
      }

      const latency = Date.now() - startTime

      // Update copy operation as successful
      await supabaseAdmin
        .from('copy_operations')
        .update({
          slave_trade_id: slaveTradeData?.id,
          status: 'success',
          latency_ms: latency,
          executed_at: new Date().toISOString(),
        })
        .eq('id', copyOperation.id)

      // Log system event
      await supabaseAdmin
        .from('system_events')
        .insert({
          event_type: 'trade_copied',
          account_id: copyRule.slave_account_id,
          severity: 'info',
          message: `Trade ${masterTrade.ticket} copied successfully`,
          metadata: {
            master_trade_id: masterTradeId,
            slave_trade_id: slaveTradeData?.id,
            operation_type: operationType,
            latency_ms: latency,
          },
        })

      return NextResponse.json({
        success: true,
        copyOperation: copyOperation.id,
        slaveTrade: slaveTradeData,
        latency: latency,
      })

    } catch (error) {
      const latency = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      // Update copy operation as failed
      await supabaseAdmin
        .from('copy_operations')
        .update({
          status: 'failed',
          error_message: errorMessage,
          latency_ms: latency,
          executed_at: new Date().toISOString(),
        })
        .eq('id', copyOperation.id)

      // Log system event
      await supabaseAdmin
        .from('system_events')
        .insert({
          event_type: 'trade_copy_failed',
          account_id: copyRule.slave_account_id,
          severity: 'error',
          message: `Failed to copy trade ${masterTrade.ticket}: ${errorMessage}`,
          metadata: {
            master_trade_id: masterTradeId,
            operation_type: operationType,
            error: errorMessage,
            latency_ms: latency,
          },
        })

      return NextResponse.json({
        success: false,
        error: errorMessage,
        copyOperation: copyOperation.id,
        latency: latency,
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Error in copy engine API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function passesFilters(trade: Trade, copyRule: CopyRule): boolean {
  // Check symbol filter
  if (copyRule.symbol_filter && copyRule.symbol_filter.length > 0) {
    if (!copyRule.symbol_filter.includes(trade.symbol)) {
      return false
    }
  }

  // Check magic number filter
  if (copyRule.magic_number_filter && copyRule.magic_number_filter.length > 0) {
    if (!copyRule.magic_number_filter.includes(trade.magic_number)) {
      return false
    }
  }

  return true
}

function calculateLotSize(masterLotSize: number, copyRule: CopyRule): number {
  const calculatedLots = masterLotSize * copyRule.lot_multiplier
  return Math.min(calculatedLots, copyRule.max_lot_size)
}

function generateSlaveTicket(): number {
  // Generate a unique ticket number for slave trades
  // In a real implementation, this would be handled by the MT4/MT5 platform
  return Math.floor(Math.random() * 1000000000) + 1000000000
}

function calculateSlaveProfit(masterTrade: Trade, slaveTrade: Trade, _copyRule: CopyRule): number {
  // Simplified profit calculation
  // In reality, this would consider spread differences, commission, etc.
  const masterProfit = masterTrade.profit || 0
  const profitRatio = masterProfit / (masterTrade.lot_size || 1)
  return profitRatio * slaveTrade.lot_size
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    
    // Get user from auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Get copy operations for user's copy rules
    const { data: operations, error } = await supabase
      .from('copy_operations')
      .select(`
        *,
        copy_rules!inner(user_id),
        master_trade:trades!copy_operations_master_trade_id_fkey(*),
        slave_trade:trades!copy_operations_slave_trade_id_fkey(*)
      `)
      .eq('copy_rules.user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching copy operations:', error)
      return NextResponse.json({ error: 'Failed to fetch copy operations' }, { status: 500 })
    }

    return NextResponse.json({ operations })
  } catch (error) {
    console.error('Error in copy engine GET API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
