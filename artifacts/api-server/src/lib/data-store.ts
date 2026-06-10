import { FirebaseStore } from "./firebase-store";
import { PostgresStore } from "./postgres-store";

export type DatabaseProvider = "postgres" | "firebase";

export function getDatabaseProvider(): DatabaseProvider {
  const raw = (process.env["DATABASE_PROVIDER"] ?? process.env["DB_PROVIDER"] ?? "postgres")
    .trim()
    .toLowerCase();

  if (raw === "postgres" || raw === "firebase") return raw;

  throw new Error(`DATABASE_PROVIDER must be "postgres" or "firebase", received "${raw}".`);
}

export const dataStore =
  getDatabaseProvider() === "firebase" ? new FirebaseStore() : new PostgresStore();
