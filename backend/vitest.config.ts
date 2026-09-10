import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    // Aún no hay suites reales (Task 1 solo instala el harness); las tareas
    // siguientes añaden los primeros tests. Sin esto, `vitest run` sale con
    // código 1 al no encontrar archivos y rompe el pipeline.
    passWithNoTests: true,
  },
})
