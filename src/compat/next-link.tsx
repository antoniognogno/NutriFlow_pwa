import { Link as RouterLink, type LinkProps as RouterLinkProps } from 'react-router-dom'

type CompatLinkProps = Omit<RouterLinkProps, 'to'> & {
  href: string
  passHref?: boolean
}

export default function Link({ href, passHref: _passHref, ...props }: CompatLinkProps) {
  return <RouterLink to={href} {...props} />
}
