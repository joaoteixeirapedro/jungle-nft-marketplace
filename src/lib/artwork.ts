const names = ['8f387', '83794', '9add2', 'b7cfc'] as const

/** Presentation metadata only; NFT identity, price and availability stay in REST. */
export function artworkProps(source: string, sizes: string) {
  const name = names.find((value) => source === `/assets/figma/${value}.png` || source === `/assets/artwork/${value}-1254.webp`)
  if (!name) return { src: source }
  return {
    src: `/assets/artwork/${name}-1254.webp`,
    srcSet: [320, 640, 1254].map((width) => `/assets/artwork/${name}-${width}.webp ${width}w`).join(', '),
    sizes,
  }
}
