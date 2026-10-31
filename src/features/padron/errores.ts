/**
 * Traducción de los errores de la base a algo que se pueda leer en la pantalla.
 *
 * Mismo criterio que `features/sorteos/errores.ts` —decir qué pasó y cómo se
 * arregla, nunca reproducir el texto de PostgreSQL— pero con el mapa de esta
 * tabla. No comparte código con aquél a propósito: son dos listas de constraints
 * que no se parecen, y el tronco común serían diez líneas de `typeof`.
 *
 * De dónde salen los códigos:
 *
 *   23505  UNIQUE. Acá siempre es el mismo: ese documento ya está en el padrón.
 *   23514  CHECK. El nombre del constraint dice qué campo fue.
 *   23503  FK — una ciudad que no está en el catálogo.
 *   42501  permiso denegado. No es culpa del usuario: falta un GRANT.
 */

interface ErrorBase {
  code?: unknown
  message?: unknown
  details?: unknown
}

function leer(error: unknown): { code: string; message: string; details: string } {
  if (!error || typeof error !== 'object') return { code: '', message: '', details: '' }
  const { code, message, details } = error as ErrorBase
  return {
    code: typeof code === 'string' ? code : '',
    message: typeof message === 'string' ? message : '',
    details: typeof details === 'string' ? details : '',
  }
}

/**
 * Qué campo señala cada constraint de la base.
 *
 * Los textos están escritos para quien está en el local con la persona
 * enfrente, no para quien escribió el schema: dicen qué formato se espera, con
 * un ejemplo cuando el formato no es obvio.
 */
const POR_CONSTRAINT: Array<[string, string]> = [
  [
    'cliente_sorteo_documento_key',
    'Ese documento ya está en el padrón. Buscalo en la lista y editá esa ficha en vez de crear otra.',
  ],
  [
    'cliente_sorteo_documento_chk',
    'El documento tiene que ser el número sin puntos ni dígito verificador, de 5 a 10 dígitos.',
  ],
  ['cliente_sorteo_documento_dv_chk', 'El dígito verificador es un solo número, del 0 al 9.'],
  [
    'cliente_sorteo_nombre_chk',
    'El nombre tiene que tener entre 3 y 120 caracteres, en MAYÚSCULAS.',
  ],
  [
    'cliente_sorteo_telefono_chk',
    'El celular va en formato nacional de 10 dígitos, por ejemplo 0972413798. No se aceptan líneas bajas.',
  ],
  ['cliente_sorteo_origen_chk', 'El origen no puede pasar de 40 caracteres.'],
  [
    'cliente_sorteo_empresa_sin_fecha_chk',
    'Ese documento es de una empresa (empieza con 80), y la ficha tiene una fecha de nacimiento cargada de antes. Una empresa no lleva fecha: pedí que la borren desde el panel de Supabase antes de cambiar el documento.',
  ],
  ['cliente_sorteo_nacimiento_chk', 'La fecha de nacimiento guardada no es una fecha válida.'],
  [
    'cliente_sorteo_ciudad_id_fkey',
    'Esa ciudad no está en el catálogo. Recargá la página y elegila de nuevo.',
  ],
]

export function mensajeDeError(
  error: unknown,
  porDefecto = 'No pudimos guardar los cambios.',
): string {
  const { code, message, details } = leer(error)

  // PGRST204/202: PostgREST no conoce una columna o una vista que el front sí
  // usa. Siempre significa lo mismo — la base está una versión atrás del código.
  if (code === 'PGRST204' || code === 'PGRST202' || message.includes('schema cache')) {
    return 'La base todavía no tiene esta columna o vista. Volvé a aplicar supabase/schema_clientes.sql en el backend; su última línea refresca el caché de PostgREST.'
  }

  // El error que aparece cuando el schema se aplicó a medias. El caso típico acá
  // es el `grant usage on sequence` que falta y hace fallar sólo los INSERT.
  if (code === '42501') {
    return 'La base rechazó la operación por permisos. Volvé a aplicar supabase/schema_clientes.sql en el backend: su sección EL PANEL es la que habilita esta pantalla.'
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
