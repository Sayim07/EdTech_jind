import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

// Cloudflare Workers cannot reuse a database connection between requests, so there a fresh client is built per use.
const onWorkers = typeof navigator !== 'undefined' && navigator.userAgent === 'Cloudflare-Workers';

// PRISMA_QUERY_LOG=1 prints every query with its duration, to find slow pages. Off by default.
const logQueries = process.env.PRISMA_QUERY_LOG === '1';

function create() {
  const client = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL, max: onWorkers ? 1 : 5 }),
    log: logQueries ? [{ emit: 'event', level: 'query' }, 'error'] : process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });
  if (logQueries) {
    (client as any).$on('query', (e: { duration: number; query: string }) => console.log(`[sql ${e.duration}ms] ${e.query.replace(/\s+/g, ' ').slice(0, 110)}`));
  }

  // Speed: by default Prisma loads each level of an `include` with its own query, one after another, and every
  // query costs a network round trip to the hosted database. "join" fetches the whole tree in ONE query.
  // Applied to every read that asks for related rows, so pages do not need to remember it.
  const READS = new Set(['findMany', 'findFirst', 'findFirstOrThrow', 'findUnique', 'findUniqueOrThrow']);
  return client.$extends({
    query: {
      $allModels: {
        async $allOperations({ operation, args, query }) {
          const a = args as any;
          if (READS.has(operation) && a && (a.include || a.select) && a.relationLoadStrategy === undefined) {
            a.relationLoadStrategy = 'join';
          }
          return query(args);
        },
      },
    },
  });
}

const globalForPrisma = global as unknown as { prisma: ReturnType<typeof create> };

type Db = ReturnType<typeof create>;

export const prisma: Db = onWorkers
  ? (new Proxy({} as Db, { get: (_t, prop) => (create() as any)[prop] }) as Db)
  : globalForPrisma.prisma || create();

if (!onWorkers && process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
