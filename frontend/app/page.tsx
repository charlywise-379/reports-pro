import Link from 'next/link'
import { BarChart3, Shield, Heart, CheckCircle, ArrowRight, Zap } from 'lucide-react'

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-950 text-white">

      <nav className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="text-blue-500" size={22} />
            <span className="font-bold text-lg tracking-tight">Reports PRO</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-gray-400 hover:text-white text-sm transition-colors">
              Iniciar sesión
            </Link>
            <Link href="/register" className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
              Prueba gratis 7 días
            </Link>
          </div>
        </div>
      </nav>

      <section className="px-6 py-24 text-center">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-blue-950 border border-blue-800 text-blue-400 text-xs font-medium px-3 py-1.5 rounded-full mb-6">
            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse"></span>
            Inteligencia artificial en piloto automático
          </div>
          <h1 className="text-5xl font-bold tracking-tight mb-6 leading-tight">
            Reportes de inteligencia<br />
            <span className="text-blue-500">generados automáticamente</span><br />
            para tu empresa
          </h1>
          <p className="text-gray-400 text-xl mb-10 max-w-2xl mx-auto">
            Recibe análisis personalizados de tu industria, competidores y riesgos directamente en tu email o WhatsApp.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/register" className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-8 py-3.5 rounded-xl transition-colors flex items-center gap-2">
              Comenzar prueba gratis
              <ArrowRight size={18} />
            </Link>
            <Link href="#precios" className="text-gray-400 hover:text-white font-medium px-6 py-3.5 transition-colors">
              Ver precios
            </Link>
          </div>
          <p className="text-gray-600 text-sm mt-4">7 días gratis · Sin tarjeta de crédito · Cancela cuando quieras</p>
        </div>
      </section>

      <section className="px-6 py-20 bg-gray-900/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold mb-3">Tres servicios especializados</h2>
            <p className="text-gray-400">Cada reporte es generado con IA y personalizado para tu empresa</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 hover:border-blue-800 transition-colors">
              <div className="w-11 h-11 bg-blue-950 rounded-xl flex items-center justify-center mb-4">
                <BarChart3 className="text-blue-500" size={22} />
              </div>
              <h3 className="font-semibold text-lg mb-2">Inteligencia Competitiva</h3>
              <p className="text-gray-400 text-sm mb-4">Monitoreo de competidores, precios, campañas y cobertura de medios.</p>
              <ul className="space-y-2">
                {['Movimientos de competidores', 'Análisis de precios', 'Cobertura en medios', 'Cambios regulatorios'].map(item => (
                  <li key={item} className="flex items-center gap-2 text-sm text-gray-400">
                    <CheckCircle size={14} className="text-blue-500 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 hover:border-green-800 transition-colors">
              <div className="w-11 h-11 bg-green-950 rounded-xl flex items-center justify-center mb-4">
                <Heart className="text-green-500" size={22} />
              </div>
              <h3 className="font-semibold text-lg mb-2">Salud Corporativa RRHH</h3>
              <p className="text-gray-400 text-sm mb-4">Benchmarks de bienestar laboral y prevención de burnout.</p>
              <ul className="space-y-2">
                {['Métricas de ausentismo', 'Prevención de burnout', 'Tips de productividad', 'Actividades motivadoras'].map(item => (
                  <li key={item} className="flex items-center gap-2 text-sm text-gray-400">
                    <CheckCircle size={14} className="text-green-500 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 hover:border-purple-800 transition-colors">
              <div className="w-11 h-11 bg-purple-950 rounded-xl flex items-center justify-center mb-4">
                <Shield className="text-purple-500" size={22} />
              </div>
              <h3 className="font-semibold text-lg mb-2">Radar de Ciberseguridad</h3>
              <p className="text-gray-400 text-sm mb-4">Vulnerabilidades activas y checklist de protección empresarial.</p>
              <ul className="space-y-2">
                {['Vulnerabilidades activas', 'Alertas de brechas', 'Checklist de protección', 'Cumplimiento LFPDPPP'].map(item => (
                  <li key={item} className="flex items-center gap-2 text-sm text-gray-400">
                    <CheckCircle size={14} className="text-purple-500 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section id="precios" className="px-6 py-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold mb-3">Precios simples y transparentes</h2>
            <p className="text-gray-400">Elige la frecuencia que mejor se adapte a tu operación</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { freq: 'Mensual', price: '$20', period: '/mes', desc: 'Un reporte al mes', popular: false },
              { freq: 'Quincenal', price: '$22', period: '/mes', desc: 'Cada 15 días', popular: false },
              { freq: 'Semanal', price: '$25', period: '/mes', desc: 'Cada semana', popular: true },
              { freq: 'Diario', price: '$29.99', period: '/mes', desc: 'Cada día hábil', popular: false },
            ].map(plan => (
              <div key={plan.freq} className={`relative bg-gray-900 border rounded-2xl p-5 text-center ${plan.popular ? 'border-blue-600' : 'border-gray-800'}`}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-medium px-3 py-1 rounded-full">
                    Popular
                  </div>
                )}
                <div className="text-gray-400 text-sm mb-2">{plan.freq}</div>
                <div className="text-3xl font-bold mb-1">{plan.price}<span className="text-gray-500 text-sm font-normal">{plan.period}</span></div>
                <div className="text-gray-500 text-xs">{plan.desc}</div>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link href="/register" className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-8 py-3.5 rounded-xl transition-colors inline-flex items-center gap-2">
              Empezar 7 días gratis
              <ArrowRight size={18} />
            </Link>
            <p className="text-gray-600 text-sm mt-3">Sin tarjeta de crédito requerida al registrarte</p>
          </div>
        </div>
      </section>

      <footer className="border-t border-gray-800 px-6 py-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="text-blue-500" size={16} />
            <span className="font-bold text-sm">Reports PRO</span>
          </div>
          <p className="text-gray-600 text-sm">© 2025 Reports PRO. Todos los derechos reservados.</p>
        </div>
      </footer>

    </main>
  )
}