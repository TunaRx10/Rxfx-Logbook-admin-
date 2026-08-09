// Types générés à partir du schéma public
// ⚠️ Idéalement, ce fichier est généré automatiquement via :
//   npx supabase gen types typescript --linked > src/types/database.types.ts
// et ne devrait pas être édité à la main pour éviter les désync avec le schéma réel.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string | null
          display_name: string | null
          avatar_url: string | null
          created_at: string
        }
        Insert: {
          id: string
          email?: string | null
          display_name?: string | null
          avatar_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          display_name?: string | null
          avatar_url?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      rxfx_sessions: {
        Row: {
          id: string
          user_id: string
          expires_at: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          expires_at: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          expires_at?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rxfx_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
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

// ------------------------------------------------------------------
// Helpers génériques pour éviter d'écrire Database["public"]["Tables"]["x"]["Row"]
// partout dans le code. Usage : Tables<'profiles'>, TablesInsert<'rxfx_sessions'>, etc.
// ------------------------------------------------------------------

type PublicSchema = Database["public"]

export type Tables<
  T extends keyof PublicSchema["Tables"]
> = PublicSchema["Tables"][T]["Row"]

export type TablesInsert<
  T extends keyof PublicSchema["Tables"]
> = PublicSchema["Tables"][T]["Insert"]

export type TablesUpdate<
  T extends keyof PublicSchema["Tables"]
> = PublicSchema["Tables"][T]["Update"]

export type Enums<
  T extends keyof PublicSchema["Enums"]
> = PublicSchema["Enums"][T]

// Raccourcis pour tes deux tables actuelles
export type Profile = Tables<"profiles">
export type ProfileInsert = TablesInsert<"profiles">
export type ProfileUpdate = TablesUpdate<"profiles">

export type RxfxSession = Tables<"rxfx_sessions">
export type RxfxSessionInsert = TablesInsert<"rxfx_sessions">
export type RxfxSessionUpdate = TablesUpdate<"rxfx_sessions">
