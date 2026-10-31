import type { FormEvent } from 'react'

import { Button } from '@/components/ui/Button'
import { Ayuda, Etiqueta, MensajeError } from '@/features/publico/components/Campo'
import { SelectCiudad } from '@/features/publico/components/SelectCiudad'
import type { Accion, Estado } from '@/features/publico/estado'

/**
 * Paso 3 — la ciudad.
 *
 * Un paso para un campo solo, y está bien que lo sea: es el único dato que la
 * persona elige de una lista de 249, y mezclarlo con la confirmación haría que el
 * botón de guardar conviva con un `<select>` recién abierto. Acá elige, ahí
 * confirma.
 *
 * El `<select>` es nativo y agrupado por departamento, con las siete ciudades más
 * frecuentes arriba. Ver `SelectCiudad`: en el celular abre el selector del
 * sistema, con su propio buscador y su tamaño de toque.
 */

interface PasoCiudadProps {
  estado: Estado
  despachar: (accion: Accion) => void
}

export function PasoCiudad({ estado, despachar }: PasoCiudadProps) {
  function continuar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (!estado.ciudadId) {
      despachar({ tipo: 'error', codigo: 'validacion', campo: 'ciudad' })
      return
    }
    despachar({ tipo: 'avanzar', a: 4 })
  }

  return (
    <form onSubmit={continuar} noValidate>
      <h1 className="text-xl font-semibold tracking-tight text-slate-900">¿De dónde sos?</h1>
      <p className="mt-1.5 text-sm text-slate-600">Último dato y terminamos.</p>

      <div className="mt-6">
        <Etiqueta htmlFor="ciudad">Ciudad</Etiqueta>
        <SelectCiudad
          id="ciudad"
          value={estado.ciudadId}
          onChange={(valor) => despachar({ tipo: 'ciudad', valor })}
          invalido={Boolean(estado.errores.ciudad)}
          aria-describedby="ciudad-ayuda"
        />
        {estado.errores.ciudad ? (
          <MensajeError id="ciudad-ayuda">{estado.errores.ciudad}</MensajeError>
        ) : (
          <Ayuda id="ciudad-ayuda">Las más elegidas están arriba de la lista.</Ayuda>
        )}
      </div>

      <Button type="submit" disabled={!estado.ciudadId} className="mt-6 h-12 w-full text-[15px]">
        Continuar
      </Button>

      <button
        type="button"
        onClick={() => despachar({ tipo: 'volver', a: 2 })}
        className="mt-4 block w-full text-center text-sm font-medium text-slate-500 underline underline-offset-4 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600"
      >
        Volver
      </button>
    </form>
  )
}
