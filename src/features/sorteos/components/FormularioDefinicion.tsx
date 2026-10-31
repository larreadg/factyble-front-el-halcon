import { useMemo, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { describedBy } from '@/components/ui/inputStyles'
import { Campo } from '@/features/sorteos/components/Campo'
import { hoyEnAsuncion, isIsoDate } from '@/lib/dates'
import { formatCurrency } from '@/lib/format'
import type { Empresa, Sorteo } from '@/types/database'

export interface ValoresDefinicion {
  empresa_id: string
  nombre: string
  descripcion: string
  fecha_inicio: string
  fecha_fin: string
  fecha_sorteo: string
  /** Como texto: un `number` vacío no existe, y `0` no es lo mismo que "sin mínimo". */
  monto_minimo_compra: string
  /** Ídem: vacío = una chance por factura, sin importar cuánto se compró. */
  guaranies_por_cupon: string
}

type Errores = Partial<Record<keyof ValoresDefinicion, string>>

function valoresDe(sorteo: Sorteo | undefined, empresaPorDefecto: string): ValoresDefinicion {
  if (!sorteo) {
    return {
      empresa_id: empresaPorDefecto,
      nombre: '',
      descripcion: '',
      // El período arranca hoy porque es el caso normal (se carga el sorteo el día
      // que empieza). El cierre queda vacío a propósito: una fecha de fin
      // adivinada es de las que se publican sin mirar.
      fecha_inicio: hoyEnAsuncion(),
      fecha_fin: '',
      fecha_sorteo: '',
      monto_minimo_compra: '',
      guaranies_por_cupon: '',
    }
  }
  return {
    empresa_id: sorteo.empresa_id,
    nombre: sorteo.nombre,
    descripcion: sorteo.descripcion ?? '',
    fecha_inicio: sorteo.fecha_inicio,
    fecha_fin: sorteo.fecha_fin,
    fecha_sorteo: sorteo.fecha_sorteo ?? '',
    monto_minimo_compra:
      sorteo.monto_minimo_compra === null ? '' : String(Number(sorteo.monto_minimo_compra)),
    guaranies_por_cupon:
      sorteo.guaranies_por_cupon === null ? '' : String(Number(sorteo.guaranies_por_cupon)),
  }
}

/**
 * Las mismas reglas que los CHECK de `sorteo`, del lado del navegador.
 *
 * No están duplicadas por desconfianza: la base valida porque es la única que no
 * se puede saltear, y el front valida para que la persona corrija sin esperar un
 * round-trip ni leer el nombre de un constraint. Si alguna vez discrepan, la que
 * manda es la base — y este archivo es el que hay que corregir.
 */
function validar(valores: ValoresDefinicion): Errores {
  const errores: Errores = {}
  const nombre = valores.nombre.trim()

  if (nombre.length < 3) errores.nombre = 'Poné un nombre de al menos 3 caracteres.'
  else if (nombre.length > 120) errores.nombre = 'El nombre no puede pasar de 120 caracteres.'

  if (!isIsoDate(valores.fecha_inicio)) errores.fecha_inicio = 'Elegí la fecha de inicio.'
  if (!isIsoDate(valores.fecha_fin)) errores.fecha_fin = 'Elegí la fecha de cierre.'
  else if (isIsoDate(valores.fecha_inicio) && valores.fecha_fin < valores.fecha_inicio)
    errores.fecha_fin = 'El cierre no puede ser anterior al inicio.'

  if (valores.fecha_sorteo) {
    if (!isIsoDate(valores.fecha_sorteo)) errores.fecha_sorteo = 'Fecha inválida.'
    else if (isIsoDate(valores.fecha_fin) && valores.fecha_sorteo < valores.fecha_fin)
      errores.fecha_sorteo = 'El sorteo se hace cuando el período ya cerró.'
  }

  if (valores.monto_minimo_compra) {
    const monto = Number(valores.monto_minimo_compra)
    if (!Number.isFinite(monto) || monto <= 0)
      errores.monto_minimo_compra = 'Tiene que ser mayor que cero, o vacío si no hay mínimo.'
  }

  if (valores.guaranies_por_cupon) {
    const porCupon = Number(valores.guaranies_por_cupon)
    if (!Number.isFinite(porCupon) || porCupon <= 0)
      errores.guaranies_por_cupon =
        'Tiene que ser mayor que cero, o vacío para una chance por factura.'
  }

  if (!valores.empresa_id) errores.empresa_id = 'Elegí la empresa que hace el sorteo.'

  return errores
}

export interface DefinicionGuardada {
  empresa_id: string
  nombre: string
  descripcion: string | null
  fecha_inicio: string
  fecha_fin: string
  fecha_sorteo: string | null
  monto_minimo_compra: number | null
  guaranies_por_cupon: number | null
}

export function FormularioDefinicion({
  sorteo,
  empresas,
  soloLectura = false,
  guardando = false,
  textoGuardar = 'Guardar cambios',
  onGuardar,
}: {
  sorteo?: Sorteo
  empresas: Empresa[]
  soloLectura?: boolean
  guardando?: boolean
  textoGuardar?: string
  onGuardar: (valores: DefinicionGuardada) => void
}) {
  // Con una sola empresa el campo no se muestra y se usa esa; con más de una, la
  // del sorteo que se está editando, o vacío para que el usuario elija.
  const empresaPorDefecto =
    empresas.length === 1 ? (empresas[0]?.id ?? '') : (sorteo?.empresa_id ?? '')
  const iniciales = useMemo(() => valoresDe(sorteo, empresaPorDefecto), [sorteo, empresaPorDefecto])

  const [valores, setValores] = useState<ValoresDefinicion>(iniciales)
  const [tocado, setTocado] = useState(false)

  const errores = validar(valores)
  const hayErrores = Object.keys(errores).length > 0
  const sucio = useMemo(
    () =>
      (Object.keys(iniciales) as (keyof ValoresDefinicion)[]).some(
        (k) => valores[k] !== iniciales[k],
      ),
    [valores, iniciales],
  )

  function cambiar<C extends keyof ValoresDefinicion>(campo: C, valor: string) {
    setValores((previos) => ({ ...previos, [campo]: valor }))
  }

  /** Los errores recién se muestran al intentar guardar, no mientras se tipea. */
  const error = (campo: keyof ValoresDefinicion) => (tocado ? errores[campo] : undefined)

  function enviar() {
    setTocado(true)
    if (hayErrores) return
    onGuardar({
      empresa_id: valores.empresa_id,
      nombre: valores.nombre.trim(),
      descripcion: valores.descripcion.trim() || null,
      fecha_inicio: valores.fecha_inicio,
      fecha_fin: valores.fecha_fin,
      fecha_sorteo: valores.fecha_sorteo || null,
      monto_minimo_compra: valores.monto_minimo_compra ? Number(valores.monto_minimo_compra) : null,
      guaranies_por_cupon: valores.guaranies_por_cupon ? Number(valores.guaranies_por_cupon) : null,
    })
  }

  const montoEnLimpio = valores.monto_minimo_compra ? Number(valores.monto_minimo_compra) : 0
  const porCuponEnLimpio = valores.guaranies_por_cupon ? Number(valores.guaranies_por_cupon) : 0

  return (
    <form
      className="space-y-4"
      onSubmit={(evento) => {
        evento.preventDefault()
        enviar()
      }}
    >
      <fieldset disabled={soloLectura || guardando} className="space-y-4">
        {empresas.length > 1 ? (
          <Campo
            id="sorteo-empresa"
            etiqueta="Empresa"
            error={error('empresa_id')}
            ayuda="El catálogo de marcas es por empresa: cambiarla vacía las marcas elegidas."
            className="max-w-sm"
          >
            <Select
              id="sorteo-empresa"
              value={valores.empresa_id}
              onChange={(evento) => cambiar('empresa_id', evento.target.value)}
              options={empresas.map((empresa) => ({ value: empresa.id, label: empresa.nombre }))}
            />
          </Campo>
        ) : null}

        <Campo
          id="sorteo-nombre"
          etiqueta="Nombre del sorteo"
          error={error('nombre')}
          ayuda="Como se va a anunciar. Ej.: Semana Tramontina 2026."
        >
          <Input
            id="sorteo-nombre"
            value={valores.nombre}
            maxLength={120}
            autoComplete="off"
            aria-describedby={describedBy('sorteo-nombre', true)}
            onChange={(evento) => cambiar('nombre', evento.target.value)}
          />
        </Campo>

        <Campo
          id="sorteo-descripcion"
          etiqueta="Descripción"
          opcional
          ayuda="Para uso interno: qué se está promocionando y por qué."
        >
          <Textarea
            id="sorteo-descripcion"
            value={valores.descripcion}
            rows={2}
            aria-describedby={describedBy('sorteo-descripcion', true)}
            onChange={(evento) => cambiar('descripcion', evento.target.value)}
          />
        </Campo>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Campo id="sorteo-inicio" etiqueta="Participación desde" error={error('fecha_inicio')}>
            <Input
              id="sorteo-inicio"
              type="date"
              value={valores.fecha_inicio}
              aria-describedby={describedBy('sorteo-inicio', Boolean(error('fecha_inicio')))}
              onChange={(evento) => cambiar('fecha_inicio', evento.target.value)}
            />
          </Campo>

          <Campo id="sorteo-fin" etiqueta="hasta" error={error('fecha_fin')}>
            <Input
              id="sorteo-fin"
              type="date"
              value={valores.fecha_fin}
              min={valores.fecha_inicio || undefined}
              aria-describedby={describedBy('sorteo-fin', Boolean(error('fecha_fin')))}
              onChange={(evento) => cambiar('fecha_fin', evento.target.value)}
            />
          </Campo>

          <Campo
            id="sorteo-fecha-sorteo"
            etiqueta="Fecha del sorteo"
            opcional
            error={error('fecha_sorteo')}
          >
            <Input
              id="sorteo-fecha-sorteo"
              type="date"
              value={valores.fecha_sorteo}
              min={valores.fecha_fin || undefined}
              aria-describedby={describedBy('sorteo-fecha-sorteo', Boolean(error('fecha_sorteo')))}
              onChange={(evento) => cambiar('fecha_sorteo', evento.target.value)}
            />
          </Campo>
        </div>

        <p className="text-xs text-slate-500">
          Las fechas son días de Asunción y los dos extremos participan: una compra del día de
          cierre entra.
        </p>

        <Campo
          id="sorteo-monto"
          etiqueta="Compra mínima para participar"
          opcional
          error={error('monto_minimo_compra')}
          ayuda={
            montoEnLimpio > 0
              ? `${formatCurrency(montoEnLimpio)} acumulados en las marcas del sorteo.`
              : 'Vacío significa que participa cualquier compra de las marcas del sorteo.'
          }
          className="max-w-xs"
        >
          <Input
            id="sorteo-monto"
            type="number"
            inputMode="numeric"
            min={1}
            step={1000}
            placeholder="Sin mínimo"
            value={valores.monto_minimo_compra}
            aria-describedby={describedBy('sorteo-monto', true)}
            onChange={(evento) => cambiar('monto_minimo_compra', evento.target.value)}
            className="tabular-nums"
          />
        </Campo>

        <Campo
          id="sorteo-cupon"
          etiqueta="Guaraníes por cupón"
          opcional
          error={error('guaranies_por_cupon')}
          ayuda={
            porCuponEnLimpio > 0
              ? `Cada ${formatCurrency(porCuponEnLimpio)} comprados de las marcas del sorteo valen un cupón. Lo que sobra no suma: con este valor, una compra de ${formatCurrency(porCuponEnLimpio * 2 - 1)} da 1 cupón.`
              : 'Vacío significa una chance por factura, compre lo que compre. Con un valor, cada factura vale tantas chances como veces entre ese monto en lo comprado.'
          }
          className="max-w-xs"
        >
          <Input
            id="sorteo-cupon"
            type="number"
            inputMode="numeric"
            min={1}
            step={1000}
            placeholder="Una chance por factura"
            value={valores.guaranies_por_cupon}
            aria-describedby={describedBy('sorteo-cupon', true)}
            onChange={(evento) => cambiar('guaranies_por_cupon', evento.target.value)}
            className="tabular-nums"
          />
        </Campo>
      </fieldset>

      {soloLectura ? null : (
        <div className="flex items-center gap-3">
          <Button type="submit" loading={guardando} disabled={!sucio && Boolean(sorteo)}>
            {textoGuardar}
          </Button>
          {sucio && sorteo ? (
            <span className="text-xs text-slate-500">Hay cambios sin guardar.</span>
          ) : null}
        </div>
      )}
    </form>
  )
}
