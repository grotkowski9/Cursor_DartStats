export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      customers: {
        Row: {
          about_completed_at: string | null
          auth_user_id: string | null
          city: string | null
          created_at: string
          customer_id: string
          dart_brand: string | null
          dart_brand_other: string | null
          dart_model: string | null
          dart_weight_bucket: string | null
          favorite_player_id: string | null
          first_name: string
          known_nicknames: string[]
          last_name: string
          newsletter_opt_in: boolean
          nickname: string | null
          profile_stats_visible: boolean
          role: string
          throwing_hand: string | null
          tour_completed_at: string | null
          updated_at: string
        }
        Insert: {
          about_completed_at?: string | null
          auth_user_id?: string | null
          city?: string | null
          created_at?: string
          customer_id?: string
          dart_brand?: string | null
          dart_brand_other?: string | null
          dart_model?: string | null
          dart_weight_bucket?: string | null
          favorite_player_id?: string | null
          first_name: string
          known_nicknames?: string[]
          last_name: string
          newsletter_opt_in?: boolean
          nickname?: string | null
          profile_stats_visible?: boolean
          role?: string
          throwing_hand?: string | null
          tour_completed_at?: string | null
          updated_at?: string
        }
        Update: {
          about_completed_at?: string | null
          auth_user_id?: string | null
          city?: string | null
          created_at?: string
          customer_id?: string
          dart_brand?: string | null
          dart_brand_other?: string | null
          dart_model?: string | null
          dart_weight_bucket?: string | null
          favorite_player_id?: string | null
          first_name?: string
          known_nicknames?: string[]
          last_name?: string
          newsletter_opt_in?: boolean
          nickname?: string | null
          profile_stats_visible?: boolean
          role?: string
          throwing_hand?: string | null
          tour_completed_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ingest_snapshots: {
        Row: {
          customer_id: string
          html_snapshot_path: string | null
          ingested_at: string
          match_id: string | null
          n01_tmid: string
          payload_hash: string
          snapshot_id: string
          snapshot_path: string
        }
        Insert: {
          customer_id: string
          html_snapshot_path?: string | null
          ingested_at?: string
          match_id?: string | null
          n01_tmid: string
          payload_hash: string
          snapshot_id?: string
          snapshot_path: string
        }
        Update: {
          customer_id?: string
          html_snapshot_path?: string | null
          ingested_at?: string
          match_id?: string | null
          n01_tmid?: string
          payload_hash?: string
          snapshot_id?: string
          snapshot_path?: string
        }
        Relationships: []
      }
      legs: {
        Row: {
          created_at: string
          first_player: number
          leg_id: string
          leg_number: number
          match_id: string
          winner_index: number
        }
        Insert: {
          created_at?: string
          first_player?: number
          leg_id?: string
          leg_number: number
          match_id: string
          winner_index: number
        }
        Update: {
          created_at?: string
          first_player?: number
          leg_id?: string
          leg_number?: number
          match_id?: string
          winner_index?: number
        }
        Relationships: []
      }
      matches: {
        Row: {
          created_at: string
          customer_id: string
          html_snapshot_path: string | null
          match_id: string
          match_type: string
          n01_tmid: string
          opponent_legs_won: number | null
          opponent_name: string | null
          player_average: number | null
          player_checkout_pct: number | null
          player_first9: number | null
          player_index: number | null
          player_legs_won: number | null
          players: Json
          raw_payload: Json | null
          share_token: string
          snapshot_path: string
          start_score: number
          start_time: string
          title: string
          update_time: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          html_snapshot_path?: string | null
          match_id?: string
          match_type: string
          n01_tmid: string
          opponent_legs_won?: number | null
          opponent_name?: string | null
          player_average?: number | null
          player_checkout_pct?: number | null
          player_first9?: number | null
          player_index?: number | null
          player_legs_won?: number | null
          players?: Json
          raw_payload?: Json | null
          share_token: string
          snapshot_path: string
          start_score?: number
          start_time: string
          title: string
          update_time?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          html_snapshot_path?: string | null
          match_id?: string
          match_type?: string
          n01_tmid?: string
          opponent_legs_won?: number | null
          opponent_name?: string | null
          player_average?: number | null
          player_checkout_pct?: number | null
          player_first9?: number | null
          player_index?: number | null
          player_legs_won?: number | null
          players?: Json
          raw_payload?: Json | null
          share_token?: string
          snapshot_path?: string
          start_score?: number
          start_time?: string
          title?: string
          update_time?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      share_links: {
        Row: {
          created_at: string
          match_id: string
          revoked_at: string | null
          share_token: string
        }
        Insert: {
          created_at?: string
          match_id: string
          revoked_at?: string | null
          share_token: string
        }
        Update: {
          created_at?: string
          match_id?: string
          revoked_at?: string | null
          share_token?: string
        }
        Relationships: []
      }
      snapshot_access_log: {
        Row: {
          access_kind: string
          accessed_at: string
          ip_address: string | null
          log_id: number
          match_id: string | null
          share_token: string
          user_agent: string | null
        }
        Insert: {
          access_kind: string
          accessed_at?: string
          ip_address?: string | null
          log_id?: number
          match_id?: string | null
          share_token: string
          user_agent?: string | null
        }
        Update: {
          access_kind?: string
          accessed_at?: string
          ip_address?: string | null
          log_id?: number
          match_id?: string | null
          share_token?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      visits: {
        Row: {
          actual_score: number
          darts_thrown: number
          is_bust: boolean
          is_checkout: boolean
          is_setup: boolean
          left_after: number
          leg_id: string
          player_index: number
          raw_score: number
          visit_id: number
          visit_number: number
        }
        Insert: {
          actual_score: number
          darts_thrown: number
          is_bust?: boolean
          is_checkout?: boolean
          is_setup?: boolean
          left_after: number
          leg_id: string
          player_index: number
          raw_score: number
          visit_id?: number
          visit_number: number
        }
        Update: {
          actual_score?: number
          darts_thrown?: number
          is_bust?: boolean
          is_checkout?: boolean
          is_setup?: boolean
          left_after?: number
          leg_id?: string
          player_index?: number
          raw_score?: number
          visit_id?: number
          visit_number?: number
        }
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: {
      app_role: "admin" | "user" | "premium" | "superadmin"
    }
    CompositeTypes: { [_ in never]: never }
  }
}

type DefaultSchema = Database["public"]

export type Tables<T extends keyof DefaultSchema["Tables"]> = DefaultSchema["Tables"][T]["Row"]
export type TablesInsert<T extends keyof DefaultSchema["Tables"]> = DefaultSchema["Tables"][T]["Insert"]
