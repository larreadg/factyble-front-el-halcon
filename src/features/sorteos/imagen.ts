/**
 * Preparación de la imagen de referencia de un premio, antes de subirla.
 *
 * ── Por qué se reencodea en el navegador y no se sube el archivo tal cual ────
 * La foto la saca alguien con el celular en el local: 3 a 6 MB, 4000 px de lado.
 * El bucket `sorteos` tiene un techo de 2 MB (está en `schema_sorteos.sql`), así
 * que subir el original falla más veces de las que funciona — y cuando funciona,
 * manda 5 MB para mostrar una miniatura de 96 px.
 *
 * Acá se reduce a 1200 px de lado mayor y se reencodea en WebP. Una foto de
 * producto queda en 60–150 KB, entra siempre y carga instantáneo. 1200 px es el
 * techo porque es lo que necesita la vista más grande que esta imagen va a tener:
 * la tarjeta del premio en la futura página pública del sorteo.
 *
 * ── Qué pasa si el navegador no puede ───────────────────────────────────────
 * Hay dos caídas distintas y NO se tratan igual:
 *
 *   No puede hacer WebP  → se reencodea en JPEG. El formato es lo accesorio; lo
 *                          que no se puede perder es el REDIMENSIONADO, que es
 *                          lo que hace que una foto de 5 MB entre en un bucket
 *                          con techo de 2 MB.
 *   No puede decodificar → se sube el original. Una imagen corrupta o un canvas
 *                          contaminado hacen fallar todo, y ahí es mejor subir
 *                          1,8 MB de JPEG que decirle a la persona que su foto
 *                          no sirve. El techo del bucket sigue puesto: si el
 *                          original tampoco entra, el error llega con el mensaje
 *                          de tamaño, que es el correcto.
 *
 * ── Y la orientación ────────────────────────────────────────────────────────
 * Un canvas no arrastra el EXIF. Sin pedir `imageOrientation: 'from-image'`, una
 * foto sacada en vertical con el celular —que se guarda apaisada más una etiqueta
 * de "rotar 90°"— sale ACOSTADA del reencode, y ya no hay etiqueta que la
 * enderece. Ver `reducir`.
 */

/** Lo que acepta el bucket. Tiene que coincidir con `allowed_mime_types`. */
export const TIPOS_ACEPTADOS = ['image/jpeg', 'image/png', 'image/webp'] as const

/** `file_size_limit` del bucket: 2 MB. El tope del ORIGINAL antes de convertir. */
const TAMANIO_MAXIMO_ORIGINAL = 12 * 1024 * 1024
/** Y el del archivo que efectivamente se sube. */
const TAMANIO_MAXIMO_SUBIDA = 2 * 1024 * 1024

const LADO_MAXIMO = 1200
const CALIDAD_WEBP = 0.82

export interface ImagenPreparada {
  blob: Blob
  extension: string
  tipo: string
}

/** Error con un mensaje pensado para mostrarse tal cual al lado del campo. */
export class ErrorDeImagen extends Error {}

function extensionDe(tipo: string): string {
  if (tipo === 'image/png') return 'png'
  if (tipo === 'image/webp') return 'webp'
  return 'jpg'
}

function codificar(canvas: HTMLCanvasElement, tipo: string, calidad: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob(resolve, tipo, calidad)
  })
}

async function reducir(file: File): Promise<ImagenPreparada | null> {
  if (typeof createImageBitmap !== 'function') return null

  let bitmap: ImageBitmap
  try {
    // `imageOrientation: 'from-image'` NO es opcional acá, y es el detalle que
    // más se nota si falta: el canvas no arrastra el EXIF, así que una foto
    // vertical de celular —guardada apaisada con una etiqueta de "rotar 90°"—
    // saldría acostada del reencode, sin etiqueta que la enderece después.
    //
    // El valor por defecto de la spec cambió a `from-image` hace unos años, pero
    // no en todos los motores a la vez: pedirlo explícitamente vale lo mismo
    // donde ya es el default y arregla el resto.
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    return null
  }

  try {
    const escala = Math.min(1, LADO_MAXIMO / Math.max(bitmap.width, bitmap.height))
    const ancho = Math.max(1, Math.round(bitmap.width * escala))
    const alto = Math.max(1, Math.round(bitmap.height * escala))
    const seAchico = escala < 1

    const canvas = document.createElement('canvas')
    canvas.width = ancho
    canvas.height = alto

    const contexto = canvas.getContext('2d')
    if (!contexto) return null
    contexto.drawImage(bitmap, 0, 0, ancho, alto)

    let blob = await codificar(canvas, 'image/webp', CALIDAD_WEBP)

    // Un navegador sin encoder WebP no falla: `toBlob` devuelve PNG con el mismo
    // llamado. Ahí se reintenta en JPEG en vez de rendirse, porque lo que no se
    // puede perder es el redimensionado — un PNG de una foto de 12 Mpx pesa más
    // que el original, y rendirse significaría subir los 5 MB que el bucket
    // rechaza. El formato es negociable; el tamaño no.
    const hayWebp = blob?.type === 'image/webp'
    if (!hayWebp) {
      blob = await codificar(canvas, 'image/jpeg', CALIDAD_WEBP)
      if (blob?.type !== 'image/jpeg') return null
      // La misma regla que abajo, y por el mismo motivo: si no hubo que achicar,
      // esto fue sólo un cambio de formato y sólo vale si pesa menos.
      if (!seAchico && blob.size >= file.size) return null
      return { blob, extension: 'jpg', tipo: 'image/jpeg' }
    }
    if (!blob) return null

    // Si NO hubo que achicar, esto fue sólo un cambio de formato, y sólo vale la
    // pena si además pesa menos: un PNG chico y ya optimizado puede salir más
    // pesado en WebP.
    //
    // Si SÍ hubo que achicar, el reencode se queda pase lo que pase. La versión
    // anterior comparaba bytes también en este caso, y en el raro en que perdía
    // volvía a subir el original COMPLETO, de 4000 px — o sea, deshacía el
    // redimensionado justo cuando era imprescindible.
    if (!seAchico && blob.size >= file.size) return null

    return { blob, extension: 'webp', tipo: 'image/webp' }
  } finally {
    bitmap.close()
  }
}

/**
 * Valida y prepara el archivo elegido. Lanza `ErrorDeImagen` con un mensaje
 * mostrable si el archivo no sirve.
 */
export async function prepararImagen(file: File): Promise<ImagenPreparada> {
  if (!(TIPOS_ACEPTADOS as readonly string[]).includes(file.type)) {
    throw new ErrorDeImagen('Sólo se pueden subir imágenes JPG, PNG o WebP.')
  }
  if (file.size > TAMANIO_MAXIMO_ORIGINAL) {
    throw new ErrorDeImagen('La imagen pesa más de 12 MB. Elegí una más liviana.')
  }

  const reducida = await reducir(file)
  if (reducida) return reducida

  if (file.size > TAMANIO_MAXIMO_SUBIDA) {
    throw new ErrorDeImagen(
      'No pudimos comprimir la imagen y pesa más de 2 MB. Probá con una versión más chica.',
    )
  }
  return { blob: file, extension: extensionDe(file.type), tipo: file.type }
}

/**
 * Ruta de la imagen dentro del bucket. El layout `premios/<sorteo_id>/<archivo>`
 * lo exige el CHECK `sorteo_premio_imagen_chk` de la base: hace que todas las
 * imágenes de un sorteo compartan prefijo (borrarlas es una operación) y cierra
 * el path traversal por construcción.
 *
 * El nombre es aleatorio, no el del archivo original: dos personas subiendo
 * `IMG_0001.jpg` no se pisan, y un nombre con espacios o acentos no rompe la URL.
 */
export function rutaImagenPremio(sorteoId: string, extension: string): string {
  return `premios/${sorteoId}/${crypto.randomUUID()}.${extension}`
}
