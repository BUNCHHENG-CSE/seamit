import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const prismaDir = path.join(rootDir, 'prisma');
const schemaTarget = path.join(prismaDir, 'schema.prisma');

const dbUrl = process.env.DATABASE_URL || '';
const isPostgres = dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://');

const sourceSchema = isPostgres
  ? path.join(prismaDir, 'schema.postgresql.prisma')
  : path.join(prismaDir, 'schema.sqlite.prisma');

if (fs.existsSync(sourceSchema)) {
  const content = fs.readFileSync(sourceSchema, 'utf8');
  fs.writeFileSync(schemaTarget, content, 'utf8');
  console.log(`[prisma-prepare] Selected ${isPostgres ? 'PostgreSQL (Neon)' : 'SQLite (Local)'} schema.`);
} else {
  console.warn(`[prisma-prepare] Source schema ${sourceSchema} not found, keeping existing schema.prisma`);
}
