import "./instrument"
import express from "express"
import rateLimit from "express-rate-limit"
import cors from "cors"
import cookieParser from "cookie-parser"
import dotenv from "dotenv"
import onboardingRouter from "./routes/onboarding"
import reportsRouter from "./routes/reports"
import dashboardRouter from "./routes/dashboard"
import stripeRouter from "./routes/stripe"
import authRouter from "./routes/auth"
import operationsAuthRouter from "./routes/operations/auth"
import operationsDashboardRouter from "./routes/operations/dashboard"
import operationsUsersRouter from "./routes/operations/users"
import operationsReportsRouter from "./routes/operations/reports"
import operationsSubscriptionsRouter from "./routes/operations/subscriptions"
import operationsAdminsRouter from "./routes/operations/admins"
import { startReportWorker } from "./workers/reportWorker"
import { scheduleReports } from "./jobs/scheduleReports"

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',')
  .map(url => url.trim())
  .flatMap(url => {
    if (!url.includes('://www.')) {
      return [url, url.replace('://', '://www.')]
    }
    return [url, url.replace('://www.', '://')]
  })

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
}))
app.set("trust proxy", 1)
app.use(cookieParser())

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

// Rate limiting para autocompletado IA del wizard — 20 por hora por IP (respaldo del límite de sesión del frontend)
const autocompleteLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: { error: 'Límite de autocompletados alcanzado. Intenta en un rato.' },
  standardHeaders: true,
  legacyHeaders: false,
})
app.use('/api/onboarding/autocomplete', autocompleteLimiter)

// Rate limiting para registro — 10 por hora por IP (previene abuso de creación de cuentas)
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { error: 'Demasiados intentos de registro. Intenta en un rato.' },
  standardHeaders: true,
  legacyHeaders: false,
})
app.use('/api/auth/register', registerLimiter)

// Rate limiting estricto para login de administradores — 5 por 15 min por IP
const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Demasiados intentos de inicio de sesión. Intenta en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
})
app.use('/api/operations/auth/login', adminLoginLimiter)
app.use("/api/stripe/webhook", express.raw({ type: "application/json" }))
app.use(express.json())

app.use("/api/onboarding", onboardingRouter)
app.use("/api/reports", reportsRouter)
app.use("/api/dashboard", dashboardRouter)
app.use("/api/stripe", stripeRouter)
app.use("/api/auth", authRouter)
app.use("/api/operations/auth", operationsAuthRouter)
app.use("/api/operations/dashboard", operationsDashboardRouter)
app.use("/api/operations/users", operationsUsersRouter)
app.use("/api/operations/reports", operationsReportsRouter)
app.use("/api/operations/subscriptions", operationsSubscriptionsRouter)
app.use("/api/operations/admins", operationsAdminsRouter)

startReportWorker()
console.log("Worker de reportes activo")

scheduleReports()
setInterval(scheduleReports, 60 * 60 * 1000)
console.log("Scheduler activo cada hora")

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
