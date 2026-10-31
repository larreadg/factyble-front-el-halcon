import { BadgeCheck, MessageCircle, UserPlus } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { ErrorState } from '@/components/ui/ErrorState'
import { SkeletonRows } from '@/components/ui/Skeleton'
import { buttonClass } from '@/components/ui/buttonStyles'
import { useResultados } from '@/features/sorteos/apiEjecucion'
import { mensajeDeError } from '@/features/sorteos/errores'
import {
  Cabecera,
  Cuerpo,
  Fila,
  ItemMovil,
  ListaMovil,
  Tabla,
  Td,
  TdAcciones,
  Th,
  ThAcciones,
} from '@/components/ui/Tabla'
import { formatDateTime } from '@/lib/dates'
import { formatearTelefono, telefonoInternacional } from '@/lib/paraguay'
import type { SorteoResultado } from '@/types/database'

/**
 * Los ganadores de un sorteo, con su teléfono si lo tenemos.
 *
 * ── De dónde sale el teléfono ──────────────────────────────────────────────
 * El ganador sale de una FACTURA, y una factura no trae teléfono: trae el RUC y
 * el nombre del receptor. El teléfono está en el padrón —la gente que se anotó
 * en `/public/clientes`— y la vista `v_sorteo_resultado` cruza las dos por
 * documento. Que el cruce acierte o no es exactamente la pregunta que se hace
 * cinco minutos después de sortear: «¿cómo le aviso?».
 *
 * Por eso cuando NO cruza esta tabla no deja un guión y sigue: dice que esa
 * persona no está en el padrón y ofrece agregarla. Es el único lugar del panel
 * donde esa ausencia significa algo concreto y se puede resolver en el momento.
 *
 * ── Por qué acá sí se muestra el nombre completo y el teléfono ─────────────
 * Esta pantalla no se graba ni se comparte: es el panel, detrás de sesión. El
 * enmascarado existe para la pantalla de presentación y para la página pública,
 * que son las dos que ven terceros. Acá se necesita el dato entero para poder
 * llamar a la persona.
 */
export function TablaGanadores({ actas }: { actas: SorteoResultado[] }) {
  return (
    <>
      <ListaMovil>
        {actas.map((acta) => (
          <ItemMovil
            key={acta.id}
            titulo={
              <span className="flex items-baseline gap-2">
                <span className="text-xs font-semibold text-accent-600 tabular-nums">
                  {acta.premio_orden}°
                </span>
                {acta.receptor_nombre ?? 'Sin nombre'}
              </span>
            }
            subtitulo={
              <span className="block text-xs text-slate-500">
                {acta.premio_nombre}
                {acta.receptor_ruc ? (
                  <span className="tabular-nums"> · {acta.receptor_ruc}</span>
                ) : null}
                {acta.padron_nombre && acta.padron_nombre !== acta.receptor_nombre ? (
                  <span className="block text-amber-600">
                    En el padrón figura como {acta.padron_nombre}
                  </span>
                ) : null}
              </span>
            }
            meta={
              <>
                <span className="tabular-nums">Factura {acta.factura_numero}</span>
                <span className="tabular-nums">{formatDateTime(acta.sorteado_en)}</span>
              </>
            }
            accion={<Contacto acta={acta} />}
          />
        ))}
      </ListaMovil>

      <Tabla>
        <Cabecera>
          <Th className="w-px">Premio</Th>
          <Th>Ganador</Th>
          <Th>Factura</Th>
          <Th>Sorteado</Th>
          <ThAcciones>Contacto</ThAcciones>
        </Cabecera>

        <Cuerpo>
          {actas.map((acta) => (
            <Fila key={acta.id}>
              <Td numerica>
                <span className="font-semibold text-accent-600">{acta.premio_orden}°</span>
              </Td>
              <Td className="max-w-80">
                <Ganador acta={acta} />
              </Td>
              <Td tono="normal" numerica>
                {acta.factura_numero}
              </Td>
              <Td tono="tenue" numerica>
                {formatDateTime(acta.sorteado_en)}
              </Td>
              <TdAcciones>
                <Contacto acta={acta} />
              </TdAcciones>
            </Fila>
          ))}
        </Cuerpo>
      </Tabla>
    </>
  )
}

/**
 * Quién ganó: el nombre de la factura, qué se llevó y con qué documento.
 *
 * El documento no es decoración: es lo que hay que tipear para darlo de alta en
 * el padrón cuando no está, y sin él el botón «Agregar» manda a un formulario
 * que no se puede completar.
 */
function Ganador({ acta }: { acta: SorteoResultado }) {
  const otroNombre = acta.padron_nombre && acta.padron_nombre !== acta.receptor_nombre

  return (
    <>
      <span className="block truncate font-medium text-slate-900">
        {acta.receptor_nombre ?? 'Sin nombre'}
      </span>
      <span className="mt-0.5 block truncate text-xs font-normal text-slate-500">
        {acta.premio_nombre}
        {acta.receptor_ruc ? <span className="tabular-nums"> · {acta.receptor_ruc}</span> : null}
      </span>
      {/* El cruce es por documento, así que dos nombres distintos sobre el mismo
          documento significan que alguno de los dos está mal escrito — o que no
          es la misma persona. Quien va a escribir el mensaje tiene que verlo
          antes de mandarlo. */}
      {otroNombre ? (
        <span className="mt-0.5 block text-xs font-normal text-amber-600">
          En el padrón figura como {acta.padron_nombre}
        </span>
      ) : null}
    </>
  )
}

/**
 * El teléfono del ganador, o la salida cuando no lo tenemos.
 *
 * El enlace es a `wa.me` y no a `tel:`: acá se avisa por WhatsApp, y desde una
 * computadora un `tel:` no hace nada. El número igual queda a la vista para
 * copiarlo o marcarlo a mano.
 */
function Contacto({ acta }: { acta: SorteoResultado }) {
  const telefono = acta.padron_telefono
  const internacional = telefonoInternacional(telefono)

  if (!telefono) {
    return (
      <span className="flex flex-wrap items-center justify-end gap-x-2 gap-y-1">
        <span className="text-xs text-slate-500">No está en el padrón</span>
        <Link
          to="/padron?ficha=nuevo"
          className={buttonClass({
            variant: 'ghost',
            size: 'sm',
            className: 'h-10 shrink-0 lg:h-8',
          })}
        >
          <UserPlus className="size-3.5" aria-hidden />
          Agregar
          <span className="sr-only"> a {acta.receptor_nombre ?? 'este ganador'} al padrón</span>
        </Link>
      </span>
    )
  }

  return (
    <span className="flex flex-wrap items-center justify-end gap-x-2 gap-y-1">
      <span className="inline-flex items-center gap-1.5 text-sm text-slate-700 tabular-nums">
        {formatearTelefono(telefono)}
        {acta.padron_telefono_verificado ? (
          <BadgeCheck
            className="size-3.5 shrink-0 text-emerald-600"
            aria-label="Celular verificado por SMS"
          />
        ) : null}
      </span>

      {internacional ? (
        <a
          href={`https://wa.me/${internacional}`}
          target="_blank"
          rel="noreferrer noopener"
          className={buttonClass({
            variant: 'secondary',
            size: 'sm',
            className: 'h-10 shrink-0 lg:h-8',
          })}
        >
          <MessageCircle className="size-3.5" aria-hidden />
          WhatsApp
          <span className="sr-only"> a {acta.receptor_nombre ?? 'el ganador'}</span>
        </a>
      ) : null}
    </span>
  )
}

/**
 * La tarjeta de ganadores del detalle del sorteo.
 *
 * Sólo existe con el sorteo ya sorteado, y va arriba de todo: en ese estado la
 * configuración es historia y lo único que queda por hacer es avisarle a la
 * gente que ganó.
 */
export function PanelGanadores({ sorteoId }: { sorteoId: number }) {
  const resultados = useResultados(sorteoId)
  const actas = resultados.data ?? []
  const conTelefono = actas.filter((acta) => acta.padron_telefono).length

  return (
    <Card className="overflow-hidden">
      <CardHeader
        title="Ganadores"
        description={
          resultados.isPending
            ? 'Buscando el contacto de cada uno en el padrón…'
            : actas.length === 0
              ? 'Todavía no hay actas para este sorteo.'
              : `${String(conTelefono)} de ${String(actas.length)} tienen teléfono en el padrón.`
        }
      />

      {resultados.isPending ? (
        <CardBody>
          <SkeletonRows rows={3} />
        </CardBody>
      ) : resultados.isError ? (
        <ErrorState
          description={mensajeDeError(resultados.error, 'No pudimos traer los ganadores.')}
          onRetry={() => void resultados.refetch()}
        />
      ) : actas.length > 0 ? (
        <div className="border-t border-slate-100">
          <TablaGanadores actas={actas} />
        </div>
      ) : null}
    </Card>
  )
}
