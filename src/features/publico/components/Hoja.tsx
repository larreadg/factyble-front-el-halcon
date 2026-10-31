import type { ReactNode } from 'react'

/**
 * La hoja del formulario público: membrete arriba, contenido debajo.
 *
 * Es la misma del login, y eso es deliberado: quien escanea el QR en el local y
 * quien entra a trabajar ven la misma marca, con el mismo peso. Lo único que la
 * distingue es el filete ámbar de El Halcón arriba.
 *
 * `h-full` + `overflow-y-auto`, no `min-h-dvh`. En `index.css` el documento tiene
 * `overflow: hidden` y alto fijo —la app nunca scrollea el body, ver el README—,
 * así que una hoja más alta que la pantalla tiene que scrollear POR DENTRO. Con
 * `min-h-dvh` el contenido que sobra queda fuera de vista y sin forma de llegar a
 * él: el botón de enviar, por ejemplo.
 */

export function Hoja({ children }: { children: ReactNode }) {
  return (
    <div className="relative h-full overflow-y-auto bg-ink-950">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-[radial-gradient(70%_100%_at_50%_0%,var(--color-ink-900),transparent_72%)]"
        aria-hidden
      />
      <div className="relative mx-auto flex min-h-full w-full max-w-112 flex-col justify-center px-5 py-6">
        <div className="animate-entrada-suave overflow-hidden rounded-2xl bg-white shadow-2xl shadow-ink-950/50">
          <div className="h-[3px] bg-halcon" aria-hidden />
          <div className="px-7 pt-8 pb-5 sm:px-9">
            <img
              src="/eh.png"
              alt="El Halcón Ferretería"
              className="mx-auto h-20 w-auto object-contain sm:h-24"
              width={1920}
              height={1920}
            />
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}
