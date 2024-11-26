import { PrismaClient } from '@prisma/client';

declare global {
  // allow global `var` declarations
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

const prisma = () => {
  if (global.prisma) {
    return global.prisma;
  }
  const prisma = new PrismaClient({
    log: ['query'],
  });

  if (process.env.NODE_ENV !== 'production') {
    // https://www.prisma.io/docs/orm/more/help-and-troubleshooting/help-articles/nextjs-prisma-client-dev-practices#solution
    global.prisma = prisma;
  }
  return prisma;
};

export default prisma();
