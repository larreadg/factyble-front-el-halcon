import { useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { describedBy } from '@/components/ui/inputStyles'
import { Campo } from '@/features/sorteos/components/Campo'
import { CampoImagen } from '@/features/sorteos/components/CampoImagen'
import { formatCurrency } from '@/lib/format'
import type { SorteoMarca, SorteoPremio } from '@/types/database'

/** Lo que el formulario devuelve, ya normalizado a los tipos de la tabla. */
export interface PremioGuardado {
  nombre: string
  descripcion: string | null
  cantidad: number
  valor_estimado: number | null
  marca_codigo: string | null
  imagen_path: string | null
}

interface Valores {
  nombre: string
  descripcion: string
  cantidad: string
  valor_estimado: string
  marca_codigo: string
  imagen_path: string | null
}

/** `''` es el valor del `<option>` "premio del sorteo": un select no guarda null. */
const SIN_MARCA = ''

function valoresDe(premio: SorteoPremio | undefined): Valores {
  return {
    nombre: premio?.nombre ?? '',
    descripcion: premio?.descripcion ?? '',
    cantidad: String(premio?.cantidad ?? 1),
    valor_estimado:
      premio?.valor_estimado === null || premio?.valor_estimado === undefined
        ? ''
        : String(Number(premio.valor_estimado)),
    marca_codigo: premio?.marca_codigo ?? SIN_MARCA,
    imagen_path: premio?.imagen_path ?? null,
  }
}

type Errores = Partial<Record<keyof Valores, string>>

function validar(valores: Valores): Errores {
  const errores: Errores = {}
  const nombre = valores.nombre.trim()

  if (nombre.length < 2) errores.nombre = 'Poné el nombre del premio.'
  else if (nombre.length > 160) errores.nombre = 'El nombre no puede pasar de 160 caracteres.'

  const cantidad = Number(valores.cantidad)
  if (!Number.isInteger(cantidad) || cantidad < 1) errores.cantidad = 'Al menos 1 unidad.'
  else if (cantidad > 9999) errores.cantidad = 'Máximo 9999 unidades.'

  if (valores.valor_estimado) {
    const valor = Number(valores.valor_estimado)
    if (!Number.isFinite(valor) || valor < 0) errores.valor_estimado = 'No puede ser negativo.'
  }

  return errores
}

/**
 * Alta y edición de un premio, en línea dentro de la lista.
 *
 * No es un modal: editar un premio no es una decisión que haya que bloquear, y
 * abrir una capa encima tapa justamente lo que ayuda a decidir —los otros
 * premios ya cargados, con sus fotos y su orden—. La fila se expande donde está.
 */
export function FormularioPremio({
  sorteoId,
  premio,
  marcas,
  guardando = false,
  onGuardar,
  onCancelar,
}: {
  sorteoId: string
  premio?: SorteoPremio
  marcas: SorteoMarca[]
  guardando?: boolean
  onGuardar: (valores: PremioGuardado, imagenAnterior: string | null) => void
  onCancelar: () => void
}) {
  const originales = valoresDe(premio)
  const [valores, setValores] = useState<Valores>(originales)
  const [tocado, setTocado] = useState(false)

  const errores = validar(valores)
  const error = (campo: keyof Valores) => (tocado ? errores[campo] : undefined)

  function cambiar<C extends keyof Valores>(campo: C, valor: Valores[C]) {
    setValores((previos) => ({ ...previos, [campo]: valor }))
  }

  function enviar() {
    setTocado(true)
    if (Object.keys(errores).length > 0) return
    onGuardar(
      {
        nombre: valores.nombre.trim(),
        descripcion: valores.descripcion.trim() || null,
        cantidad: Number(valores.cantidad),
        valor_estimado: valores.valor_estimado ? Number(valores.valor_estimado) : null,
        marca_codigo: valores.marca_codigo || null,
        imagen_path: valores.imagen_path,
      },
      // La imagen que hay que descartar si el guardado sale bien: la que estaba
      // antes, cuando el campo cambió. El borrado va después del guardado.
      originales.imagen_path !== valores.imagen_path ? originales.imagen_path : null,
    )
  }

  const valorEnLimpio = valores.valor_estimado ? Number(valores.valor_estimado) : 0

  return (
    <form
      className="space-y-4 rounded-lg bg-slate-50 p-3.5 ring-1 ring-slate-200 ring-inset sm:p-4"
      onSubmit={(evento) => {
        evento.preventDefault()
        enviar()
      }}
    >
      <fieldset disabled={guardando} className="space-y-4">
        <Campo id="premio-nombre" etiqueta="Premio" error={error('nombre')}>
          <Input
            id="premio-nombre"
            value={valores.nombre}
            maxLength={160}
            autoComplete="off"
            autoFocus
            placeholder="Ej.: Amoladora angular 4½”"
            aria-describedby={describedBy('premio-nombre', Boolean(error('nombre')))}
            onChange={(evento) => cambiar('nombre', evento.target.value)}
          />
        </Campo>

        <Campo
          id="premio-descripcion"
          etiqueta="Detalle"
          opcional
          ayuda="Modelo, color, medidas: lo que hace falta para entregar el premio correcto."
        >
          <Textarea
            id="premio-descripcion"
            rows={2}
            value={valores.descripcion}
            aria-describedby={describedBy('premio-descripcion', true)}
            onChange={(evento) => cambiar('descripcion', evento.target.value)}
          />
        </Campo>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Campo id="premio-cantidad" etiqueta="Unidades" error={error('cantidad')}>
            <Input
              id="premio-cantidad"
              type="number"
              inputMode="numeric"
              min={1}
              max={9999}
              step={1}
              value={valores.cantidad}
              className="tabular-nums"
              aria-describedby={describedBy('premio-cantidad', Boolean(error('cantidad')))}
              onChange={(evento) => cambiar('cantidad', evento.target.value)}
            />
          </Campo>

          <Campo
            id="premio-valor"
            etiqueta="Valor estimado"
            opcional
            error={error('valor_estimado')}
            ayuda={valorEnLimpio > 0 ? formatCurrency(valorEnLimpio) : undefined}
          >
            <Input
              id="premio-valor"
              type="number"
              inputMode="numeric"
              min={0}
              step={1000}
              placeholder="—"
              value={valores.valor_estimado}
              className="tabular-nums"
              aria-describedby={describedBy('premio-valor', true)}
              onChange={(evento) => cambiar('valor_estimado', evento.target.value)}
            />
          </Campo>

          <Campo
            id="premio-marca"
            etiqueta="Lo aporta"
            ayuda={
              marcas.length === 0
                ? 'Elegí primero las marcas del sorteo.'
                : 'Sirve para saber con qué proveedor reclamarlo.'
            }
          >
            <Select
              id="premio-marca"
              value={valores.marca_codigo}
              onChange={(evento) => cambiar('marca_codigo', evento.target.value)}
              options={[
                { value: SIN_MARCA, label: 'El sorteo' },
                ...marcas.map((marca) => ({
                  value: marca.marca_codigo,
                  label: marca.marca_nombre,
                })),
              ]}
            />
          </Campo>
        </div>

        <CampoImagen
          sorteoId={sorteoId}
          valor={valores.imagen_path}
          onCambio={(path) => cambiar('imagen_path', path)}
          deshabilitado={guardando}
        />
      </fieldset>

      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" loading={guardando}>
          {premio ? 'Guardar premio' : 'Agregar premio'}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onCancelar}
          disabled={guardando}
        >
          Cancelar
        </Button>
      </div>
    </form>
  )
}
