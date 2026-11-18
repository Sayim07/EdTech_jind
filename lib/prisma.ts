import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

// PRISMA_QUERY_LOG=1 prints every query with its duration, to find slow pages. Off by default.
const logQueries = process.env.PRISMA_QUERY_LOG === '1';

function create() {
  const client = new PrismaClient({
    log: logQueries ? [{ emit: 'event', level: 'query' }, 'error'] : process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });
  if (logQueries) {
    (client as any).$on('query', (e: { duration: number; query: string }) => console.log(`[sql ${e.duration}ms] ${e.query.replace(/\s+/g, ' ').slice(0, 110)}`));
  }
  return client;
}

export const prisma = globalForPrisma.prisma || create();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
