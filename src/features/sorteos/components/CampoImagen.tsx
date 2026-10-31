import { ImagePlus, Loader2, Trash2 } from 'lucide-react'
import { useId, useRef, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { subirImagenPremio, urlDeImagen } from '@/features/sorteos/api'
import { mensajeDeError } from '@/features/sorteos/errores'
import { ErrorDeImagen } from '@/features/sorteos/imagen'
import { cn } from '@/lib/cn'

/**
 * La imagen de referencia de un premio.
 *
 * ── La imagen se sube al elegirla, antes de guardar el premio ───────────────
 * Es la única forma de mostrar una vista previa real —la misma que se va a ver
 * después, ya comprimida— en vez de un `blob:` local que podría no representar lo
 * que quedó guardado. El costo es que si alguien sube una foto y abandona el
 * formulario, el archivo queda sin fila que lo referencie. Es un huérfano
 * invisible que no rompe nada, y borrar el sorteo barre la carpeta entera.
 *
 * ── Este campo SÓLO sube; nunca borra ──────────────────────────────────────
 * Al reemplazar o quitar una imagen, la anterior sigue en el bucket hasta que el
 * premio se guarde. Es lo que hace que "Cancelar" funcione: si acá se borrara el
 * archivo anterior al elegir uno nuevo, cancelar dejaría la fila apuntando a una
 * imagen que ya no existe — un premio con la foto rota. El borrado del archivo
 * viejo lo hace el formulario, después de que el guardado salió bien.
 */
export function CampoImagen({
  sorteoId,
  valor,
  onCambio,
  deshabilitado = false,
}: {
  sorteoId: string
  valor: string | null
  onCambio: (path: string | null) => void
  deshabilitado?: boolean
}) {
  const inputId = useId()
  const input = useRef<HTMLInputElement>(null)
  const [subiendo, setSubiendo] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [arrastrando, setArrastrando] = useState(false)

  const url = urlDeImagen(valor)

  async function procesar(file: File | undefined) {
    if (!file) return
    setError(null)
    setSubiendo(true)
    try {
      const path = await subirImagenPremio(sorteoId, file)
      onCambio(path)
    } catch (fallo) {
      // `ErrorDeImagen` es lo que rechazó el navegador antes de salir (tipo o
      // tamaño); el resto viene de Storage y lo traduce `mensajeDeError`, que
      // sabe distinguir "elegiste un archivo que no sirve" de "el bucket todavía
      // no existe" — dos cosas que un único mensaje genérico vuelve indistinguibles.
      setError(
        fallo instanceof ErrorDeImagen
          ? fallo.message
          : mensajeDeError(fallo, 'No pudimos subir la imagen. Probá de nuevo.'),
      )
    } finally {
      setSubiendo(false)
      // Sin esto, elegir el mismo archivo dos veces no dispara `change`.
      if (input.current) input.current.value = ''
    }
  }

  return (
    <div>
      <span className="text-sm font-medium text-slate-800">Imagen de referencia</span>
      <span className="ml-1.5 text-xs font-normal text-slate-400">opcional</span>

      <div className="mt-1.5 flex items-start gap-3">
        <label
          htmlFor={inputId}
          onDragOver={(evento) => {
            evento.preventDefault()
            if (!deshabilitado) setArrastrando(true)
          }}
          onDragLeave={() => setArrastrando(false)}
          onDrop={(evento) => {
            evento.preventDefault()
            setArrastrando(false)
            if (deshabilitado) return
            void procesar(evento.dataTransfer.files[0])
          }}
          className={cn(
            'relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg',
            'bg-slate-50 ring-1 ring-slate-200 ring-inset transition-colors duration-150',
            deshabilitado
              ? 'cursor-not-allowed opacity-60'
              : 'cursor-pointer hover:bg-slate-100 hover:ring-slate-300',
            arrastrando && 'bg-accent-50 ring-2 ring-accent-600',
            'focus-within:ring-2 focus-within:ring-accent-600',
          )}
        >
          {url ? (
            <img src={url} alt="" className="size-full object-cover" />
          ) : (
            <ImagePlus className="size-5 text-slate-400" aria-hidden />
          )}

          {subiendo ? (
            <span className="absolute inset-0 flex items-center justify-center bg-white/75">
              <Loader2 className="size-4 animate-spin text-accent-600" aria-hidden />
            </span>
          ) : null}

          <input
            ref={input}
            id={inputId}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={deshabilitado || subiendo}
            onChange={(evento) => void procesar(evento.target.files?.[0])}
            className="sr-only"
          />
        </label>

        <div className="min-w-0 flex-1">
          <p className="text-xs text-slate-500">
            {url
              ? 'Arrastrá otra imagen o hacé click para reemplazarla.'
              : 'Arrastrá una foto o hacé click para elegirla.'}
          </p>
          <p className="mt-0.5 text-xs text-slate-400">
            JPG, PNG o WebP. Se reduce a 1200 px antes de subirse.
          </p>

          {url && !deshabilitado ? (
            <Button
              variant="ghost"
              size="sm"
              className="mt-1.5 -ml-2.5 text-slate-500"
              disabled={subiendo}
              onClick={() => {
                setError(null)
                onCambio(null)
              }}
            >
              <Trash2 className="size-3.5" aria-hidden />
              Quitar imagen
            </Button>
          ) : null}

          {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
        </div>
      </div>
    </div>
  )
}
