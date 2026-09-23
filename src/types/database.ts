/**
 * Tipos del schema `public`, escritos a mano con la misma forma que produce
 * `supabase gen types typescript --project-id <id> --schema public`.
 *
 * Cuando haya acceso al CLI, este archivo se reemplaza por el generado y el resto
 * del código no cambia: todo se consume vía los alias del final.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type EstadoSifen = 'APROBADO' | 'CANCELADO'
export type CondicionVenta = 'CONTADO' | 'CREDITO'

/** Fila de `v_factura`, la vista que consume todo el listado. */
export type VFacturaRow = {
  id: string
  cdc: string | null
  numero_documento: string | null
  fecha_emision: string
  estado_sifen: EstadoSifen
  condicion_venta: CondicionVenta | null
  moneda: string
  total: number
  total_iva: number
  total_exentas: number
  total_gravado_5: number
  total_gravado_10: number
  total_iva_5: number
  total_iva_10: number
  receptor_ruc: string | null
  receptor: string | null
  receptor_situacion_tributaria: string | null
  establecimiento_nombre: string | null
  caja_nombre: string | null
  link_qr: string | null
  fuente: string | null
  id_externo: string | null
  emitida_por: string | null
  sincronizado_en: string | null
  empresa_id_origen: string | null
  empresa_ruc: string | null
  empresa_nombre: string | null
  empresa_timbrado: string | null
}

/**
 * Fila de `v_factura_busqueda`: `v_factura` más los dos textos por los que se
 * puede filtrar una factura por su contenido.
 *
 * `items_texto`  -> descripción + marca congelada de cada línea.
 * `marcas_texto` -> sólo las marcas, sin repetir y con el nombre VIGENTE del
 *                   catálogo (fallback al congelado). Ver `AmbitoBusqueda`.
 *
 * Las dos son `''` cuando no hay nada que concatenar, nunca `null`.
 */
export type VFacturaBusquedaRow = VFacturaRow & {
  items_texto: string
  marcas_texto: string
}

export type TasaIva = 'T0' | 'T5' | 'T10'

/**
 * Fila de `v_factura_item`: una línea de `factura_detalle`, con la marca del
 * catálogo ya resuelta.
 *
 * `marca` y `marca_nombre` NO son lo mismo, y la diferencia importa:
 *
 *   marca        -> el texto CONGELADO al momento de vender. Es lo que decía el
 *                   KuDE que se le entregó al cliente, así que es lo que hay que
 *                   MOSTRAR junto al ítem.
 *   marca_nombre -> el nombre VIGENTE del catálogo. Sobrevive a que la marca se
 *                   renombre, así que es por el que hay que AGRUPAR en un reporte.
 *
 * Los dos pueden ser `null`: el producto no tiene marca declarada en el sistema
 * de origen (~20% de los ítems), o la factura no vino de ese sistema.
 */
export type VFacturaItemRow = {
  id: string
  factura_id: string
  nro_linea: number
  descripcion: string | null
  cantidad: number
  precio_unitario: number
  tasa: TasaIva
  impuesto: number
  total: number
  producto_id: string | null
  marca_id: string | null
  marca: string | null
  marca_nombre: string | null
}

export interface Database {
  public: {
    Tables: {
      sync_corrida: {
        Row: {
          id: string
          iniciada_en: string
          finalizada_en: string | null
          facturas_sincronizadas: number
          facturas_con_error: number
          truncada: boolean
          duracion_ms: number | null
          error: string | null
        }
        Insert: {
          id?: string
          iniciada_en?: string
          finalizada_en?: string | null
          facturas_sincronizadas?: number
          facturas_con_error?: number
          truncada?: boolean
          duracion_ms?: number | null
          error?: string | null
        }
        Update: {
          id?: string
          iniciada_en?: string
          finalizada_en?: string | null
          facturas_sincronizadas?: number
          facturas_con_error?: number
          truncada?: boolean
          duracion_ms?: number | null
          error?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      v_factura: {
        Row: VFacturaRow
        Relationships: []
      }
      /**
       * `v_factura` + `items_texto` + `marcas_texto`: la misma fila, filtrable
       * por lo que se vendió y por la marca de lo vendido.
       */
      v_factura_busqueda: {
        Row: VFacturaBusquedaRow
        Relationships: []
      }
      v_factura_item: {
        Row: VFacturaItemRow
        Relationships: []
      }
    }
    Functions: {
      dashboard_resumen: {
        Args: { p_desde: string; p_hasta: string; p_moneda?: string }
        Returns: {
          cantidad: number
          canceladas: number
          total: number
          total_iva: number
          total_exentas: number
          total_gravado_5: number
          total_gravado_10: number
          total_iva_5: number
          total_iva_10: number
          total_contado: number
          total_credito: number
          ticket_promedio: number
          clientes_distintos: number
        }[]
      }
      dashboard_por_periodo: {
        Args: {
          p_desde: string
          p_hasta: string
          p_granularidad: string
          p_moneda?: string
        }
        Returns: {
          periodo: string
          cantidad: number
          total: number
          total_iva: number
        }[]
      }
      dashboard_top_receptores: {
        Args: {
          p_desde: string
          p_hasta: string
          p_limite?: number
          p_moneda?: string
        }
        Returns: {
          receptor_ruc: string | null
          receptor: string | null
          cantidad: number
          total: number
        }[]
      }
      /**
       * Agrupa por `producto_id` cuando lo hay y cae a la descripción cuando no:
       * el mismo artículo facturado con descripciones distintas cuenta una vez.
       * `descripcion` es la del documento más reciente del grupo, y `producto_id`
       * viene `null` para los grupos armados por descripción.
       */
      dashboard_top_productos: {
        Args: {
          p_desde: string
          p_hasta: string
          p_limite?: number
          p_moneda?: string
        }
        Returns: {
          descripcion: string | null
          producto_id: string | null
          cantidad: number
          documentos: number
          total: number
        }[]
      }
      /**
       * Top de marcas del período. Agrupa por el CÓDIGO de marca, no por el texto
       * congelado en cada ítem: una marca renombrada aparecería partida en dos.
       * `marca` es el nombre vigente del catálogo, con fallback al texto congelado
       * más reciente cuando el código no resuelve. Excluye los ítems sin marca.
       *
       * `marca_id` nunca es null: la RPC lo exige en el `where`. `marca` SÍ puede
       * serlo — sale de `coalesce(max(m.nombre), <texto congelado más reciente>)`,
       * y los dos son null cuando el código no resuelve contra el catálogo y el
       * ítem tampoco traía texto. Es el caso raro (2 de 259.577 ítems medidos),
       * pero el tipo no puede prometer lo contrario.
       */
      dashboard_top_marcas: {
        Args: {
          p_desde: string
          p_hasta: string
          p_limite?: number
          p_moneda?: string
        }
        Returns: {
          marca_id: string
          marca: string | null
          cantidad: number
          documentos: number
          total: number
        }[]
      }
      dashboard_por_establecimiento: {
        Args: { p_desde: string; p_hasta: string; p_moneda?: string }
        Returns: {
          establecimiento: string | null
          caja: string | null
          cantidad: number
          total: number
        }[]
      }
    }
    Enums: Record<never, never>
    CompositeTypes: Record<never, never>
  }
}

/* Alias que usa la app, para no arrastrar los caminos largos por todos lados. */

type PublicSchema = Database['public']

export type Factura = PublicSchema['Views']['v_factura']['Row']
export type FacturaItem = PublicSchema['Views']['v_factura_item']['Row']
export type SyncCorrida = PublicSchema['Tables']['sync_corrida']['Row']

export type DashboardResumen = PublicSchema['Functions']['dashboard_resumen']['Returns'][number]
export type DashboardPeriodo = PublicSchema['Functions']['dashboard_por_periodo']['Returns'][number]
export type DashboardReceptor =
  PublicSchema['Functions']['dashboard_top_receptores']['Returns'][number]
export type DashboardProducto =
  PublicSchema['Functions']['dashboard_top_productos']['Returns'][number]
export type DashboardMarca = PublicSchema['Functions']['dashboard_top_marcas']['Returns'][number]
export type DashboardEstablecimiento =
  PublicSchema['Functions']['dashboard_por_establecimiento']['Returns'][number]

/** Columna de `v_factura` por la que se puede ordenar la tabla. */
export type FacturaSortField = 'fecha_emision' | 'numero_documento' | 'total'
