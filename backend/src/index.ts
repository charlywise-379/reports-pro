import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import onboardingRouter from './routes/onboarding'
import reportsRouter from './routes/reports'
import dashboardRouter from './routes/dashboard'
import stripeRouter from './routes/stripe'

dotenv.config()

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
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Reports PRO Backend funcionando correctamente',
    timestamp: new Date().toISOString()
  })
})

// 0.0.0.0 requerido para Railway
app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`)
})

export default app
