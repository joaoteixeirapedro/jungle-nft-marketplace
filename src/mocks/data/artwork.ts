/** Official artwork exported from the user-provided Figma file. */
const artwork = ['8f387', '83794', '9add2', 'b7cfc'] as const
const firstItems = [0, 1, 2, 1, 1, 2, 3, 3] as const
const descriptions = ['Macaco com jaqueta verde e óculos de sol', 'Macaco de chapéu e moletom roxo', 'Macaco com paletó claro e gola verde', 'Macaco dourado com fones verdes'] as const

export function nftArtwork(index: number) {
  const imageIndex = firstItems[index] ?? index % artwork.length
  return { src: `/assets/artwork/${artwork[imageIndex]!}-1254.webp`, alt: descriptions[imageIndex]! }
}
