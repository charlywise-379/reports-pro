import Link from 'next/link'

export const metadata = {
  title: 'Términos y Condiciones · Omni Reports',
  description: 'Términos y Condiciones de uso de la plataforma Omni Reports.',
}

const LAST_UPDATED = '31 de agosto de 2026'

export default function TerminosYCondicionesPage() {
  return (
    <main className="min-h-screen bg-[#060609] text-white">
      <div className="max-w-3xl mx-auto px-6 py-14">
        <Link href="/" className="inline-flex items-center mb-8">
          <img src="/logo-full.png" alt="Omni Reports" className="h-10 w-auto" />
        </Link>

        <h1 className="text-3xl font-black mb-2">Términos y Condiciones de Uso</h1>
        <p className="text-gray-500 text-sm mb-10">Última actualización: {LAST_UPDATED}</p>

        <div className="space-y-8 text-gray-300 text-sm leading-relaxed [&_h2]:text-white [&_h2]:text-lg [&_h2]:font-bold [&_h2]:mb-3 [&_p]:mb-3 [&_li]:mb-1.5 [&_ul]:list-disc [&_ul]:pl-5 [&_strong]:text-white">

          <section>
            <h2>1. Identidad del prestador del servicio</h2>
            <p>
              La plataforma <strong>Omni Reports</strong> (en adelante, la &ldquo;Plataforma&rdquo;) es operada por
              <strong> Social Networks de México, S.A. de C.V.</strong> (en adelante, &ldquo;Omni Reports&rdquo;, &ldquo;nosotros&rdquo; o &ldquo;la Empresa&rdquo;),
              con domicilio en Blvd. Rogelio Cantú Gómez #333, Int. 10, Col. Santa María, Monterrey, Nuevo León, México.
            </p>
            <p>
              Estos Términos y Condiciones (los &ldquo;Términos&rdquo;) rigen el acceso y uso de la Plataforma por cualquier persona física
              o moral (el &ldquo;Usuario&rdquo;) que se registre o utilice los servicios ofrecidos. Al crear una cuenta, marcar la casilla de
              aceptación durante el registro, o utilizar la Plataforma de cualquier forma, el Usuario manifiesta que ha leído, entendido
              y aceptado estos Términos en su totalidad, así como el <Link href="/legal/aviso-de-privacidad" className="text-blue-400 hover:text-blue-300 underline">Aviso de Privacidad</Link>.
              Si el Usuario no está de acuerdo con estos Términos, deberá abstenerse de usar la Plataforma.
            </p>
          </section>

          <section>
            <h2>2. Descripción del servicio</h2>
            <p>
              Omni Reports es una plataforma de software como servicio (SaaS) que genera, mediante inteligencia artificial y búsqueda de
              información pública en internet, reportes periódicos de: (i) inteligencia competitiva, (ii) salud corporativa / recursos
              humanos, y (iii) radar de ciberseguridad, con base en la información y preferencias proporcionadas por el Usuario al
              configurar su proyecto.
            </p>
            <p>
              Los reportes son generados con apoyo de modelos de lenguaje de terceros (incluyendo Anthropic, Inc.) y tienen fines
              informativos y de apoyo a la toma de decisiones. No constituyen asesoría legal, financiera, contable, de seguridad
              informática ni de ningún otro tipo profesional, y Omni Reports no garantiza su exactitud, integridad o vigencia absoluta.
              Las decisiones que el Usuario tome con base en los reportes son de su exclusiva responsabilidad.
            </p>
          </section>

          <section>
            <h2>3. Registro de cuenta</h2>
            <p>
              Para utilizar la Plataforma, el Usuario debe crear una cuenta proporcionando información veraz, completa y actualizada.
              El Usuario es responsable de mantener la confidencialidad de su contraseña y de toda actividad que ocurra bajo su cuenta.
              El registro está reservado a personas mayores de 18 años con capacidad legal para contratar, o a personas morales
              debidamente representadas.
            </p>
          </section>

          <section>
            <h2>4. Periodo de prueba (trial)</h2>
            <p>
              Todo nuevo Usuario tiene acceso gratuito a la Plataforma durante un periodo de prueba de <strong>7 (siete) días naturales</strong>
              a partir del alta de su proyecto. Durante este periodo, el Usuario puede generar <strong>un (1) reporte gratuito</strong>, el cual
              se entrega de forma parcial (con determinadas secciones visibles y otras cubiertas), salvo que el Usuario cuente con un código
              promocional válido que otorgue acceso al reporte completo sin costo, en cuyo caso ese único reporte se entrega completo. En
              ningún caso el periodo de prueba, con o sin código promocional, otorga derecho a más de un reporte gratuito por Usuario.
            </p>
            <p>
              Al vencer el periodo de prueba, y salvo que el Usuario haya cancelado previamente, se realizará el cobro automático
              correspondiente al plan seleccionado y se desbloqueará el acceso completo a la Plataforma y a los reportes subsecuentes.
            </p>
          </section>

          <section>
            <h2>5. Suscripciones, precios y forma de pago</h2>
            <p>
              El acceso completo a la Plataforma se ofrece mediante planes de suscripción recurrente (diario, semanal, quincenal o
              mensual, según la frecuencia de entrega contratada), cuyo precio se muestra al Usuario antes de la contratación. Los pagos
              se procesan a través de la pasarela de pagos Stripe; Omni Reports no almacena los datos completos de tarjetas de pago en
              sus propios servidores.
            </p>
            <p>
              Las suscripciones se renuevan automáticamente al final de cada periodo de facturación, cargando el monto correspondiente al
              método de pago registrado, salvo que el Usuario haya cancelado la suscripción antes de la fecha de corte.
            </p>
          </section>

          <section>
            <h2>6. Política de no reembolso</h2>
            <p>
              <strong>Todos los pagos realizados a Omni Reports son definitivos y no reembolsables</strong>, salvo que la ley aplicable
              disponga expresamente lo contrario. El pago de cada periodo de facturación cubre y garantiza al Usuario el acceso a la
              Plataforma y a los reportes correspondientes durante todo ese periodo, hasta la siguiente fecha de corte.
            </p>
            <p>
              Si el Usuario cancela su suscripción antes de que concluya el periodo ya pagado, dicha cancelación surtirá efecto para
              evitar cargos futuros, pero <strong>no generará derecho a devolución, reembolso total o proporcional</strong> del monto
              correspondiente al periodo en curso: el Usuario conservará el acceso completo a la Plataforma y a la generación de reportes
              hasta el último día del periodo ya cubierto por el pago realizado.
            </p>
            <p>
              Esta política aplica por igual a cancelaciones voluntarias del Usuario, así como a la falta de uso de la Plataforma o de los
              reportes durante el periodo contratado.
            </p>
          </section>

          <section>
            <h2>7. Cancelación de la suscripción</h2>
            <p>
              El Usuario puede cancelar su suscripción en cualquier momento desde su panel de cuenta. La cancelación detiene los cargos
              futuros a partir del siguiente periodo de facturación, pero no afecta el periodo ya pagado conforme a la sección anterior.
            </p>
          </section>

          <section>
            <h2>8. Códigos promocionales</h2>
            <p>
              Omni Reports podrá emitir, a su entera discreción, códigos promocionales que otorguen beneficios específicos durante el
              periodo de prueba (por ejemplo, la entrega del reporte de prueba sin restricciones de contenido). Los códigos promocionales
              no tienen valor en efectivo, no son transferibles, están sujetos a límites de uso definidos por Omni Reports, y pueden ser
              modificados, suspendidos o cancelados en cualquier momento sin previo aviso.
            </p>
          </section>

          <section>
            <h2>9. Obligaciones del Usuario</h2>
            <ul>
              <li>Proporcionar información veraz y mantenerla actualizada.</li>
              <li>Utilizar la Plataforma de conformidad con la ley aplicable y estos Términos.</li>
              <li>No intentar vulnerar, realizar ingeniería inversa, ni interferir con la operación de la Plataforma.</li>
              <li>No utilizar la Plataforma para fines ilícitos, incluyendo espionaje industrial ilegal o violaciones a la competencia económica.</li>
              <li>
                Cuando el Usuario proporcione información de terceros (por ejemplo, datos de su personal para el módulo de Salud
                Corporativa), garantizar que cuenta con la base legal y los avisos de privacidad correspondientes frente a dichos terceros.
              </li>
            </ul>
          </section>

          <section>
            <h2>10. Propiedad intelectual</h2>
            <p>
              La Plataforma, su código, diseño, marca y demás elementos son propiedad de Omni Reports o de sus licenciantes. Los reportes
              generados para un Usuario son para su uso interno y comercial propio; el Usuario no adquiere derechos sobre la tecnología o
              metodología empleada por la Plataforma para generarlos.
            </p>
          </section>

          <section>
            <h2>11. Limitación de responsabilidad</h2>
            <p>
              En la máxima medida permitida por la ley aplicable, Omni Reports no será responsable por daños indirectos, incidentales o
              consecuentes derivados del uso o la imposibilidad de uso de la Plataforma, ni por decisiones tomadas por el Usuario con base
              en el contenido de los reportes. La responsabilidad total de Omni Reports frente al Usuario, en cualquier caso, no excederá
              el monto pagado por el Usuario durante los tres (3) meses previos al hecho que la origine.
            </p>
          </section>

          <section>
            <h2>12. Suspensión y terminación</h2>
            <p>
              Omni Reports podrá suspender o cancelar la cuenta de un Usuario, sin necesidad de aviso previo, en caso de incumplimiento
              de estos Términos, falta de pago, uso fraudulento o abusivo de la Plataforma. La terminación de la cuenta no exime al
              Usuario del pago de cargos ya devengados, ni genera derecho a reembolso conforme a la sección 6.
            </p>
          </section>

          <section>
            <h2>13. Modificaciones a los Términos</h2>
            <p>
              Omni Reports podrá modificar estos Términos en cualquier momento. Los cambios sustanciales se notificarán al Usuario por
              correo electrónico o mediante aviso dentro de la Plataforma, con una antelación razonable a su entrada en vigor. El uso
              continuado de la Plataforma después de dicha entrada en vigor constituye la aceptación de los Términos modificados.
            </p>
          </section>

          <section>
            <h2>14. Legislación aplicable y jurisdicción</h2>
            <p>
              Estos Términos se rigen por las leyes de los Estados Unidos Mexicanos. Para la interpretación y cumplimiento de los
              presentes Términos, el Usuario y Omni Reports se someten a la jurisdicción de los tribunales competentes de la ciudad de
              Monterrey, Nuevo León, México, renunciando expresamente a cualquier otro fuero que pudiera corresponderles por razón de su
              domicilio presente o futuro.
            </p>
          </section>

          <section>
            <h2>15. Contacto</h2>
            <p>
              Para dudas sobre estos Términos, el Usuario puede contactar a Social Networks de México, S.A. de C.V. en el domicilio
              indicado en la sección 1, o a través de los canales de soporte disponibles dentro de la Plataforma.
            </p>
          </section>

        </div>

        <div className="mt-12 pt-6 border-t border-white/10 flex gap-6 text-sm">
          <Link href="/legal/aviso-de-privacidad" className="text-blue-400 hover:text-blue-300">Aviso de Privacidad →</Link>
          <Link href="/" className="text-gray-500 hover:text-gray-400">← Volver al inicio</Link>
        </div>
      </div>
    </main>
  )
}
