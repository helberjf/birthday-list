import assert from "node:assert/strict";
import { getDatabaseProvider } from "../../artifacts/api-server/src/lib/data-store";

const originalDatabaseProvider = process.env.DATABASE_PROVIDER;
const originalDbProvider = process.env.DB_PROVIDER;

try {
  delete process.env.DATABASE_PROVIDER;
  delete process.env.DB_PROVIDER;
  assert.equal(getDatabaseProvider(), "postgres");

  process.env.DB_PROVIDER = "firebase";
  assert.equal(getDatabaseProvider(), "firebase");

  process.env.DATABASE_PROVIDER = "postgres";
  assert.equal(getDatabaseProvider(), "postgres");

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
}

console.log("Data store provider checks passed.");
