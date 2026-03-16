import { defineConfig } from 'prisma/config';

// @ts-ignore - earlyAccess is a valid Prisma 7 config option
export default defineConfig({
  earlyAccess: true,
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL ?? 'postgresql://postgres:password@localhost:5432/claimguard',
  },
});
