declare module 'next/link' {
  import type { ComponentType } from 'react'
  import type { LinkProps } from 'react-router-dom'

  const Link: ComponentType<Omit<LinkProps, 'to'> & { href: string; passHref?: boolean }>
  export default Link
}

declare module 'next/navigation' {
  export function useRouter(): {
    push(path: string): void
    replace(path: string): void
    refresh(): void
    back(): void
  }
  export function usePathname(): string
  export function useSearchParams(): URLSearchParams
  export function useParams<T extends Record<string, string | undefined> = Record<string, string | undefined>>(): T
}
