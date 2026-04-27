import path from 'path'
import { defineConfig } from 'prisma/config'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import * as dotenv from 'dotenv'

dotenv.config()

export default defineConfig({
  earlyAccess: true,
  schema: path.join(__dirname, 'prisma/schema.prisma'),
  datasource: {
    url: process.env.DIRECT_URL,
  },
  migrate: {
    async adapter() {
      const pool = new pg.Pool({ 
        connectionString: process.env.DIRECT_URL 
      })
      return new PrismaPg(pool)
    },
  },
})
