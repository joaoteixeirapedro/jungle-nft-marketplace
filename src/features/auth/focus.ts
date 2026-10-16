let trigger: HTMLElement | null = null

export function rememberAuthTrigger() {
  const element = document.activeElement
  if (element instanceof HTMLElement && element !== document.body && !element.closest('dialog')) trigger = element
}

export function restoreAuthTrigger() {
  if (document.querySelector('dialog[open]')) return
  const target = trigger?.isConnected ? trigger : [...document.querySelectorAll<HTMLElement>('[data-auth-entry]')].find((element) => element.getBoundingClientRect().width > 0)
  if (target && !target.closest('[inert]')) target.focus({ preventScroll: true })
  trigger = null
}
