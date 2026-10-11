import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { PropsWithChildren } from 'react'
import { Toaster } from 'sonner'
import { ThemeProvider } from './theme-provider'
import { useTheme } from './use-theme'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        {children}
        <AppToaster />
      </ThemeProvider>
    </QueryClientProvider>
  )
}

function AppToaster() {
  const { mode } = useTheme()
  return (
    <Toaster
      position="top-right"
      theme={mode === 'auto' ? 'system' : mode}
      toastOptions={{
        style: {
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          color: 'var(--text-primary)',
        },
      }}
    />
  )
}
