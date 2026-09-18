import { redirect } from 'next/navigation'

// La landing pixel-perfect que vivía aquí ahora es la página principal (/).
// Se deja este redirect para no romper enlaces/bookmarks/campañas ya
// compartidos con la URL /landing-2.
export default function LandingTwoRedirect() {
  redirect('/')
}
