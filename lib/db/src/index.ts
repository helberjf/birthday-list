import { drizzle } from "drizzle-orm/node-postgres";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

export class DatabaseNotConfiguredError extends Error {
  constructor() {
    super("DATABASE_URL must be set. Did you forget to provision a database?");
    this.name = "DatabaseNotConfiguredError";
  }
}

export const isDatabaseConfigured = Boolean(process.env.DATABASE_URL);

export const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : null;

export const db: NodePgDatabase<typeof schema> = pool
  ? drizzle(pool, { schema })
  : (new Proxy(
      {},
      {
        get() {
          throw new DatabaseNotConfiguredError();
        },
      },
    ) as NodePgDatabase<typeof schema>);

export * from "./schema";
