import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { prepararImagen, rutaImagenPremio } from '@/features/sorteos/imagen'
import { supabase } from '@/lib/supabase'
import type {
  Empresa,
  EstadoSorteo,
  Marca,
  Sorteo,
  SorteoCambios,
  SorteoListado,
  SorteoMarca,
  SorteoNuevo,
  SorteoPremio,
  SorteoPremioCambios,
  SorteoPremioNuevo,
} from '@/types/database'

/** El bucket de Storage donde viven las imágenes de los premios. */
const BUCKET = 'sorteos'

export type FiltroEstadoSorteo = 'todos' | EstadoSorteo
export type AmbitoBusquedaSorteo = 'nombre' | 'marca'

export interface SorteosFiltros {
  estado: FiltroEstadoSorteo
  busqueda: string
  ambito: AmbitoBusquedaSorteo
}

/**
 * Techo de filas del listado. No hay paginación y es deliberado: un sorteo es un
 * evento de semanas, así que son unidades por año, no miles. El límite existe
 * para que el día que alguien cargue mil, la pantalla se degrade mostrando los
 * más recientes en vez de traerse la tabla entera.
 */
const TECHO_LISTADO = 300

export const claves = {
  listado: (filtros: SorteosFiltros) =>
    ['sorteos', 'listado', filtros.estado, filtros.busqueda, filtros.ambito] as const,
  // `String(id)`: la clave se arma tanto con el id de la URL (string) como con el
  // que devuelve la base (number). Ver el comentario de `useInvalidar`.
  detalle: (id: string | number) => ['sorteos', 'detalle', String(id)] as const,
  marcas: () => ['sorteos', 'catalogo-marcas'] as const,
  empresas: () => ['sorteos', 'empresas'] as const,
}

/** Todo lo que necesita la pantalla de edición de un sorteo. */
export interface SorteoDetalle {
  sorteo: Sorteo
  marcas: SorteoMarca[]
  premios: SorteoPremio[]
}

/* ────────────────────────────── Lecturas ────────────────────────────── */

/**
 * Listado. Sale de `v_sorteo`, que ya trae los conteos de marcas y premios: sin
 * la vista, la tabla haría dos consultas más por fila.
 *
 * El filtro por marca va contra `marcas_texto`, que es el nombre VIGENTE del
 * catálogo — así un sorteo de una marca renombrada se encuentra por su nombre de
 * hoy, aunque la fila guarde el nombre con el que se publicó.
 */
export function useSorteos(filtros: SorteosFiltros) {
  return useQuery({
    queryKey: claves.listado(filtros),
    queryFn: async (): Promise<SorteoListado[]> => {
      let query = supabase
        .from('v_sorteo')
        .select('*')
        .order('fecha_inicio', { ascending: false })
        .order('id', { ascending: false })
        .limit(TECHO_LISTADO)

      if (filtros.estado !== 'todos') query = query.eq('estado', filtros.estado)

      const termino = filtros.busqueda.replace(/[%_]/g, ' ').trim()
      if (termino) {
        const patron = `%${termino}%`
        query =
          filtros.ambito === 'marca'
            ? query.ilike('marcas_texto', patron)
            : query.ilike('nombre', patron)
      }

      const { data, error } = await query
      if (error) throw error
      return data ?? []
    },
  })
}

/**
 * Un sorteo con sus marcas y premios. Son tres consultas en paralelo y no un
 * `select` con embedding: los tipos de este proyecto están escritos a mano y no
 * declaran las relaciones, así que el embedding no tiparía. Tres requests contra
 * el mismo origen HTTP/2 no cuestan más que uno con tres joins.
 */
export function useSorteo(id: string | undefined) {
  return useQuery({
    queryKey: claves.detalle(id ?? ''),
    enabled: Boolean(id),
    queryFn: async (): Promise<SorteoDetalle> => {
      const [cabecera, marcas, premios] = await Promise.all([
        supabase.from('sorteo').select('*').eq('id', id!).single(),
        supabase.from('sorteo_marca').select('*').eq('sorteo_id', id!).order('marca_nombre'),
        supabase.from('sorteo_premio').select('*').eq('sorteo_id', id!).order('orden'),
      ])

      if (cabecera.error) throw cabecera.error
      if (marcas.error) throw marcas.error
      if (premios.error) throw premios.error

      return { sorteo: cabecera.data, marcas: marcas.data ?? [], premios: premios.data ?? [] }
    },
  })
}

/**
 * El catálogo de marcas replicado desde PVTA. Es de lectura y ya tenía GRANT para
 * `authenticated` desde `schema.sql`: esta pantalla no necesitó permisos nuevos.
 *
 * Son ~500 filas y no cambian durante una sesión (el sync corre una vez por día),
 * así que se traen enteras una vez y el buscador filtra en memoria. Paginar el
 * selector contra el servidor sería más lento y menos útil.
 */
export function useCatalogoMarcas(empresaId: string | undefined) {
  return useQuery({
    queryKey: [...claves.marcas(), empresaId ?? ''] as const,
    enabled: Boolean(empresaId),
    staleTime: 30 * 60_000,
    queryFn: async (): Promise<Marca[]> => {
      const { data, error } = await supabase
        .from('marca')
        .select('*')
        .eq('empresa_id', empresaId!)
        .order('nombre')
      if (error) throw error
      return data ?? []
    },
  })
}

/**
 * Las empresas del espejo. Son una o dos filas: si hay una sola, el formulario no
 * pregunta y la usa. El campo aparece recién cuando hay más de una, que es el día
 * en que la pregunta significa algo.
 */
export function useEmpresas() {
  return useQuery({
    queryKey: claves.empresas(),
    staleTime: 30 * 60_000,
    queryFn: async (): Promise<Empresa[]> => {
      const { data, error } = await supabase.from('empresa').select('*').order('nombre')
      if (error) throw error
      return data ?? []
    },
  })
}

/* ───────────────────────────── Escrituras ───────────────────────────── */

/**
 * ⚠️ `String(id)` NO es decorativo: sin eso, esta pantalla se rompe de una forma
 * que parece un problema de permisos y no lo es.
 *
 * PostgREST serializa `bigint` como NÚMERO de JSON, así que el `id` que vuelve de
 * un INSERT es `1`. Pero la clave de `useSorteo` se arma con el `id` de la URL,
 * que es el STRING `"1"`. Las query keys de TanStack Query se comparan por valor y
 * `1 !== "1"`: la invalidación no encuentra nada, la pantalla sigue mostrando el
 * estado viejo, el usuario vuelve a hacer click sobre lo que ya guardó y recién
 * ahí aparece un error — "duplicate key value violates unique constraint" — que
 * apunta al síntoma y no a la causa. Visto en el navegador, no deducido.
 *
 * Los tipos de `database.ts` dicen `string` para estos id (es lo que genera el
 * CLI de Supabase para `bigint`, que en el borde puede venir de las dos formas),
 * así que TypeScript no marca nada: esto se normaliza en tiempo de ejecución o no
 * se normaliza.
 */
function useInvalidar() {
  const queryClient = useQueryClient()
  return {
    listado: () => void queryClient.invalidateQueries({ queryKey: ['sorteos', 'listado'] }),
    todo: (id: string | number) => {
      void queryClient.invalidateQueries({ queryKey: ['sorteos', 'listado'] })
      void queryClient.invalidateQueries({ queryKey: claves.detalle(String(id)) })
    },
  }
}

/**
 * Crea la cabecera. Siempre nace en `BORRADOR` — no porque el front lo decida,
 * sino porque un sorteo recién insertado todavía no tiene marcas ni premios y el
 * trigger de la base no lo dejaría nacer publicado. Por eso `SorteoNuevo` no
 * tiene campo `estado`.
 */
export function useCrearSorteo() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async (nuevo: SorteoNuevo): Promise<Sorteo> => {
      const { data, error } = await supabase.from('sorteo').insert(nuevo).select('*').single()
      if (error) throw error
      return data
    },
    onSuccess: (sorteo) => invalidar.todo(sorteo.id),
  })
}

export function useActualizarSorteo() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async ({
      id,
      cambios,
    }: {
      id: string
      cambios: SorteoCambios
    }): Promise<Sorteo> => {
      const { data, error } = await supabase
        .from('sorteo')
        .update(cambios)
        .eq('id', id)
        .select('*')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (sorteo) => invalidar.todo(sorteo.id),
  })
}

export function useEliminarSorteo() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async (sorteo: Sorteo): Promise<void> => {
      // Storage primero: si se borra la fila y después falla el bucket, quedan
      // archivos que ninguna consulta puede encontrar. Al revés, un borrado de
      // imágenes sin borrado de filas se reintenta solo al volver a borrar.
      await borrarImagenesDelSorteo(sorteo.id)
      const { error } = await supabase.from('sorteo').delete().eq('id', sorteo.id)
      if (error) throw error
    },
    onSuccess: () => invalidar.listado(),
  })
}

export function useCambiarEstado() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async ({ id, estado }: { id: string; estado: EstadoSorteo }): Promise<Sorteo> => {
      const { data, error } = await supabase
        .from('sorteo')
        .update({ estado })
        .eq('id', id)
        .select('*')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (sorteo) => invalidar.todo(sorteo.id),
  })
}

/* ── Marcas del sorteo ── */

export function useAgregarMarca() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async (fila: SorteoMarca): Promise<void> => {
      const { error } = await supabase.from('sorteo_marca').insert(fila)
      if (error) throw error
    },
    onSuccess: (_datos, fila) => invalidar.todo(fila.sorteo_id),
  })
}

/**
 * Quita una marca del sorteo. La FK `sorteo_premio_marca_fkey` borra en cascada
 * los premios que esa marca aportaba: quien llame tiene que haberlo advertido
 * antes (lo hace `SelectorMarcas`), porque desde acá ya no se puede deshacer.
 */
export function useQuitarMarca() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async ({
      sorteoId,
      marcaCodigo,
    }: {
      sorteoId: string
      marcaCodigo: string
    }): Promise<void> => {
      const { error } = await supabase
        .from('sorteo_marca')
        .delete()
        .eq('sorteo_id', sorteoId)
        .eq('marca_codigo', marcaCodigo)
      if (error) throw error
    },
    onSuccess: (_datos, { sorteoId }) => invalidar.todo(sorteoId),
  })
}

/* ── Premios ── */

export function useCrearPremio() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async (nuevo: SorteoPremioNuevo): Promise<SorteoPremio> => {
      const { data, error } = await supabase
        .from('sorteo_premio')
        .insert(nuevo)
        .select('*')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (premio) => invalidar.todo(premio.sorteo_id),
  })
}

export function useActualizarPremio() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async ({
      id,
      cambios,
    }: {
      id: string
      cambios: SorteoPremioCambios
    }): Promise<SorteoPremio> => {
      const { data, error } = await supabase
        .from('sorteo_premio')
        .update(cambios)
        .eq('id', id)
        .select('*')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (premio) => invalidar.todo(premio.sorteo_id),
  })
}

export function useEliminarPremio() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async (premio: SorteoPremio): Promise<void> => {
      const { error } = await supabase.from('sorteo_premio').delete().eq('id', premio.id)
      if (error) throw error
      // La imagen después de la fila: un archivo huérfano no se ve, una fila que
      // apunta a un archivo borrado sí — es un premio con la foto rota.
      if (premio.imagen_path) await borrarImagen(premio.imagen_path)
    },
    onSuccess: (_datos, premio) => invalidar.todo(premio.sorteo_id),
  })
}

/**
 * Reordena todos los premios del sorteo. Va por RPC porque
 * `unique (sorteo_id, orden)` no es deferrable: permutar dos órdenes desde el
 * cliente serían tres requests sin transacción, y un corte en el medio dejaría un
 * premio con un orden provisorio a la vista. Ver `sorteo_premios_reordenar`.
 */
export function useReordenarPremios() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async ({ sorteoId, ids }: { sorteoId: string; ids: string[] }): Promise<void> => {
      const { error } = await supabase.rpc('sorteo_premios_reordenar', {
        p_sorteo_id: sorteoId,
        p_ids: ids,
      })
      if (error) throw error
    },
    onSuccess: (_datos, { sorteoId }) => invalidar.todo(sorteoId),
  })
}

/* ─────────────────────── Imágenes de los premios ─────────────────────── */

/**
 * URL pública de una imagen. El bucket `sorteos` es público a propósito (son
 * fotos de premios, material de marketing), así que no hace falta firmar nada y
 * la imagen se puede cachear como cualquier otra.
 */
export function urlDeImagen(path: string | null | undefined): string | null {
  if (!path) return null
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}

/**
 * Sube la imagen y devuelve su ruta. NO toca la fila del premio: quien llama
 * decide si la ruta va a un premio existente o a uno que todavía se está creando.
 *
 * El orden importa y es siempre este: primero el archivo, después la fila. Al
 * revés, un corte dejaría una fila apuntando a una imagen que no existe, y eso se
 * ve. Así, lo peor que queda es un archivo que nadie referencia.
 */
export async function subirImagenPremio(sorteoId: string, file: File): Promise<string> {
  const { blob, extension, tipo } = await prepararImagen(file)
  const path = rutaImagenPremio(sorteoId, extension)

  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: tipo,
    // Sin `upsert`: la ruta lleva un UUID nuevo cada vez, así que una colisión
    // sería un bug y conviene que se oiga.
    upsert: false,
  })
  if (error) throw error
  return path
}

/** Borra una imagen. Los errores se tragan: un huérfano no justifica un error. */
async function borrarImagen(path: string): Promise<void> {
  await supabase.storage.from(BUCKET).remove([path])
}

/**
 * Borra todas las imágenes de un sorteo, aprovechando que comparten el prefijo
 * `premios/<sorteo_id>/` — que es exactamente para esto que el CHECK de la base
 * fuerza ese layout.
 */
async function borrarImagenesDelSorteo(sorteoId: string): Promise<void> {
  const carpeta = `premios/${sorteoId}`
  const { data } = await supabase.storage.from(BUCKET).list(carpeta)
  if (!data?.length) return
  await supabase.storage.from(BUCKET).remove(data.map((archivo) => `${carpeta}/${archivo.name}`))
}

/**
 * Borra la imagen que un premio dejó de usar. Se llama DESPUÉS de guardar la fila,
 * nunca antes: al revés, cancelar la edición dejaría la fila apuntando a un
 * archivo borrado.
 *
 * Los errores no se propagan: un archivo huérfano no justifica decirle a la
 * persona que su premio no se guardó, cuando sí se guardó.
 */
export async function descartarImagenPremio(path: string | null | undefined): Promise<void> {
  if (!path) return
  await borrarImagen(path)
}
