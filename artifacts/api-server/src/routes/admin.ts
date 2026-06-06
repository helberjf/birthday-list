import { Router, type IRouter } from "express";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import { db, guestsTable } from "@workspace/db";
import { eq, count, sum } from "drizzle-orm";
import { AdminLoginBody } from "@workspace/api-zod";
import { requireAdmin } from "../middlewares/auth";

const router: IRouter = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Muitas tentativas. Tente novamente em 15 minutos." },
});

router.post("/admin/login", loginLimiter, async (req, res): Promise<void> => {
  const parsed = AdminLoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Dados inválidos" });
    return;
  }

  const adminPassword = process.env["ADMIN_PASSWORD"];
  const jwtSecret = process.env["JWT_SECRET"]!;

  if (!adminPassword || parsed.data.password !== adminPassword) {
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
  const [totalRow] = await db.select({ count: count() }).from(guestsTable);

  const [confirmedRow] = await db
    .select({ count: count() })
    .from(guestsTable)
    .where(eq(guestsTable.status, "confirmed"));

  const [maybeRow] = await db
    .select({ count: count() })
    .from(guestsTable)
    .where(eq(guestsTable.status, "maybe"));

  const [declinedRow] = await db
    .select({ count: count() })
    .from(guestsTable)
    .where(eq(guestsTable.status, "declined"));

  const [adultsRow] = await db
    .select({ total: sum(guestsTable.adultsCount) })
    .from(guestsTable);

  const [childrenRow] = await db
    .select({ total: sum(guestsTable.childrenCount) })
    .from(guestsTable);

  res.json({
    total: totalRow?.count ?? 0,
    confirmed: confirmedRow?.count ?? 0,
    maybe: maybeRow?.count ?? 0,
    declined: declinedRow?.count ?? 0,
    totalAdults: Number(adultsRow?.total ?? 0),
    totalChildren: Number(childrenRow?.total ?? 0),
  });
});

export default router;
