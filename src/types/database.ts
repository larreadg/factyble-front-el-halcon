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

/**
 * Los cinco estados de un sorteo. El orden es el del ciclo de vida, no alfabético.
 *
 * `BORRADOR` es el único estado editable y el único borrable; `SORTEADO` es
 * terminal e inmutable. No son convenciones del front: las hacen cumplir los
 * triggers de `schema_sorteos.sql`, y el front las refleja para no proponer
 * acciones que la base va a rechazar.
 */
export type EstadoSorteo = 'BORRADOR' | 'ABIERTO' | 'CERRADO' | 'SORTEADO' | 'CANCELADO'

export interface Database {
  public: {
    Tables: {
      empresa: {
        Row: {
          id: string
          id_origen: number
          ruc: string
          ruc_sin_dv: string | null
          digito_verificador: string | null
          nombre: string
          timbrado: string | null
          direccion: string | null
          ciudad: string | null
          telefono: string | null
          email: string | null
          actualizado_en: string
        }
        Insert: never
        Update: never
        Relationships: []
      }
      marca: {
        Row: {
          id: string
          empresa_id: string
          codigo: string
          nombre: string
          actualizado_en: string
        }
        Insert: never
        Update: never
        Relationships: []
      }
      /**
       * Cabecera de un sorteo.
       *
       * `Insert` deja afuera `estado`, `creado_por`, `creado_en` y
       * `actualizado_en` a propósito: los pone la base (el trigger
       * `sorteo_antes_de_guardar` descarta lo que llegue en esas columnas), y un
       * tipo que los ofreciera invitaría a escribir código que parece funcionar y
       * no hace nada. Todo sorteo nace en `BORRADOR`.
       *
       * `estado` sí está en `Update`: cambiarlo es publicar, cerrar o cancelar.
       */
      sorteo: {
        Row: {
          id: string
          empresa_id: string
          nombre: string
          descripcion: string | null
          estado: EstadoSorteo
          fecha_inicio: string
          fecha_fin: string
          fecha_sorteo: string | null
          monto_minimo_compra: number | null
          /** Gs. que valen un cupón. `null` = una chance por factura. */
          guaranies_por_cupon: number | null
          creado_por: string | null
          creado_en: string
          actualizado_en: string
          /** URL pública de la constancia. Se genera al pasar a SORTEADO. */
          resultado_slug: string | null
          resultado_publicado: boolean
          /** `true`: los nombres salen como «JORGE O.» al presentar y al publicar. */
          enmascarar_ganadores: boolean
        }
        Insert: {
          empresa_id: string
          nombre: string
          descripcion?: string | null
          fecha_inicio: string
          fecha_fin: string
          fecha_sorteo?: string | null
          monto_minimo_compra?: number | null
          guaranies_por_cupon?: number | null
        }
        Update: {
          nombre?: string
          descripcion?: string | null
          estado?: EstadoSorteo
          fecha_inicio?: string
          fecha_fin?: string
          fecha_sorteo?: string | null
          monto_minimo_compra?: number | null
          guaranies_por_cupon?: number | null
          // Las dos únicas que un sorteo SORTEADO todavía acepta: no tocan el
          // resultado, sólo cómo se publica. Ver el trigger en schema_sorteos.sql.
          resultado_publicado?: boolean
          enmascarar_ganadores?: boolean
        }
        Relationships: []
      }
      /**
       * Marca asociada a un sorteo. No tiene `id` propio: la PK es
       * `(sorteo_id, marca_codigo)`, así que una marca no se puede repetir en el
       * mismo sorteo y **no hay `Update`** — para cambiar una asociación se borra
       * y se inserta.
       *
       * `marca_nombre` es el nombre CONGELADO al asociarla (lo que decía el
       * afiche). El vigente sale de `marca.nombre`.
       */
      sorteo_marca: {
        Row: {
          sorteo_id: string
          marca_codigo: string
          empresa_id: string
          marca_nombre: string
        }
        Insert: {
          sorteo_id: string
          marca_codigo: string
          empresa_id: string
          marca_nombre: string
        }
        Update: never
        Relationships: []
      }
      /**
       * Premio de un sorteo.
       *
       * `imagen_path` es la RUTA dentro del bucket `sorteos` de Storage
       * (`premios/<sorteo_id>/<archivo>`), nunca la URL: la URL se arma con
       * `getPublicUrl` y así mudar el proyecto de Supabase no invalida las filas.
       */
      sorteo_premio: {
        Row: {
          id: string
          sorteo_id: string
          orden: number
          nombre: string
          descripcion: string | null
          cantidad: number
          valor_estimado: number | null
          marca_codigo: string | null
          imagen_path: string | null
        }
        Insert: {
          sorteo_id: string
          orden: number
          nombre: string
          descripcion?: string | null
          cantidad?: number
          valor_estimado?: number | null
          marca_codigo?: string | null
          imagen_path?: string | null
        }
        Update: {
          orden?: number
          nombre?: string
          descripcion?: string | null
          cantidad?: number
          valor_estimado?: number | null
          marca_codigo?: string | null
          imagen_path?: string | null
        }
        Relationships: []
      }
      /**
       * El padrón de participantes de sorteos, cargado por el público desde
       * `/public/clientes` y editable desde `/padron`.
       *
       * `documento` es el número BASE sin dígito verificador, y es la llave de
       * deduplicación: la misma persona que carga una vez su cédula y otra su RUC
       * cae en la misma fila. `ruc` es una columna GENERADA (`documento-dv`), así
       * que no está en `Insert` ni en `Update`.
       *
       * `es_empresa` tampoco: lo deriva un trigger a partir del documento. Ver
       * `cliente_sorteo_derivar_empresa` en `schema_clientes.sql`.
       */
      cliente_sorteo: {
        Row: {
          id: number
          nombre: string
          documento: string
          documento_dv: string | null
          ruc: string | null
          telefono: string
          ciudad_id: number
          /** Sólo las altas anteriores a que el formulario dejara de pedirla. */
          fecha_nacimiento: string | null
          es_empresa: boolean
          /** `true` si el nombre salió de una factura, no de alguien tipeando. */
          nombre_verificado: boolean
          /** `true` si ese celular recibió un PIN por SMS y lo contestó. */
          telefono_verificado: boolean
          consentimiento_en: string
          politica_version: string
          origen: string | null
          creado_en: string
          actualizado_en: string
        }
        Insert: {
          nombre: string
          documento: string
          documento_dv?: string | null
          telefono: string
          ciudad_id: number
          nombre_verificado?: boolean
          telefono_verificado?: boolean
          origen?: string | null
        }
        Update: {
          nombre?: string
          documento?: string
          documento_dv?: string | null
          telefono?: string
          ciudad_id?: number
          nombre_verificado?: boolean
          telefono_verificado?: boolean
        }
        Relationships: []
      }
      /**
       * Qué había antes de cada sobrescritura. Lo escribe un trigger y **no se
       * edita desde ningún lado**: poder editarlo sería poder tapar lo que se
       * editó. Por eso `Insert` y `Update` son `never`.
       */
      cliente_sorteo_historial: {
        Row: {
          id: number
          cliente_id: number
          nombre: string
          telefono: string
          ciudad_id: number
          documento_dv: string | null
          reemplazado_en: string
        }
        Insert: never
        Update: never
        Relationships: []
      }
      /** Catálogo de distritos. Sólo lectura: lo siembra `seed_ciudades.sql`. */
      ciudad: {
        Row: {
          id: number
          departamento: string
          nombre: string
        }
        Insert: never
        Update: never
        Relationships: []
      }
      /**
       * El acta de cada premio sorteado. Se escribe UNA vez y no se edita: no
       * hay `Update`, y el `Insert` tampoco se usa desde el front — lo escribe
       * `sorteo_ejecutar_premio`, que es quien puede garantizar que el bolillero
       * y el ganador salieron de la misma lista.
       */
      sorteo_resultado: {
        Row: {
          id: number
          sorteo_id: number
          premio_id: number
          factura_id: number
          factura_numero: string | null
          factura_fecha: string | null
          factura_total: number | null
          /** Lo comprado en las marcas del sorteo: lo que hizo calificar la factura. */
          factura_monto_marcas: number | null
          receptor_ruc: string | null
          receptor_nombre: string | null
          /** Cuántas facturas había en el bolillero. */
          participantes: number
          /** Cuántos cupones sumaban. Igual a `participantes` sin cupones. */
          cupones: number
          /** Cuántas personas distintas representaban esas facturas. */
          clientes: number
          /** El cupón 1..cupones que salió sorteado. */
          indice_ganador: number
          sorteado_en: string
          sorteado_por: string | null
        }
        Insert: never
        Update: never
        Relationships: []
      }
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
      /**
       * Fila del listado de sorteos: la cabecera con la empresa resuelta y sus
       * marcas y premios ya contados.
       *
       * `marcas_texto` es para FILTRAR con `ilike` y trae el nombre VIGENTE de
       * cada marca (con fallback al congelado), así que una marca renombrada
       * después del sorteo se sigue encontrando por su nombre de hoy. Para MOSTRAR
       * las marcas de un sorteo se usa `sorteo_marca.marca_nombre`, que es el
       * congelado — la misma distinción que en el detalle de factura.
       */
      /**
       * El padrón con la ciudad resuelta y el conteo de cambios.
       *
       * `busqueda` concatena nombre, documento, RUC, teléfono y ciudad para poder
       * filtrar con un solo `ilike` en vez de un `or` de cinco campos — la misma
       * idea que `v_factura_busqueda`.
       */
      v_cliente_sorteo: {
        Row: Database['public']['Tables']['cliente_sorteo']['Row'] & {
          ciudad_nombre: string | null
          ciudad_departamento: string | null
          /** Cuántas veces se sobrescribieron sus datos. */
          cambios: number
          busqueda: string | null
        }
        Relationships: []
      }
      /**
       * El acta con el premio resuelto y, si esa persona está en el padrón, su
       * teléfono — que es lo que se busca cinco minutos después de sortear.
       */
      v_sorteo_resultado: {
        Row: Database['public']['Tables']['sorteo_resultado']['Row'] & {
          premio_nombre: string
          premio_orden: number
          premio_cantidad: number
          padron_telefono: string | null
          padron_telefono_verificado: boolean | null
          /** El nombre con el que esa persona figura en el padrón, si figura. */
          padron_nombre: string | null
          padron_id: number | null
          /** El SHA-256 del bolillero en hexadecimal, para poder auditarlo. */
          bolillero_hash: string
        }
        Relationships: []
      }
      v_sorteo: {
        Row: {
          id: string
          empresa_id: string
          empresa_nombre: string
          nombre: string
          descripcion: string | null
          estado: EstadoSorteo
          fecha_inicio: string
          fecha_fin: string
          fecha_sorteo: string | null
          monto_minimo_compra: number | null
          guaranies_por_cupon: number | null
          creado_por: string | null
          creado_en: string
          actualizado_en: string
          marcas: number
          marcas_texto: string
          premios: number
          premios_unidades: number
        }
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
       *
       * `p_orden` elige el criterio del ranking: `'total'` (el default) ordena por
       * monto facturado y `'cantidad'` por unidades vendidas. La RPC valida el
       * valor contra esa lista y cae al default si no lo reconoce, así que el tipo
       * lo declara `string` y el estrechado a las dos opciones vive en el front
       * (`OrdenTopProductos`, en `features/dashboard/api.ts`).
       */
      dashboard_top_productos: {
        Args: {
          p_desde: string
          p_hasta: string
          p_limite?: number
          p_moneda?: string
          p_orden?: string
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
      /**
       * Buscador de la pantalla de productos. `clave` es el `producto_id` cuando
       * lo hay y la descripción cuando no — la misma clave que agrupa el top de
       * productos, y la que se le pasa a `ventas_por_producto`. Un término vacío
       * no devuelve nada.
       */
      productos_buscar: {
        Args: { p_busqueda: string; p_limite?: number }
        Returns: {
          clave: string
          producto_id: string | null
          descripcion: string | null
          documentos: number
          ultima_venta: string | null
        }[]
      }
      /**
       * Lo vendido de cada clave pedida en el rango. Devuelve una fila por clave,
       * también las que no se vendieron (en cero). `descripcion` y
       * `ultima_venta` salen de toda la historia del artículo, no del rango.
       */
      ventas_por_producto: {
        Args: { p_desde: string; p_hasta: string; p_claves: string[]; p_moneda?: string }
        Returns: {
          clave: string
          producto_id: string | null
          descripcion: string
          cantidad: number
          documentos: number
          total: number
          ultima_venta: string | null
        }[]
      }
      /**
       * Reasigna el orden de TODOS los premios de un sorteo, en el orden del
       * array. Es una RPC y no un `update` por fila porque
       * `unique (sorteo_id, orden)` no es deferrable: permutar dos órdenes choca
       * en el medio aunque el resultado final sea válido.
       *
       * `p_ids` tiene que ser exactamente el conjunto de premios del sorteo; un
       * subconjunto se rechaza con `PT400`.
       */
      /**
       * El bolillero: una fila por factura que califica, ordenada por
       * `factura_id`. `p_antes_del_acta` reconstruye la lista tal como estaba al
       * sortear esa acta — es lo que hace verificable el hash guardado.
       */
      sorteo_participantes: {
        Args: { p_sorteo_id: number; p_antes_del_acta?: number | null }
        Returns: {
          factura_id: number
          factura_numero: string | null
          factura_fecha: string | null
          factura_total: number
          monto_marcas: number
          receptor_ruc: string | null
          receptor_nombre: string | null
          documento: string
          /** Cuántas chances vale esta factura. Siempre 1 sin cupones. */
          cupones: number
        }[]
      }
      /**
       * Sortea un premio y devuelve el id del acta. Un premio se sortea UNA vez:
       * el segundo intento falla con `PT409`, no repite el sorteo.
       */
      /**
       * Congela el bolillero y se compromete a una semilla. Idempotente: la
       * pantalla de presentación la llama al entrar y una recarga no rehace nada.
       */
      sorteo_iniciar: {
        Args: { p_sorteo_id: number }
        Returns: {
          congelado_en: string
          bolillero_hash: string
          semilla_hash: string
          participantes: number
          cupones: number
        }[]
      }
      /** Todo lo que la pantalla necesita para reconstruirse tras una recarga. */
      sorteo_estado_presentacion: {
        Args: { p_sorteo_id: number }
        Returns: {
          estado: EstadoSorteo
          congelado_en: string | null
          bolillero_hash: string | null
          semilla_hash: string | null
          /** Sólo después del último premio. */
          semilla: string | null
          enmascarar: boolean
          resultado_slug: string | null
          guaranies_por_cupon: number | null
          participantes: number
          clientes: number
          /** Facturas que siguen en juego. */
          elegibles: number
          /** Cupones que siguen en juego: el módulo del próximo premio. */
          cupones: number
          premios_pendientes: number
        }[]
      }
      /** La constancia pública. Es la ÚNICA función que `anon` puede ejecutar. */
      sorteo_resultado_publico: {
        Args: { p_slug: string }
        Returns: {
          sorteo_nombre: string
          empresa_nombre: string
          marcas: string | null
          fecha_inicio: string
          fecha_fin: string
          sorteado_en: string | null
          guaranies_por_cupon: number | null
          monto_minimo_compra: number | null
          participantes: number | null
          cupones: number | null
          clientes: number | null
          bolillero_hash: string | null
          semilla_hash: string | null
          semilla: string | null
          premios: PremioPublico[] | null
        }[]
      }
      sorteo_ejecutar_premio: {
        Args: { p_premio_id: number }
        Returns: number
      }
      sorteo_premios_reordenar: {
        Args: { p_sorteo_id: string; p_ids: string[] }
        Returns: undefined
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

export type Empresa = PublicSchema['Tables']['empresa']['Row']
export type Marca = PublicSchema['Tables']['marca']['Row']

export type Sorteo = PublicSchema['Tables']['sorteo']['Row']
export type SorteoNuevo = PublicSchema['Tables']['sorteo']['Insert']
export type SorteoCambios = PublicSchema['Tables']['sorteo']['Update']
/** Fila del listado: `sorteo` + empresa + conteos. Ver `v_sorteo`. */
export type SorteoListado = PublicSchema['Views']['v_sorteo']['Row']

export type SorteoMarca = PublicSchema['Tables']['sorteo_marca']['Row']
export type SorteoPremio = PublicSchema['Tables']['sorteo_premio']['Row']
export type SorteoPremioNuevo = PublicSchema['Tables']['sorteo_premio']['Insert']
export type SorteoPremioCambios = PublicSchema['Tables']['sorteo_premio']['Update']

export type Ciudad = PublicSchema['Tables']['ciudad']['Row']

export type ClienteSorteo = PublicSchema['Tables']['cliente_sorteo']['Row']
export type ClienteSorteoNuevo = PublicSchema['Tables']['cliente_sorteo']['Insert']
export type ClienteSorteoCambios = PublicSchema['Tables']['cliente_sorteo']['Update']
/** Fila del listado del padrón: el cliente + su ciudad + sus cambios. */
export type ClienteSorteoListado = PublicSchema['Views']['v_cliente_sorteo']['Row']
export type ClienteSorteoCambio = PublicSchema['Tables']['cliente_sorteo_historial']['Row']

/** Un premio con su ganador, tal como sale de la RPC pública. */
export interface PremioPublico {
  orden: number
  premio: string
  cantidad: number
  /** Enmascarado según `enmascarar_ganadores`. Nunca viene el RUC. */
  ganador: string | null
  factura: string | null
  factura_fecha: string | null
  sorteado_en: string
  posicion: number
  /** Sobre cuántos cupones se sorteó. Con una chance por factura, cuántas facturas. */
  de: number
  /** Cuántas facturas había en juego, que con cupones ya no es lo mismo. */
  facturas: number
}

/** Fila del bolillero: una factura que califica para el sorteo. */
export type SorteoParticipante =
  PublicSchema['Functions']['sorteo_participantes']['Returns'][number]
/** El acta de un premio ya sorteado. */
export type SorteoResultado = PublicSchema['Views']['v_sorteo_resultado']['Row']
/** El estado completo de la pantalla de presentación. */
export type EstadoPresentacion =
  PublicSchema['Functions']['sorteo_estado_presentacion']['Returns'][number]
/** La constancia pública de un sorteo. */
export type ResultadoPublico =
  PublicSchema['Functions']['sorteo_resultado_publico']['Returns'][number]

export type DashboardResumen = PublicSchema['Functions']['dashboard_resumen']['Returns'][number]
export type DashboardPeriodo = PublicSchema['Functions']['dashboard_por_periodo']['Returns'][number]
export type DashboardReceptor =
  PublicSchema['Functions']['dashboard_top_receptores']['Returns'][number]
export type DashboardProducto =
  PublicSchema['Functions']['dashboard_top_productos']['Returns'][number]
export type DashboardMarca = PublicSchema['Functions']['dashboard_top_marcas']['Returns'][number]
export type DashboardEstablecimiento =
  PublicSchema['Functions']['dashboard_por_establecimiento']['Returns'][number]
export type ProductoEncontrado = PublicSchema['Functions']['productos_buscar']['Returns'][number]
export type VentaProducto = PublicSchema['Functions']['ventas_por_producto']['Returns'][number]

/** Columna de `v_factura` por la que se puede ordenar la tabla. */
export type FacturaSortField = 'fecha_emision' | 'numero_documento' | 'total'

/** Columna de `v_cliente_sorteo` por la que se puede ordenar el padrón. */
export type PadronSortField = 'creado_en' | 'nombre' | 'documento' | 'ciudad_nombre'
