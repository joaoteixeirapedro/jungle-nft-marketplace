import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { DesignIcon } from '@/components/ui/design-icon'

/** URL changes replace the draft and cancel its pending timer without losing focus. */
export function SearchField({ value, resetKey, onSearch }: { value: string; resetKey: string; onSearch: (value: string) => void }) {
  const [input, setInput] = useState({ key: resetKey, draft: value })
  if (input.key !== resetKey) setInput({ key: resetKey, draft: value })
  const draft = input.key === resetKey ? input.draft : value
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [resetKey])
  function submit(next: string) {
    clearTimeout(timer.current)
    onSearch(next.trim())
  }
  return <form role="search" className="catalog-search" onSubmit={(event) => { event.preventDefault(); submit(draft) }}>
    <DesignIcon file="ce4db.svg" />
    <label htmlFor="catalog-search" className="sr-only">Pesquisar NFTs</label>
    <input id="catalog-search" type="search" placeholder="Explorar coleções" maxLength={120} value={draft} className="field min-w-0 flex-1" onChange={(event) => {
      const next = event.target.value
      setInput({ key: resetKey, draft: next })
      clearTimeout(timer.current)
      timer.current = setTimeout(() => onSearch(next.trim()), 300)
    }} />
    <Button type="submit" className="search-submit" variant="outline">Buscar</Button>
    {draft && <Button type="button" variant="outline" onClick={() => { setInput({ key: resetKey, draft: '' }); submit('') }}>Limpar busca</Button>}
  </form>
}
