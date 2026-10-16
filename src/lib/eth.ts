const SCALE = 10n ** 18n

export function parseEth(value: string): bigint {
  if (!/^(0|[1-9]\d{0,17})(\.\d{1,18})?$/.test(value)) throw new Error('Valor ETH inválido: utilize string decimal com até 18 casas.')
  const [whole = '0', fraction = ''] = value.split('.')
  return BigInt(whole) * SCALE + BigInt(fraction.padEnd(18, '0'))
}

export function formatEth(value: bigint): string {
  if (value < 0n) throw new Error('Valor ETH não pode ser negativo.')
  return `${value / SCALE}.${(value % SCALE).toString().padStart(18, '0').replace(/0+$/, '') || '0'}`
}

export function sumEth(values: string[]): string {
  return formatEth(values.reduce((total, value) => total + parseEth(value), 0n))
}
