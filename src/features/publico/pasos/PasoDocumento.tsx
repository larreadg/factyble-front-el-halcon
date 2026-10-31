import { CreditCard, ReceiptText, Search, User } from 'lucide-react'
import { useMemo, type FormEvent } from 'react'

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ErrorPublico, useConsultarDocumento, useDeclararNombre } from '@/features/publico/api'
import { Ayuda, Etiqueta, MensajeError } from '@/features/publico/components/Campo'
import type { Accion, Estado } from '@/features/publico/estado'
import { cn } from '@/lib/cn'
import {
  baseDeDocumento,
  esEmpresa as esRucDeEmpresa,
  normalizarDocumento,
  normalizarNombre,
  normalizarRazonSocial,
} from '@/lib/paraguay'

/**
 * Paso 2 — quién es.
 *
 * Un solo campo obligatorio: el número. De ahí sale el nombre, buscándolo en las
 * facturas de El Halcón, y esa búsqueda pasa entera del lado del servidor — el
 * navegador manda el número y recibe un nombre, nada más.
 *
 * Dos desenlaces, y el formulario cambia de forma en cada uno:
 *
 *   encontrado  ese número compró alguna vez acá: se muestra el nombre de la
 *               factura y la persona confirma. No escribe nada.
 *   declarar    no está en las facturas: escribe su nombre, o su razón social si
 *               el RUC es de una empresa. Que "nunca compró" y "compró sin dar
 *               su documento" lleguen igual es deliberado.
 *
 * ── Lo que este paso ya NO pide ────────────────────────────────────────────
 * La fecha de nacimiento. Era la llave que permitía actualizar un registro —y
 * la que impedía que alguien con una cédula ajena redirigiera ese teléfono—,
 * pero el nombre ya no sale del registro civil y no hay contra qué contrastarla.
 * Ver la decisión 3 de `schema_verificacion.sql`: lo que quedó en su lugar es el
 * tope de tres documentos por celular verificado.
 */

interface PasoDocumentoProps {
  estado: Estado
  despachar: (accion: Accion) => void
}

export function PasoDocumento({ estado, despachar }: PasoDocumentoProps) {
  const consultar = useConsultarDocumento()
  const declarar = useDeclararNombre()

  /**
   * Un RUC de empresa (80XXXXXX) cambia la etiqueta del campo MIENTRAS SE TIPEA,
   * sin ida y vuelta al servidor: se reconoce por el patrón del número, no
   * consultando nada. A una empresa se le pide razón social, no nombre y
   * apellido, y la regla de validación es otra.
   */
  const empresa = useMemo(() => {
    const canonico = normalizarDocumento(estado.documento)
    return canonico !== null && esRucDeEmpresa(baseDeDocumento(canonico))
  }, [estado.documento])

  const documentoValido = normalizarDocumento(estado.documento) !== null

  function alFallar(causa: unknown) {
    if (causa instanceof ErrorPublico) {
      despachar({ tipo: 'error', codigo: causa.codigo, campo: causa.campo })
      return
    }
    despachar({ tipo: 'error', codigo: 'servidor' })
  }

  function buscar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()

    const documento = normalizarDocumento(estado.documento)
    if (!documento) {
      despachar({ tipo: 'error', codigo: 'validacion', campo: 'documento' })
      return
    }

    consultar.mutate(
      { sesion: estado.sesion, documento },
      {
        onSuccess: (datos) => {
          if (datos.estado === 'encontrado' && datos.nombre) {
            despachar({
              tipo: 'identidadResuelta',
              identidad: {
                nombre: datos.nombre,
                documento: datos.documento,
                esEmpresa: datos.esEmpresa,
                verificado: true,
              },
            })
            return
          }
          despachar({
            tipo: 'nombrePedido',
            cual: datos.esEmpresa ? 'empresa' : 'persona',
            documento: datos.documento,
          })
        },
        onError: alFallar,
      },
    )
  }

  function confirmarNombre(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()

    const documento = normalizarDocumento(estado.documento)
    if (!documento) {
      despachar({ tipo: 'error', codigo: 'validacion', campo: 'documento' })
      return
    }

    // La misma regla que aplica el servidor, para corregir sin ida y vuelta. La
    // que manda sigue siendo la de la base: acá sólo se ahorra un viaje.
    const nombre = empresa ? normalizarRazonSocial(estado.nombre) : normalizarNombre(estado.nombre)
    if (!nombre) {
      despachar({ tipo: 'error', codigo: 'validacion', campo: 'nombre' })
      return
    }

    declarar.mutate(
      { sesion: estado.sesion, documento, nombre },
      {
        onSuccess: (datos) => {
          despachar({
            tipo: 'identidadResuelta',
            identidad: {
              nombre: datos.nombre ?? nombre,
              documento: datos.documento,
              esEmpresa: datos.esEmpresa,
              verificado: false,
            },
          })
        },
        onError: alFallar,
      },
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Identidad resuelta: se muestra y se confirma
  // ─────────────────────────────────────────────────────────────────────────

  if (estado.identidad) {
    const { nombre, documento, verificado } = estado.identidad

    return (
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">
          {verificado ? '¿Sos vos?' : 'Confirmá tus datos'}
        </h1>
        <p className="mt-1.5 text-sm text-slate-600">
          {verificado
            ? 'Encontramos este nombre para ese número.'
            : 'Así vamos a guardar tus datos.'}
        </p>

        {/* La losa de identidad: el nombre es el dato importante de todo el paso y
            se ve como tal. Región tintada con anillo completo, no una tarjeta
            dentro de la tarjeta. */}
        <div className="mt-6 rounded-xl bg-accent-50 px-4 py-4 ring-1 ring-accent-100 ring-inset">
          <p className="text-lg leading-snug font-semibold tracking-tight text-balance text-slate-900">
            {nombre}
          </p>
          <p className="mt-1.5 text-sm text-slate-600 tabular-nums">{documento}</p>
          {verificado ? (
            /* Dice de DÓNDE salió, sin adornarlo. "Verificado" a secas sugeriría
               una autoridad que no hay detrás: es el nombre de sus facturas, que
               puede estar viejo o mal escrito — y por eso justo abajo está el
               botón para corregirlo. */
            <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-accent-700">
              <ReceiptText className="size-3.5 shrink-0" aria-hidden />
              Así figurás en tus facturas
            </p>
          ) : null}
        </div>

        <Button
          type="button"
          onClick={() => despachar({ tipo: 'avanzar', a: 3 })}
          className="mt-5 h-12 w-full text-[15px]"
        >
          Sí, soy yo
        </Button>

        {/* Dos salidas distintas y las dos hacen falta: el número puede estar
            mal, o el número puede estar bien y el nombre viejo. */}
        <div className="mt-4 flex flex-col items-center gap-3 text-sm">
          {verificado ? (
            <button
              type="button"
              onClick={() =>
                despachar({
                  tipo: 'nombrePedido',
                  cual: estado.identidad?.esEmpresa ? 'empresa' : 'persona',
                  documento: estado.documento,
                })
              }
              className="font-medium text-accent-600 underline underline-offset-4 hover:text-accent-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600"
            >
              Ese no es mi nombre, corregirlo
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => despachar({ tipo: 'documento', valor: estado.documento })}
            className="font-medium text-slate-500 underline underline-offset-4 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600"
          >
            Cambiar el número
          </button>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Falta el nombre: lo escribe la persona
  // ─────────────────────────────────────────────────────────────────────────

  if (estado.pedidoNombre !== 'ninguno') {
    const esRazonSocial = estado.pedidoNombre === 'empresa'

    return (
      <form onSubmit={confirmarNombre} noValidate>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">
          {esRazonSocial ? 'Nombre de la empresa' : '¿Cómo te llamás?'}
        </h1>
        <p className="mt-1.5 text-sm text-slate-600">
          {esRazonSocial
            ? `El RUC ${estado.documento} es de una empresa, así que la razón social la ponés vos.`
            : 'No tenemos ese número cargado. Escribí tu nombre y seguimos.'}
        </p>

        <div className="mt-6">
          <Etiqueta htmlFor="nombre">
            {esRazonSocial ? 'Razón social' : 'Nombre y apellido'}
          </Etiqueta>
          <div className="relative">
            <User
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400"
              aria-hidden
            />
            <Input
              id="nombre"
              autoComplete={esRazonSocial ? 'organization' : 'name'}
              autoCapitalize="characters"
              autoFocus
              required
              value={estado.nombre}
              onChange={(evento) => despachar({ tipo: 'nombre', valor: evento.target.value })}
              aria-invalid={estado.errores.nombre ? true : undefined}
              aria-describedby={estado.errores.nombre ? 'nombre-ayuda' : undefined}
              placeholder={esRazonSocial ? 'Ferretería El Halcón S.A.' : 'María González'}
              // `uppercase` para lo que se escribe —así se guarda—, pero el
              // placeholder en caja normal: en mayúsculas se confunde con un
              // valor ya cargado.
              className={cn(
                'h-12 pl-9 text-base uppercase placeholder:normal-case',
                estado.errores.nombre && 'ring-red-400',
              )}
            />
          </div>
          {estado.errores.nombre ? (
            <MensajeError id="nombre-ayuda">{estado.errores.nombre}</MensajeError>
          ) : null}
        </div>

        <Button type="submit" loading={declarar.isPending} className="mt-5 h-12 w-full text-[15px]">
          {declarar.isPending ? 'Guardando…' : 'Continuar'}
        </Button>

        <button
          type="button"
          onClick={() => despachar({ tipo: 'documento', valor: '' })}
          className="mt-4 block w-full text-center text-sm font-medium text-slate-500 underline underline-offset-4 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600"
        >
          Volver a cargar el número
        </button>
      </form>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // El número
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <form onSubmit={buscar} noValidate>
      <h1 className="text-xl font-semibold tracking-tight text-slate-900">Tu RUC o tu cédula</h1>
      <p className="mt-1.5 text-sm text-slate-600">
        Si ya compraste acá, con eso encontramos tu nombre y no lo tenés que escribir.
      </p>

      <div className="mt-6">
        <Etiqueta htmlFor="documento">RUC o cédula</Etiqueta>
        <div className="relative">
          <CreditCard
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400"
            aria-hidden
          />
          <Input
            id="documento"
            // `text` y no `numeric`: el RUC lleva guion, y un teclado numérico
            // puro no lo ofrece en todos los celulares.
            inputMode="text"
            autoComplete="off"
            autoFocus
            required
            value={estado.documento}
            onChange={(evento) => despachar({ tipo: 'documento', valor: evento.target.value })}
            aria-invalid={estado.errores.documento ? true : undefined}
            aria-describedby="documento-ayuda"
            placeholder="5249657-4"
            className={cn(
              'h-12 pl-9 text-base tabular-nums',
              estado.errores.documento && 'ring-red-400',
            )}
          />
        </div>
        {estado.errores.documento ? (
          <MensajeError id="documento-ayuda">{estado.errores.documento}</MensajeError>
        ) : (
          /* Pide el RUC primero a propósito: con el RUC estos registros se
             cruzan con las facturas. Quien no lo tenga a mano carga la cédula y
             listo — el número base es el mismo, así que las dos formas caen en
             la misma persona y en la misma factura. */
          <Ayuda id="documento-ayuda">
            Si tenés RUC, cargalo con el dígito verificador. Si no, tu cédula.
          </Ayuda>
        )}
      </div>

      <Button
        type="submit"
        loading={consultar.isPending}
        disabled={!documentoValido}
        className="mt-6 h-12 w-full gap-2 text-[15px]"
      >
        {consultar.isPending ? (
          'Buscando…'
        ) : (
          <>
            <Search className="size-4" aria-hidden />
            Buscar mis datos
          </>
        )}
      </Button>
    </form>
  )
}
