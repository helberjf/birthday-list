import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Não autorizado" });
    return;
  }

  const token = authHeader.slice(7);
  const jwtSecret = process.env["JWT_SECRET"]!;

  try {
    const payload = jwt.verify(token, jwtSecret) as { role: string };
    if (payload.role !== "admin") {
      res.status(403).json({ error: "Acesso negado" });
      return;
    }
    next();
  } catch {
    res.status(401).json({ error: "Token inválido ou expirado" });
    return;
  }
}
