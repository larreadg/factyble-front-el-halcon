/** Mensajes de Supabase Auth traducidos a algo que el usuario entienda. */
const MENSAJES: { patron: RegExp; mensaje: string }[] = [
  { patron: /invalid login credentials/i, mensaje: 'Credenciales inválidas.' },
  {
    patron: /email not confirmed/i,
    mensaje: 'La cuenta todavía no confirmó su correo electrónico.',
  },
  {
    patron: /user not found/i,
    mensaje: 'No existe una cuenta con ese correo electrónico.',
  },
  {
    patron: /too many requests|rate limit/i,
    mensaje: 'Demasiados intentos. Esperá unos minutos y volvé a probar.',
  },
  {
    patron: /user is banned|user banned/i,
    mensaje: 'La cuenta está deshabilitada. Contactá al administrador.',
  },
  {
    patron: /password should be at least/i,
    mensaje: 'La contraseña es demasiado corta.',
  },
  {
    patron: /failed to fetch|network|fetch error/i,
    mensaje: 'No pudimos conectarnos al servidor. Revisá tu conexión.',
  },
]

export function traducirErrorAuth(error: unknown): string {
  // AuthError extiende Error, así que alcanza con esta comprobación.
  const mensajeOriginal =
    error instanceof Error ? error.message : typeof error === 'string' ? error : ''

  const coincidencia = MENSAJES.find((item) => item.patron.test(mensajeOriginal))
  if (coincidencia) return coincidencia.mensaje

  return 'No pudimos iniciar sesión. Intentá nuevamente.'
}
