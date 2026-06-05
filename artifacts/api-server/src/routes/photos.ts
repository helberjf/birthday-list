import { Router, type IRouter } from "express";
import { db, photosTable } from "@workspace/db";
import { eq, asc, count } from "drizzle-orm";
import { requireAdmin } from "../middlewares/auth";
import { CreatePhotoBody, UpdatePhotoBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/photos", async (_req, res): Promise<void> => {
  const photos = await db
    .select()
    .from(photosTable)
    .orderBy(asc(photosTable.displayOrder), asc(photosTable.createdAt));
  res.json(photos);
});

router.post("/admin/photos", requireAdmin, async (req, res): Promise<void> => {
  const parsed = CreatePhotoBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [countResult] = await db.select({ count: count() }).from(photosTable);
  const nextOrder = Number(countResult?.count ?? 0);

  const [photo] = await db
    .insert(photosTable)
    .values({
      url: parsed.data.url,
      caption: parsed.data.caption ?? null,
      displayOrder: parsed.data.displayOrder ?? Number(nextOrder),
    })
    .returning();

  res.status(201).json(photo);
});

router.patch("/admin/photos/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  const parsed = UpdatePhotoBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Partial<typeof photosTable.$inferInsert> = {};
  if (parsed.data.caption !== undefined) updateData.caption = parsed.data.caption;
  if (parsed.data.displayOrder !== undefined) updateData.displayOrder = parsed.data.displayOrder;

  const [photo] = await db
    .update(photosTable)
    .set(updateData)
    .where(eq(photosTable.id, id))
    .returning();

  if (!photo) {
    res.status(404).json({ error: "Foto não encontrada" });
    return;
  }

  res.json(photo);
});

router.delete("/admin/photos/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  const [photo] = await db
    .delete(photosTable)
    .where(eq(photosTable.id, id))
    .returning();

  if (!photo) {
    res.status(404).json({ error: "Foto não encontrada" });
    return;
  }

  res.sendStatus(204);
});

export default router;
