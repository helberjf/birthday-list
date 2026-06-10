import { Router, type IRouter } from "express";
import { CreatePhotoBody, UpdatePhotoBody } from "@workspace/api-zod";
import { dataStore } from "../lib/data-store";
import { requireAdmin } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/photos", async (_req, res): Promise<void> => {
  const photos = await dataStore.listPhotos();
  res.json(photos);
});

router.post("/admin/photos", requireAdmin, async (req, res): Promise<void> => {
  const parsed = CreatePhotoBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const photo = await dataStore.createPhoto({
    url: parsed.data.url,
    caption: parsed.data.caption ?? null,
    displayOrder: parsed.data.displayOrder,
  });

  res.status(201).json(photo);
});

router.patch("/admin/photos/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "ID invalido" });
    return;
  }

  const parsed = UpdatePhotoBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const photo = await dataStore.updatePhoto(id, {
    ...(parsed.data.caption !== undefined && { caption: parsed.data.caption }),
    ...(parsed.data.displayOrder !== undefined && { displayOrder: parsed.data.displayOrder }),
  });

  if (!photo) {
    res.status(404).json({ error: "Foto nao encontrada" });
    return;
  }

  res.json(photo);
});

router.delete("/admin/photos/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "ID invalido" });
    return;
  }

  const photo = await dataStore.deletePhoto(id);
  if (!photo) {
    res.status(404).json({ error: "Foto nao encontrada" });
    return;
  }

  res.sendStatus(204);
});

export default router;
