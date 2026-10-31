import { Badge } from '@/components/ui/Badge'
import { ETIQUETA, TONO } from '@/features/sorteos/estados'
import type { EstadoSorteo } from '@/types/database'

export function EstadoSorteoBadge({ estado }: { estado: EstadoSorteo }) {
  return <Badge tone={TONO[estado]}>{ETIQUETA[estado]}</Badge>
}
