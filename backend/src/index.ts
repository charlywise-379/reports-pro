import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import onboardingRouter from './routes/onboarding'
import reportsRouter from './routes/reports'
import dashboardRouter from './routes/dashboard'
import stripeRouter from './routes/stripe'

dotenv.config()

// Startup diagnostics — removed in production once stable
console.log('🔧 ENV CHECK:', {
  SUPABASE_URL: !!process.env.SUPABASE_URL,
  SUPABASE_ANON_KEY: !!process.env.SUPABASE_ANON_KEY,
  DATABASE_URL: !!process.env.DATABASE_URL,
  DIRECT_URL: !!process.env.DIRECT_URL,
  STRIPE_SECRET_KEY: !!process.env.STRIPE_SECRET_KEY,
  ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
})

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }))
app.use(express.json())

// Rutas
app.use('/api/onboarding', onboardingRouter)
app.use('/api/reports', reportsRouter)
app.use('/api/dashboard', dashboardRouter)
app.use('/api/stripe', stripeRouter)

// Health check
app.get('/health', async (req, res) => {
  const { prisma } = await import('./lib/prisma')
  let dbStatus = 'unknown'
  let userCount = 0
  try {
    userCount = await prisma.user.count()
    dbStatus = 'ok'
  } catch (e: any) {
    dbStatus = e.message
  }
  res.json({
    status: dbStatus === 'ok' ? 'ok' : 'db_error',
    message: 'Reports PRO Backend',
    timestamp: new Date().toISOString(),
    db: dbStatus,
    users: userCount,
    env: {
      supabaseAnon: !!process.env.SUPABASE_ANON_KEY,
      directUrl: !!process.env.DIRECT_URL,
    }
  })
})

// 0.0.0.0 requerido para Railway
app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`)
})

export default app
