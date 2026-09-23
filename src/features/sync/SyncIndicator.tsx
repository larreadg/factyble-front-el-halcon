import { AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react'

import { cn } from '@/lib/cn'
import { formatDateTime, formatDistancia, minutosDesde } from '@/lib/dates'
import { MINUTOS_ALERTA, useUltimaSync } from '@/features/sync/useUltimaSync'

type Estado = 'ok' | 'demorada' | 'error'

export function SyncIndicator({ className }: { className?: string }) {
  const { data, isPending, isError } = useUltimaSync()

  if (isPending) {
    return (
      <div className={cn('flex items-center gap-1.5 text-xs text-slate-400', className)}>
        <RefreshCw className="size-3.5 animate-spin" aria-hidden />
        <span>Verificando…</span>
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div
        className={cn('flex items-center gap-1.5 text-xs text-slate-400', className)}
        title="No pudimos leer el estado de la última sincronización."
      >
        <AlertTriangle className="size-3.5" aria-hidden />
        <span>Sincronización desconocida</span>
      </div>
    )
  }

  const minutos = minutosDesde(data.iniciada_en)
  const estado: Estado = data.error
    ? 'error'
    : minutos !== null && minutos > MINUTOS_ALERTA
      ? 'demorada'
      : 'ok'

  const tooltip = construirTooltip(estado, data.error, data.iniciada_en, data.facturas_con_error)

  const estilos: Record<Estado, string> = {
    ok: 'text-slate-500',
    demorada: 'text-amber-600',
    error: 'text-red-600',
  }

  return (
    <div
      className={cn('flex items-center gap-1.5 text-xs font-medium', estilos[estado], className)}
      title={tooltip}
    >
      {estado === 'ok' ? (
        <CheckCircle2 className="size-3.5" aria-hidden />
      ) : (
        <AlertTriangle className="size-3.5" aria-hidden />
      )}
      <span className="hidden sm:inline">Actualizado&nbsp;</span>
      <span>{formatDistancia(data.iniciada_en)}</span>
    </div>
  )
}

function construirTooltip(
  estado: Estado,
  error: string | null,
  iniciadaEn: string,
  facturasConError: number,
): string {
  const base = `Última sincronización: ${formatDateTime(iniciadaEn)}`

  if (estado === 'error') {
    return `${base}\nLa última corrida terminó con error: ${error ?? 'sin detalle'}`
  }
  if (estado === 'demorada') {
    return `${base}\nPasaron más de ${MINUTOS_ALERTA / 60} horas desde la última corrida; los datos podrían estar desactualizados.`
  }
  if (facturasConError > 0) {
    return `${base}\n${facturasConError} factura(s) con error en la última corrida.`
  }
  return base
}
