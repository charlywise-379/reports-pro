'use client'
// Meta Pixel en todo el sitio. El código base de Meta se carga una vez; PageView se envía en la carga inicial y en
// cada navegación interna (en App Router cambiar de ruta no recarga la página, así que el PageView del snippet
// original solo contaría la primera vista).
import Script from 'next/script'
import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { META_PIXEL_ID, trackMetaPageView } from '@/lib/metaPixel'

export default function MetaPixel() {
  const pathname = usePathname()
  const last = useRef<string | null>(null)

  useEffect(() => {
    if (!META_PIXEL_ID || last.current === pathname) return
    const isFirst = last.current === null
    last.current = pathname
    // La primera vista la envía el snippet al inicializarse; aquí solo las navegaciones posteriores.
    if (!isFirst) trackMetaPageView()
  }, [pathname])

  if (!META_PIXEL_ID) return null
  return (
    <>
      <Script id="meta-pixel" strategy="afterInteractive">{`
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${META_PIXEL_ID}');
fbq('track', 'PageView');
`}</Script>
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img height="1" width="1" style={{ display: 'none' }} alt=""
          src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`} />
      </noscript>
    </>
  )
}
