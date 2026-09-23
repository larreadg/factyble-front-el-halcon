import { useEffect, useState } from 'react'

/** Devuelve `valor` recién después de `delay` ms sin cambios. */
export function useDebouncedValue<T>(valor: T, delay = 400): T {
  const [diferido, setDiferido] = useState(valor)

  useEffect(() => {
    const temporizador = window.setTimeout(() => setDiferido(valor), delay)
    return () => window.clearTimeout(temporizador)
  }, [valor, delay])

  return diferido
}
