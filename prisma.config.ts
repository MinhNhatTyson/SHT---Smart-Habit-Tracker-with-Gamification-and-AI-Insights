// prisma.config.ts
// Prisma 7+ requires database connection to be defined here

import path from 'path'
import { defineConfig } from 'prisma/config'

export default defineConfig({
  earlyAccess: true,
  schema: path.join('prisma', 'schema.prisma'),
  migrate: {
    async adapter() {
      const { PrismaLibSQL } = await import('@prisma/adapter-libsql')
      const { createClient } = await import('@libsql/client')

      const client = createClient({
        url: 'file:./prisma/habitquest.db',
      })

      return new PrismaLibSQL(client)
    },
  },
})
