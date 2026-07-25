import { Router, type IRouter } from "express";
import { dataStore, getDatabaseProvider } from "../lib/data-store";

const router: IRouter = Router();

function getDatabaseProtocol(databaseUrl: string) {
  if (!databaseUrl) return null;
  try {
    return new URL(databaseUrl).protocol;
  } catch {
    return "invalid";
  }
}

function getProvider() {
  try {
    return getDatabaseProvider();
  } catch (error) {
    return error instanceof Error ? `error:${error.message}` : "error";
  }
}

router.get("/diagnostics/store", async (_req, res) => {
  const databaseUrl = process.env["DATABASE_URL"] ?? "";
  try {
    const config = await dataStore.getOrCreateEventConfig();
    res.json({
      ok: true,
      provider: getProvider(),
      databaseProtocol: getDatabaseProtocol(databaseUrl),
      hasAuthToken: Boolean(
        process.env["DATABASE_AUTH_TOKEN"] ||
          process.env["TURSO_AUTH_TOKEN"] ||
          process.env["LIBSQL_AUTH_TOKEN"] ||
          process.env["DATABASE_TOKEN"],
      ),
      childName: config.childName,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      provider: getProvider(),
      databaseProtocol: getDatabaseProtocol(databaseUrl),
      hasAuthToken: Boolean(
        process.env["DATABASE_AUTH_TOKEN"] ||
          process.env["TURSO_AUTH_TOKEN"] ||
          process.env["LIBSQL_AUTH_TOKEN"] ||
          process.env["DATABASE_TOKEN"],
      ),
      errorName: error instanceof Error ? error.name : typeof error,
      errorMessage: error instanceof Error ? error.message : String(error),
    });
  }
});

export default router;
