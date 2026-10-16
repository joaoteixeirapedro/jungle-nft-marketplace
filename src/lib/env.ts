export const env = {
  mocksEnabled: import.meta.env.VITE_ENABLE_MOCKS !== 'false',
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || '/api',
  socketUrl: import.meta.env.VITE_SOCKET_URL || 'https://realtime.nft-marketplace.test',
} as const
