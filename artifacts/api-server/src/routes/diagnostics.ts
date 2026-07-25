import { Router, type IRouter } from "express";
import { dataStore, getDatabaseProvider } from "../lib/data-store";

const router: IRouter = Router();

router.get("/diagnostics/store", async (_req, res) => {
  const databaseUrl = process.env["DATABASE_URL"] ?? "";
  try {
    const config = await dataStore.getOrCreateEventConfig();
    res.json({
      ok: true,
      provider: getDatabaseProvider(),
      databaseProtocol: databaseUrl ? new URL(databaseUrl).protocol : null,
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
      provider: getDatabaseProvider(),
      databaseProtocol: databaseUrl ? new URL(databaseUrl).protocol : null,
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
