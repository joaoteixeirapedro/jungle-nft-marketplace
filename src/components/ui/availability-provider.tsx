import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AvailabilityContext } from '@/hooks/use-availability'
import { Button } from '@/components/ui/button'

export function AvailabilityProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => { if (message) dialog.current?.showModal() }, [message])
  return <AvailabilityContext value={setMessage}>
    {children}
    <dialog className="notice-dialog" ref={dialog} aria-labelledby="notice-title" aria-describedby="notice-description" onClose={() => setMessage(null)}>
      <h2 id="notice-title">Recurso indisponível</h2>
      <p id="notice-description">{message}</p>
      <Button autoFocus onClick={() => dialog.current?.close()}>Entendi</Button>
    </dialog>
  </AvailabilityContext>
}
