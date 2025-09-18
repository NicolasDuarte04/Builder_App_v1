import { env } from "@/lib/env";

export type DbMode = 'READONLY' | 'READWRITE';

export const dbEnv = {
  urlRW: env.server.catalogDbUrlRW,
  urlRO: env.server.catalogDbUrlRO,
  readWrite: env.server.catalogDbReadWrite === true,
};

export function getDatabaseUrl(): string | null {
  return dbEnv.urlRW || dbEnv.urlRO || null;
}

export function getDbMode(): DbMode {
  return dbEnv.readWrite ? 'READWRITE' : 'READONLY';
}

export function assertWriteAllowed(): void {
  if (getDbMode() !== 'READWRITE') {
    throw new Error('Write mode disabled. Set READWRITE=true to enable writes (not recommended in this task).');
  }
  if (!dbEnv.urlRW) {
    throw new Error('CATALOG_DB_URL (or DATABASE_URL) is required for write mode');
  }
}

// Optional: throw in dev if neither URL is present (to catch misconfig early)
if (process.env.NODE_ENV !== "production") {
  if (!dbEnv.urlRW && !dbEnv.urlRO) {
    throw new Error("[dbEnv] Missing CATALOG_DB_URL / CATALOG_DB_RO_URL (or DATABASE_URL alias)");
  }
}

