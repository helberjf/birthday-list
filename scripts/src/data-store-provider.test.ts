import assert from "node:assert/strict";
import { getDatabaseProvider } from "../../artifacts/api-server/src/lib/data-store";

const originalDatabaseProvider = process.env.DATABASE_PROVIDER;
const originalDbProvider = process.env.DB_PROVIDER;
const originalDatabaseUrl = process.env.DATABASE_URL;

try {
  delete process.env.DATABASE_PROVIDER;
  delete process.env.DB_PROVIDER;
  process.env.DATABASE_URL = "";
  assert.equal(getDatabaseProvider(), "memory");

  process.env.DATABASE_URL = "libsql://example-db.turso.io";
  assert.equal(getDatabaseProvider(), "turso");

  process.env.DATABASE_URL = "postgresql://localhost:5432/birthday";
  assert.equal(getDatabaseProvider(), "postgres");

  process.env.DB_PROVIDER = "firebase";
  assert.equal(getDatabaseProvider(), "firebase");

  process.env.DATABASE_PROVIDER = "postgres";
  assert.equal(getDatabaseProvider(), "postgres");

  process.env.DATABASE_PROVIDER = "libsql";
  assert.equal(getDatabaseProvider(), "turso");

  process.env.DATABASE_PROVIDER = "unknown";
  assert.throws(() => getDatabaseProvider(), /DATABASE_PROVIDER/);
} finally {
  if (originalDatabaseProvider === undefined) {
    delete process.env.DATABASE_PROVIDER;
  } else {
    process.env.DATABASE_PROVIDER = originalDatabaseProvider;
  }

  if (originalDbProvider === undefined) {
    delete process.env.DB_PROVIDER;
  } else {
    process.env.DB_PROVIDER = originalDbProvider;
  }

  if (originalDatabaseUrl === undefined) {
    delete process.env.DATABASE_URL;
  } else {
    process.env.DATABASE_URL = originalDatabaseUrl;
  }
}

console.log("Data store provider checks passed.");
