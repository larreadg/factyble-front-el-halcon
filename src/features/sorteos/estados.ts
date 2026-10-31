import type { Tone } from '@/components/ui/Badge'
import type { EstadoSorteo } from '@/types/database'

/**
 * El vocabulario del ciclo de vida de un sorteo, en un solo lugar.
 *
 * Las reglas duras las hace valer la base (`schema_sorteos.sql`); esto es cómo se
 * nombran y qué acciones tiene sentido ofrecer. Que estén acá y no repartidas
 * evita que el listado llame "Borrador" a lo que el formulario llama "Sin publicar".
 */

export const ESTADOS: EstadoSorteo[] = ['BORRADOR', 'ABIERTO', 'CERRADO', 'SORTEADO', 'CANCELADO']

export const ETIQUETA: Record<EstadoSorteo, string> = {
  BORRADOR: 'Borrador',
  ABIERTO: 'Abierto',
  CERRADO: 'Cerrado',
  SORTEADO: 'Sorteado',
  CANCELADO: 'Cancelado',
}

/**
 * El tono dice en qué parte del ciclo está, no "bueno o malo": gris lo que todavía
 * no salió, verde lo que está corriendo, ámbar lo que espera una decisión, azul lo
 * terminado y rojo lo que no se hizo.
 */
export const TONO: Record<EstadoSorteo, Tone> = {
  BORRADOR: 'neutro',
  ABIERTO: 'verde',
  CERRADO: 'ambar',
  SORTEADO: 'azul',
  CANCELADO: 'rojo',
}

export const QUE_SIGNIFICA: Record<EstadoSorteo, string> = {
  BORRADOR: 'Todavía no está publicado. Es el único estado en el que se puede editar.',
  ABIERTO: 'Publicado y acumulando participaciones.',
  CERRADO: 'El período terminó. Falta sortear.',
  SORTEADO: 'Ya tiene ganadores. No admite más cambios.',
  CANCELADO: 'No se llevó a cabo. Queda el registro de que existió.',
}

/** Marcas y premios se editan sólo en borrador. Lo exige un trigger de la base. */
export function esEditable(estado: EstadoSorteo): boolean {
  return estado === 'BORRADOR'
}

export interface AccionEstado {
  destino: EstadoSorteo
  etiqueta: string
  /** Qué le pasa al sorteo, para la confirmación. */
  consecuencia: string
  /** `true` cuando conviene pedir confirmación antes de hacerlo. */
  confirmar: boolean
  destructivo: boolean
}

/**
 * Qué se puede hacer desde cada estado.
 *
 * `SORTEADO` no aparece como destino de ninguna acción, y es a propósito: esta
 * pantalla no elige ganadores. Marcar un sorteo como sorteado lo dejaría
 * congelado para siempre —el estado es terminal e inmutable— sin que exista un
 * solo ganador registrado. Lo pone la base sola, al sortear el último premio
 * desde `/sorteos/:id/presentar`, que es cuando hay algo que registrar.
 */
export function accionesDesde(estado: EstadoSorteo): AccionEstado[] {
  switch (estado) {
    case 'BORRADOR':
      return [
        {
          destino: 'ABIERTO',
          etiqueta: 'Publicar sorteo',
          consecuencia:
            'El sorteo pasa a abierto y sus marcas y premios quedan bloqueados. Para volver a editarlos hay que pasarlo de nuevo a borrador.',
          confirmar: true,
          destructivo: false,
        },
      ]
    case 'ABIERTO':
      return [
        {
          destino: 'CERRADO',
          etiqueta: 'Cerrar período',
          consecuencia: 'Deja de acumular participaciones. Se puede reabrir.',
          confirmar: false,
          destructivo: false,
        },
        {
          destino: 'BORRADOR',
          etiqueta: 'Volver a borrador',
          consecuencia: 'Vuelve a ser editable y deja de estar publicado.',
          confirmar: true,
          destructivo: false,
        },
        {
          destino: 'CANCELADO',
          etiqueta: 'Cancelar sorteo',
          consecuencia: 'Queda registrado como no realizado. Se puede reactivar como borrador.',
          confirmar: true,
          destructivo: true,
        },
      ]
    case 'CERRADO':
      return [
        {
          destino: 'ABIERTO',
          etiqueta: 'Reabrir período',
          consecuencia: 'Vuelve a estar abierto.',
          confirmar: false,
          destructivo: false,
        },
        {
          destino: 'CANCELADO',
          etiqueta: 'Cancelar sorteo',
          consecuencia: 'Queda registrado como no realizado.',
          confirmar: true,
          destructivo: true,
        },
      ]
    case 'CANCELADO':
      return [
        {
          destino: 'BORRADOR',
          etiqueta: 'Reactivar como borrador',
          consecuencia: 'Vuelve a ser editable. No se republica solo.',
          confirmar: false,
          destructivo: false,
        },
      ]
    case 'SORTEADO':
      return []
  }
}
