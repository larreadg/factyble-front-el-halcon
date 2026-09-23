import { useEffect, useRef, useState } from 'react'

export interface Tamanio {
  ancho: number
  alto: number
}

/**
 * Mide un contenedor con ResizeObserver.
 *
 * Existe para no usar el `ResponsiveContainer` de Recharts: ese componente suma
 * alto al documento (medido: +279 px con un gráfico de 288 px), lo que provoca
 * una segunda barra de scroll y una franja vacía al pie de la app.
 */
export function useTamanioContenedor<T extends HTMLElement>() {
  const ref = useRef<T | null>(null)
  const [tamanio, setTamanio] = useState<Tamanio>({ ancho: 0, alto: 0 })

  useEffect(() => {
    const elemento = ref.current
    if (!elemento) return

    const observer = new ResizeObserver((entradas) => {
      const entrada = entradas[0]
      if (!entrada) return
      const { width, height } = entrada.contentRect
      setTamanio((previo) =>
        Math.abs(previo.ancho - width) < 1 && Math.abs(previo.alto - height) < 1
          ? previo
          : { ancho: width, alto: height },
      )
    })

    observer.observe(elemento)
    return () => observer.disconnect()
  }, [])

  return { ref, tamanio }
}
