/** Only application routes can be used as a post-authentication destination. */
export function safeAuthRedirect(value: unknown, fallback = '/') {
  if (typeof value !== 'string' || value.length > 5000 || !value.startsWith('/') || value.startsWith('//') || [...value].some((character) => character === '\\' || character.charCodeAt(0) <= 32)) return fallback
  try {
    const url = new URL(value, 'https://kurio.local')
    if (url.origin !== 'https://kurio.local' || !/^(?:\/|\/marketplace|\/nfts\/[\w-]+|\/cart|\/favorites|\/profile|\/wallets|\/checkout|\/orders(?:\/[\w-]+)?)$/.test(url.pathname)) return fallback
    for (const key of [...url.searchParams.keys()]) if (/password|token|secret|authorization/i.test(key)) url.searchParams.delete(key)
    return `${url.pathname}${url.search}${url.hash}`
  } catch { return fallback }
}

export function validateAuthFields(values: Record<string, string>, register: boolean) {
  const errors: Record<string, string> = {}
  if (!values.email?.trim() || values.email.trim().length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) errors.email = 'Informe um e-mail válido.'
  if (!values.password || values.password.length > 128) errors.password = 'Informe a senha (até 128 caracteres).'
  if (register) {
    if (!/^[a-z0-9_]{3,32}$/i.test(values.username?.trim() ?? '')) errors.username = 'Use de 3 a 32 letras, números ou sublinhado.'
    if (!values.password || values.password.length < 8 || values.password.length > 128 || !/[A-Za-z]/.test(values.password) || !/\d/.test(values.password)) errors.password = 'Use de 8 a 128 caracteres, com letra e número.'
    if (values.confirmPassword !== values.password || !values.confirmPassword) errors.confirmPassword = 'As senhas devem ser iguais.'
  }
  return errors
}
