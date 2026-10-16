/** SVG exports retain their intrinsic root geometry. Wrappers provide touch targets. */
export function DesignIcon({ file, className, loading = 'lazy' }: { file: string; className?: string; loading?: 'eager' | 'lazy' }) {
  const dimensions = designIconDimensions[file]
  return <img src={`/assets/figma/${file}`} loading={loading} alt="" aria-hidden="true" className={className} width={dimensions?.[0]} height={dimensions?.[1]} />
}
import { designIconDimensions } from '@/lib/design-icon-dimensions'
