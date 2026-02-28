import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const PRISMA_CLIENT_PATH = path.join(ROOT, 'server', 'node_modules', '@prisma', 'client', 'index.js');

let prismaSingleton = null;

export async function getPrismaClient() {
  if (prismaSingleton) return prismaSingleton;
  const mod = await import(PRISMA_CLIENT_PATH);
  prismaSingleton = new mod.PrismaClient();
  return prismaSingleton;
}

export async function closeReadPrisma() {
  if (!prismaSingleton) return;
  await prismaSingleton.$disconnect();
  prismaSingleton = null;
}
