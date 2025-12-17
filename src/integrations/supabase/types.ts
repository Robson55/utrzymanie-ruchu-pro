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
      issue_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string
          id: string
          issue_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by: string
          id?: string
          issue_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string
          id?: string
          issue_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "issue_assignments_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "issues"
            referencedColumns: ["id"]
          },
        ]
      }
      issue_attachments: {
        Row: {
          file_name: string
          file_type: string | null
          file_url: string
          id: string
          issue_id: string
          uploaded_at: string
          uploaded_by: string
        }
        Insert: {
          file_name: string
          file_type?: string | null
          file_url: string
          id?: string
          issue_id: string
          uploaded_at?: string
          uploaded_by: string
        }
        Update: {
          file_name?: string
          file_type?: string | null
          file_url?: string
          id?: string
          issue_id?: string
          uploaded_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "issue_attachments_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "issues"
            referencedColumns: ["id"]
          },
        ]
      }
      issue_status_history: {
        Row: {
          changed_at: string
          changed_by: string
          comment: string | null
          id: string
          issue_id: string
          status: Database["public"]["Enums"]["issue_status"]
          substatus: Database["public"]["Enums"]["issue_substatus"] | null
        }
        Insert: {
          changed_at?: string
          changed_by: string
          comment?: string | null
          id?: string
          issue_id: string
          status: Database["public"]["Enums"]["issue_status"]
          substatus?: Database["public"]["Enums"]["issue_substatus"] | null
        }
        Update: {
          changed_at?: string
          changed_by?: string
          comment?: string | null
          id?: string
          issue_id?: string
          status?: Database["public"]["Enums"]["issue_status"]
          substatus?: Database["public"]["Enums"]["issue_substatus"] | null
        }
        Relationships: [
          {
            foreignKeyName: "issue_status_history_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "issues"
            referencedColumns: ["id"]
          },
        ]
      }
      issues: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          assigned_to: string | null
          assignment_time_minutes: number | null
          completed_at: string | null
          created_at: string
          description: string
          id: string
          machine_id: string
          notes: string | null
          priority: Database["public"]["Enums"]["issue_priority"]
          reaction_time_minutes: number | null
          reported_at: string
          reported_by: string
          started_at: string | null
          status: Database["public"]["Enums"]["issue_status"]
          substatus: Database["public"]["Enums"]["issue_substatus"] | null
          title: string
          updated_at: string
          work_time_minutes: number | null
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          assigned_to?: string | null
          assignment_time_minutes?: number | null
          completed_at?: string | null
          created_at?: string
          description: string
          id?: string
          machine_id: string
          notes?: string | null
          priority?: Database["public"]["Enums"]["issue_priority"]
          reaction_time_minutes?: number | null
          reported_at?: string
          reported_by: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["issue_status"]
          substatus?: Database["public"]["Enums"]["issue_substatus"] | null
          title: string
          updated_at?: string
          work_time_minutes?: number | null
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          assigned_to?: string | null
          assignment_time_minutes?: number | null
          completed_at?: string | null
          created_at?: string
          description?: string
          id?: string
          machine_id?: string
          notes?: string | null
          priority?: Database["public"]["Enums"]["issue_priority"]
          reaction_time_minutes?: number | null
          reported_at?: string
          reported_by?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["issue_status"]
          substatus?: Database["public"]["Enums"]["issue_substatus"] | null
          title?: string
          updated_at?: string
          work_time_minutes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "issues_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
        ]
      }
      machines: {
        Row: {
          created_at: string
          description: string | null
          documentation_url: string | null
          id: string
          installation_date: string | null
          is_active: boolean | null
          location: string | null
          machine_number: string
          machine_type: string | null
          manufacturer: string | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          documentation_url?: string | null
          id?: string
          installation_date?: string | null
          is_active?: boolean | null
          location?: string | null
          machine_number: string
          machine_type?: string | null
          manufacturer?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          documentation_url?: string | null
          id?: string
          installation_date?: string | null
          is_active?: boolean | null
          location?: string | null
          machine_number?: string
          machine_type?: string | null
          manufacturer?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      planned_works: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_weekly: boolean | null
          machine_id: string
          scheduled_date: string
          status: string | null
          title: string
          updated_at: string
          week_number: number | null
          year: number
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_weekly?: boolean | null
          machine_id: string
          scheduled_date: string
          status?: string | null
          title: string
          updated_at?: string
          week_number?: number | null
          year?: number
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_weekly?: boolean | null
          machine_id?: string
          scheduled_date?: string
          status?: string | null
          title?: string
          updated_at?: string
          week_number?: number | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "planned_works_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      spare_parts: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          delivered_at: string | null
          description: string | null
          expected_delivery_date: string | null
          id: string
          machine_id: string | null
          name: string
          notes: string | null
          ordered_at: string | null
          quantity: number
          requested_at: string
          requested_by: string
          status: Database["public"]["Enums"]["spare_part_status"]
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          delivered_at?: string | null
          description?: string | null
          expected_delivery_date?: string | null
          id?: string
          machine_id?: string | null
          name: string
          notes?: string | null
          ordered_at?: string | null
          quantity?: number
          requested_at?: string
          requested_by: string
          status?: Database["public"]["Enums"]["spare_part_status"]
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          delivered_at?: string | null
          description?: string | null
          expected_delivery_date?: string | null
          id?: string
          machine_id?: string | null
          name?: string
          notes?: string | null
          ordered_at?: string | null
          quantity?: number
          requested_at?: string
          requested_by?: string
          status?: Database["public"]["Enums"]["spare_part_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "spare_parts_accepted_by_fkey"
            columns: ["accepted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spare_parts_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spare_parts_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_roles: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"][]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_manager: { Args: { _user_id: string }; Returns: boolean }
      round_to_5_minutes:
        | {
            Args: { minutes: number }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.round_to_5_minutes(minutes => int4), public.round_to_5_minutes(minutes => numeric). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
        | {
            Args: { minutes: number }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.round_to_5_minutes(minutes => int4), public.round_to_5_minutes(minutes => numeric). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
    }
    Enums: {
      app_role:
        | "kierownik_zmiany"
        | "kontrola_jakosci"
        | "kierownik_ur"
        | "mechanik"
        | "admin"
      issue_priority: "niski" | "sredni" | "wysoki" | "krytyczny"
      issue_status:
        | "nowe"
        | "zaakceptowane"
        | "w_realizacji"
        | "zakonczone"
        | "usuniete"
      issue_substatus: "aktywne" | "wstrzymane" | "przerwa" | "brak_czesci"
      spare_part_status: "nowe" | "zaakceptowane" | "zamowione" | "dostarczone"
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
    Enums: {
      app_role: [
        "kierownik_zmiany",
        "kontrola_jakosci",
        "kierownik_ur",
        "mechanik",
        "admin",
      ],
      issue_priority: ["niski", "sredni", "wysoki", "krytyczny"],
      issue_status: [
        "nowe",
        "zaakceptowane",
        "w_realizacji",
        "zakonczone",
        "usuniete",
      ],
      issue_substatus: ["aktywne", "wstrzymane", "przerwa", "brak_czesci"],
      spare_part_status: ["nowe", "zaakceptowane", "zamowione", "dostarczone"],
    },
  },
} as const
