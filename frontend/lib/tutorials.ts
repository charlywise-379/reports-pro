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
  image?: string
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
    image: '/tutorial/dashboard-crear-proyecto.png',
  },
  {
    title: 'Tu periodo de prueba',
    body: 'Tienes 7 días gratis desde tu registro, con derecho a 1 reporte. Ese primer reporte se entrega parcial (algunas secciones cubiertas) salvo que tengas un código promocional — en ese caso lo recibes completo. Al vencer el trial, se activa tu suscripción automáticamente.',
    image: '/tutorial/dashboard-trial.png',
  },
  {
    title: 'Tus reportes',
    body: 'Todos tus reportes generados aparecen en tu dashboard, listos para ver o descargar en PDF. También te los enviamos por correo (y WhatsApp, si lo activas) en cuanto están listos.',
    image: '/tutorial/dashboard-reportes.png',
  },
  {
    title: '¿Dudas? Estamos para ayudarte',
    body: 'Puedes escribirnos en cualquier momento a info@omnireports.pro, o volver a ver este tutorial cuando quieras desde el botón "¿Cómo funciona?" en tu dashboard.',
  },
]

// Tutorial del wizard de onboarding — módulo Inteligencia Competitiva.
export const competitiveOnboardingTutorialSteps: TutorialStep[] = [
  {
    title: 'Vamos a configurar tu Inteligencia Competitiva 🎯',
    body: 'Este módulo monitorea a tu competencia y tu mercado de forma automática: detecta cambios de precios, campañas, movimientos comerciales y contrataciones clave, y te entrega un reporte con alertas tempranas y recomendaciones accionables — sin que tengas que investigarlo tú mismo. Este es un tutorial rápido antes de empezar: el formulario de configuración que sigue tiene 7 pasos cortos; aquí te explicamos qué esperar en cada uno. Puedes reabrir esta ayuda cuando quieras con el botón "?" flotante.',
  },
  {
    title: 'Tu empresa y posicionamiento',
    body: 'Primero nos cuentas quién eres: tu empresa, tu industria y cómo te posicionas frente al mercado. Mientras más preciso seas, más relevante será el análisis.',
    image: '/tutorial/onboarding-empresa.png',
  },
  {
    title: 'Competidores directos e indirectos',
    body: 'Aquí defines a quién quieres que monitoreemos: tus competidores directos (mismo producto, mismo mercado) y los indirectos (alternativas que resuelven la misma necesidad de otra forma).',
    image: '/tutorial/onboarding-competidores.png',
  },
  {
    title: 'Áreas a monitorear y frecuencia',
    body: 'Eliges qué tipo de movimientos te interesa detectar (precios, campañas, contrataciones, etc.) y con qué frecuencia quieres recibir tus reportes.',
    image: '/tutorial/onboarding-areas.png',
  },
  {
    title: 'Confirmación y activación',
    body: 'En el último paso revisas todo y activas tu proyecto. En ese momento arranca tu periodo de prueba de 7 días y comenzamos a generar tu primer reporte.',
    image: '/tutorial/onboarding-confirmacion.png',
  },
]
