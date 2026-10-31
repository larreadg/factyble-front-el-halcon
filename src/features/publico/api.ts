import { useMutation } from '@tanstack/react-query'

/**
 * Los tres pasos del formulario público, contra tres Edge Functions.
 *
 * ── Esto NO usa el cliente de Supabase, y es deliberado ────────────────────
 * Todo el resto de la app habla con Supabase vía `@/lib/supabase`. Esta página
 * no: postea a Edge Functions que verifican Turnstile y la sesión antes de tocar
 * la base. El navegador de un visitante anónimo nunca recibe la anon key por
 * esta vía.
 *
 * ── Lo que el navegador NO sabe ────────────────────────────────────────────
 * A partir del paso 2, el nombre, el documento, el teléfono y la fecha de
 * nacimiento viven del lado del servidor, atados al token de sesión. El alta del
 * paso 4 manda sólo el token, la ciudad y el consentimiento: no hay forma de
 * postear un nombre "verificado" que no haya salido del registro civil.
 *
 * Ver las tres funciones en `factyble-back/supabase/functions/` y la cabecera de
 * `factyble-back/supabase/schema_verificacion.sql`.
 */

const BASE = import.meta.env.VITE_FUNCIONES_URL

/** Los códigos que devuelven las funciones, más `red` para el fetch caído. */
export type CodigoError =
  | 'metodo'
  | 'origen'
  | 'cuerpo'
  | 'captcha'
  | 'validacion'
  | 'servidor'
  | 'red'
  /** El token de sesión venció, no existe o ya se usó. */
  | 'sesion'
  /** Pidió otro código demasiado pronto. */
  | 'espera'
  /** Tope de códigos por hora para ese número. */
  | 'demasiados'
  /** PIN incorrecto. Trae `restantes`. */
  | 'pin'
  /** Se agotaron los intentos de PIN. */
  | 'intentos'
  /** El PIN venció antes de usarse. */
  | 'vencido'
  /** Tope de documentos distintos consultados con una misma sesión. */
  | 'consultas'
  /** Ese celular ya figura como contacto de demasiados documentos. */
  | 'telefono'
  /** El gateway de SMS no aceptó el mensaje. */
  | 'sms'

export type CampoFormulario =
  | 'telefono'
  | 'pin'
  | 'documento'
  | 'nombre'
  | 'ciudad'
  | 'consentimiento'

export class ErrorPublico extends Error {
  // Campos declarados y asignados a mano, no parámetros-propiedad del
  // constructor: el proyecto compila con `erasableSyntaxOnly`, que los prohíbe
  // porque no son borrables — emiten código en vez de desaparecer al quitar los
  // tipos.
  readonly codigo: CodigoError
  readonly campo: CampoFormulario | undefined
  readonly restantes: number | undefined

  constructor(codigo: CodigoError, campo?: CampoFormulario, restantes?: number) {
    super(codigo)
    this.name = 'ErrorPublico'
    this.codigo = codigo
    this.campo = campo
    this.restantes = restantes
  }
}

const CODIGOS: CodigoError[] = [
  'metodo',
  'origen',
  'cuerpo',
  'captcha',
  'validacion',
  'servidor',
  'red',
  'sesion',
  'espera',
  'demasiados',
  'pin',
  'intentos',
  'vencido',
  'consultas',
  'telefono',
  'sms',
]

const CAMPOS: CampoFormulario[] = [
  'telefono',
  'pin',
  'documento',
  'nombre',
  'ciudad',
  'consentimiento',
]

interface CuerpoError {
  ok: false
  error?: string
  campo?: string
  restantes?: number
}

async function postear<T>(funcion: string, cuerpo: unknown): Promise<T> {
  let respuesta: Response
  try {
    respuesta = await fetch(`${BASE}/${funcion}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cuerpo),
    })
  } catch {
    // Sin conexión, DNS caído, CORS rechazado en el preflight. Desde acá no se
    // distinguen, y para la persona son lo mismo: no salió.
    throw new ErrorPublico('red')
  }

  const texto = await respuesta.text()

  if (respuesta.ok) {
    try {
      return JSON.parse(texto) as T
    } catch {
      throw new ErrorPublico('servidor')
    }
  }

  let fallo: CuerpoError = { ok: false }
  try {
    fallo = JSON.parse(texto) as CuerpoError
  } catch {
    // Respuesta sin JSON (un 502 de infraestructura, por ejemplo).
  }

  throw new ErrorPublico(
    CODIGOS.includes(fallo.error as CodigoError) ? (fallo.error as CodigoError) : 'servidor',
    CAMPOS.includes(fallo.campo as CampoFormulario) ? (fallo.campo as CampoFormulario) : undefined,
    typeof fallo.restantes === 'number' ? fallo.restantes : undefined,
  )
}

/**
 * Ninguna de estas mutaciones reintenta, y por dos razones distintas.
 *
 * El token de Turnstile es de UN SOLO USO: un reintento automático mandaría el
 * mismo token, Cloudflare lo rechazaría por replay y la persona vería un error
 * de captcha sin haber hecho nada mal.
 *
 * Y un reintento de "mandame el código" es un SMS más, que sale plata y choca
 * contra el tope de la hora. Reintentar lo decide ella.
 */
const SIN_REINTENTOS = { retry: false } as const

// ---------------------------------------------------------------------------
// Paso 1 — verificar el celular
// ---------------------------------------------------------------------------

export interface PedidoCodigo {
  telefono: string
  turnstileToken: string
  /** Milisegundos desde que se montó el formulario. Control de tiempo mínimo. */
  transcurridoMs: number
  /** Honeypot: siempre vacío si lo completó una persona. */
  trampa: string
}

export function usePedirCodigo() {
  return useMutation({
    mutationFn: (datos: PedidoCodigo) =>
      postear<{ ok: true; id: string }>('verificar-telefono', { accion: 'enviar', ...datos }),
    ...SIN_REINTENTOS,
  })
}

export interface Confirmacion {
  id: string
  pin: string
  /** Vuelve al servidor porque el hash del PIN va salado con él. */
  telefono: string
}

export function useConfirmarCodigo() {
  return useMutation({
    mutationFn: (datos: Confirmacion) =>
      postear<{ ok: true; sesion: string; telefono: string }>('verificar-telefono', {
        accion: 'confirmar',
        ...datos,
      }),
    ...SIN_REINTENTOS,
  })
}

// ---------------------------------------------------------------------------
// Paso 2 — resolver la identidad
// ---------------------------------------------------------------------------

/**
 * El nombre sale de NUESTRAS facturas, no del registro civil: el servicio del
 * MSPBS filtra por origen geográfico y no es alcanzable desde ninguna nube
 * fuera de Paraguay. Ver la Edge Function.
 *
 * `declarar` es el mismo estado para "nunca compró acá" y para "compró sin dar
 * su documento". Desde afuera no se distinguen, y está bien que así sea.
 */
export interface ResultadoDocumento {
  ok: true
  estado: 'encontrado' | 'declarar' | 'confirmado'
  nombre?: string
  documento: string
  esEmpresa: boolean
}

export interface ConsultaDocumento {
  sesion: string
  documento: string
}

export function useConsultarDocumento() {
  return useMutation({
    mutationFn: (datos: ConsultaDocumento) =>
      postear<ResultadoDocumento>('consultar-documento', { accion: 'consultar', ...datos }),
    ...SIN_REINTENTOS,
  })
}

export interface DeclaracionNombre extends ConsultaDocumento {
  /** Nombre y apellido, o razón social si el RUC es de una empresa. */
  nombre: string
}

export function useDeclararNombre() {
  return useMutation({
    mutationFn: (datos: DeclaracionNombre) =>
      postear<ResultadoDocumento>('consultar-documento', { accion: 'declarar', ...datos }),
    ...SIN_REINTENTOS,
  })
}

// ---------------------------------------------------------------------------
// Paso 4 — el alta
// ---------------------------------------------------------------------------

export interface Alta {
  sesion: string
  ciudadId: number
  consentimiento: boolean
  /** Campaña de la que vino, desde la query de la URL. */
  origen: string | null
  transcurridoMs: number
  trampa: string
}

export function useGuardar() {
  return useMutation({
    mutationFn: (datos: Alta) => postear<{ ok: true }>('registrar-cliente', datos),
    ...SIN_REINTENTOS,
  })
}
