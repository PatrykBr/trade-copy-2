export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      copy_operations: {
        Row: {
          copy_rule_id: string
          created_at: string | null
          error_message: string | null
          executed_at: string | null
          id: string
          latency_ms: number | null
          master_trade_id: string
          operation_type: string
          retry_count: number | null
          slave_trade_id: string | null
          status: string | null
        }
        Insert: {
          copy_rule_id: string
          created_at?: string | null
          error_message?: string | null
          executed_at?: string | null
          id?: string
          latency_ms?: number | null
          master_trade_id: string
          operation_type: string
          retry_count?: number | null
          slave_trade_id?: string | null
          status?: string | null
        }
        Update: {
          copy_rule_id?: string
          created_at?: string | null
          error_message?: string | null
          executed_at?: string | null
          id?: string
          latency_ms?: number | null
          master_trade_id?: string
          operation_type?: string
          retry_count?: number | null
          slave_trade_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "copy_operations_copy_rule_id_fkey"
            columns: ["copy_rule_id"]
            isOneToOne: false
            referencedRelation: "copy_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "copy_operations_master_trade_id_fkey"
            columns: ["master_trade_id"]
            isOneToOne: false
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "copy_operations_slave_trade_id_fkey"
            columns: ["slave_trade_id"]
            isOneToOne: false
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
        ]
      }
      copy_rules: {
        Row: {
          copy_pending_orders: boolean | null
          copy_stop_loss: boolean | null
          copy_take_profit: boolean | null
          created_at: string | null
          id: string
          is_active: boolean | null
          lot_multiplier: number | null
          magic_number_filter: number[] | null
          master_account_id: string
          max_lot_size: number | null
          risk_percentage: number | null
          slave_account_id: string
          symbol_filter: string[] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          copy_pending_orders?: boolean | null
          copy_stop_loss?: boolean | null
          copy_take_profit?: boolean | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          lot_multiplier?: number | null
          magic_number_filter?: number[] | null
          master_account_id: string
          max_lot_size?: number | null
          risk_percentage?: number | null
          slave_account_id: string
          symbol_filter?: string[] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          copy_pending_orders?: boolean | null
          copy_stop_loss?: boolean | null
          copy_take_profit?: boolean | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          lot_multiplier?: number | null
          magic_number_filter?: number[] | null
          master_account_id?: string
          max_lot_size?: number | null
          risk_percentage?: number | null
          slave_account_id?: string
          symbol_filter?: string[] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "copy_rules_master_account_id_fkey"
            columns: ["master_account_id"]
            isOneToOne: false
            referencedRelation: "mt_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "copy_rules_slave_account_id_fkey"
            columns: ["slave_account_id"]
            isOneToOne: false
            referencedRelation: "mt_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "copy_rules_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      mt_accounts: {
        Row: {
          account_login: string
          account_password_encrypted: string
          account_type: string
          balance: number | null
          broker_name: string | null
          created_at: string | null
          equity: number | null
          free_margin: number | null
          id: string
          is_active: boolean | null
          last_connected_at: string | null
          margin: number | null
          platform: string
          role: string
          server_name: string
          updated_at: string | null
          user_id: string
          vps_container_id: string | null
        }
        Insert: {
          account_login: string
          account_password_encrypted: string
          account_type: string
          balance?: number | null
          broker_name?: string | null
          created_at?: string | null
          equity?: number | null
          free_margin?: number | null
          id?: string
          is_active?: boolean | null
          last_connected_at?: string | null
          margin?: number | null
          platform: string
          role: string
          server_name: string
          updated_at?: string | null
          user_id: string
          vps_container_id?: string | null
        }
        Update: {
          account_login?: string
          account_password_encrypted?: string
          account_type?: string
          balance?: number | null
          broker_name?: string | null
          created_at?: string | null
          equity?: number | null
          free_margin?: number | null
          id?: string
          is_active?: boolean | null
          last_connected_at?: string | null
          margin?: number | null
          platform?: string
          role?: string
          server_name?: string
          updated_at?: string | null
          user_id?: string
          vps_container_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mt_accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      system_events: {
        Row: {
          account_id: string | null
          container_id: string | null
          created_at: string | null
          event_type: string
          id: string
          message: string
          metadata: Json | null
          severity: string | null
        }
        Insert: {
          account_id?: string | null
          container_id?: string | null
          created_at?: string | null
          event_type: string
          id?: string
          message: string
          metadata?: Json | null
          severity?: string | null
        }
        Update: {
          account_id?: string | null
          container_id?: string | null
          created_at?: string | null
          event_type?: string
          id?: string
          message?: string
          metadata?: Json | null
          severity?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_events_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "mt_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_events_container_id_fkey"
            columns: ["container_id"]
            isOneToOne: false
            referencedRelation: "vps_containers"
            referencedColumns: ["id"]
          },
        ]
      }
      trades: {
        Row: {
          account_id: string
          close_price: number | null
          close_time: string | null
          comment: string | null
          commission: number | null
          created_at: string | null
          id: string
          is_copied_trade: boolean | null
          lot_size: number
          magic_number: number | null
          master_trade_id: string | null
          open_price: number | null
          open_time: string | null
          profit: number | null
          status: string | null
          stop_loss: number | null
          swap: number | null
          symbol: string
          take_profit: number | null
          ticket: number
          trade_type: string
          updated_at: string | null
        }
        Insert: {
          account_id: string
          close_price?: number | null
          close_time?: string | null
          comment?: string | null
          commission?: number | null
          created_at?: string | null
          id?: string
          is_copied_trade?: boolean | null
          lot_size: number
          magic_number?: number | null
          master_trade_id?: string | null
          open_price?: number | null
          open_time?: string | null
          profit?: number | null
          status?: string | null
          stop_loss?: number | null
          swap?: number | null
          symbol: string
          take_profit?: number | null
          ticket: number
          trade_type: string
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          close_price?: number | null
          close_time?: string | null
          comment?: string | null
          commission?: number | null
          created_at?: string | null
          id?: string
          is_copied_trade?: boolean | null
          lot_size?: number
          magic_number?: number | null
          master_trade_id?: string | null
          open_price?: number | null
          open_time?: string | null
          profit?: number | null
          status?: string | null
          stop_loss?: number | null
          swap?: number | null
          symbol?: string
          take_profit?: number | null
          ticket?: number
          trade_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trades_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "mt_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trades_master_trade_id_fkey"
            columns: ["master_trade_id"]
            isOneToOne: false
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          subscription_tier: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name?: string | null
          id?: string
          subscription_tier?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          subscription_tier?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      vps_containers: {
        Row: {
          account_count: number | null
          container_id: string
          cpu_usage: number | null
          created_at: string | null
          id: string
          max_accounts: number | null
          memory_usage: number | null
          server_ip: string
          server_region: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          account_count?: number | null
          container_id: string
          cpu_usage?: number | null
          created_at?: string | null
          id?: string
          max_accounts?: number | null
          memory_usage?: number | null
          server_ip: string
          server_region?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          account_count?: number | null
          container_id?: string
          cpu_usage?: number | null
          created_at?: string | null
          id?: string
          max_accounts?: number | null
          memory_usage?: number | null
          server_ip?: string
          server_region?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const