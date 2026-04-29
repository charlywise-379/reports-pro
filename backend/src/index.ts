import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import onboardingRouter from './routes/onboarding'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

// Rutas
app.use('/api/onboarding', onboardingRouter)

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Reports PRO Backend funcionando correctamente',
    timestamp: new Date().toISOString()
  })
})

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`)
})

export default app