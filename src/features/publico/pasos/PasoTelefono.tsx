import { MessageSquareLock, Phone } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ErrorPublico, useConfirmarCodigo, usePedirCodigo } from '@/features/publico/api'
import { Ayuda, Etiqueta, MensajeError } from '@/features/publico/components/Campo'
import { CampoPin } from '@/features/publico/components/CampoPin'
import { Turnstile, type TurnstileHandle } from '@/features/publico/components/Turnstile'
import type { Accion, Estado } from '@/features/publico/estado'
import { cn } from '@/lib/cn'
import { formatearTelefono, normalizarTelefono } from '@/lib/paraguay'

/**
 * Paso 1 — el celular, y la prueba de que es suyo.
 *
 * Dos pantallas: el número y el código. Son un paso solo en el riel porque para
 * la persona es un acto único; son dos pantallas porque entre medio hay que
 * esperar un SMS, y mostrar cuatro casillas vacías junto al campo del número
 * sugiere que el código ya está.
 *
 * Turnstile vive acá y nada más que acá: es la puerta del flujo. Está en modo
 * `interaction-only`, así que normalmente no se ve nada — sólo aparece si
 * Cloudflare necesita que la persona haga algo.
 */

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY

/** Tiene que coincidir con el `TURNSTILE_ACTION` de la Edge Function. */
const ACCION = 'registro-clientes'

/** Segundos de espera antes de poder reenviar. Espeja el tope de la base. */
const ESPERA_REENVIO = 45

interface PasoTelefonoProps {
  estado: Estado
  despachar: (accion: Accion) => void
  /** Milisegundos desde que se montó la página: control de tiempo mínimo. */
  transcurridoMs: () => number
}

export function PasoTelefono({ estado, despachar, transcurridoMs }: PasoTelefonoProps) {
  const pedir = usePedirCodigo()
  const confirmar = useConfirmarCodigo()

  const [token, setToken] = useState<string | null>(null)
  const [turnstileCaido, setTurnstileCaido] = useState(false)
  const turnstile = useRef<TurnstileHandle>(null)

  // La cuenta regresiva del reenvío, DERIVADA de cuándo se pidió el código.
  //
  // El efecto no toca el estado del formulario: sólo se suscribe al reloj, que es
  // un sistema externo. Los segundos que faltan se calculan en el render, así que
  // volver a una pestaña que estuvo dormida muestra el valor correcto en vez de un
  // contador congelado.
  const [ahora, setAhora] = useState(() => Date.now())
  useEffect(() => {
    if (estado.fase !== 'pin') return
    const reloj = setInterval(() => {
      setAhora(Date.now())
    }, 500)
    return () => {
      clearInterval(reloj)
    }
  }, [estado.fase])

  const espera = estado.pedidoEn
    ? Math.max(0, ESPERA_REENVIO - Math.floor((ahora - estado.pedidoEn) / 1000))
    : 0

  function alFallar(causa: unknown) {
    // El token de Turnstile es de un solo uso: gastado el intento, hace falta
    // otro antes de poder reenviar.
    setToken(null)
    turnstile.current?.reset()

    if (causa instanceof ErrorPublico) {
      despachar({
        tipo: 'error',
        codigo: causa.codigo,
        campo: causa.campo,
        restantes: causa.restantes,
      })
      return
    }
    despachar({ tipo: 'error', codigo: 'servidor' })
  }

  function pedirCodigo(evento?: FormEvent<HTMLFormElement>) {
    evento?.preventDefault()

    const telefono = normalizarTelefono(estado.telefonoTipeado)
    if (!telefono) {
      despachar({ tipo: 'error', codigo: 'validacion', campo: 'telefono' })
      return
    }
    if (!token) {
      despachar({ tipo: 'error', codigo: 'captcha' })
      return
    }

    pedir.mutate(
      {
        telefono,
        turnstileToken: token,
        transcurridoMs: transcurridoMs(),
        // Honeypot. Un bot que completa todos los campos lo llena; una persona
        // no lo ve. Lo dibuja `RegistroClientePage`, fuera de pantalla.
        trampa: '',
      },
      {
        onSuccess: (datos) => {
          // El token se gastó en este envío: para reenviar hace falta otro.
          setToken(null)
          turnstile.current?.reset()
          despachar({ tipo: 'codigoPedido', id: datos.id, en: Date.now() })
        },
        onError: alFallar,
      },
    )
  }

  function confirmarCodigo(pin: string) {
    const telefono = normalizarTelefono(estado.telefonoTipeado)
    if (!telefono || pin.length !== 4) return

    confirmar.mutate(
      { id: estado.idVerificacion, pin, telefono },
      {
        onSuccess: (datos) => {
          despachar({ tipo: 'verificado', sesion: datos.sesion, telefono: datos.telefono })
        },
        onError: (causa) => {
          if (causa instanceof ErrorPublico) {
            despachar({
              tipo: 'error',
              codigo: causa.codigo,
              campo: causa.campo,
              restantes: causa.restantes,
            })
            return
          }
          despachar({ tipo: 'error', codigo: 'servidor' })
        },
      },
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Pantalla del código
  // ─────────────────────────────────────────────────────────────────────────

  if (estado.fase === 'pin') {
    return (
      <div>
        <MessageSquareLock className="size-7 text-accent-600" aria-hidden />
        <h1 className="mt-3 text-xl font-semibold tracking-tight text-slate-900">
          Escribí el código
        </h1>
        <p className="mt-1.5 text-sm text-slate-600">
          Te mandamos un SMS con 4 dígitos al{' '}
          <strong className="font-semibold text-slate-900 tabular-nums">
            {formatearTelefono(normalizarTelefono(estado.telefonoTipeado) ?? estado.telefonoTipeado)}
          </strong>
          .
        </p>

        <div className="mt-6">
          <CampoPin
            id="pin"
            value={estado.pin}
            onChange={(valor) => despachar({ tipo: 'pin', valor })}
            onCompleto={confirmarCodigo}
            invalido={Boolean(estado.errores.pin)}
            disabled={confirmar.isPending}
            aria-describedby={estado.errores.pin ? 'pin-ayuda' : undefined}
          />
          {estado.errores.pin ? (
            <MensajeError id="pin-ayuda">{estado.errores.pin}</MensajeError>
          ) : null}
        </div>

        {/* El botón existe aunque el campo se envíe solo al cuarto dígito: si el
            envío automático falla por cualquier razón, sin botón no hay salida.
            Y con el código pegado desde el SMS, apretarlo es el gesto natural. */}
        <Button
          type="button"
          onClick={() => confirmarCodigo(estado.pin)}
          loading={confirmar.isPending}
          disabled={estado.pin.length !== 4}
          className="mt-5 h-12 w-full text-[15px]"
        >
          {confirmar.isPending ? 'Verificando…' : 'Verificar'}
        </Button>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-sm">
          <button
            type="button"
            onClick={() => {
              pedirCodigo()
            }}
            disabled={espera > 0 || pedir.isPending || !token}
            className={cn(
              'font-medium underline underline-offset-4',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600',
              espera > 0 || pedir.isPending || !token
                ? 'cursor-not-allowed text-slate-400 no-underline'
                : 'text-accent-600 hover:text-accent-700',
            )}
          >
            {pedir.isPending
              ? 'Mandando…'
              : espera > 0
                ? `Reenviar en ${String(espera)}s`
                : 'Reenviar el código'}
          </button>

          <button
            type="button"
            onClick={() => despachar({ tipo: 'cambiarNumero' })}
            className="font-medium text-slate-500 underline underline-offset-4 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600"
          >
            Cambiar el número
          </button>
        </div>

        {/* El widget sigue montado en esta pantalla porque el reenvío necesita un
            token nuevo. Sin esto, "Reenviar" quedaría deshabilitado para siempre. */}
        <div className="mt-5">
          <Turnstile
            siteKey={SITE_KEY}
            action={ACCION}
            onToken={setToken}
            onFalloDeCarga={() => setTurnstileCaido(true)}
            ref={turnstile}
          />
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Pantalla del número
  // ─────────────────────────────────────────────────────────────────────────

  const telefonoValido = normalizarTelefono(estado.telefonoTipeado) !== null

  return (
    <form onSubmit={pedirCodigo} noValidate>
      <h1 className="text-xl font-semibold tracking-tight text-slate-900">
        Participá de nuestros sorteos
      </h1>
      <p className="mt-1.5 text-sm text-slate-600">
        Dejanos tus datos una sola vez y entrás en todos los sorteos que hagamos.
      </p>

      <div className="mt-6">
        <Etiqueta htmlFor="telefono">Tu celular</Etiqueta>
        <div className="relative">
          <Phone
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400"
            aria-hidden
          />
          <Input
            id="telefono"
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            autoFocus
            required
            value={estado.telefonoTipeado}
            onChange={(evento) => despachar({ tipo: 'telefonoTipeado', valor: evento.target.value })}
            aria-invalid={estado.errores.telefono ? true : undefined}
            aria-describedby="telefono-ayuda"
            placeholder="0972 413798"
            className={cn('h-12 pl-9 text-base', estado.errores.telefono && 'ring-red-400')}
          />
        </div>
        {estado.errores.telefono ? (
          <MensajeError id="telefono-ayuda">{estado.errores.telefono}</MensajeError>
        ) : (
          /* Dice POR QUÉ se lo pedimos antes de pedirlo. Un formulario que
             arranca pidiendo un celular y manda un SMS sin avisar se lee como
             spam, y la persona se va. */
          <Ayuda id="telefono-ayuda">
            Te mandamos un SMS con un código para confirmar que es tuyo. Es el número al que te
            escribimos si ganás.
          </Ayuda>
        )}
      </div>

      <div className="mt-5">
        <Turnstile
          siteKey={SITE_KEY}
          action={ACCION}
          onToken={setToken}
          onFalloDeCarga={() => setTurnstileCaido(true)}
          ref={turnstile}
        />
      </div>

      {turnstileCaido ? (
        <MensajeError id="error-turnstile">
          No pudimos cargar la verificación de seguridad. Revisá tu conexión y recargá la página.
        </MensajeError>
      ) : null}

      {/* El botón refleja el estado de la verificación en vez de dejar clickear y
          contestar "esperá". Turnstile resuelve mientras la persona tipea el
          número, así que en la práctica el token ya está cuando termina. */}
      <Button
        type="submit"
        loading={pedir.isPending}
        disabled={turnstileCaido || !token || !telefonoValido}
        className="mt-5 h-12 w-full text-[15px]"
      >
        {pedir.isPending
          ? 'Mandando el código…'
          : !token && !turnstileCaido
            ? 'Verificando seguridad…'
            : 'Mandarme el código'}
      </Button>
    </form>
  )
}
