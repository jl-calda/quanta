/**
 * Database types for the Supabase client.
 *
 * Hand-authored to mirror `supabase/migrations/*.sql` (the schema is the source
 * of truth). Keep this in sync when the schema changes — or regenerate with
 * `supabase gen types typescript` once the project is linked. The shape matches
 * what `@supabase/supabase-js` expects so `createClient<Database>()` is typed.
 */

// ---- Enums ----------------------------------------------------------------
export type WorkspaceRole =
  | "owner"
  | "admin"
  | "engineer"
  | "reviewer"
  | "viewer"
  | "billing";
export type WorksheetRole = "owner" | "editor" | "commenter" | "viewer";
export type CalcMode = "auto" | "manual";
export type UnitsSystem = "si" | "uscs" | "cgs" | "custom";
export type CalcStatus = "current" | "stale" | "error";
export type ShareScope = "restricted" | "workspace" | "link";
export type MemberStatus = "active" | "invited" | "suspended";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// Foreign-key relationship descriptor (matches postgrest-js GenericRelationship),
// used by the typed query builder to resolve embedded selects like
// `workspace:workspaces(*)`.
type Relationship = {
  foreignKeyName: string;
  columns: string[];
  isOneToOne?: boolean;
  referencedRelation: string;
  referencedColumns: string[];
};

// A table definition: Row is what you read, Insert what you write, Update the
// partial patch. Relationships default to none.
type Table<Row, Insert, Update, Rel extends Relationship[] = []> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: Rel;
};

export type Database = {
  // Mirrors `supabase gen types` output; the typed query builder reads the
  // PostgREST version from here to pick its insert/update signatures.
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)";
  };
  public: {
    Tables: {
      profiles: Table<
        {
          id: string;
          email: string | null;
          full_name: string | null;
          title: string | null;
          avatar_url: string | null;
          preferences: Json;
          last_workspace_id: string | null;
          created_at: string;
        },
        {
          id: string;
          email?: string | null;
          full_name?: string | null;
          title?: string | null;
          avatar_url?: string | null;
          preferences?: Json;
          last_workspace_id?: string | null;
          created_at?: string;
        },
        {
          email?: string | null;
          full_name?: string | null;
          title?: string | null;
          avatar_url?: string | null;
          preferences?: Json;
          last_workspace_id?: string | null;
        }
      >;
      workspaces: Table<
        {
          id: string;
          name: string;
          slug: string;
          owner_id: string | null;
          plan: string;
          seats: number;
          branding: Json;
          settings: Json;
          created_at: string;
        },
        {
          id?: string;
          name: string;
          slug: string;
          owner_id?: string | null;
          plan?: string;
          seats?: number;
          branding?: Json;
          settings?: Json;
          created_at?: string;
        },
        {
          name?: string;
          slug?: string;
          owner_id?: string | null;
          plan?: string;
          seats?: number;
          branding?: Json;
          settings?: Json;
        }
      >;
      workspace_members: Table<
        {
          id: string;
          workspace_id: string;
          user_id: string | null;
          role: WorkspaceRole;
          status: MemberStatus;
          invited_email: string | null;
          invited_by: string | null;
          created_at: string;
        },
        {
          id?: string;
          workspace_id: string;
          user_id?: string | null;
          role?: WorkspaceRole;
          status?: MemberStatus;
          invited_email?: string | null;
          invited_by?: string | null;
          created_at?: string;
        },
        {
          role?: WorkspaceRole;
          status?: MemberStatus;
          invited_email?: string | null;
          user_id?: string | null;
        },
        [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ]
      >;
      projects: Table<
        {
          id: string;
          workspace_id: string;
          parent_id: string | null;
          name: string;
          created_by: string | null;
          created_at: string;
        },
        {
          id?: string;
          workspace_id: string;
          parent_id?: string | null;
          name: string;
          created_by?: string | null;
          created_at?: string;
        },
        { name?: string; parent_id?: string | null }
      >;
      worksheets: Table<
        {
          id: string;
          workspace_id: string;
          project_id: string | null;
          title: string;
          content: Json;
          calc_mode: CalcMode;
          units_system: UnitsSystem;
          custom_unit_system_id: string | null;
          page_settings: Json;
          layout_settings: Json;
          calc_status: CalcStatus;
          error_count: number;
          owner_id: string | null;
          created_by: string | null;
          updated_at: string;
          created_at: string;
          deleted_at: string | null;
        },
        {
          id?: string;
          workspace_id: string;
          project_id?: string | null;
          title?: string;
          content?: Json;
          calc_mode?: CalcMode;
          units_system?: UnitsSystem;
          custom_unit_system_id?: string | null;
          page_settings?: Json;
          layout_settings?: Json;
          calc_status?: CalcStatus;
          error_count?: number;
          owner_id?: string | null;
          created_by?: string | null;
          updated_at?: string;
          created_at?: string;
          deleted_at?: string | null;
        },
        {
          project_id?: string | null;
          title?: string;
          content?: Json;
          calc_mode?: CalcMode;
          units_system?: UnitsSystem;
          custom_unit_system_id?: string | null;
          page_settings?: Json;
          layout_settings?: Json;
          calc_status?: CalcStatus;
          error_count?: number;
          owner_id?: string | null;
          deleted_at?: string | null;
        }
      >;
      worksheet_versions: Table<
        {
          id: string;
          worksheet_id: string;
          content: Json;
          label: string | null;
          summary: Json | null;
          created_by: string | null;
          created_at: string;
        },
        {
          id?: string;
          worksheet_id: string;
          content: Json;
          label?: string | null;
          summary?: Json | null;
          created_by?: string | null;
          created_at?: string;
        },
        { label?: string | null }
      >;
      worksheet_collaborators: Table<
        {
          id: string;
          worksheet_id: string;
          user_id: string | null;
          invited_email: string | null;
          role: WorksheetRole;
          share_scope: ShareScope;
          link_token: string | null;
          created_at: string;
        },
        {
          id?: string;
          worksheet_id: string;
          user_id?: string | null;
          invited_email?: string | null;
          role?: WorksheetRole;
          share_scope?: ShareScope;
          link_token?: string | null;
          created_at?: string;
        },
        {
          user_id?: string | null;
          invited_email?: string | null;
          role?: WorksheetRole;
          share_scope?: ShareScope;
          link_token?: string | null;
        }
      >;
      comments: Table<
        {
          id: string;
          worksheet_id: string;
          region_id: string;
          author_id: string | null;
          body: string;
          parent_id: string | null;
          resolved: boolean;
          created_at: string;
        },
        {
          id?: string;
          worksheet_id: string;
          region_id: string;
          author_id?: string | null;
          body: string;
          parent_id?: string | null;
          resolved?: boolean;
          created_at?: string;
        },
        { body?: string; resolved?: boolean }
      >;
      templates: Table<
        {
          id: string;
          workspace_id: string | null;
          title: string;
          description: string | null;
          discipline: string | null;
          standard: string | null;
          template_type: string | null;
          content: Json;
          thumbnail_url: string | null;
          visibility: string;
          author_id: string | null;
          usage_count: number;
          created_at: string;
        },
        {
          id?: string;
          workspace_id?: string | null;
          title: string;
          description?: string | null;
          discipline?: string | null;
          standard?: string | null;
          template_type?: string | null;
          content: Json;
          thumbnail_url?: string | null;
          visibility?: string;
          author_id?: string | null;
          usage_count?: number;
          created_at?: string;
        },
        {
          title?: string;
          description?: string | null;
          discipline?: string | null;
          standard?: string | null;
          template_type?: string | null;
          content?: Json;
          thumbnail_url?: string | null;
          visibility?: string;
          usage_count?: number;
        }
      >;
      tags: Table<
        { id: string; workspace_id: string; name: string },
        { id?: string; workspace_id: string; name: string },
        { name?: string }
      >;
      worksheet_tags: Table<
        { worksheet_id: string; tag_id: string },
        { worksheet_id: string; tag_id: string },
        { worksheet_id?: string; tag_id?: string }
      >;
      unit_systems: Table<
        {
          id: string;
          workspace_id: string;
          name: string;
          mapping: Json;
          created_by: string | null;
          created_at: string;
        },
        {
          id?: string;
          workspace_id: string;
          name: string;
          mapping: Json;
          created_by?: string | null;
          created_at?: string;
        },
        { name?: string; mapping?: Json }
      >;
      audit_log: Table<
        {
          id: number;
          workspace_id: string | null;
          actor_id: string | null;
          action: string | null;
          target_type: string | null;
          target_id: string | null;
          metadata: Json | null;
          created_at: string;
        },
        {
          id?: number;
          workspace_id?: string | null;
          actor_id?: string | null;
          action?: string | null;
          target_type?: string | null;
          target_id?: string | null;
          metadata?: Json | null;
          created_at?: string;
        },
        Record<string, never>
      >;
    };
    Views: { [_ in never]: never };
    Functions: {
      is_member: { Args: { ws: string }; Returns: boolean };
      member_role: { Args: { ws: string }; Returns: WorkspaceRole };
      is_workspace_admin: { Args: { ws: string }; Returns: boolean };
      worksheet_effective_role: {
        Args: { sheet: string };
        Returns: WorksheetRole;
      };
      increment_template_usage: { Args: { tpl: string }; Returns: undefined };
    };
    Enums: {
      workspace_role: WorkspaceRole;
      worksheet_role: WorksheetRole;
      calc_mode: CalcMode;
      units_system: UnitsSystem;
      calc_status: CalcStatus;
      share_scope: ShareScope;
      member_status: MemberStatus;
    };
    CompositeTypes: { [_ in never]: never };
  };
};

// Convenience row aliases for app code.
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Workspace = Database["public"]["Tables"]["workspaces"]["Row"];
export type WorkspaceMember =
  Database["public"]["Tables"]["workspace_members"]["Row"];
export type Worksheet = Database["public"]["Tables"]["worksheets"]["Row"];
export type Project = Database["public"]["Tables"]["projects"]["Row"];
export type Template = Database["public"]["Tables"]["templates"]["Row"];
export type Tag = Database["public"]["Tables"]["tags"]["Row"];
