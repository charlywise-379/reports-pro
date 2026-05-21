import express from "express"
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
app.use("/api/stripe/webhook", express.raw({ type: "application/json" }))
app.use(express.json())

app.use("/api/onboarding", onboardingRouter)
app.use("/api/reports", reportsRouter)
app.use("/api/dashboard", dashboardRouter)
app.use("/api/stripe", stripeRouter)

startReportWorker()
console.log("Worker de reportes activo")

scheduleReports()
setInterval(scheduleReports, 6 * 60 * 60 * 1000)
console.log("Scheduler activo cada 6 horas")

app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "Reports PRO Backend", timestamp: new Date().toISOString() })
})

app.listen(Number(PORT), "0.0.0.0", () => {
  console.log("Servidor corriendo en puerto " + PORT)
})

export default app
