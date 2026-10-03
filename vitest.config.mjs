import { defineConfig } from 'vitest/config'
import { defineVitestProject } from '@nuxt/test-utils/config'

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'simulation',
          include: ['test/simulation/**/*.test.js'],
          environment: 'node',
        },
      },
      await defineVitestProject({
        test: {
          name: 'components',
          include: ['test/components/**/*.test.js'],
          environment: 'nuxt',
        },
      }),
    ],
  },
})
