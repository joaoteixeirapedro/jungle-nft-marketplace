import { Link } from '@tanstack/react-router'

export function NotFoundPage() {
  return (
    <>
      <h1 className="text-3xl font-semibold">Página não encontrada</h1>
      <Link to="/" className="underline underline-offset-4">Voltar ao início</Link>
    </>
  )
}
