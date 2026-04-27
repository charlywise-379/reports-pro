import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

// Carga las variables de entorno
dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// Middlewares básicos
app.use(cors())
app.use(express.json())

// Ruta de prueba — para verificar que el servidor funciona
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Reports PRO Backend funcionando correctamente',
    timestamp: new Date().toISOString()
  })
})

// Inicia el servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`)
})

export default app
