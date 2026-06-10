import { FirebaseStore } from "./firebase-store";
import { MemoryStore } from "./memory-store";
import { PostgresStore } from "./postgres-store";

export type DatabaseProvider = "postgres" | "firebase" | "memory";

export function getDatabaseProvider(): DatabaseProvider {
  const raw = (process.env["DATABASE_PROVIDER"] ?? process.env["DB_PROVIDER"] ?? "")
    .trim()
    .toLowerCase();

  if (raw === "firebase") return "firebase";
  if (raw === "postgres") return "postgres";
  if (raw === "memory") return "memory";

  // No provider set: fall back to memory so the admin panel works without a DB
  if (!raw) return "memory";

  throw new Error(`DATABASE_PROVIDER must be "postgres", "firebase", or "memory", received "${raw}".`);
}

function createStore() {
  const provider = getDatabaseProvider();
  if (provider === "firebase") return new FirebaseStore();
  if (provider === "postgres") return new PostgresStore();
  return new MemoryStore();
}

export const dataStore = createStore();
