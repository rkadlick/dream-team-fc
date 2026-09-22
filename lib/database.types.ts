/**
 * Hand-written to match the migrations in supabase/migrations/.
 *
 * Regenerate after any migration with:
 *   supabase gen types typescript --project-id <your-project-ref> --schema public > lib/database.types.ts
 * or, against a local stack:
 *   supabase gen types typescript --local --schema public > lib/database.types.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      seasons: {
        Row: {
          id: string
          name: string
          start_date: string
          end_date: string | null
          is_current: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          start_date: string
          end_date?: string | null
          is_current?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          start_date?: string
          end_date?: string | null
          is_current?: boolean
          created_at?: string
        }
        Relationships: []
      }
      players: {
        Row: {
          id: string
          name: string
          jersey_number: number | null
          position: string | null
          is_human: boolean
          gamertag: string | null
          user_id: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          jersey_number?: number | null
          position?: string | null
          is_human?: boolean
          gamertag?: string | null
          user_id?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          jersey_number?: number | null
          position?: string | null
          is_human?: boolean
          gamertag?: string | null
          user_id?: string | null
          is_active?: boolean
          created_at?: string
        }
        Relationships: []
      }
      game_types: {
        Row: {
          id: string
          name: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          is_active?: boolean
          created_at?: string
        }
        Relationships: []
      }
      matches: {
        Row: {
          id: string
          season_id: string
          game_type_id: string
          played_on: string
          division: number
          opponent: string
          home_away: string
          score_us: number
          score_them: number
          opp_own_goals: number
          went_to_overtime: boolean
          went_to_pks: boolean
          pk_us: number | null
          pk_them: number | null
          result: string
          notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
          shots_us: number | null
          shots_them: number | null
          shots_on_target_us: number | null
          shots_on_target_them: number | null
          tackles_us: number | null
          tackles_them: number | null
          possession_us: number | null
          possession_them: number | null
          pass_accuracy_us: number | null
          pass_accuracy_them: number | null
        }
        Insert: {
          id?: string
          season_id: string
          game_type_id: string
          played_on: string
          division: number
          opponent: string
          home_away: string
          score_us: number
          score_them: number
          opp_own_goals?: number
          went_to_overtime?: boolean
          went_to_pks?: boolean
          pk_us?: number | null
          pk_them?: number | null
          result: string
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
          shots_us?: number | null
          shots_them?: number | null
          shots_on_target_us?: number | null
          shots_on_target_them?: number | null
          tackles_us?: number | null
          tackles_them?: number | null
          possession_us?: number | null
          possession_them?: number | null
          pass_accuracy_us?: number | null
          pass_accuracy_them?: number | null
        }
        Update: {
          id?: string
          season_id?: string
          game_type_id?: string
          played_on?: string
          division?: number
          opponent?: string
          home_away?: string
          score_us?: number
          score_them?: number
          opp_own_goals?: number
          went_to_overtime?: boolean
          went_to_pks?: boolean
          pk_us?: number | null
          pk_them?: number | null
          result?: string
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
          shots_us?: number | null
          shots_them?: number | null
          shots_on_target_us?: number | null
          shots_on_target_them?: number | null
          tackles_us?: number | null
          tackles_them?: number | null
          possession_us?: number | null
          possession_them?: number | null
          pass_accuracy_us?: number | null
          pass_accuracy_them?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'matches_season_id_fkey'
            columns: ['season_id']
            referencedRelation: 'seasons'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'matches_game_type_id_fkey'
            columns: ['game_type_id']
            referencedRelation: 'game_types'
            referencedColumns: ['id']
          },
        ]
      }
      match_player_stats: {
        Row: {
          id: string
          match_id: string
          player_id: string
          goals: number
          assists: number
          created_at: string
          shots: number | null
          shots_on_target: number | null
          tackles: number | null
          saves: number | null
          yellow_cards: number | null
          red_cards: number | null
          potg_rank: number | null
        }
        Insert: {
          id?: string
          match_id: string
          player_id: string
          goals?: number
          assists?: number
          created_at?: string
          shots?: number | null
          shots_on_target?: number | null
          tackles?: number | null
          saves?: number | null
          yellow_cards?: number | null
          red_cards?: number | null
          potg_rank?: number | null
        }
        Update: {
          id?: string
          match_id?: string
          player_id?: string
          goals?: number
          assists?: number
          created_at?: string
          shots?: number | null
          shots_on_target?: number | null
          tackles?: number | null
          saves?: number | null
          yellow_cards?: number | null
          red_cards?: number | null
          potg_rank?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'match_player_stats_match_id_fkey'
            columns: ['match_id']
            referencedRelation: 'matches'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'match_player_stats_player_id_fkey'
            columns: ['player_id']
            referencedRelation: 'players'
            referencedColumns: ['id']
          },
        ]
      }
      admins: {
        Row: { user_id: string }
        Insert: { user_id: string }
        Update: { user_id?: string }
        Relationships: []
      }
      match_videos: {
        Row: {
          id: string
          match_id: string
          url: string
          title: string | null
          kind: string
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          match_id: string
          url: string
          title?: string | null
          kind?: string
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          match_id?: string
          url?: string
          title?: string | null
          kind?: string
          sort_order?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'match_videos_match_id_fkey'
            columns: ['match_id']
            referencedRelation: 'matches'
            referencedColumns: ['id']
          },
        ]
      }
      team_photos: {
        Row: {
          id: string
          storage_path: string
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          storage_path: string
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          storage_path?: string
          created_by?: string | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<never, never>
    Functions: {
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      save_match: {
        Args: { p_match: Json; p_stats: Json }
        Returns: string
      }
    }
    Enums: Record<never, never>
    CompositeTypes: Record<never, never>
  }
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']
