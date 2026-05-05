import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import onboardingRouter from './routes/onboarding'
import reportsRouter from './routes/reports'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

// Rutas
app.use('/api/onboarding', onboardingRouter)
app.use('/api/reports', reportsRouter)
// DEBUG temporal — eliminar después
app.get('/debug/chromium', async (req, res) => {
  const { execSync } = require('child_process')
  try {
    const which = execSync('which chromium 2>/dev/null || which chromium-browser 2>/dev/null || echo "not found"').toString().trim()
    const find = execSync('find /usr /nix /run -name "chromium" 2>/dev/null | head -5').toString().trim()
    res.json({ which, find })
  } catch (e: any) {
    res.json({ error: e.message })
  }
})

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