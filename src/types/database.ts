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
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      activities: {
        Row: {
          activity_date: string
          capacity: number
          created_at: string
          description: string
          end_time: string | null
          goal_id: string | null
          id: string
          is_demo: boolean
          location: string
          published: boolean
          start_time: string | null
          status: Database["public"]["Enums"]["activity_status"]
          title: string
          updated_at: string
        }
        Insert: {
          activity_date: string
          capacity: number
          created_at?: string
          description: string
          end_time?: string | null
          goal_id?: string | null
          id: string
          is_demo?: boolean
          location: string
          published?: boolean
          start_time?: string | null
          status?: Database["public"]["Enums"]["activity_status"]
          title: string
          updated_at?: string
        }
        Update: {
          activity_date?: string
          capacity?: number
          created_at?: string
          description?: string
          end_time?: string | null
          goal_id?: string | null
          id?: string
          is_demo?: boolean
          location?: string
          published?: boolean
          start_time?: string | null
          status?: Database["public"]["Enums"]["activity_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_registrations: {
        Row: {
          activity_id: string
          contact_phone: string | null
          created_at: string
          id: string
          note: string
          user_id: string
        }
        Insert: {
          activity_id: string
          contact_phone?: string | null
          created_at?: string
          id?: string
          note?: string
          user_id: string
        }
        Update: {
          activity_id?: string
          contact_phone?: string | null
          created_at?: string
          id?: string
          note?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_registrations_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_registrations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: Json
          id: string
          target_id: string | null
          target_type: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          target_id?: string | null
          target_type: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          target_id?: string | null
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          author_id: string
          author_name: string
          content: string
          created_at: string
          id: string
          is_demo: boolean
          is_public: boolean
          target_id: string
          target_type: string
          updated_at: string
        }
        Insert: {
          author_id: string
          author_name: string
          content: string
          created_at?: string
          id?: string
          is_demo?: boolean
          is_public?: boolean
          target_id: string
          target_type: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          author_name?: string
          content?: string
          created_at?: string
          id?: string
          is_demo?: boolean
          is_public?: boolean
          target_id?: string
          target_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          challenges: string[]
          color: string
          created_at: string
          description: string
          icon: string
          id: string
          is_demo: boolean
          meaning: string
          published: boolean
          sdg_tags: string[]
          short_title: string
          sort_order: number
          status_label: string
          title: string
          updated_at: string
        }
        Insert: {
          challenges?: string[]
          color?: string
          created_at?: string
          description: string
          icon?: string
          id: string
          is_demo?: boolean
          meaning?: string
          published?: boolean
          sdg_tags?: string[]
          short_title: string
          sort_order: number
          status_label?: string
          title: string
          updated_at?: string
        }
        Update: {
          challenges?: string[]
          color?: string
          created_at?: string
          description?: string
          icon?: string
          id?: string
          is_demo?: boolean
          meaning?: string
          published?: boolean
          sdg_tags?: string[]
          short_title?: string
          sort_order?: number
          status_label?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      indicator_records: {
        Row: {
          created_at: string
          id: string
          indicator_id: string
          is_demo: boolean
          period: string
          published: boolean
          updated_at: string
          value: number
        }
        Insert: {
          created_at?: string
          id?: string
          indicator_id: string
          is_demo?: boolean
          period: string
          published?: boolean
          updated_at?: string
          value: number
        }
        Update: {
          created_at?: string
          id?: string
          indicator_id?: string
          is_demo?: boolean
          period?: string
          published?: boolean
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "indicator_records_indicator_id_fkey"
            columns: ["indicator_id"]
            isOneToOne: false
            referencedRelation: "indicators"
            referencedColumns: ["id"]
          },
        ]
      }
      indicators: {
        Row: {
          change_label: string
          completeness: number
          created_at: string
          definition: string
          goal_id: string
          id: string
          is_demo: boolean
          method: string
          name: string
          published: boolean
          source: string
          target: number
          trend: string
          unit: string
          updated_at: string
          value: number
        }
        Insert: {
          change_label?: string
          completeness?: number
          created_at?: string
          definition?: string
          goal_id: string
          id: string
          is_demo?: boolean
          method?: string
          name: string
          published?: boolean
          source?: string
          target?: number
          trend?: string
          unit?: string
          updated_at?: string
          value?: number
        }
        Update: {
          change_label?: string
          completeness?: number
          created_at?: string
          definition?: string
          goal_id?: string
          id?: string
          is_demo?: boolean
          method?: string
          name?: string
          published?: boolean
          source?: string
          target?: number
          trend?: string
          unit?: string
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "indicators_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      issue_history: {
        Row: {
          created_at: string
          description: string
          id: string
          issue_id: string
          operator_id: string | null
          operator_name: string
          status: Database["public"]["Enums"]["issue_status"]
          title: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          issue_id: string
          operator_id?: string | null
          operator_name?: string
          status: Database["public"]["Enums"]["issue_status"]
          title: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          issue_id?: string
          operator_id?: string | null
          operator_name?: string
          status?: Database["public"]["Enums"]["issue_status"]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "issue_history_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "issues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issue_history_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      issue_ratings: {
        Row: {
          comment: string
          created_at: string
          id: string
          issue_id: string
          rating: number
          updated_at: string
          user_id: string
        }
        Insert: {
          comment?: string
          created_at?: string
          id?: string
          issue_id: string
          rating: number
          updated_at?: string
          user_id: string
        }
        Update: {
          comment?: string
          created_at?: string
          id?: string
          issue_id?: string
          rating?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "issue_ratings_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: true
            referencedRelation: "issues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issue_ratings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      issues: {
        Row: {
          affects_daily_life: boolean
          assignee: string | null
          code: string | null
          description: string
          goal_id: string | null
          id: string
          is_demo: boolean
          is_public: boolean
          issue_type: string
          latitude: number | null
          location: string
          longitude: number | null
          project_id: string | null
          public_name: boolean
          result: string | null
          status: Database["public"]["Enums"]["issue_status"]
          submitted_at: string
          submitter_id: string
          title: string
          updated_at: string
          urgent: boolean
        }
        Insert: {
          affects_daily_life?: boolean
          assignee?: string | null
          code?: string | null
          description: string
          goal_id?: string | null
          id?: string
          is_demo?: boolean
          is_public?: boolean
          issue_type: string
          latitude?: number | null
          location: string
          longitude?: number | null
          project_id?: string | null
          public_name?: boolean
          result?: string | null
          status?: Database["public"]["Enums"]["issue_status"]
          submitted_at?: string
          submitter_id: string
          title: string
          updated_at?: string
          urgent?: boolean
        }
        Update: {
          affects_daily_life?: boolean
          assignee?: string | null
          code?: string | null
          description?: string
          goal_id?: string | null
          id?: string
          is_demo?: boolean
          is_public?: boolean
          issue_type?: string
          latitude?: number | null
          location?: string
          longitude?: number | null
          project_id?: string | null
          public_name?: boolean
          result?: string | null
          status?: Database["public"]["Enums"]["issue_status"]
          submitted_at?: string
          submitter_id?: string
          title?: string
          updated_at?: string
          urgent?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "issues_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issues_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issues_submitter_id_fkey"
            columns: ["submitter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      media_files: {
        Row: {
          bucket_id: string
          created_at: string
          file_name: string
          id: string
          issue_id: string | null
          media_type: string
          object_path: string
          owner_id: string
          public_allowed: boolean
          research_submission_id: string | null
        }
        Insert: {
          bucket_id: string
          created_at?: string
          file_name: string
          id?: string
          issue_id?: string | null
          media_type: string
          object_path: string
          owner_id: string
          public_allowed?: boolean
          research_submission_id?: string | null
        }
        Update: {
          bucket_id?: string
          created_at?: string
          file_name?: string
          id?: string
          issue_id?: string | null
          media_type?: string
          object_path?: string
          owner_id?: string
          public_allowed?: boolean
          research_submission_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "media_files_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "issues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_files_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_files_research_submission_id_fkey"
            columns: ["research_submission_id"]
            isOneToOne: false
            referencedRelation: "research_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          content: string
          created_at: string
          href: string | null
          id: string
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          href?: string | null
          id?: string
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          href?: string | null
          id?: string
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_datasets: {
        Row: {
          is_public: boolean
          payload: Json
          slug: string
          source_version: string | null
          updated_at: string
        }
        Insert: {
          is_public?: boolean
          payload: Json
          slug: string
          source_version?: string | null
          updated_at?: string
        }
        Update: {
          is_public?: boolean
          payload?: Json
          slug?: string
          source_version?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name: string
          id: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
      project_follows: {
        Row: {
          created_at: string
          project_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          project_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_follows_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_follows_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      project_updates: {
        Row: {
          author_name: string
          content: string
          created_at: string
          id: string
          is_demo: boolean
          project_id: string
          published: boolean
          stage: string
          title: string
          update_date: string
          updated_at: string
        }
        Insert: {
          author_name?: string
          content: string
          created_at?: string
          id?: string
          is_demo?: boolean
          project_id: string
          published?: boolean
          stage?: string
          title: string
          update_date?: string
          updated_at?: string
        }
        Update: {
          author_name?: string
          content?: string
          created_at?: string
          id?: string
          is_demo?: boolean
          project_id?: string
          published?: boolean
          stage?: string
          title?: string
          update_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_updates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          accent: string
          background: string
          budget_label: string
          created_at: string
          goal_id: string
          id: string
          is_demo: boolean
          lead: string
          location: string
          participants: string[]
          progress: number
          project_type: string
          published: boolean
          recruiting: boolean
          slug: string
          start_date: string | null
          status: Database["public"]["Enums"]["project_status"]
          summary: string
          title: string
          updated_at: string
        }
        Insert: {
          accent?: string
          background?: string
          budget_label?: string
          created_at?: string
          goal_id: string
          id: string
          is_demo?: boolean
          lead?: string
          location?: string
          participants?: string[]
          progress?: number
          project_type?: string
          published?: boolean
          recruiting?: boolean
          slug: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          summary: string
          title: string
          updated_at?: string
        }
        Update: {
          accent?: string
          background?: string
          budget_label?: string
          created_at?: string
          goal_id?: string
          id?: string
          is_demo?: boolean
          lead?: string
          location?: string
          participants?: string[]
          progress?: number
          project_type?: string
          published?: boolean
          recruiting?: boolean
          slug?: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          summary?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      research_submissions: {
        Row: {
          created_at: string
          description: string
          feature_type: Database["public"]["Enums"]["map_feature_type"] | null
          id: string
          is_demo: boolean
          location: string
          public_allowed: boolean
          researchers: string
          review_note: string | null
          source: string
          status: Database["public"]["Enums"]["review_status"]
          submission_type: string
          submitter_id: string
          survey_date: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          feature_type?: Database["public"]["Enums"]["map_feature_type"] | null
          id?: string
          is_demo?: boolean
          location?: string
          public_allowed?: boolean
          researchers: string
          review_note?: string | null
          source: string
          status?: Database["public"]["Enums"]["review_status"]
          submission_type: string
          submitter_id: string
          survey_date?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          feature_type?: Database["public"]["Enums"]["map_feature_type"] | null
          id?: string
          is_demo?: boolean
          location?: string
          public_allowed?: boolean
          researchers?: string
          review_note?: string | null
          source?: string
          status?: Database["public"]["Enums"]["review_status"]
          submission_type?: string
          submitter_id?: string
          survey_date?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "research_submissions_submitter_id_fkey"
            columns: ["submitter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      review_records: {
        Row: {
          created_at: string
          id: string
          note: string
          reviewer_id: string
          status: Database["public"]["Enums"]["review_status"]
          submission_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string
          reviewer_id: string
          status: Database["public"]["Enums"]["review_status"]
          submission_id: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string
          reviewer_id?: string
          status?: Database["public"]["Enums"]["review_status"]
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_records_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_records_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "research_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      spatial_features: {
        Row: {
          created_at: string
          description: string
          feature_type: Database["public"]["Enums"]["map_feature_type"]
          geojson: Json
          goal_id: string | null
          id: string
          image_label: string
          is_demo: boolean
          latitude: number
          linked_id: string | null
          linked_type: string | null
          location: string
          longitude: number
          public_participation: boolean
          published: boolean
          status_label: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          feature_type: Database["public"]["Enums"]["map_feature_type"]
          geojson?: Json
          goal_id?: string | null
          id?: string
          image_label?: string
          is_demo?: boolean
          latitude: number
          linked_id?: string | null
          linked_type?: string | null
          location: string
          longitude: number
          public_participation?: boolean
          published?: boolean
          status_label?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          feature_type?: Database["public"]["Enums"]["map_feature_type"]
          geojson?: Json
          goal_id?: string | null
          id?: string
          image_label?: string
          is_demo?: boolean
          latitude?: number
          linked_id?: string | null
          linked_type?: string | null
          location?: string
          longitude?: number
          public_participation?: boolean
          published?: boolean
          status_label?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "spatial_features_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      suggestion_supports: {
        Row: {
          created_at: string
          suggestion_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          suggestion_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          suggestion_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "suggestion_supports_suggestion_id_fkey"
            columns: ["suggestion_id"]
            isOneToOne: false
            referencedRelation: "suggestions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suggestion_supports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      suggestions: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          is_demo: boolean
          project_id: string | null
          response: string | null
          status: Database["public"]["Enums"]["suggestion_status"]
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          is_demo?: boolean
          project_id?: string | null
          response?: string | null
          status?: Database["public"]["Enums"]["suggestion_status"]
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          is_demo?: boolean
          project_id?: string | null
          response?: string | null
          status?: Database["public"]["Enums"]["suggestion_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "suggestions_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suggestions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_options: {
        Row: {
          created_at: string
          id: string
          is_demo: boolean
          label: string
          published: boolean
          sort_order: number
          survey_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          is_demo?: boolean
          label: string
          published?: boolean
          sort_order?: number
          survey_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_demo?: boolean
          label?: string
          published?: boolean
          sort_order?: number
          survey_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_options_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_responses: {
        Row: {
          created_at: string
          id: string
          option_ids: string[]
          response_text: string | null
          survey_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          option_ids?: string[]
          response_text?: string | null
          survey_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          option_ids?: string[]
          response_text?: string | null
          survey_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_responses_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_responses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      surveys: {
        Row: {
          created_at: string
          description: string
          id: string
          is_demo: boolean
          published: boolean
          status: Database["public"]["Enums"]["survey_status"]
          survey_type: Database["public"]["Enums"]["survey_type"]
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          id: string
          is_demo?: boolean
          published?: boolean
          status?: Database["public"]["Enums"]["survey_status"]
          survey_type?: Database["public"]["Enums"]["survey_type"]
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          is_demo?: boolean
          published?: boolean
          status?: Database["public"]["Enums"]["survey_status"]
          survey_type?: Database["public"]["Enums"]["survey_type"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      village_content: {
        Row: {
          body: Json
          created_at: string
          id: string
          is_demo: boolean
          published: boolean
          source_note: string
          summary: string
          title: string
          updated_at: string
        }
        Insert: {
          body?: Json
          created_at?: string
          id: string
          is_demo?: boolean
          published?: boolean
          source_note?: string
          summary?: string
          title: string
          updated_at?: string
        }
        Update: {
          body?: Json
          created_at?: string
          id?: string
          is_demo?: boolean
          published?: boolean
          source_note?: string
          summary?: string
          title?: string
          updated_at?: string
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
      activity_status: "open" | "full" | "ended"
      app_role: "resident" | "collaborator" | "admin"
      issue_status:
        | "pending"
        | "accepted"
        | "assigned"
        | "processing"
        | "completed"
        | "rated"
        | "rejected"
      map_feature_type:
        | "issue"
        | "project"
        | "completed-action"
        | "public-service"
        | "ecology"
        | "culture"
        | "research-photo"
        | "building"
        | "road"
        | "water"
      project_status:
        | "planning"
        | "discussion"
        | "active"
        | "completed"
        | "maintenance"
      review_status:
        | "pending"
        | "approved"
        | "revision"
        | "duplicate"
        | "rejected"
      suggestion_status:
        | "pending"
        | "responded"
        | "discussion"
        | "adopted"
        | "declined"
      survey_status: "open" | "closed"
      survey_type: "single" | "multiple" | "mixed"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      activity_status: ["open", "full", "ended"],
      app_role: ["resident", "collaborator", "admin"],
      issue_status: [
        "pending",
        "accepted",
        "assigned",
        "processing",
        "completed",
        "rated",
        "rejected",
      ],
      map_feature_type: [
        "issue",
        "project",
        "completed-action",
        "public-service",
        "ecology",
        "culture",
        "research-photo",
        "building",
        "road",
        "water",
      ],
      project_status: [
        "planning",
        "discussion",
        "active",
        "completed",
        "maintenance",
      ],
      review_status: [
        "pending",
        "approved",
        "revision",
        "duplicate",
        "rejected",
      ],
      suggestion_status: [
        "pending",
        "responded",
        "discussion",
        "adopted",
        "declined",
      ],
      survey_status: ["open", "closed"],
      survey_type: ["single", "multiple", "mixed"],
    },
  },
} as const
