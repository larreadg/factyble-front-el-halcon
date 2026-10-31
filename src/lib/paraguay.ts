/**
 * Las reglas de documento, teléfono y nombre de Paraguay.
 *
 * ── Espejo, y a propósito ──────────────────────────────────────────────────
 * Estas mismas reglas están escritas otras dos veces: en las Edge Functions
 * (`factyble-back/supabase/functions/_shared/comun.ts`) y como CHECK y funciones
 * `normalizar_*` en la base (`factyble-back/supabase/schema_clientes.sql`). No es
 * duplicación por descuido: cada copia cubre una falla distinta.
 *
 *   Acá        para que la persona corrija sin esperar un viaje al servidor.
 *   Edge       porque esto es código en el navegador y se puede saltear entero.
 *   CHECK      porque la Edge Function puede tener un bug, o mañana aparecer
 *              un segundo camino de escritura.
 *
 * Si cambia una, cambian las tres.
 *
 * ── Por qué viven en `lib/` y no en un feature ─────────────────────────────
 * Las usan dos pantallas que no se parecen en nada: el formulario público de
 * `/public/clientes` y el padrón de `/padron`. Son reglas del país, no de una
 * pantalla, y tenerlas en un feature obligaría a la otra a importar desde ahí —
 * que es como empiezan a divergir.
 */

/**
 * Colapsa espacios y exige nombre y apellido sin dígitos. Devuelve el valor en
 * MAYÚSCULAS, que es como se guarda.
 */
export function normalizarNombre(valor: string): string | null {
  const v = valor.replace(/\s+/g, ' ').trim()
  if (/[0-9]/.test(v)) return null
  if (v.length < 3 || v.length > 120) return null
  if (!v.includes(' ')) return null
  return v.toUpperCase()
}

/**
 * Documento en su forma canonica: el numero base y, si lo dio, el digito
 * verificador detras de un guion.
 *
 *   '5.249.657'    -> '5249657'
 *   '5249657-4'    -> '5249657-4'
 *   '5.249.657-4'  -> '5249657-4'
 *
 * Se manda entero y el servidor lo vuelve a partir: la base es la llave de
 * deduplicacion y de cruce con facturas, el DV es un dato aparte.
 *
 * El DV solo se reconoce DETRAS DE UN GUION. Sin esa regla '12345678' seria
 * ambiguo —una cedula de 8 digitos o un RUC de 7 mas DV— y al adivinar mal se
 * partiria o se fusionaria gente.
 */
export function normalizarDocumento(valor: string): string | null {
  const limpio = valor.replace(/[^0-9-]/g, '')
  const partes = limpio.split('-')
  const base = (partes[0] ?? '').replace(/[^0-9]/g, '')
  if (!/^[0-9]{5,10}$/.test(base)) return null
  const dv = (partes[1] ?? '').replace(/[^0-9]/g, '')
  return /^[0-9]$/.test(dv) ? `${base}-${dv}` : base
}

/**
 * Celular paraguayo al formato nacional de 10 dígitos (`0972413798`). Acepta
 * las tres formas en que lo escribe la gente, con o sin `+`, puntos o espacios:
 *
 *   0972413798  ·  972413798  ·  595972413798
 *
 * El orden importa: `0972413798` tiene que probar contra `/^09/` antes que
 * contra `/^9/`, o se le agregaría un cero de más.
 */
export function normalizarTelefono(valor: string): string | null {
  const d = valor.replace(/[^0-9]/g, '')
  if (/^09[0-9]{8}$/.test(d)) return d
  if (/^9[0-9]{8}$/.test(d)) return `0${d}`
  if (/^5959[0-9]{8}$/.test(d)) return `0${d.slice(3)}`
  return null
}

/**
 * RUC de persona juridica: 80 seguido de 6 digitos.
 *
 * Verificado contra datos reales: los 68 RUCs de 8 digitos de las facturas de
 * El Halcon empiezan con 80.
 *
 * Se decide por el PATRON del numero, sin consultar nada. Es aritmetica sobre
 * lo que la persona tipeo, asi que no filtra ninguna informacion.
 */
export function esEmpresa(documentoBase: string): boolean {
  return /^80[0-9]{6}$/.test(documentoBase)
}

/** El numero base, sin el DV: lo que mira `esEmpresa`. */
export function baseDeDocumento(documentoCanonico: string): string {
  return documentoCanonico.split('-')[0] ?? ''
}

/**
 * Razón social: se normaliza pero NO se le exige "dos palabras sin dígitos".
 * "PLANTA 3 S.A." es un nombre válido de empresa y "JUAN" no lo es de persona,
 * así que la misma regla no puede servir para los dos.
 */
export function normalizarRazonSocial(valor: string): string | null {
  const v = valor.replace(/\s+/g, ' ').trim().toUpperCase()
  if (v.length < 3 || v.length > 120) return null
  return v
}

/**
 * `0972413798` -> `0972 413798`. SÓLO para mostrar: lo que viaja y lo que se
 * guarda es siempre el crudo de diez dígitos.
 */
export function formatearTelefono(telefono: string): string {
  return telefono.length === 10 ? `${telefono.slice(0, 4)} ${telefono.slice(4)}` : telefono
}

/**
 * El mismo celular en formato internacional sin `+`, que es lo que espera
 * `wa.me`: `0972413798` -> `595972413798`.
 *
 * Devuelve `null` si el número no tiene la forma nacional de diez dígitos, para
 * no armar un enlace de WhatsApp que lleve a ningún lado.
 */
export function telefonoInternacional(telefono: string | null | undefined): string | null {
  if (!telefono || !/^09[0-9]{8}$/.test(telefono)) return null
  return `595${telefono.slice(1)}`
}

/** El dígito verificador de un documento canónico, o `null` si no lo lleva. */
export function dvDeDocumento(documentoCanonico: string): string | null {
  const dv = documentoCanonico.split('-')[1] ?? ''
  return /^[0-9]$/.test(dv) ? dv : null
}
