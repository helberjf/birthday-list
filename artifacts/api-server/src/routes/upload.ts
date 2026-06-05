import { Router, type Request, type IRouter } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";
import { requireAdmin } from "../middlewares/auth";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)) cb(null, true);
    else cb(new Error("Apenas imagens sao permitidas."));
  },
});

const router: IRouter = Router();

function writeLocalUpload(req: Request, file: Express.Multer.File): string {
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

  const ext = path.extname(file.originalname).toLowerCase();
  const safeName = `invite-${Date.now()}-${randomUUID()}${ext}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, safeName), file.buffer);
  const host = `${req.protocol}://${req.get("host")}`;
  return `${host}/api/uploads/${safeName}`;
}

router.post(
  "/admin/upload-image",
  requireAdmin,
  upload.single("image"),
  async (req, res): Promise<void> => {
    if (!req.file) {
      res.status(400).json({ error: "Nenhum arquivo enviado." });
      return;
    }

    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const { put } = await import("@vercel/blob");
      const ext = path.extname(req.file.originalname).toLowerCase();
      const blob = await put(
        `birthday-list/invite-${randomUUID()}${ext}`,
        req.file.buffer,
        {
          access: "public",
          contentType: req.file.mimetype,
        },
      );
      res.json({ url: blob.url });
      return;
    }

    if (process.env.VERCEL) {
      res.status(501).json({
        error:
          "Configure BLOB_READ_WRITE_TOKEN na Vercel ou cole uma URL externa para imagens.",
      });
      return;
    }

    res.json({ url: writeLocalUpload(req, req.file) });
  },
);

export default router;
