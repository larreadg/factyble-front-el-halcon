import { useMemo, type FormEvent, type ReactNode } from 'react'

import { Button } from '@/components/ui/Button'
import { ErrorPublico, useGuardar } from '@/features/publico/api'
import { MensajeError } from '@/features/publico/components/Campo'
import { CIUDADES } from '@/features/publico/ciudades'
import type { Accion, Estado } from '@/features/publico/estado'
import { guardarRecordado } from '@/features/publico/recordado'
import { cn } from '@/lib/cn'
import { formatearTelefono } from '@/lib/paraguay'

/**
 * Paso 4 — repasar y guardar.
 *
 * ── Qué se manda, y es casi nada ───────────────────────────────────────────
 * El token de sesión, la ciudad y el consentimiento. El nombre, el documento, el
 * teléfono y la fecha de nacimiento están del lado del servidor desde los pasos 1
 * y 2: acá se muestran para que la persona los repase, pero no vuelven a viajar.
 *
 * ── Por qué hay un paso de repaso ──────────────────────────────────────────
 * Es el único momento en que los cuatro datos se ven juntos, y el único en que se
 * puede pedir el consentimiento con la lista de lo que se va a guardar a la
 * vista. Un consentimiento que se firma sin ver qué se firma no es un
 * consentimiento.
 */

interface PasoConfirmarProps {
  estado: Estado
  despachar: (accion: Accion) => void
  origen: string | null
  transcurridoMs: () => number
}

export function PasoConfirmar({
  estado,
  despachar,
  origen,
  transcurridoMs,
}: PasoConfirmarProps) {
  const guardar = useGuardar()

  const ciudad = useMemo(
    () => CIUDADES.find((c) => String(c.id) === estado.ciudadId),
    [estado.ciudadId],
  )

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()

    if (!estado.consentimiento) {
      despachar({ tipo: 'error', codigo: 'validacion', campo: 'consentimiento' })
      return
    }

    guardar.mutate(
      {
        sesion: estado.sesion,
        ciudadId: Number(estado.ciudadId),
        consentimiento: true,
        origen,
        transcurridoMs: transcurridoMs(),
        trampa: '',
      },
      {
        onSuccess: () => {
          // Para reconocerla la próxima vez que abra el QR desde este celular.
          // Va el nombre y el teléfono enmascarado, nunca la cédula. Ver
          // `recordado.ts`.
          guardarRecordado(estado.identidad?.nombre ?? '', estado.telefono)
          despachar({ tipo: 'guardado' })
        },
        onError: (causa) => {
          if (causa instanceof ErrorPublico) {
            despachar({ tipo: 'error', codigo: causa.codigo, campo: causa.campo })
            return
          }
          despachar({ tipo: 'error', codigo: 'servidor' })
        },
      },
    )
  }

  return (
    <form onSubmit={enviar} noValidate>
      <h1 className="text-xl font-semibold tracking-tight text-slate-900">Revisá y confirmá</h1>
      <p className="mt-1.5 text-sm text-slate-600">Esto es todo lo que vamos a guardar.</p>

      {/* Lista de definiciones con filetes, no tarjetas. Son cuatro pares
          etiqueta-valor: la tabla es la forma correcta del dato y las tarjetas
          agregarían tres bordes por fila sin agregar información. */}
      <dl className="mt-6 divide-y divide-slate-100 border-y border-slate-100">
        <Fila etiqueta={estado.identidad?.esEmpresa ? 'Razón social' : 'Nombre'}>
          {estado.identidad?.nombre ?? '—'}
        </Fila>
        <Fila etiqueta={estado.identidad?.esEmpresa ? 'RUC' : 'Documento'} numerico>
          {estado.identidad?.documento ?? '—'}
        </Fila>
        <Fila etiqueta="Celular" numerico>
          {estado.telefono ? formatearTelefono(estado.telefono) : '—'}
        </Fila>
        <Fila etiqueta="Ciudad">{ciudad?.nombre ?? '—'}</Fila>
      </dl>

      <div className="mt-6">
        <label className="flex items-start gap-2.5 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={estado.consentimiento}
            onChange={(evento) =>
              despachar({ tipo: 'consentimiento', valor: evento.target.checked })
            }
            aria-invalid={estado.errores.consentimiento ? true : undefined}
            aria-describedby={estado.errores.consentimiento ? 'consentimiento-ayuda' : undefined}
            className="mt-0.5 size-4 shrink-0 rounded border-slate-300 text-accent-600 focus:ring-accent-600"
          />
          <span>
            Autorizo a <strong className="font-medium text-slate-700">El Halcón Ferretería</strong>{' '}
            a guardar mi nombre, documento, celular y ciudad para contactarme si gano un sorteo.
            Puedo pedir que los borren cuando quiera, en el local.
          </span>
        </label>
        {estado.errores.consentimiento ? (
          <MensajeError id="consentimiento-ayuda">{estado.errores.consentimiento}</MensajeError>
        ) : null}
      </div>

      <Button
        type="submit"
        loading={guardar.isPending}
        disabled={!estado.consentimiento}
        className="mt-6 h-12 w-full text-[15px]"
      >
        {guardar.isPending ? 'Guardando…' : 'Quiero participar'}
      </Button>

      <button
        type="button"
        onClick={() => despachar({ tipo: 'volver', a: 3 })}
        className="mt-4 block w-full text-center text-sm font-medium text-slate-500 underline underline-offset-4 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600"
      >
        Volver
      </button>
    </form>
  )
}

function Fila({
  etiqueta,
  children,
  numerico,
}: {
  etiqueta: string
  children: ReactNode
  /** `tabular-nums` para que los números no bailen al alinearse. */
  numerico?: boolean
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-3">
      <dt className="shrink-0 text-sm text-slate-500">{etiqueta}</dt>
      <dd
        className={cn('min-w-0 text-right text-sm font-medium text-slate-900', numerico && 'tabular-nums')}
      >
        {children}
      </dd>
    </div>
  )
}
