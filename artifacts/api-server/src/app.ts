import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "path";
import { DatabaseNotConfiguredError } from "@workspace/db";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

if (!process.env.VERCEL) {
  app.use(
    pinoHttp({
      logger,
      serializers: {
        req(req) {
          return {
            id: req.id,
            method: req.method,
            url: req.url?.split("?")[0],
          };
        },
        res(res) {
          return {
            statusCode: res.statusCode,
          };
        },
      },
    }),
  );
}
const allowedOrigins = process.env["ALLOWED_ORIGINS"]
  ?.split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors(
    allowedOrigins?.length
      ? { origin: allowedOrigins, credentials: true }
      : undefined,
  ),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/uploads", express.static(path.join(process.cwd(), "uploads")));
app.use("/api", router);

app.use((err: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof DatabaseNotConfiguredError) {
    res.status(503).json({
      error:
        "DATABASE_URL nao esta configurada. Configure um Postgres na Vercel para habilitar API, RSVP e admin.",
    });
    return;
  }

  next(err);
});

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error({ err }, "Unhandled API error");
  const body: { error: string; message?: string } = {
    error: "Erro interno da API",
  };

  if (process.env.NODE_ENV !== "production") {
    body.message = err instanceof Error ? err.message : String(err);
  }

  res.status(500).json(body);
});

export default app;
