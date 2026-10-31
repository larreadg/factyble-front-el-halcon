/**
 * Reconocer a quien ya se registró, desde su propio dispositivo.
 *
 * ── Por qué en el navegador y no consultando la base ───────────────────────
 * Un endpoint público que conteste "¿esta cédula ya está registrada?" es un
 * oráculo de cédulas: las paraguayas son secuenciales, así que no hace falta
 * conocerlas para barrer un rango y armar la lista de quién es cliente de
 * El Halcón. Turnstile encarece ese barrido, no lo cierra.
 *
 * Esto resuelve el caso real —alguien escanea el QR del local con SU celular y
 * vuelve otro día con el mismo celular— sin una sola llamada al servidor y sin
 * filtrar absolutamente nada. Desde otro dispositivo la persona llena el
 * formulario y el UNIQUE de `documento` deduplica en silencio, como siempre.
 *
 * ── Qué se guarda, y qué NO ────────────────────────────────────────────────
 * Sólo el nombre y el teléfono YA ENMASCARADO. Ni la cédula, ni el teléfono
 * completo, ni la ciudad.
 *
 * La razón es un escenario concreto: si el QR termina usándose en una tablet
 * del mostrador, lo guardado queda a la vista de la próxima persona. Con el
 * mínimo, lo peor que ve es un nombre y tres dígitos — y la pantalla de
 * bienvenida tiene un "No soy yo" bien visible que borra todo. Guardar la
 * cédula ahí sería peor que el oráculo que estamos evitando.
 */

const CLAVE = 'elhalcon.sorteo.v1'

export interface ClienteRecordado {
  nombre: string
  /** Ya enmascarado al guardar: nunca se almacena el número completo. */
  telefonoMascara: string
  guardadoEn: string
}

/** `0972413798` -> `0972 ••• 798`. Suficiente para que se reconozca. */
export function enmascararTelefono(telefono: string): string {
  if (telefono.length < 7) return '•••'
  return `${telefono.slice(0, 4)} ••• ${telefono.slice(-3)}`
}

/** El primer nombre, para saludar sin sonar a formulario. */
export function primerNombre(nombre: string): string {
  return nombre.split(' ')[0] ?? nombre
}

/**
 * Todo va envuelto en try/catch: en modo incógnito, con las cookies de sitio
 * bloqueadas o en algunos WebView, `localStorage` no sólo viene vacío — tirar
 * de él LANZA. Sin el catch, el formulario entero se cae en el navegador de
 * alguien que sólo quería anotarse.
 */
export function leerRecordado(): ClienteRecordado | null {
  try {
    const crudo = localStorage.getItem(CLAVE)
    if (!crudo) return null
    const dato = JSON.parse(crudo) as Partial<ClienteRecordado>
    if (typeof dato.nombre !== 'string' || typeof dato.telefonoMascara !== 'string') {
      return null
    }
    return {
      nombre: dato.nombre,
      telefonoMascara: dato.telefonoMascara,
      guardadoEn: typeof dato.guardadoEn === 'string' ? dato.guardadoEn : '',
    }
  } catch {
    return null
  }
}

export function guardarRecordado(nombre: string, telefono: string): void {
  try {
    const dato: ClienteRecordado = {
      nombre,
      telefonoMascara: enmascararTelefono(telefono),
      guardadoEn: new Date().toISOString(),
    }
    localStorage.setItem(CLAVE, JSON.stringify(dato))
  } catch {
    // Que no se pueda recordar no es un error para la persona: ya se registró.
  }
}

export function olvidarRecordado(): void {
  try {
    localStorage.removeItem(CLAVE)
  } catch {
    // Nada que hacer: si no se puede escribir, tampoco se pudo guardar antes.
  }
}
