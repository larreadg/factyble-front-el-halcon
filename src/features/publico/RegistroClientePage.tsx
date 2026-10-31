import { CheckCircle2, PartyPopper } from 'lucide-react'
import { useEffect, useReducer, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { Aviso } from '@/features/publico/components/Campo'
import { Hoja } from '@/features/publico/components/Hoja'
import { RielPasos } from '@/features/publico/components/RielPasos'
import { ESTADO_INICIAL, reducir } from '@/features/publico/estado'
import { PasoCiudad } from '@/features/publico/pasos/PasoCiudad'
import { PasoConfirmar } from '@/features/publico/pasos/PasoConfirmar'
import { PasoDocumento } from '@/features/publico/pasos/PasoDocumento'
import { PasoTelefono } from '@/features/publico/pasos/PasoTelefono'
import {
  leerRecordado,
  olvidarRecordado,
  primerNombre,
  type ClienteRecordado,
} from '@/features/publico/recordado'

/**
 * Formulario público de registro para sorteos, en cuatro pasos.
 *
 * Es la ÚNICA pantalla de la app sin sesión y sin `AppLayout`: la abre gente que
 * no tiene cuenta, típicamente escaneando un QR en el local. Por eso vive fuera
 * de `ProtectedRoute` y no espera a que `AuthProvider` resuelva la sesión.
 *
 * ── Qué hace este archivo, y qué no ────────────────────────────────────────
 * Es la carcasa: la hoja, el riel, el honeypot, el título de la pestaña, los dos
 * desenlaces (ya registrado / recién registrado) y el aviso general. Cada paso es
 * su propio componente y las reglas del flujo viven en `estado.ts`.
 *
 * Que la carcasa no sepa nada de la lógica es lo que hace que agregar un paso sea
 * agregar un caso al reducer y un archivo en `pasos/`, en vez de editar un
 * componente de mil líneas.
 */

/**
 * Quién se registró antes desde ESTE dispositivo.
 *
 * Se lee al importar el módulo —fuera de React— y no en un efecto, por dos
 * razones. La primera es que el valor ya está en el PRIMER render: leerlo después
 * obligaría a un estado "todavía no sé", con el formulario apareciendo un instante
 * antes de que lo reemplace la bienvenida. La segunda es que React 19 no acepta ni
 * `setState` dentro de un efecto para esto, ni leer algo impuro durante el render.
 *
 * Este módulo se carga con `lazy`, o sea recién cuando alguien abre la ruta.
 */
const recordadoInicial = leerRecordado()

export function RegistroClientePage() {
  const [params] = useSearchParams()
  const [estado, despachar] = useReducer(reducir, ESTADO_INICIAL)

  // Arranca con lo que había al cargar la página; cambia a `null` si la persona
  // dice "no soy yo". Ver `recordadoInicial`, arriba.
  const [recordado, setRecordado] = useState<ClienteRecordado | null>(recordadoInicial)

  // Marca de montaje para el control de tiempo mínimo del servidor. Se manda el
  // TIEMPO TRANSCURRIDO, no una marca absoluta: así no depende de que el reloj del
  // visitante esté en hora.
  //
  // Se toma en un efecto y no en el `useRef`: `Date.now()` es impura y llamarla
  // durante el render rompe el modelo de React. El efecto corre antes de que la
  // persona pueda tocar nada, así que al enviar siempre está puesta.
  const montadoEn = useRef(0)
  useEffect(() => {
    montadoEn.current = Date.now()
  }, [])
  const transcurridoMs = () => Date.now() - montadoEn.current

  // De qué campaña vino: ?origen=qr-local, ?origen=instagram. No identifica a
  // nadie; sirve para saber qué trajo gente.
  const origen = params.get('origen')?.trim().slice(0, 40) || null

  // El título de la pestaña: esta ruta no pasa por el layout de la app, que es
  // donde el resto de las pantallas lo resuelve.
  useEffect(() => {
    const anterior = document.title
    document.title = 'Registrate para los sorteos · El Halcón'
    return () => {
      document.title = anterior
    }
  }, [])

  // Al cambiar de paso, la hoja vuelve a quedar a la vista. Sin esto, quien llega
  // al paso 3 desde un paso 2 largo aterriza a mitad del scroll.
  const panel = useRef<HTMLDivElement>(null)
  useEffect(() => {
    panel.current?.scrollIntoView({ block: 'nearest' })
  }, [estado.paso, estado.fase])

  // ─────────────────────────────────────────────────────────────────────────
  // Ya se registró desde este dispositivo
  //
  // No se consulta nada al servidor: lo único que sabemos es lo que este
  // navegador guardó. Ver `recordado.ts`.
  // ─────────────────────────────────────────────────────────────────────────

  if (recordado && !estado.guardado) {
    return (
      <Hoja>
        <div className="border-t border-slate-200 px-7 pt-8 pb-9 text-center sm:px-9">
          <PartyPopper className="mx-auto size-11 text-accent-600" aria-hidden />
          <h1 className="mt-4 text-xl font-semibold tracking-tight text-slate-900">
            ¡Hola de nuevo, {primerNombre(recordado.nombre)}!
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Ya estás participando de los sorteos de El Halcón. Si salís sorteado te escribimos al{' '}
            {recordado.telefonoMascara}.
          </p>
          <p className="mt-4 text-sm text-slate-500">
            ¿Cambiaron tus datos, o querés anotar a otra persona?
          </p>

          {/* La salida, y no es un detalle: si el QR termina usándose en una
              tablet del mostrador, la próxima persona se encuentra con el saludo
              de la anterior. Tiene que poder salir de acá en un toque, y al
              hacerlo se borra lo guardado. */}
          <button
            type="button"
            onClick={() => {
              olvidarRecordado()
              setRecordado(null)
            }}
            className="mt-6 text-sm font-medium text-accent-600 underline underline-offset-4 hover:text-accent-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600"
          >
            Cargar datos de nuevo
          </button>
        </div>
      </Hoja>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Recién registrado
  // ─────────────────────────────────────────────────────────────────────────

  if (estado.guardado) {
    return (
      <Hoja>
        <div className="border-t border-slate-200 px-7 pt-8 pb-10 text-center sm:px-9">
          <CheckCircle2 className="mx-auto size-12 text-emerald-500" aria-hidden />
          <h1 className="mt-4 text-xl font-semibold tracking-tight text-slate-900">
            ¡Listo, ya estás participando!
          </h1>
          {/* Dice lo mismo si el documento ya estaba registrado: contestar "ya
              estabas anotado" convertiría el formulario en una forma de averiguar
              si una cédula está en la base, tecleando cédulas. */}
          <p className="mt-2 text-sm text-slate-600">
            Guardamos tus datos para los próximos sorteos de El Halcón. Si salís sorteado, te
            escribimos al celular que verificaste.
          </p>
          {/* Dicho de antemano, y sin condiciones que cumplir: el último
              registro manda. Quien se anotó antes con otro celular y vuelve
              ahora ve exactamente esta pantalla, igual que quien se anota por
              primera vez. */}
          <p className="mt-4 text-sm text-slate-500">
            Si ya te habías registrado antes, actualizamos tus datos con lo que cargaste ahora.
          </p>
        </div>
      </Hoja>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // El flujo
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <Hoja>
      <div className="relative border-t border-slate-200 px-7 pt-6 pb-9 sm:px-9">
        <RielPasos actual={estado.paso} />

        {/* La `key` es lo que hace la transición: al cambiar, React reemplaza el
            subárbol y la animación vuelve a correr. Incluye la fase para que las
            dos pantallas del paso 1 también se muevan.

            `sentido` decide en qué dirección entra, así volver no se ve igual que
            avanzar — es la única señal de dirección que tiene quien no está
            mirando el riel. */}
        <div
          ref={panel}
          key={`${String(estado.paso)}-${estado.fase}`}
          className={
            estado.sentido === 'adelante' ? 'animate-paso-adelante mt-7' : 'animate-paso-atras mt-7'
          }
        >
          {estado.paso === 1 ? (
            <PasoTelefono estado={estado} despachar={despachar} transcurridoMs={transcurridoMs} />
          ) : null}
          {estado.paso === 2 ? <PasoDocumento estado={estado} despachar={despachar} /> : null}
          {estado.paso === 3 ? <PasoCiudad estado={estado} despachar={despachar} /> : null}
          {estado.paso === 4 ? (
            <PasoConfirmar
              estado={estado}
              despachar={despachar}
              origen={origen}
              transcurridoMs={transcurridoMs}
            />
          ) : null}
        </div>

        {estado.aviso ? <Aviso>{estado.aviso}</Aviso> : null}

        {/* Honeypot. Fuera de pantalla y fuera del orden de tabulación: una
            persona no lo ve ni lo puede enfocar; un bot que completa todos los
            campos del formulario, sí. `sr-only` no alcanza — eso lo leería un
            lector de pantalla y alguien ciego lo completaría de buena fe.

            Vive en la carcasa y no en un paso porque tiene que existir en el DOM
            durante todo el flujo, y los pasos se desmontan al cambiar. */}
        <div aria-hidden className="pointer-events-none absolute -left-[9999px] h-0 w-0 opacity-0">
          <label htmlFor="empresa-contacto">No completar</label>
          <input id="empresa-contacto" type="text" tabIndex={-1} autoComplete="off" />
        </div>
      </div>
    </Hoja>
  )
}
