import { BadgeCheck, Building2, History } from 'lucide-react'
import type { ReactNode } from 'react'

import {
  BotonFila,
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
  ThOrden,
} from '@/components/ui/Tabla'
import { formatDateTime } from '@/lib/dates'
import { formatearTelefono } from '@/lib/paraguay'
import type { ClienteSorteoListado, PadronSortField } from '@/types/database'

interface TablaPadronProps {
  filas: ClienteSorteoListado[]
  orden: PadronSortField
  direccion: 'asc' | 'desc'
  onOrdenar: (campo: PadronSortField) => void
  onAbrir: (id: number) => void
}

export function TablaPadron({ filas, orden, direccion, onOrdenar, onAbrir }: TablaPadronProps) {
  return (
    <>
      <ListaMovil>
        {filas.map((cliente) => (
          <ItemMovil
            key={cliente.id}
            titulo={<Nombre cliente={cliente} />}
            subtitulo={
              <span className="text-slate-600 tabular-nums">
                {cliente.ruc ?? cliente.documento}
              </span>
            }
            meta={
              <>
                <Celular cliente={cliente} />
                <span>{cliente.ciudad_nombre ?? 'Sin ciudad'}</span>
                <span className="tabular-nums">{formatDateTime(cliente.creado_en)}</span>
                <Procedencia cliente={cliente} />
              </>
            }
            accion={
              <BotonFila onClick={() => onAbrir(cliente.id)} sobre={`de ${cliente.nombre}`}>
                Ver ficha
              </BotonFila>
            }
          />
        ))}
      </ListaMovil>

      <Tabla>
        <Cabecera>
          <ThOrden campo="nombre" orden={orden} direccion={direccion} onOrdenar={onOrdenar}>
            Nombre
          </ThOrden>
          <ThOrden campo="documento" orden={orden} direccion={direccion} onOrdenar={onOrdenar}>
            RUC o cédula
          </ThOrden>
          <Th>Celular</Th>
          <ThOrden campo="ciudad_nombre" orden={orden} direccion={direccion} onOrdenar={onOrdenar}>
            Ciudad
          </ThOrden>
          <ThOrden campo="creado_en" orden={orden} direccion={direccion} onOrdenar={onOrdenar}>
            Se anotó
          </ThOrden>
          <ThAcciones />
        </Cabecera>

        <Cuerpo>
          {filas.map((cliente) => (
            <Fila key={cliente.id}>
              <Td className="max-w-72">
                <Nombre cliente={cliente} truncado />
                <Procedencia cliente={cliente} className="mt-0.5" />
              </Td>
              <Td numerica>{cliente.ruc ?? cliente.documento}</Td>
              <Td numerica>
                <Celular cliente={cliente} />
              </Td>
              <Td className="max-w-44 truncate">{cliente.ciudad_nombre ?? '—'}</Td>
              <Td tono="tenue" numerica>
                {formatDateTime(cliente.creado_en)}
              </Td>
              <TdAcciones>
                <BotonFila onClick={() => onAbrir(cliente.id)} sobre={`de ${cliente.nombre}`}>
                  Ver ficha
                </BotonFila>
              </TdAcciones>
            </Fila>
          ))}
        </Cuerpo>
      </Tabla>
    </>
  )
}

function Nombre({ cliente, truncado }: { cliente: ClienteSorteoListado; truncado?: boolean }) {
  return (
    <span className="flex items-center gap-1.5">
      {cliente.es_empresa ? (
        <Building2 className="size-3.5 shrink-0 text-slate-400" aria-hidden />
      ) : null}
      <span className={truncado ? 'truncate font-medium text-slate-900' : undefined}>
        {cliente.nombre}
      </span>
    </span>
  )
}

function Celular({ cliente }: { cliente: ClienteSorteoListado }) {
  return (
    <span className="inline-flex items-center gap-1.5 tabular-nums">
      {formatearTelefono(cliente.telefono)}
      {cliente.telefono_verificado ? (
        <BadgeCheck
          className="size-3.5 shrink-0 text-emerald-600"
          aria-label="Celular verificado por SMS"
        />
      ) : null}
    </span>
  )
}

/**
 * De dónde salió el nombre y cuántas veces se editó la ficha.
 *
 * Es la línea que convierte el listado en algo que se puede auditar: un nombre
 * tipeado y uno que salió de una factura valen distinto el día del sorteo, y una
 * ficha con muchos cambios es exactamente lo que hay que poder mirar de cerca.
 */
function Procedencia({
  cliente,
  className,
}: {
  cliente: ClienteSorteoListado
  className?: string
}) {
  const partes: ReactNode[] = [
    <span key="v" className="text-slate-500">
      {cliente.nombre_verificado ? 'de sus facturas' : 'cargado a mano'}
    </span>,
  ]

  if (cliente.cambios > 0) {
    partes.push(
      <span key="c" className="inline-flex items-center gap-1 text-amber-600">
        <History className="size-3" aria-hidden />
        {cliente.cambios} {cliente.cambios === 1 ? 'cambio' : 'cambios'}
      </span>,
    )
  }

  return (
    <span className={className}>
      {partes.map((parte, indice) => (
        // El separador es un nodo entre nodos, así que no puede salir de un
        // `join`: va como hermano del trozo que precede.
        <span key={indice} className="inline-flex items-center gap-2 text-xs">
          {indice > 0 ? <span className="mx-2 text-slate-300">·</span> : null}
          {parte}
        </span>
      ))}
    </span>
  )
}
