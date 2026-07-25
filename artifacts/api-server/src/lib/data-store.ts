import { FirebaseStore } from "./firebase-store";
import { MemoryStore } from "./memory-store";
import { PostgresStore } from "./postgres-store";
import { TursoStore } from "./turso-store";

export type DatabaseProvider = "postgres" | "firebase" | "memory" | "turso";

export function getDatabaseProvider(): DatabaseProvider {
  const raw = (process.env["DATABASE_PROVIDER"] ?? process.env["DB_PROVIDER"] ?? "")
    .trim()
    .toLowerCase();

  if (!raw) {
    const databaseUrl = (process.env["DATABASE_URL"] ?? "").trim().toLowerCase();
    if (databaseUrl.startsWith("libsql://")) return "turso";
    if (databaseUrl.startsWith("postgres://") || databaseUrl.startsWith("postgresql://")) return "postgres";
    if (process.env["VERCEL"]) {
      throw new Error(
        "DATABASE_PROVIDER or DATABASE_URL must be configured in Vercel; MemoryStore is only for local development.",
      );
    }
    return "memory";
  }

  if (raw === "firebase") return "firebase";
  if (raw === "postgres") return "postgres";
  if (raw === "turso" || raw === "libsql") return "turso";
  if (raw === "memory") {
    if (process.env["VERCEL"]) {
      throw new Error(
        'DATABASE_PROVIDER="memory" is not allowed in Vercel; configure DATABASE_URL or a persistent provider.',
      );
    }
    return "memory";
  }

  throw new Error(
    `DATABASE_PROVIDER must be "postgres", "firebase", "turso" (or "libsql"), or "memory", received "${raw}".`,
  );
}

function createStore() {
  const provider = getDatabaseProvider();
  if (provider === "firebase") return new FirebaseStore();
  if (provider === "postgres") return new PostgresStore();
  if (provider === "turso") return new TursoStore();
  return new MemoryStore();
}

export const dataStore = createStore();
