import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import * as dotenv from 'dotenv'

dotenv.config()

const pool = new pg.Pool({
  connectionString: process.env.DIRECT_URL,
})

const adapter = new PrismaPg(pool)

export const prisma = new PrismaClient({ adapter })
