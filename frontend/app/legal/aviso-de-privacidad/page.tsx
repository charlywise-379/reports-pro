import Link from 'next/link'

export const metadata = {
  title: 'Aviso de Privacidad · Omni Reports',
  description: 'Aviso de Privacidad de la plataforma Omni Reports, conforme a la LFPDPPP.',
}

const LAST_UPDATED = '31 de agosto de 2026'

export default function AvisoDePrivacidadPage() {
  return (
    <main className="min-h-screen bg-[#060609] text-white">
      <div className="max-w-3xl mx-auto px-6 py-14">
        <Link href="/" className="inline-flex items-center mb-8">
          <img src="/logo-full.png" alt="Omni Reports" className="h-10 w-auto" />
        </Link>

        <h1 className="text-3xl font-black mb-2">Aviso de Privacidad</h1>
        <p className="text-gray-500 text-sm mb-10">Última actualización: {LAST_UPDATED}</p>

        <div className="space-y-8 text-gray-300 text-sm leading-relaxed [&_h2]:text-white [&_h2]:text-lg [&_h2]:font-bold [&_h2]:mb-3 [&_p]:mb-3 [&_li]:mb-1.5 [&_ul]:list-disc [&_ul]:pl-5 [&_strong]:text-white">

          <section>
            <h2>1. Responsable del tratamiento de datos personales</h2>
            <p>
              <strong>Social Networks de México, S.A. de C.V.</strong> (en adelante, &ldquo;Omni Reports&rdquo; o &ldquo;el Responsable&rdquo;),
              con domicilio en Blvd. Rogelio Cantú Gómez #333, Int. 10, Col. Santa María, Monterrey, Nuevo León, México, es responsable
              del tratamiento de los datos personales que usted (el &ldquo;Titular&rdquo;) nos proporcione, de conformidad con la Ley Federal
              de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP), su Reglamento y demás disposiciones aplicables
              en México.
            </p>
          </section>

          <section>
            <h2>2. Datos personales que recabamos</h2>
            <p>Dependiendo de su relación con la Plataforma, podemos recabar las siguientes categorías de datos:</p>
            <ul>
              <li><strong>Datos de identificación y contacto:</strong> nombre, apellidos, correo electrónico, teléfono.</li>
              <li><strong>Datos de facturación y empresa:</strong> nombre de la empresa, ciudad, estado, país.</li>
              <li><strong>Datos de pago:</strong> procesados directamente por nuestro proveedor de pagos (Stripe); Omni Reports no almacena números completos de tarjeta ni códigos de seguridad en sus propios servidores.</li>
              <li><strong>Datos de uso de la Plataforma:</strong> configuración de proyectos, preferencias de reportes, historial de reportes generados, interacciones con la Plataforma, dirección IP y datos técnicos de navegación (mediante herramientas de analítica).</li>
              <li><strong>Información proporcionada para la generación de reportes:</strong> información sobre la empresa, competidores, o personal del Usuario que este decida ingresar para la generación de reportes de inteligencia competitiva, salud corporativa o ciberseguridad.</li>
            </ul>
            <p>No recabamos de forma intencional datos personales sensibles en los términos del artículo 3, fracción VI de la LFPDPPP. Le pedimos no incluir este tipo de datos al configurar sus proyectos o comunicarse con nosotros.</p>
          </section>

          <section>
            <h2>3. Finalidades del tratamiento</h2>
            <p><strong>Finalidades primarias</strong> (necesarias para la relación con usted):</p>
            <ul>
              <li>Crear y administrar su cuenta de usuario.</li>
              <li>Generar y entregar los reportes contratados a través de la Plataforma.</li>
              <li>Procesar pagos y gestionar su suscripción, incluyendo cobros recurrentes y renovaciones.</li>
              <li>Enviar los reportes y notificaciones relacionadas con el servicio por correo electrónico y/o WhatsApp, según los canales que usted elija.</li>
              <li>Brindar soporte técnico y atención a solicitudes del Titular.</li>
              <li>Cumplir con obligaciones legales, fiscales y contractuales.</li>
            </ul>
            <p><strong>Finalidades secundarias</strong> (no necesarias, pero que nos permiten ofrecerle un mejor servicio; usted puede oponerse a ellas sin que esto afecte la relación contractual):</p>
            <ul>
              <li>Enviar comunicaciones informativas o promocionales sobre nuevas funcionalidades, planes o códigos promocionales.</li>
              <li>Elaborar estadísticas internas y análisis de uso de la Plataforma con fines de mejora del producto.</li>
            </ul>
            <p>
              Si no desea que sus datos sean tratados para las finalidades secundarias, puede manifestarlo en cualquier momento
              escribiéndonos a través de los canales de contacto señalados en la sección 9, o dejando de recibir dichas comunicaciones
              mediante el enlace de baja incluido en ellas.
            </p>
          </section>

          <section>
            <h2>4. Uso de inteligencia artificial y terceros encargados</h2>
            <p>
              Para generar los reportes, la Plataforma utiliza modelos de inteligencia artificial de terceros proveedores (incluyendo
              Anthropic, Inc.), así como servicios de infraestructura (almacenamiento en la nube, envío de correo electrónico y
              mensajería, procesamiento de pagos y analítica de uso). Estos terceros actúan como encargados del tratamiento o, en su
              caso, como responsables independientes conforme a sus propios avisos de privacidad, y solo reciben los datos necesarios
              para prestar el servicio contratado, bajo obligaciones de confidencialidad y seguridad.
            </p>
            <p>
              Cuando el Titular ingresa a la Plataforma información relativa a terceros (por ejemplo, datos de personal de su empresa
              para el módulo de Salud Corporativa), el Titular es responsable de contar con la base legal correspondiente frente a
              dichos terceros y de haberles informado, en su caso, sobre dicho tratamiento.
            </p>
          </section>

          <section>
            <h2>5. Transferencias de datos personales</h2>
            <p>
              Omni Reports podrá transferir sus datos personales a las siguientes categorías de destinatarios, únicamente para el
              cumplimiento de las finalidades descritas en este Aviso: (i) proveedores de infraestructura tecnológica y hospedaje de
              datos; (ii) el proveedor de procesamiento de pagos (Stripe); (iii) proveedores de servicios de inteligencia artificial
              utilizados para la generación de reportes; (iv) autoridades competentes, cuando exista un requerimiento legal válido.
              Algunos de estos proveedores pueden encontrarse fuera de territorio mexicano; en dichos casos, Omni Reports procura que
              el tratamiento se realice conforme a estándares de protección de datos equivalentes a los exigidos por la legislación
              mexicana. No vendemos ni rentamos sus datos personales a terceros con fines distintos a los aquí señalados.
            </p>
          </section>

          <section>
            <h2>6. Medidas de seguridad</h2>
            <p>
              Omni Reports ha implementado medidas de seguridad administrativas, técnicas y físicas razonables para proteger sus datos
              personales contra daño, pérdida, alteración, destrucción o uso, acceso o tratamiento no autorizado, incluyendo cifrado en
              tránsito, control de acceso a nuestros sistemas y respaldo de información.
            </p>
          </section>

          <section>
            <h2>7. Derechos ARCO y revocación del consentimiento</h2>
            <p>
              Usted tiene derecho a Acceder a sus datos personales, Rectificarlos cuando sean inexactos, Cancelarlos cuando considere
              que no son tratados conforme a los principios y obligaciones de la LFPDPPP, u Oponerse al tratamiento de los mismos para
              fines específicos (derechos &ldquo;ARCO&rdquo;). Asimismo, puede revocar en cualquier momento el consentimiento que, en su
              caso, nos haya otorgado para el tratamiento de sus datos.
            </p>
            <p>
              Para ejercer cualquiera de estos derechos, envíe su solicitud a través de los canales de contacto señalados en la sección
              9, indicando: (i) su nombre completo y correo electrónico registrado; (ii) el derecho que desea ejercer; (iii) una
              descripción clara de los datos personales respecto de los cuales busca ejercer el derecho; y (iv), en su caso, copia de
              una identificación oficial que acredite su identidad. Le responderemos en un plazo máximo de 20 días hábiles, conforme a
              lo previsto por la LFPDPPP.
            </p>
            <p>
              La cancelación u oposición al tratamiento de ciertos datos puede implicar que no podamos seguir prestándole el servicio
              contratado; en ese caso, se lo haremos saber antes de proceder.
            </p>
          </section>

          <section>
            <h2>8. Conservación de datos</h2>
            <p>
              Sus datos personales se conservarán durante la vigencia de la relación contractual y, posteriormente, durante los plazos
              necesarios para cumplir con obligaciones legales, fiscales y contables aplicables, o para la defensa de derechos de Omni
              Reports ante autoridades competentes.
            </p>
          </section>

          <section>
            <h2>9. Contacto y solicitudes de privacidad</h2>
            <p>
              Cualquier duda, solicitud o ejercicio de derechos ARCO relacionado con este Aviso de Privacidad puede dirigirse a Social
              Networks de México, S.A. de C.V., en el domicilio señalado en la sección 1, o a través de los canales de soporte
              disponibles dentro de la Plataforma.
            </p>
          </section>

          <section>
            <h2>10. Uso de cookies y tecnologías similares</h2>
            <p>
              La Plataforma utiliza cookies y tecnologías de analítica similares para mantener su sesión activa, recordar sus
              preferencias y comprender el uso general del sitio con fines de mejora del producto. Usted puede deshabilitar el uso de
              cookies desde la configuración de su navegador; sin embargo, esto podría afectar el funcionamiento de la Plataforma.
            </p>
          </section>

          <section>
            <h2>11. Cambios al Aviso de Privacidad</h2>
            <p>
              Omni Reports podrá modificar este Aviso de Privacidad en cualquier momento, para atender novedades legislativas,
              políticas internas o nuevos requerimientos para la prestación de nuestros servicios. Cualquier modificación será
              publicada en esta misma página, indicando la fecha de última actualización. Le recomendamos consultarla periódicamente.
            </p>
          </section>

        </div>

        <div className="mt-12 pt-6 border-t border-white/10 flex gap-6 text-sm">
          <Link href="/legal/terminos-y-condiciones" className="text-blue-400 hover:text-blue-300">Términos y Condiciones →</Link>
          <Link href="/" className="text-gray-500 hover:text-gray-400">← Volver al inicio</Link>
        </div>
      </div>
    </main>
  )
}
