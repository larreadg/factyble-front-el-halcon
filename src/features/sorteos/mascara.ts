/**
 * «DELIO GABRIEL RECALDE» -> «DELIO G.»
 *
 * Espejo EXACTO de `public.enmascarar_nombre` en
 * `factyble-back/supabase/schema_sorteo_publico.sql`. Están las dos porque la
 * página pública recibe el nombre YA enmascarado por la base —el navegador nunca
 * ve el completo— mientras que la pantalla de presentación recibe el acta entera
 * y enmascara al dibujar, para que el operador pueda ver el nombre real si
 * apaga la opción. Si cambia una, cambia la otra.
 *
 * No intenta adivinar cuál es el nombre y cuál el apellido: en Paraguay vienen
 * en los dos órdenes, y con comas. Acertar no importa — lo que importa es que el
 * ganador SE RECONOZCA y que un tercero no pueda identificarlo desde un video.
 */
export function enmascararNombre(nombre: string | null | undefined): string | null {
  if (!nombre) return null
  const partes = nombre.replace(/[,\s]+/g, ' ').trim().split(' ').filter(Boolean)
  if (partes.length === 0) return null
  if (partes.length === 1) return partes[0] ?? null
  return `${partes[0] ?? ''} ${(partes[1] ?? '').charAt(0)}.`
}
