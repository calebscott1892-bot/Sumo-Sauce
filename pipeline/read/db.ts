import path from 'node:path';
import type { PrismaClient } from '../../server/node_modules/@prisma/client/index.js';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const PRISMA_CLIENT_PATH = path.join(ROOT, 'server', 'node_modules', '@prisma', 'client', 'index.js');

type PrismaClientModule = {
  PrismaClient: new () => PrismaClient;
};

let prismaSingleton: PrismaClient | null = null;

export async function getPrismaClient(): Promise<PrismaClient> {
  if (prismaSingleton) return prismaSingleton;
  const mod = (await import(PRISMA_CLIENT_PATH)) as PrismaClientModule;
  prismaSingleton = new mod.PrismaClient();
  return prismaSingleton;
}

export async function closeReadPrisma(): Promise<void> {
  if (!prismaSingleton) return;
  await prismaSingleton.$disconnect();
  prismaSingleton = null;
}
