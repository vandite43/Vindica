import { defineConfig } from 'prisma/config';

// @ts-ignore - earlyAccess is a valid Prisma 7 config option
export default defineConfig({
  earlyAccess: true,
  schema: 'prisma/schema.prisma',
  migrations: {
    seed: 'ts-node --compiler-options {"module":"CommonJS"} prisma/seed.ts',
  },
  datasource: {
    url: process.env.DATABASE_URL ?? 'postgresql://postgres:password@127.0.0.1:5432/claimguard',
  },
});
