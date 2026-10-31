/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  /**
   * Base de las Edge Functions del formulario publico de sorteos, sin barra
   * final. Son tres —verificar-telefono, consultar-documento,
   * registrar-cliente— y comparten la base: una variable en vez de tres que se
   * pueden desincronizar.
   */
  readonly VITE_FUNCIONES_URL: string
  /** Site key de Turnstile. Es publica: viaja en el bundle a proposito. */
  readonly VITE_TURNSTILE_SITE_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
