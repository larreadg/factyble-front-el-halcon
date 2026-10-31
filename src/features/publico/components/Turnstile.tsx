import { useEffect, useImperativeHandle, useRef, type Ref } from 'react'

/**
 * Widget de Cloudflare Turnstile.
 *
 * Renderizado EXPLÍCITO (`?render=explicit`), no implícito. El modo implícito
 * busca `.cf-turnstile` en el DOM cuando carga el script, lo que en una SPA
 * significa "cuando quiera que eso pase" — y si la ruta se monta después, el
 * widget no aparece nunca. Con el explícito el control es nuestro.
 */

interface OpcionesRender {
  sitekey: string
  action: string
  callback: (token: string) => void
  'expired-callback': () => void
  'error-callback': () => void
  'refresh-expired'?: 'auto' | 'manual' | 'never'
  appearance?: 'always' | 'execute' | 'interaction-only'
  theme?: 'light' | 'dark' | 'auto'
  language?: string
}

interface ApiTurnstile {
  render: (contenedor: HTMLElement, opciones: OpcionesRender) => string
  reset: (id: string) => void
  remove: (id: string) => void
}

declare global {
  interface Window {
    turnstile?: ApiTurnstile
  }
}

const SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

/**
 * Una sola carga del script por documento, compartida por todos los montajes.
 * En desarrollo, StrictMode monta el componente dos veces; sin este caché se
 * insertarían dos `<script>`.
 */
let cargando: Promise<void> | null = null

function cargarScript(): Promise<void> {
  if (cargando) return cargando

  cargando = new Promise<void>((resolver, rechazar) => {
    if (window.turnstile) {
      resolver()
      return
    }
    const script = document.createElement('script')
    script.src = SRC
    script.async = true
    script.defer = true
    script.onload = () => {
      resolver()
    }
    script.onerror = () => {
      // Que se pueda reintentar: si el script no cargó por una caída de red,
      // dejar la promesa rechazada en caché condenaría a la página entera.
      cargando = null
      rechazar(new Error('No se pudo cargar Turnstile'))
    }
    document.head.appendChild(script)
  })

  return cargando
}

export interface TurnstileHandle {
  /**
   * Pide un token nuevo. Hay que llamarlo después de CADA envío fallido: el
   * token es de un solo uso y Cloudflare rechaza el segundo intento por replay.
   */
  reset: () => void
}

interface TurnstileProps {
  siteKey: string
  /** Tiene que coincidir con el `TURNSTILE_ACTION` de la Edge Function. */
  action: string
  /** Recibe el token, o `null` cuando venció o falló y hay que esperar otro. */
  onToken: (token: string | null) => void
  /** Se llama si el script no carga; sin widget no se puede enviar nada. */
  onFalloDeCarga?: () => void
  ref?: Ref<TurnstileHandle>
}

export function Turnstile({ siteKey, action, onToken, onFalloDeCarga, ref }: TurnstileProps) {
  const contenedor = useRef<HTMLDivElement>(null)
  const widgetId = useRef<string | null>(null)

  // En refs y no en el árbol de dependencias: el efecto que crea el widget
  // tiene que correr UNA vez. Si dependiera de los callbacks, cada render del
  // padre destruiría y recrearía el widget, y la persona vería el captcha
  // reiniciarse mientras escribe.
  const alToken = useRef(onToken)
  const alFallo = useRef(onFalloDeCarga)

  // La sincronización va en un efecto, no en el cuerpo del componente: escribir
  // un ref durante el render rompe el modelo de React y lo marca el linter.
  // Sin array de dependencias, corre después de cada render, que es justo lo
  // que se quiere.
  useEffect(() => {
    alToken.current = onToken
    alFallo.current = onFalloDeCarga
  })

  useImperativeHandle(ref, () => ({
    reset: () => {
      if (widgetId.current && window.turnstile) {
        window.turnstile.reset(widgetId.current)
        alToken.current(null)
      }
    },
  }))

  useEffect(() => {
    let vivo = true

    void cargarScript()
      .then(() => {
        // StrictMode desmonta y vuelve a montar: sin esto quedan dos widgets.
        if (!vivo || !contenedor.current || !window.turnstile) return
        widgetId.current = window.turnstile.render(contenedor.current, {
          sitekey: siteKey,
          action,
          language: 'es',
          // Explícito, no `auto`. El widget sólo se dibuja cuando Cloudflare
          // pide un desafío, y cuando eso pasa aparece dentro de una hoja
          // blanca: con `auto` toma el tema del SISTEMA, así que a quien tiene
          // el celular en modo oscuro le aparece un recuadro negro en medio del
          // formulario. La hoja es clara siempre, así que el widget también.
          theme: 'light',
          callback: (token) => alToken.current(token),
          // El token dura unos 5 minutos. Si vence con el formulario abierto,
          // se limpia: enviar con un token vencido da un error de captcha que
          // la persona no entiende.
          'expired-callback': () => alToken.current(null),
          'error-callback': () => alToken.current(null),
          // Explícito aunque sea el valor por defecto, porque de esto depende
          // que el formulario siga sirviendo después de cinco minutos abierto.
          // Alguien llenando esto en el local, entre que atiende y busca la
          // cédula, pasa ese tiempo sin problema: el widget pide un token nuevo
          // solo y la persona no se entera.
          'refresh-expired': 'auto',
          // CAPTCHA INVISIBLE. El widget no se dibuja salvo que Cloudflare
          // necesite que la persona haga algo; en ese caso aparece, en vez de
          // rechazarla en silencio.
          //
          // Por eso esto y no un widget de tipo "Invisible" del panel: ese
          // nunca puede mostrar un desafío, así que una persona real con VPN o
          // un navegador poco común queda afuera sin entender por qué. Además
          // se configura acá, sin tocar el panel ni cambiar la site key.
          appearance: 'interaction-only',
        })
      })
      .catch(() => {
        if (vivo) alFallo.current?.()
      })

    return () => {
      vivo = false
      if (widgetId.current && window.turnstile) {
        window.turnstile.remove(widgetId.current)
        widgetId.current = null
      }
    }
  }, [siteKey, action])

  return <div ref={contenedor} className="flex justify-center" />
}
