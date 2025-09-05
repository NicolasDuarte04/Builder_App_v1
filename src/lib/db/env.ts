export type DbMode = 'READONLY' | 'READWRITE';

export function getDatabaseUrl(): string | null {
  return process.env.DATABASE_URL || process.env.RENDER_POSTGRES_URL || null;
}

export function getDbMode(): DbMode {
  const write = process.env.READWRITE === 'true' || process.env.READWRITE === '1';
  return write ? 'READWRITE' : 'READONLY';
}

export function assertWriteAllowed(): void {
  if (getDbMode() !== 'READWRITE') {
    throw new Error('Write mode disabled. Set READWRITE=1 to enable writes (not recommended in this task).');
  }
  if (!getDatabaseUrl()) {
    throw new Error('DATABASE_URL is required for write mode');
  }
}

