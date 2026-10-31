import { useEffect, useRef } from 'react'

import { cn } from '@/lib/cn'

/**
 * El campo del código de 4 dígitos.
 *
 * ── UN input, no cuatro ────────────────────────────────────────────────────
 * Las cuatro casillas son lo que la gente espera ver, pero cuatro `<input>` de
 * un carácter traen todos los problemas de una vez: el autocompletado del SMS de
 * iOS y Android llena sólo el primero, pegar el código funciona a medias, el
 * borrado hay que reimplementarlo, y un lector de pantalla anuncia cuatro campos
 * sin decir que son un número solo.
 *
 * Acá hay un único `<input maxlength="4" autocomplete="one-time-code">` estirado
 * sobre toda la fila y transparente; las casillas son decoración que dibuja lo
 * que ese input tiene. El autocompletado, el pegado, el borrado y la selección
 * son los del navegador, no los nuestros.
 *
 * El precio es que el cursor real no se ve, así que se dibuja uno: ver la casilla
 * activa y `--animate-latido-caret` en `index.css`.
 */

interface CampoPinProps {
  id: string
  value: string
  onChange: (valor: string) => void
  /** Se llama cuando entra el cuarto dígito: envía sin pedir otro toque. */
  onCompleto?: (valor: string) => void
  invalido?: boolean
  disabled?: boolean
  'aria-describedby'?: string
}

const CASILLAS = [0, 1, 2, 3]

export function CampoPin({
  id,
  value,
  onChange,
  onCompleto,
  invalido,
  disabled,
  'aria-describedby': describedBy,
}: CampoPinProps) {
  const entrada = useRef<HTMLInputElement>(null)

  // Al aparecer la pantalla el foco va acá: es lo único que hay que hacer, y en
  // el celular abre el teclado numérico sin un toque de más.
  //
  // Y vuelve acá después de un código errado. Mientras se verifica, el campo
  // está deshabilitado —para que no se siga tipeando sobre algo que ya se
  // envió—, y deshabilitar un elemento enfocado le saca el foco. Sin esto, tras
  // el error la persona se queda con las casillas vacías, el teclado cerrado y
  // nada indicando dónde escribir.
  useEffect(() => {
    if (!disabled) entrada.current?.focus()
  }, [disabled, invalido])

  // El envío automático va en un efecto y no en el `onChange`: así también
  // dispara cuando el código lo pone el autocompletado del sistema, que no
  // siempre pasa por un evento de input.
  //
  // La referencia al callback se lee de un ref para que la dependencia sea el
  // valor y no la función, que el padre recrea en cada render.
  const alCompletar = useRef(onCompleto)
  useEffect(() => {
    alCompletar.current = onCompleto
  })
  useEffect(() => {
    if (value.length === 4) alCompletar.current?.(value)
  }, [value])

  return (
    <div
      // `group` es lo que deja que las casillas reaccionen al foco del input,
      // que está encima de ellas y es invisible.
      className="group relative"
      // Toda la fila es zona de toque: en un celular, apuntar a una casilla de
      // 12 px de ancho para enfocar el campo es innecesario.
      onPointerDown={(evento) => {
        // El `<input>` ya cubre el área; esto sólo atrapa el borde de 2 px que
        // queda entre casillas.
        if (evento.target !== entrada.current) {
          evento.preventDefault()
          entrada.current?.focus()
        }
      }}
    >
      <div className="flex gap-2.5" aria-hidden>
        {CASILLAS.map((indice) => {
          const digito = value[indice] ?? ''
          const activa = indice === Math.min(value.length, 3)

          return (
            <div
              key={indice}
              className={cn(
                'relative flex h-14 flex-1 items-center justify-center rounded-xl',
                'text-2xl font-semibold tabular-nums transition-colors duration-150',
                'ring-1 ring-inset',
                digito ? 'text-slate-900' : 'text-slate-300',
                invalido
                  ? 'bg-red-50 ring-red-300'
                  : digito
                    ? 'bg-white ring-slate-300'
                    : 'bg-slate-50 ring-slate-200',
                // El anillo de la casilla activa se dibuja sólo cuando el input
                // tiene el foco: `group-focus-within` sobre el contenedor.
                activa && !disabled && 'group-focus-within:ring-2',
                activa && !disabled && !invalido && 'group-focus-within:ring-accent-600',
              )}
            >
              {digito || (
                <span
                  className={cn(
                    'absolute h-6 w-px bg-accent-600 opacity-0',
                    activa && 'animate-latido-caret group-focus-within:opacity-100',
                  )}
                />
              )}
            </div>
          )
        })}
      </div>

      <input
        ref={entrada}
        id={id}
        type="text"
        inputMode="numeric"
        // El que hace que el SMS se autocomplete solo en iOS y Android.
        autoComplete="one-time-code"
        // `pattern` además de `inputMode`: en algunos Android es lo que decide
        // que el teclado arranque en números.
        pattern="[0-9]*"
        maxLength={4}
        value={value}
        disabled={disabled}
        onChange={(evento) => onChange(evento.target.value)}
        aria-label="Código de 4 dígitos"
        aria-invalid={invalido ?? undefined}
        aria-describedby={describedBy}
        // Transparente y encima de las casillas. `caret-transparent` porque el
        // cursor lo dibujamos nosotros en la casilla activa.
        className={cn(
          'absolute inset-0 w-full rounded-xl bg-transparent text-transparent caret-transparent',
          'focus:outline-none disabled:cursor-not-allowed',
          // El texto seleccionado tampoco se ve: si se viera, aparecería una
          // banda azul sobre unas casillas que ya muestran los dígitos.
          'selection:bg-transparent',
        )}
      />
    </div>
  )
}
