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
    PostgrestVersion: "14.18"
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
      admins: {
        Row: {
          correo: string
          created_at: string
          nombre: string
          user_id: string
        }
        Insert: {
          correo: string
          created_at?: string
          nombre: string
          user_id: string
        }
        Update: {
          correo?: string
          created_at?: string
          nombre?: string
          user_id?: string
        }
        Relationships: []
      }
      avances_ronda: {
        Row: {
          propuestas: number
          realizado_at: string
          realizado_por: string | null
          ronda_destino_id: string
          ronda_origen_id: string
        }
        Insert: {
          propuestas: number
          realizado_at?: string
          realizado_por?: string | null
          ronda_destino_id: string
          ronda_origen_id: string
        }
        Update: {
          propuestas?: number
          realizado_at?: string
          realizado_por?: string | null
          ronda_destino_id?: string
          ronda_origen_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "avances_ronda_ronda_destino_id_fkey"
            columns: ["ronda_destino_id"]
            isOneToOne: false
            referencedRelation: "rondas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avances_ronda_ronda_origen_id_fkey"
            columns: ["ronda_origen_id"]
            isOneToOne: true
            referencedRelation: "rondas"
            referencedColumns: ["id"]
          },
        ]
      }
      calificaciones: {
        Row: {
          created_at: string
          criterio_id: string
          id: string
          propuesta_id: string
          puntaje: number
          ronda_id: string
          updated_at: string
          votante_id: string
        }
        Insert: {
          created_at?: string
          criterio_id: string
          id?: string
          propuesta_id: string
          puntaje: number
          ronda_id: string
          updated_at?: string
          votante_id: string
        }
        Update: {
          created_at?: string
          criterio_id?: string
          id?: string
          propuesta_id?: string
          puntaje?: number
          ronda_id?: string
          updated_at?: string
          votante_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calificaciones_criterio_id_fkey"
            columns: ["criterio_id"]
            isOneToOne: false
            referencedRelation: "criterios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calificaciones_ronda_propuesta_fkey"
            columns: ["ronda_id", "propuesta_id"]
            isOneToOne: false
            referencedRelation: "resultados_ronda"
            referencedColumns: ["ronda_id", "propuesta_id"]
          },
          {
            foreignKeyName: "calificaciones_ronda_propuesta_fkey"
            columns: ["ronda_id", "propuesta_id"]
            isOneToOne: false
            referencedRelation: "ronda_propuestas"
            referencedColumns: ["ronda_id", "propuesta_id"]
          },
        ]
      }
      calificaciones_enviadas: {
        Row: {
          criterio_id: string
          propuesta_id: string
          puntaje: number
          ronda_id: string
          votante_id: string
        }
        Insert: {
          criterio_id: string
          propuesta_id: string
          puntaje: number
          ronda_id: string
          votante_id: string
        }
        Update: {
          criterio_id?: string
          propuesta_id?: string
          puntaje?: number
          ronda_id?: string
          votante_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calificaciones_enviadas_criterio_id_fkey"
            columns: ["criterio_id"]
            isOneToOne: false
            referencedRelation: "criterios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calificaciones_enviadas_ronda_propuesta_fkey"
            columns: ["ronda_id", "propuesta_id"]
            isOneToOne: false
            referencedRelation: "resultados_ronda"
            referencedColumns: ["ronda_id", "propuesta_id"]
          },
          {
            foreignKeyName: "calificaciones_enviadas_ronda_propuesta_fkey"
            columns: ["ronda_id", "propuesta_id"]
            isOneToOne: false
            referencedRelation: "ronda_propuestas"
            referencedColumns: ["ronda_id", "propuesta_id"]
          },
        ]
      }
      criterios: {
        Row: {
          activo: boolean
          descripcion: string | null
          id: string
          nombre: string
          orden: number
        }
        Insert: {
          activo?: boolean
          descripcion?: string | null
          id?: string
          nombre: string
          orden: number
        }
        Update: {
          activo?: boolean
          descripcion?: string | null
          id?: string
          nombre?: string
          orden?: number
        }
        Relationships: []
      }
      ganadores_confirmados: {
        Row: {
          confirmado_at: string
          confirmado_por: string | null
          ronda_id: string
        }
        Insert: {
          confirmado_at?: string
          confirmado_por?: string | null
          ronda_id: string
        }
        Update: {
          confirmado_at?: string
          confirmado_por?: string | null
          ronda_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ganadores_confirmados_ronda_id_fkey"
            columns: ["ronda_id"]
            isOneToOne: true
            referencedRelation: "rondas"
            referencedColumns: ["id"]
          },
        ]
      }
      propuestas: {
        Row: {
          area: string
          ciudad: string
          created_at: string
          created_by: string
          descartada_at: string | null
          descartada_por: string | null
          estado: string
          folio: number
          id: string
          logo_path: string
          motivo_descarte: string | null
          nombre_propuesto: string
          notas_internas: string | null
          participante_nombre: string
          significado: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          area: string
          ciudad: string
          created_at?: string
          created_by?: string
          descartada_at?: string | null
          descartada_por?: string | null
          estado?: string
          folio?: never
          id?: string
          logo_path: string
          motivo_descarte?: string | null
          nombre_propuesto: string
          notas_internas?: string | null
          participante_nombre: string
          significado: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          area?: string
          ciudad?: string
          created_at?: string
          created_by?: string
          descartada_at?: string | null
          descartada_por?: string | null
          estado?: string
          folio?: never
          id?: string
          logo_path?: string
          motivo_descarte?: string | null
          nombre_propuesto?: string
          notas_internas?: string | null
          participante_nombre?: string
          significado?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      ronda_propuestas: {
        Row: {
          created_at: string
          posicion_final: number | null
          propuesta_id: string
          ronda_id: string
        }
        Insert: {
          created_at?: string
          posicion_final?: number | null
          propuesta_id: string
          ronda_id: string
        }
        Update: {
          created_at?: string
          posicion_final?: number | null
          propuesta_id?: string
          ronda_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ronda_propuestas_propuesta_id_fkey"
            columns: ["propuesta_id"]
            isOneToOne: false
            referencedRelation: "propuestas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ronda_propuestas_propuesta_id_fkey"
            columns: ["propuesta_id"]
            isOneToOne: false
            referencedRelation: "propuestas_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ronda_propuestas_ronda_id_fkey"
            columns: ["ronda_id"]
            isOneToOne: false
            referencedRelation: "rondas"
            referencedColumns: ["id"]
          },
        ]
      }
      rondas: {
        Row: {
          created_at: string
          estado: string
          id: string
          nombre: string
          numero: number
          top_n: number
        }
        Insert: {
          created_at?: string
          estado?: string
          id?: string
          nombre: string
          numero: number
          top_n: number
        }
        Update: {
          created_at?: string
          estado?: string
          id?: string
          nombre?: string
          numero?: number
          top_n?: number
        }
        Relationships: []
      }
      votos_enviados: {
        Row: {
          calificaciones: number
          enviado_at: string
          ronda_id: string
          votante_id: string
        }
        Insert: {
          calificaciones: number
          enviado_at?: string
          ronda_id: string
          votante_id: string
        }
        Update: {
          calificaciones?: number
          enviado_at?: string
          ronda_id?: string
          votante_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "votos_enviados_ronda_id_fkey"
            columns: ["ronda_id"]
            isOneToOne: false
            referencedRelation: "rondas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      propuestas_admin: {
        Row: {
          area: string | null
          busqueda: string | null
          capturada_por_nombre: string | null
          ciudad: string | null
          created_at: string | null
          created_by: string | null
          descartada_at: string | null
          descartada_por: string | null
          descartada_por_nombre: string | null
          editada_por_nombre: string | null
          estado: string | null
          folio: number | null
          id: string | null
          logo_path: string | null
          motivo_descarte: string | null
          nombre_orden: string | null
          nombre_propuesto: string | null
          notas_internas: string | null
          participante_nombre: string | null
          significado: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Relationships: []
      }
      resultados_ronda: {
        Row: {
          folio: number | null
          gerentes_calificaron: number | null
          nombre_propuesto: string | null
          participante_nombre: string | null
          posicion: number | null
          posicion_final: number | null
          promedio_general: number | null
          promedio_por_criterio: Json | null
          propuesta_estado: string | null
          propuesta_id: string | null
          ronda_id: string | null
          ronda_numero: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ronda_propuestas_propuesta_id_fkey"
            columns: ["propuesta_id"]
            isOneToOne: false
            referencedRelation: "propuestas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ronda_propuestas_propuesta_id_fkey"
            columns: ["propuesta_id"]
            isOneToOne: false
            referencedRelation: "propuestas_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ronda_propuestas_ronda_id_fkey"
            columns: ["ronda_id"]
            isOneToOne: false
            referencedRelation: "rondas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      ajustar_folio: { Args: never; Returns: number }
      buscar_posibles_duplicados: {
        Args: {
          p_excluir_id?: string
          p_nombre_propuesto: string
          p_participante: string
        }
        Returns: {
          estado: string
          folio: number
          id: string
          motivo: string
          nombre_propuesto: string
          participante_nombre: string
          similitud: number
        }[]
      }
      calificaciones_esperadas: { Args: { p_ronda: string }; Returns: number }
      confirmar_ganadores: {
        Args: { p_ids: string[]; p_ronda: string }
        Returns: undefined
      }
      deshacer_avance: { Args: { p_origen: string }; Returns: undefined }
      enviar_voto: {
        Args: { p_ronda: string; p_votante: string }
        Returns: string
      }
      es_admin: { Args: never; Returns: boolean }
      pasar_a_siguiente_ronda: {
        Args: { p_origen: string; p_propuestas: string[] }
        Returns: number
      }
      reiniciar_folio_si_vacio: { Args: never; Returns: boolean }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
    Enums: {},
  },
} as const
