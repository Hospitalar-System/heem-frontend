const configuredApiUrl = import.meta.env.VITE_API_BASE_URL
const configuredDemoMode = import.meta.env.VITE_DEMO_MODE

export const isDemoMode = configuredDemoMode === 'true'
  || (!configuredApiUrl && configuredDemoMode !== 'false')
