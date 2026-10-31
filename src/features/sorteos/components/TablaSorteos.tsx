import { Gift, Sparkles, Tag, Trophy } from 'lucide-react'
import { Link } from 'react-router-dom'

import { buttonClass } from '@/components/ui/buttonStyles'
import {
  AccionFila,
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
import { EstadoSorteoBadge } from '@/features/sorteos/components/EstadoSorteoBadge'
import { formatFechaCalendario } from '@/lib/dates'
import { formatNumber, pluralize } from '@/lib/format'
import type { SorteoListado } from '@/types/database'

/**
 * El listado de sorteos.
 *
 * ── Por qué la fila entera dejó de ser un enlace ───────────────────────────
 * Lo fue hasta que existieron tres listados: acá se abría tocando cualquier
 * parte y en facturas y padrón había un botón al final. Dos gramáticas para la
 * misma acción en pantallas vecinas. Ahora las tres terminan en un control con
 * nombre, y el sorteo sigue siendo un `<Link>` —así que abrir en otra pestaña o
 * copiar la dirección funciona igual que antes.
 */
export function TablaSorteos({ filas }: { filas: SorteoListado[] }) {
  return (
    <>
      <ListaMovil>
        {filas.map((sorteo) => (
          <ItemMovil
            key={sorteo.id}
            titulo={sorteo.nombre}
            derecha={<EstadoSorteoBadge estado={sorteo.estado} />}
            subtitulo={
              <span className="text-xs text-slate-600 tabular-nums">
                {formatFechaCalendario(sorteo.fecha_inicio)} –{' '}
                {formatFechaCalendario(sorteo.fecha_fin)}
              </span>
            }
            meta={
              <>
                <span className="inline-flex min-w-0 items-center gap-1">
                  <Tag className="size-3.5 shrink-0 text-brand-600" aria-hidden />
                  <span className="truncate">{sorteo.marcas_texto || 'Sin marcas'}</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <Gift className="size-3.5 shrink-0 text-accent-600" aria-hidden />
                  {sorteo.premios > 0
                    ? `${formatNumber(sorteo.premios)} ${pluralize(sorteo.premios, 'premio', 'premios')}`
                    : 'Sin premios'}
                </span>
              </>
            }
            accion={
              <>
                <AccesoAlSorteo sorteo={sorteo} />
                <AccionFila to={`/sorteos/${sorteo.id}`} sobre={sorteo.nombre}>
                  Abrir
                </AccionFila>
              </>
            }
          />
        ))}
      </ListaMovil>

      <Tabla>
        <Cabecera>
          <Th>Sorteo</Th>
          <Th>Marcas</Th>
          <Th>Período</Th>
          <Th align="right">Premios</Th>
          <Th>Estado</Th>
          <ThAcciones />
        </Cabecera>

        <Cuerpo>
          {filas.map((sorteo) => (
            <Fila key={sorteo.id}>
              <Td tono="principal" className="max-w-80">
                <span className="block truncate">{sorteo.nombre}</span>
                {sorteo.descripcion ? (
                  <span className="mt-0.5 block truncate text-xs font-normal text-slate-500">
                    {sorteo.descripcion}
                  </span>
                ) : null}
              </Td>
              <Td className="max-w-64">
                {sorteo.marcas > 0 ? (
                  <span className="block truncate" title={sorteo.marcas_texto}>
                    {sorteo.marcas_texto}
                  </span>
                ) : (
                  <span className="text-slate-500">Sin marcas</span>
                )}
              </Td>
              <Td tono="tenue" numerica>
                {formatFechaCalendario(sorteo.fecha_inicio)} –{' '}
                {formatFechaCalendario(sorteo.fecha_fin)}
              </Td>
              <Td align="right" numerica>
                {sorteo.premios > 0 ? (
                  <>
                    {formatNumber(sorteo.premios)}
                    {sorteo.premios_unidades > sorteo.premios ? (
                      <span className="text-slate-500">
                        {' '}
                        / {formatNumber(sorteo.premios_unidades)} u.
                      </span>
                    ) : null}
                  </>
                ) : (
                  <span className="text-slate-500">—</span>
                )}
              </Td>
              <Td>
                <EstadoSorteoBadge estado={sorteo.estado} />
              </Td>
              <TdAcciones>
                <AccesoAlSorteo sorteo={sorteo} />
                <AccionFila to={`/sorteos/${sorteo.id}`} sobre={sorteo.nombre}>
                  Abrir
                </AccionFila>
              </TdAcciones>
            </Fila>
          ))}
        </Cuerpo>
      </Tabla>
    </>
  )
}

/**
 * La entrada a la pantalla de sorteo, desde el listado.
 *
 * Sólo aparece cuando tiene sentido: con el sorteo CERRADO se puede sortear, y
 * con uno SORTEADO se puede volver a ver el acta. En BORRADOR o ABIERTO no se
 * muestra nada — un botón deshabilitado invitaría a preguntarse por qué, y la
 * respuesta (hay que cerrar el período primero) no cabe en un `title`.
 */
function AccesoAlSorteo({ sorteo }: { sorteo: SorteoListado }) {
  if (sorteo.estado !== 'CERRADO' && sorteo.estado !== 'SORTEADO') return null

  const sorteado = sorteo.estado === 'SORTEADO'

  return (
    <Link
      to={`/sorteos/${String(sorteo.id)}/presentar`}
      // Pestaña nueva: la presentación se pone en pantalla completa y se graba,
      // y quien la abre normalmente quiere seguir teniendo el panel donde estaba.
      target="_blank"
      rel="noreferrer"
      className={buttonClass({
        variant: sorteado ? 'secondary' : 'primary',
        size: 'sm',
        className: 'h-10 shrink-0 lg:h-8',
      })}
    >
      {sorteado ? (
        <>
          <Trophy className="size-3.5" aria-hidden />
          Ver ganadores
        </>
      ) : (
        <>
          <Sparkles className="size-3.5" aria-hidden />
          Sortear
        </>
      )}
      <span className="sr-only"> · {sorteo.nombre}</span>
    </Link>
  )
}
