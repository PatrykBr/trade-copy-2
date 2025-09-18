// Database types
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string | null
          subscription_tier: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          full_name?: string | null
          subscription_tier?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          subscription_tier?: string
          created_at?: string
          updated_at?: string
        }
      }
      mt_accounts: {
        Row: {
          id: string
          user_id: string
          account_login: string
          account_password_encrypted: string
          server_name: string
          platform: 'MT4' | 'MT5'
          account_type: 'demo' | 'live'
          role: 'master' | 'slave'
          broker_name: string | null
          balance: number
          equity: number
          margin: number
          free_margin: number
          is_active: boolean
          last_connected_at: string | null
          vps_container_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          account_login: string
          account_password_encrypted: string
          server_name: string
          platform: 'MT4' | 'MT5'
          account_type: 'demo' | 'live'
          role: 'master' | 'slave'
          broker_name?: string | null
          balance?: number
          equity?: number
          margin?: number
          free_margin?: number
          is_active?: boolean
          last_connected_at?: string | null
          vps_container_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          account_login?: string
          account_password_encrypted?: string
          server_name?: string
          platform?: 'MT4' | 'MT5'
          account_type?: 'demo' | 'live'
          role?: 'master' | 'slave'
          broker_name?: string | null
          balance?: number
          equity?: number
          margin?: number
          free_margin?: number
          is_active?: boolean
          last_connected_at?: string | null
          vps_container_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      copy_rules: {
        Row: {
          id: string
          master_account_id: string
          slave_account_id: string
          user_id: string
          lot_multiplier: number
          max_lot_size: number
          risk_percentage: number
          copy_pending_orders: boolean
          copy_stop_loss: boolean
          copy_take_profit: boolean
          symbol_filter: string[] | null
          magic_number_filter: number[] | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          master_account_id: string
          slave_account_id: string
          user_id: string
          lot_multiplier?: number
          max_lot_size?: number
          risk_percentage?: number
          copy_pending_orders?: boolean
          copy_stop_loss?: boolean
          copy_take_profit?: boolean
          symbol_filter?: string[] | null
          magic_number_filter?: number[] | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          master_account_id?: string
          slave_account_id?: string
          user_id?: string
          lot_multiplier?: number
          max_lot_size?: number
          risk_percentage?: number
          copy_pending_orders?: boolean
          copy_stop_loss?: boolean
          copy_take_profit?: boolean
          symbol_filter?: string[] | null
          magic_number_filter?: number[] | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      trades: {
        Row: {
          id: string
          account_id: string
          ticket: number
          symbol: string
          trade_type: string
          lot_size: number
          open_price: number | null
          close_price: number | null
          stop_loss: number | null
          take_profit: number | null
          commission: number
          swap: number
          profit: number
          magic_number: number
          comment: string | null
          open_time: string | null
          close_time: string | null
          status: string
          is_copied_trade: boolean
          master_trade_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          account_id: string
          ticket: number
          symbol: string
          trade_type: string
          lot_size: number
          open_price?: number | null
          close_price?: number | null
          stop_loss?: number | null
          take_profit?: number | null
          commission?: number
          swap?: number
          profit?: number
          magic_number?: number
          comment?: string | null
          open_time?: string | null
          close_time?: string | null
          status?: string
          is_copied_trade?: boolean
          master_trade_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          account_id?: string
          ticket?: number
          symbol?: string
          trade_type?: string
          lot_size?: number
          open_price?: number | null
          close_price?: number | null
          stop_loss?: number | null
          take_profit?: number | null
          commission?: number
          swap?: number
          profit?: number
          magic_number?: number
          comment?: string | null
          open_time?: string | null
          close_time?: string | null
          status?: string
          is_copied_trade?: boolean
          master_trade_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}

