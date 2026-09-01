// Contenido de los tutoriales guiados de la plataforma.
//
// Cada módulo (Inteligencia Competitiva, Salud Corporativa, Radar de
// Ciberseguridad) tiene o tendrá su propio arreglo de pasos aquí. El
// componente TutorialModal es genérico — solo consume `steps` + `storageKey`,
// así que agregar el tutorial de un nuevo módulo es tan simple como agregar
// un nuevo arreglo en este archivo y montar <TutorialModal> donde corresponda.

export type TutorialStep = {
  title: string
  body: string
}

// Tutorial general del dashboard — se muestra la primera vez que un usuario
// llega después de registrarse.
export const dashboardTutorialSteps: TutorialStep[] = [
  {
    title: '¡Bienvenido a Omni Reports! 👋',
    body: 'Esta es tu plataforma de inteligencia automatizada. En unos minutos vas a tener tu primer reporte generado por IA. Te damos un tour rápido de 5 pasos.',
  },
  {
    title: 'Crea tu primer proyecto',
    body: 'Cada proyecto representa un módulo de inteligencia (por ejemplo, Inteligencia Competitiva) configurado para tu empresa. Lo creas una sola vez respondiendo un formulario guiado — nosotros nos encargamos del resto.',
  },
  {
    title: 'Tu periodo de prueba',
    body: 'Tienes 7 días gratis desde tu registro, con derecho a 1 reporte. Ese primer reporte se entrega parcial (algunas secciones cubiertas) salvo que tengas un código promocional — en ese caso lo recibes completo. Al vencer el trial, se activa tu suscripción automáticamente.',
  },
  {
    title: 'Tus reportes',
    body: 'Todos tus reportes generados aparecen en tu dashboard, listos para ver o descargar en PDF. También te los enviamos por correo (y WhatsApp, si lo activas) en cuanto están listos.',
  },
  {
    title: '¿Dudas? Estamos para ayudarte',
    body: 'Puedes escribirnos en cualquier momento desde el botón de Contacto, o volver a ver este tutorial cuando quieras desde el botón "¿Cómo funciona?" en tu dashboard.',
  },
]

// Tutorial del wizard de onboarding — módulo Inteligencia Competitiva.
export const competitiveOnboardingTutorialSteps: TutorialStep[] = [
  {
    title: 'Vamos a configurar tu Inteligencia Competitiva 🎯',
    body: 'Este formulario tiene 7 pasos cortos. Con esta información, nuestra IA arma un análisis completo de tu mercado y tu competencia. Puedes reabrir esta ayuda en cualquier momento con el botón "?" de arriba.',
  },
  {
    title: 'Tu empresa y posicionamiento',
    body: 'Primero nos cuentas quién eres: tu empresa, tu industria y cómo te posicionas frente al mercado. Mientras más preciso seas, más relevante será el análisis.',
  },
  {
    title: 'Competidores directos e indirectos',
    body: 'Aquí defines a quién quieres que monitoreemos: tus competidores directos (mismo producto, mismo mercado) y los indirectos (alternativas que resuelven la misma necesidad de otra forma).',
  },
  {
    title: 'Áreas a monitorear y frecuencia',
    body: 'Eliges qué tipo de movimientos te interesa detectar (precios, campañas, contrataciones, etc.) y con qué frecuencia quieres recibir tus reportes.',
  },
  {
    title: 'Confirmación y activación',
    body: 'En el último paso revisas todo y activas tu proyecto. En ese momento arranca tu periodo de prueba de 7 días y comenzamos a generar tu primer reporte.',
  },
]
