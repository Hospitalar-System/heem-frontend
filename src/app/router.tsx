import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import App from '@/App'

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
  },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
