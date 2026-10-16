import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

const root = path.join(__dirname, '../../prisma')
const schema = fs.readFileSync(path.join(root, 'schema.prisma'), 'utf-8')
const migration = fs.readFileSync(
  path.join(root, 'migrations/20261016000000_project_limits_and_free_report_per_project/migration.sql'),
  'utf-8',
)

const modelBlock = (name: string) => schema.match(new RegExp(`model ${name} \\{[\\s\\S]*?\\n\\}`))?.[0] ?? ''

describe('esquema de límites de proyectos', () => {
  it('User tiene maxProjects entero con valor por defecto 1', () => {
    expect(modelBlock('User')).toMatch(/maxProjects\s+Int\s+@default\(1\)/)
  })
  it('Project tiene freeReportUsedAt opcional', () => {
    expect(modelBlock('Project')).toMatch(/freeReportUsedAt\s+DateTime\?/)
  })
})

describe('migración', () => {
  it('agrega las dos columnas', () => {
    expect(migration).toContain('ALTER TABLE "users" ADD COLUMN "maxProjects" INTEGER NOT NULL DEFAULT 1')
    expect(migration).toContain('ALTER TABLE "projects" ADD COLUMN "freeReportUsedAt" TIMESTAMP(3)')
  })
  it('copia el reporte gratis ya usado del usuario a sus proyectos', () => {
    expect(migration).toMatch(/UPDATE "projects"[\s\S]*SET "freeReportUsedAt" = u\."freeReportUsedAt"[\s\S]*FROM "users" u[\s\S]*u\."freeReportUsedAt" IS NOT NULL/)
  })
  it('no contiene instrucciones destructivas', () => {
    expect(migration).not.toMatch(/DROP|TRUNCATE|DELETE/i)
  })
})
