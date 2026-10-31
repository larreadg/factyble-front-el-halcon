import { ChevronDown } from 'lucide-react'
import { useMemo } from 'react'

import { CIUDADES } from '@/features/publico/ciudades'
import { cn } from '@/lib/cn'

/**
 * Select de ciudad agrupado por departamento.
 *
 * No reusa `@/components/ui/Select` porque ese recibe una lista plana y acá
 * hacen falta `<optgroup>`: son 249 opciones, y sin el departamento como
 * encabezado encontrar la propia en una lista corrida es tedioso — sobre todo
 * en el celular, que es donde se va a llenar esto.
 *
 * Es un `<select>` nativo a propósito. En mobile abre el selector del sistema,
 * con su propio buscador y su tamaño de toque: cualquier combobox hecho a mano
 * sería peor justo en el dispositivo que más importa.
 */

/**
 * Las ciudades de donde viene la mayoría de los clientes, arriba de todo y en
 * este orden — que NO es alfabético: es el que pidió el negocio, y sabe mejor
 * que nosotros de dónde le llega la gente.
 *
 * Con 249 opciones, que alguien de Luque tenga que bajar hasta CENTRAL es
 * pedirle trabajo por nada. Estas siete cubren el anillo de Asunción.
 *
 * Se identifican por NOMBRE y no por id: los id vienen de un `bigserial` y no
 * significan nada acá, mientras que un nombre que deje de existir en el
 * catálogo se nota al leer esta lista. Los siete están verificados como únicos
 * en el catálogo; si alguno dejara de estarlo, `find` se queda con el primero y
 * habría que desambiguar por departamento.
 */
const DESTACADAS = [
  'AREGUÁ',
  'LUQUE',
  'SAN LORENZO',
  'YPACARAÍ',
  'CAACUPÉ',
  'ASUNCIÓN',
  'ITAUGUÁ',
] as const

interface SelectCiudadProps {
  id: string
  value: string
  onChange: (value: string) => void
  invalido?: boolean
  'aria-describedby'?: string
}

export function SelectCiudad({
  id,
  value,
  onChange,
  invalido,
  'aria-describedby': describedBy,
}: SelectCiudadProps) {
  // El catálogo viene ordenado por departamento desde la base, así que agrupar
  // es recorrerlo una vez. `useMemo` porque son 249 filas y el padre re-renderiza
  // en cada tecla del formulario.
  const grupos = useMemo(() => {
    const porDepartamento = new Map<string, typeof CIUDADES>()
    for (const ciudad of CIUDADES) {
      const actual = porDepartamento.get(ciudad.departamento)
      if (actual) {
        porDepartamento.set(ciudad.departamento, [...actual, ciudad])
      } else {
        porDepartamento.set(ciudad.departamento, [ciudad])
      }
    }
    return [...porDepartamento.entries()]
  }, [])

  // En el orden de DESTACADAS, no en el del catálogo. Si alguna no resolviera
  // —un nombre mal escrito acá, o una ciudad que cambió en el origen— se cae
  // sola de la lista en vez de romper el select.
  const destacadas = useMemo(
    () =>
      DESTACADAS.map((nombre) => CIUDADES.find((c) => c.nombre === nombre)).filter(
        (c) => c !== undefined,
      ),
    [],
  )

  return (
    <div className="relative">
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={invalido ?? undefined}
        aria-describedby={describedBy}
        className={cn(
          // `h-12` y `text-base`, igual que los `<Input>` del resto del flujo: un
          // select mas bajo que el campo de arriba se lee como otro tipo de
          // control, y ademas 48 px es el piso comodo para un toque.
          'h-12 w-full appearance-none rounded-lg border-0 bg-white pr-9 pl-3 text-base',
          'ring-1 ring-inset focus:ring-2 focus:outline-none',
          value ? 'text-slate-900' : 'text-slate-400',
          invalido ? 'ring-red-400 focus:ring-red-500' : 'ring-slate-200 focus:ring-accent-600',
        )}
      >
        <option value="">Elegí tu ciudad</option>

        {/* Las destacadas aparecen DOS VECES: acá arriba y también en su
            departamento, más abajo. Es deliberado — quien busca por cercanía la
            encuentra de una, y quien recorre CENTRAL esperando ver LUQUE la
            encuentra donde corresponde. Sacarlas de su grupo haría que ese
            segundo camino terminara en una lista a la que le falta algo, que se
            lee como un bug. Las dos opciones llevan el mismo `value`, así que
            elegir cualquiera es lo mismo. */}
        <optgroup label="Más elegidas">
          {destacadas.map((ciudad) => (
            <option key={`destacada-${ciudad.id}`} value={String(ciudad.id)}>
              {ciudad.nombre}
            </option>
          ))}
        </optgroup>

        {grupos.map(([departamento, ciudades]) => (
          <optgroup key={departamento} label={departamento}>
            {ciudades.map((ciudad) => (
              <option key={ciudad.id} value={String(ciudad.id)}>
                {ciudad.nombre}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-slate-400"
        aria-hidden
      />
    </div>
  )
}
