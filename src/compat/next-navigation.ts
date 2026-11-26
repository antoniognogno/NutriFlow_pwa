import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useMemo } from 'react'

export function useRouter() {
  const navigate = useNavigate()

  return useMemo(() => ({
    push: (path: string) => navigate(path),
    replace: (path: string) => navigate(path, { replace: true }),
    refresh: () => undefined,
    back: () => navigate(-1),
  }), [navigate])
}

export function usePathname() {
  return useLocation().pathname
}

export function useSearchParams() {
  const { search } = useLocation()
  return useMemo(() => new URLSearchParams(search), [search])
}

export { useParams }
