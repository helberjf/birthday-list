import { Router, type IRouter } from "express";
import jwt from "jsonwebtoken";
import { AdminLoginBody } from "@workspace/api-zod";
import { dataStore } from "../lib/data-store";
import { requireAdmin } from "../middlewares/auth";

const router: IRouter = Router();

const loginAttempts = new Map<string, { count: number; resetAt: number }>();

function getLoginKey(req: import("express").Request): string {
  return req.ip || req.socket.remoteAddress || "unknown";
}

function pruneExpiredAttempts(now = Date.now()): void {
  for (const [attemptKey, attempt] of loginAttempts) {
    if (attempt.resetAt <= now) loginAttempts.delete(attemptKey);
  }
}

function registerLoginFailure(key: string, windowMs: number): number {
  const now = Date.now();
  const current = loginAttempts.get(key);
  const bucket = current && current.resetAt > now ? current : { count: 0, resetAt: now + windowMs };
  bucket.count += 1;
  loginAttempts.set(key, bucket);
  return bucket.count;
}

function clearLoginFailures(key: string): void {
  loginAttempts.delete(key);
}

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_FAILED_ATTEMPTS = 10;

router.post("/admin/login", async (req, res): Promise<void> => {
  const parsed = AdminLoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Dados inválidos" });
    return;
  }

  const adminPassword = process.env["ADMIN_PASSWORD"];
  const jwtSecret = process.env["JWT_SECRET"]!;
  const password = parsed.data.password.trim();
  const loginKey = getLoginKey(req);
  pruneExpiredAttempts();

  if (!adminPassword || password !== adminPassword.trim()) {
    const failures = registerLoginFailure(loginKey, LOGIN_WINDOW_MS);
    if (failures >= LOGIN_MAX_FAILED_ATTEMPTS) {
      res.status(429).json({ error: "Muitas tentativas. Tente novamente em 15 minutos." });
      return;
    }

    res.status(401).json({ error: "Senha incorreta" });
    return;
  }

  clearLoginFailures(loginKey);

  const token = jwt.sign({ role: "admin" }, jwtSecret, { expiresIn: "24h" });

  res.json({ token, message: "Login realizado com sucesso" });
});

router.post("/admin/logout", async (_req, res): Promise<void> => {
  res.json({ message: "Logout realizado com sucesso" });
});

router.get("/admin/stats", requireAdmin, async (_req, res): Promise<void> => {
  res.json(await dataStore.getAdminStats());
});

export default router;
