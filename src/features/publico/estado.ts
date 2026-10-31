/**
 * El estado del formulario público, como máquina.
 *
 * ── Por qué un reducer y no diez `useState` ────────────────────────────────
 * Este formulario tiene una invariante que se rompe sola si cada dato vive por
 * su cuenta: TODO lo que se cargó después del paso 1 depende del token de
 * sesión, y si ese token cambia o se cae, lo demás dejó de ser válido.
 *
 * Con estados sueltos, "volver a cambiar el número" es acordarse de limpiar
 * cinco campos en el `onClick` de un botón — y el día que se agregue un sexto,
 * va a quedar colgado. Acá el reducer es el único lugar donde eso puede pasar
 * mal, y se lee de arriba abajo.
 */

import type { CampoFormulario, CodigoError } from '@/features/publico/api'

/** Los cuatro pasos del riel. El 1 tiene dos pantallas: ver `Fase`. */
export type Paso = 1 | 2 | 3 | 4

/**
 * Las dos mitades del paso 1. Son un paso solo en el riel porque para la persona
 * "verificar mi celular" es un acto, no dos; pero son dos pantallas porque entre
 * medio hay que esperar un SMS.
 */
export type Fase = 'numero' | 'pin'

/**
 * Qué pide el paso 2 cuando el registro civil no alcanzó.
 *
 *   'ninguno'  el nombre salió del registro civil, no hay nada que pedir
 *   'persona'  no lo encontró (o el servicio no contestó): que escriba su nombre
 *   'empresa'  el RUC es de persona jurídica: que escriba la razón social
 */
export type PedidoNombre = 'ninguno' | 'persona' | 'empresa'

export interface Identidad {
  /** Ya en mayúsculas, como se va a guardar. */
  nombre: string
  /** Con el DV pegado si lo dio: `5249657-4`. */
  documento: string
  esEmpresa: boolean
  /** `true` si salió del registro civil, `false` si lo tipeó la persona. */
  verificado: boolean
}

export interface Estado {
  paso: Paso
  fase: Fase
  /** Hacia dónde se movió el último cambio de paso: decide la animación. */
  sentido: 'adelante' | 'atras'

  /** Como lo tipeó. El normalizado vuelve del servidor en `telefono`. */
  telefonoTipeado: string
  /** `09XXXXXXXX`, tal como lo guardó el servidor. Vacío hasta verificar. */
  telefono: string
  /** El id de la verificación en curso; lo devolvió el paso 1. */
  idVerificacion: string
  /**
   * Cuándo se pidió el código, en milisegundos de época. De acá SALE la cuenta
   * regresiva del reenvío, en vez de un contador que se decrementa.
   *
   * Es la diferencia entre "el estado dice cuándo pasó algo" y "el estado dice
   * cuántos segundos quedan": lo segundo obliga a inicializarlo desde un efecto,
   * que es una cascada de renders, y además se desincroniza si la pestaña se
   * queda dormida. Lo pone quien despacha la acción, así el reducer sigue puro.
   */
  pedidoEn: number
  pin: string

  /** El token que autoriza los pasos 2 a 4. Vacío = no verificado. */
  sesion: string

  documento: string
  identidad: Identidad | null
  pedidoNombre: PedidoNombre
  nombre: string

  ciudadId: string
  consentimiento: boolean

  /** Un mensaje por campo. Se limpia al tocar el campo. */
  errores: Partial<Record<CampoFormulario, string>>
  /** Lo que no es de un campo: red, captcha, topes. */
  aviso: string | null
  /** Intentos de PIN que quedan, cuando el servidor los informó. */
  intentosRestantes: number | null

  guardado: boolean
}

export const ESTADO_INICIAL: Estado = {
  paso: 1,
  fase: 'numero',
  sentido: 'adelante',
  telefonoTipeado: '',
  telefono: '',
  idVerificacion: '',
  pedidoEn: 0,
  pin: '',
  sesion: '',
  documento: '',
  identidad: null,
  pedidoNombre: 'ninguno',
  nombre: '',
  ciudadId: '',
  consentimiento: false,
  errores: {},
  aviso: null,
  intentosRestantes: null,
  guardado: false,
}

export type Accion =
  | { tipo: 'telefonoTipeado'; valor: string }
  | { tipo: 'codigoPedido'; id: string; en: number }
  | { tipo: 'pin'; valor: string }
  | { tipo: 'verificado'; sesion: string; telefono: string }
  | { tipo: 'documento'; valor: string }
  | { tipo: 'nombre'; valor: string }
  | { tipo: 'identidadResuelta'; identidad: Identidad }
  | { tipo: 'nombrePedido'; cual: Exclude<PedidoNombre, 'ninguno'>; documento: string }
  | { tipo: 'ciudad'; valor: string }
  | { tipo: 'consentimiento'; valor: boolean }
  | { tipo: 'avanzar'; a: Paso }
  | { tipo: 'volver'; a: Paso }
  | { tipo: 'cambiarNumero' }
  | { tipo: 'guardado' }
  | { tipo: 'error'; codigo: CodigoError; campo?: CampoFormulario; restantes?: number }
  | { tipo: 'limpiarAviso' }

/**
 * Los mensajes de error, en un solo lugar.
 *
 * Cada uno dice QUÉ pasó y QUÉ hacer. "Código incorrecto" a secas deja a alguien
 * mirando la pantalla sin saber si tiene que reenviar o volver a tipear.
 */
function mensaje(codigo: CodigoError, restantes?: number): string {
  switch (codigo) {
    case 'red':
      return 'No pudimos conectarnos. Revisá tu internet y probá de nuevo.'
    case 'captcha':
      return 'La verificación de seguridad venció. Probá de nuevo.'
    case 'sms':
      return 'No pudimos mandar el mensaje. Probá de nuevo en un rato, o pedí ayuda en el local.'
    case 'espera':
      return 'Recién te mandamos un código. Esperá unos segundos antes de pedir otro.'
    case 'demasiados':
      return 'Pediste muchos códigos para ese número. Probá de nuevo en una hora.'
    case 'pin':
      return restantes && restantes > 0
        ? `Ese código no es. Te quedan ${String(restantes)} ${restantes === 1 ? 'intento' : 'intentos'}.`
        : 'Ese código no es.'
    case 'intentos':
      return 'Se agotaron los intentos. Pedí un código nuevo.'
    case 'vencido':
      return 'El código venció. Pedí uno nuevo.'
    case 'consultas':
      return 'Probaste demasiados números. Verificá tu celular de nuevo para seguir.'
    case 'telefono':
      return 'Ese celular ya está en varios registros. Si es un error, pedí ayuda en el local.'
    case 'sesion':
      return 'La verificación venció. Pedí un código nuevo para seguir.'
    case 'origen':
    case 'metodo':
    case 'cuerpo':
    case 'servidor':
    case 'validacion':
      return 'No pudimos guardar tus datos. Probá de nuevo en unos minutos.'
  }
}

/** Los mensajes de los errores que sí son de un campo concreto. */
const POR_CAMPO: Record<CampoFormulario, string> = {
  telefono: 'Escribí tu celular, por ejemplo 0972 413798.',
  pin: 'Escribí los 4 dígitos del código.',
  documento: 'Escribí tu RUC o tu número de cédula.',
  nombre: 'Escribí tu nombre y tu apellido, sin números.',
  ciudad: 'Elegí tu ciudad.',
  consentimiento: 'Necesitamos tu autorización para guardar tus datos.',
}

export function reducir(estado: Estado, accion: Accion): Estado {
  switch (accion.tipo) {
    case 'telefonoTipeado':
      return { ...estado, telefonoTipeado: accion.valor, errores: {}, aviso: null }

    case 'codigoPedido':
      return {
        ...estado,
        idVerificacion: accion.id,
        pedidoEn: accion.en,
        fase: 'pin',
        sentido: 'adelante',
        pin: '',
        errores: {},
        aviso: null,
        intentosRestantes: null,
      }

    case 'pin':
      // Sólo dígitos y nunca más de cuatro: el campo no deja escribir algo que
      // el servidor va a rechazar.
      return {
        ...estado,
        pin: accion.valor.replace(/\D/g, '').slice(0, 4),
        errores: {},
        aviso: null,
      }

    case 'verificado':
      return {
        ...estado,
        sesion: accion.sesion,
        telefono: accion.telefono,
        paso: 2,
        sentido: 'adelante',
        errores: {},
        aviso: null,
        intentosRestantes: null,
      }

    case 'documento':
      // Cambiar el número invalida lo que se resolvió con el anterior. Sin esto
      // alguien podría corregir la cédula después de la búsqueda y guardar el
      // nombre de otra persona con su número nuevo.
      return {
        ...estado,
        documento: accion.valor,
        identidad: null,
        pedidoNombre: 'ninguno',
        nombre: '',
        errores: {},
        aviso: null,
      }

    case 'nombre':
      return { ...estado, nombre: accion.valor, errores: {}, aviso: null }

    case 'identidadResuelta':
      return {
        ...estado,
        identidad: accion.identidad,
        pedidoNombre: 'ninguno',
        errores: {},
        aviso: null,
      }

    case 'nombrePedido':
      return {
        ...estado,
        pedidoNombre: accion.cual,
        documento: accion.documento,
        identidad: null,
        errores: {},
        aviso: null,
      }

    case 'ciudad':
      return { ...estado, ciudadId: accion.valor, errores: {}, aviso: null }

    case 'consentimiento':
      return { ...estado, consentimiento: accion.valor, errores: {}, aviso: null }

    case 'avanzar':
      return { ...estado, paso: accion.a, sentido: 'adelante', errores: {}, aviso: null }

    case 'volver':
      return { ...estado, paso: accion.a, sentido: 'atras', errores: {}, aviso: null }

    case 'cambiarNumero':
      // Volver al principio NO es "paso = 1": el token de sesión que autoriza
      // los pasos 2 a 4 quedó atado al número anterior. Se vuelve al estado
      // inicial a propósito, salvo lo que la persona no tiene por qué retipear.
      return {
        ...ESTADO_INICIAL,
        telefonoTipeado: estado.telefonoTipeado,
        documento: estado.documento,
        ciudadId: estado.ciudadId,
        sentido: 'atras',
      }

    case 'guardado':
      return { ...estado, guardado: true, errores: {}, aviso: null }

    case 'limpiarAviso':
      return { ...estado, aviso: null, errores: {} }

    case 'error': {
      // Una sesión vencida no es un error que se lea y se siga: lo cargado ya no
      // sirve. Se vuelve al paso 1 con el aviso puesto.
      if (accion.codigo === 'sesion' || accion.codigo === 'consultas') {
        return {
          ...ESTADO_INICIAL,
          telefonoTipeado: estado.telefonoTipeado,
          documento: estado.documento,
          ciudadId: estado.ciudadId,
          sentido: 'atras',
          aviso: mensaje(accion.codigo),
        }
      }

      // `intentos` y `vencido` dejan el PIN inservible: se vuelve a la pantalla
      // del número, donde el botón dice "Mandarme el código".
      if (accion.codigo === 'intentos' || accion.codigo === 'vencido') {
        return {
          ...estado,
          fase: 'numero',
          sentido: 'atras',
          pin: '',
          idVerificacion: '',
          pedidoEn: 0,
          intentosRestantes: null,
          errores: {},
          aviso: mensaje(accion.codigo),
        }
      }

      if (accion.codigo === 'pin') {
        return {
          ...estado,
          pin: '',
          intentosRestantes: accion.restantes ?? null,
          errores: { pin: mensaje('pin', accion.restantes) },
          aviso: null,
        }
      }

      if (accion.codigo === 'validacion' && accion.campo) {
        return { ...estado, errores: { [accion.campo]: POR_CAMPO[accion.campo] }, aviso: null }
      }

      return { ...estado, aviso: mensaje(accion.codigo), errores: {} }
    }
  }
}

/** Los errores que el front detecta sin preguntar. Mismo texto que el servidor. */
export function errorDeCampo(campo: CampoFormulario): string {
  return POR_CAMPO[campo]
}
