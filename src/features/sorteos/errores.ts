/**
 * Traducción de los errores de la base a algo que se pueda leer en la pantalla.
 *
 * Esta es la primera pantalla del proyecto que ESCRIBE, así que es la primera que
 * puede recibir un rechazo del servidor sobre algo que el usuario acaba de hacer.
 * Los mensajes tienen que decir qué pasó y cómo se arregla, no reproducir el
 * texto de PostgreSQL.
 *
 * De dónde salen los códigos:
 *
 *   PT409  invariante del ciclo de vida (los triggers de `schema_sorteos.sql`).
 *          El campo culpable viaja en `hint`: `estado`, `marcas`, `premios`.
 *   PT400  argumento inválido de `sorteo_premios_reordenar`.
 *   23505  violación de UNIQUE — acá siempre es el nombre repetido en la misma
 *          fecha de inicio (`sorteo_nombre_key`).
 *   23514  violación de CHECK. El nombre del constraint dice qué campo fue.
 *   23503  violación de FK — una marca que no está en el catálogo.
 *   42501  permiso denegado. No es culpa del usuario: falta un GRANT.
 *
 * `42501` se traduce aparte y a propósito. Es el error que aparece cuando el
 * schema se aplicó a medias (el caso típico: faltan los `grant usage on sequence`),
 * y confundirlo con "sesión vencida" mandaría al usuario al login en loop — la
 * misma razón por la que `lib/supabase.ts` lo excluye de `esErrorDeSesion`.
 */

interface ErrorBase {
  code?: unknown
  message?: unknown
  hint?: unknown
  details?: unknown
}

function leer(error: unknown): { code: string; message: string; hint: string; details: string } {
  if (!error || typeof error !== 'object') return { code: '', message: '', hint: '', details: '' }
  const { code, message, hint, details } = error as ErrorBase
  return {
    code: typeof code === 'string' ? code : '',
    message: typeof message === 'string' ? message : '',
    hint: typeof hint === 'string' ? hint : '',
    details: typeof details === 'string' ? details : '',
  }
}

/** Qué dice cada invariante del ciclo de vida cuando la base la hace valer. */
const POR_HINT: Record<string, string> = {
  marcas: 'Agregá al menos una marca antes de publicar el sorteo.',
  premios: 'Cargá al menos un premio antes de publicar el sorteo.',
  estado:
    'El estado del sorteo no permite este cambio. Las marcas y los premios sólo se editan mientras está en borrador.',
}

/** Qué campo señala cada CHECK de la base. */
const POR_CONSTRAINT: Array<[string, string]> = [
  ['sorteo_nombre_chk', 'El nombre tiene que tener entre 3 y 120 caracteres.'],
  ['sorteo_periodo_chk', 'La fecha de cierre no puede ser anterior a la de inicio.'],
  [
    'sorteo_fecha_sorteo_chk',
    'El sorteo se hace cuando el período ya cerró: elegí una fecha igual o posterior al cierre.',
  ],
  [
    'sorteo_monto_minimo_chk',
    'La compra mínima tiene que ser mayor que cero. Dejala vacía si no hay mínimo.',
  ],
  ['sorteo_nombre_key', 'Ya existe un sorteo con ese nombre y esa fecha de inicio.'],
  [
    'sorteo_marca_pkey',
    'Esa marca ya está en el sorteo. Recargá la página para ver la lista al día.',
  ],
  ['sorteo_premio_nombre_chk', 'El nombre del premio tiene que tener entre 2 y 160 caracteres.'],
  ['sorteo_premio_cantidad_chk', 'La cantidad tiene que ser al menos 1.'],
  ['sorteo_premio_valor_chk', 'El valor estimado no puede ser negativo.'],
  ['sorteo_premio_imagen_chk', 'La imagen no se guardó con una ruta válida. Volvé a subirla.'],
  [
    'sorteo_marca_marca_fkey',
    'Esa marca no está en el catálogo. Sincronizá las marcas e intentá de nuevo.',
  ],
  [
    'sorteo_premio_orden_key',
    'Dos premios quedaron con el mismo orden. Recargá la página y volvé a intentarlo.',
  ],
]

/**
 * Storage no habla el idioma de PostgREST: no manda SQLSTATE, manda un `message`
 * en inglés y un status. Los cuatro que importan son los que separan "la persona
 * eligió un archivo que no sirve" de "el backend está a medio aplicar", que es la
 * distinción que un mensaje genérico borra — y con ella, la única pista de que hay
 * que volver a correr el schema.
 */
function mensajeDeStorage(message: string): string | null {
  const texto = message.toLowerCase()

  if (texto.includes('bucket not found')) {
    return 'El bucket «sorteos» de Storage todavía no existe. Volvé a aplicar supabase/schema_sorteos.sql en el backend: la sección ALMACENAMIENTO lo crea.'
  }
  if (texto.includes('row-level security') || texto.includes('unauthorized')) {
    return 'Storage rechazó la subida por permisos: faltan las políticas del bucket «sorteos». Volvé a aplicar supabase/schema_sorteos.sql en el backend.'
  }
  if (texto.includes('maximum allowed size') || texto.includes('payload too large')) {
    return 'La imagen supera el límite de 2 MB del bucket. Probá con una foto más chica.'
  }
  if (texto.includes('mime type') || texto.includes('invalid_mime_type')) {
    return 'Ese tipo de archivo no está permitido. Subí un JPG, un PNG o un WebP.'
  }
  return null
}

export function mensajeDeError(
  error: unknown,
  porDefecto = 'No pudimos guardar los cambios.',
): string {
  const { code, message, hint, details } = leer(error)

  const deStorage = mensajeDeStorage(message)
  if (deStorage) return deStorage

  if (code === 'PT409' || code === 'PT400') {
    return POR_HINT[hint] ?? message ?? porDefecto
  }

  // PGRST204: PostgREST no conoce una columna o una función que el front sí usa.
  // Siempre significa lo mismo — la base está una versión atrás del código — y el
  // mensaje crudo ("in the schema cache") manda a buscar un problema de caché que
  // casi nunca es el problema.
  if (code === 'PGRST204' || code === 'PGRST202' || message.includes('schema cache')) {
    return 'La base todavía no tiene esta columna o función. Volvé a aplicar supabase/schema_sorteos.sql en el backend; su última línea refresca el caché de PostgREST.'
  }

  if (code === '42501') {
    return 'La base rechazó la operación por permisos. Volvé a aplicar supabase/schema_sorteos.sql en el backend.'
  }

  if (code === '23505' || code === '23514' || code === '23503') {
    const texto = `${message} ${details}`
    for (const [constraint, explicacion] of POR_CONSTRAINT) {
      if (texto.includes(constraint)) return explicacion
    }
  }

  // Sin red, PostgREST no contesta y `message` es "Failed to fetch": inútil.
  if (message.toLowerCase().includes('failed to fetch')) {
    return 'No hay conexión con el servidor. Revisá internet y volvé a intentarlo.'
  }

  return message || porDefecto
}

/**
 * `true` cuando el error viene de una invariante del ciclo de vida y no de un
 * campo del formulario: ahí lo que hay que hacer es recargar el sorteo, porque el
 * estado que muestra la pantalla ya no es el que tiene la base.
 */
export function esConflictoDeEstado(error: unknown): boolean {
  const { code, hint } = leer(error)
  return code === 'PT409' && hint === 'estado'
}
