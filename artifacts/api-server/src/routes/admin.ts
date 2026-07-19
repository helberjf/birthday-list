import { Router, type IRouter, type RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { AdminLoginBody } from "@workspace/api-zod";
import { dataStore } from "../lib/data-store";
import { requireAdmin } from "../middlewares/auth";

const router: IRouter = Router();

const loginAttempts = new Map<string, { count: number; resetAt: number }>();

function createLoginLimiter(windowMs: number, max: number): RequestHandler {
  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip || req.socket.remoteAddress || "unknown";
    const current = loginAttempts.get(key);
    const bucket = current && current.resetAt > now ? current : { count: 0, resetAt: now + windowMs };

    bucket.count += 1;
    loginAttempts.set(key, bucket);

    if (bucket.count > max) {
      res.status(429).json({ error: "Muitas tentativas. Tente novamente em 15 minutos." });
      return;
    }

    for (const [attemptKey, attempt] of loginAttempts) {
      if (attempt.resetAt <= now) loginAttempts.delete(attemptKey);
    }

    next();
  };
}

const loginLimiter = createLoginLimiter(15 * 60 * 1000, 10);

router.post("/admin/login", loginLimiter, async (req, res): Promise<void> => {
  const parsed = AdminLoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Dados inválidos" });
    return;
  }

  const adminPassword = process.env["ADMIN_PASSWORD"];
  const jwtSecret = process.env["JWT_SECRET"]!;
  const password = parsed.data.password.trim();

  if (!adminPassword || password !== adminPassword.trim()) {
    res.status(401).json({ error: "Senha incorreta" });
    return;
  }

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
