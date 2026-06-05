import "./instrument"
import express from "express"
import rateLimit from "express-rate-limit"
import cors from "cors"
import dotenv from "dotenv"
import onboardingRouter from "./routes/onboarding"
import reportsRouter from "./routes/reports"
import dashboardRouter from "./routes/dashboard"
import stripeRouter from "./routes/stripe"
import { startReportWorker } from "./workers/reportWorker"
import { scheduleReports } from "./jobs/scheduleReports"

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.set("trust proxy", 1)

// Rate limiting global — 100 requests por 15 min por IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Demasiadas solicitudes. Intenta en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
})
app.use(globalLimiter)

// Rate limiting estricto para generación de reportes — 5 por hora por IP
const generateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { error: 'Límite de generación alcanzado. Máximo 5 reportes por hora.' },
  standardHeaders: true,
  legacyHeaders: false,
})
app.use('/api/reports/generate', generateLimiter)
app.use("/api/stripe/webhook", express.raw({ type: "application/json" }))
app.use(express.json())

app.use("/api/onboarding", onboardingRouter)
app.use("/api/reports", reportsRouter)
app.use("/api/dashboard", dashboardRouter)
app.use("/api/stripe", stripeRouter)

startReportWorker()
console.log("Worker de reportes activo")

scheduleReports()
setInterval(scheduleReports, 60 * 60 * 1000)
console.log("Scheduler activo cada hora")

app.get("/debug-env", (req: any, res: any) => {
  res.json({
    CF_API_TOKEN: process.env.CF_API_TOKEN ? 'presente:' + process.env.CF_API_TOKEN.substring(0,8) : 'VACÍO',
    CF_KV_NAMESPACE_ID: process.env.CF_KV_NAMESPACE_ID ? 'presente:' + process.env.CF_KV_NAMESPACE_ID.substring(0,8) : 'VACÍO',
    CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID ? 'presente:' + process.env.CLOUDFLARE_ACCOUNT_ID.substring(0,8) : 'VACÍO',
  })
})

app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "Reports PRO Backend", timestamp: new Date().toISOString() })
})

// Sentry error handler — debe ir después de todas las rutas
import * as Sentry from "@sentry/node"
Sentry.setupExpressErrorHandler(app)

app.listen(Number(PORT), "0.0.0.0", () => {
  console.log("Servidor corriendo en puerto " + PORT)
})

export default app
