import * as readline from 'readline'
import bcrypt from 'bcryptjs'
import { prisma } from '../src/lib/prisma'

function ask(question: string, hidden = false): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close()
      resolve(answer.trim())
    })
  })
}

async function main() {
  const existing = await prisma.adminUser.findFirst({ where: { role: 'SUPER_ADMIN' } })
  if (existing) {
    console.log(`Ya existe un Super Admin: ${existing.email}. Cancelando.`)
    process.exit(1)
  }

  const email = await ask('Email del Super Admin: ')
  const fullName = await ask('Nombre completo: ')
  const password = await ask('Password (mínimo 8 caracteres): ')

  if (!email.includes('@')) {
    console.error('Email inválido.')
    process.exit(1)
  }
  if (password.length < 8) {
    console.error('El password debe tener al menos 8 caracteres.')
    process.exit(1)
  }

  const passwordHash = await bcrypt.hash(password, 12)

  const admin = await prisma.adminUser.create({
    data: {
      email: email.toLowerCase(),
      fullName,
      passwordHash,
      role: 'SUPER_ADMIN',
    },
  })

  console.log(`Super Admin creado: ${admin.email} (id: ${admin.id})`)
  process.exit(0)
}

main().catch(e => {
  console.error('Error:', e.message)
  process.exit(1)
})
