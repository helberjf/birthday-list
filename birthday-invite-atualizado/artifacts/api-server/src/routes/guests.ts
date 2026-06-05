import { Router, type IRouter } from "express";
import { db, guestsTable, guestAuditTable, eventConfigTable } from "@workspace/db";
import { sendConfirmationEmail } from "../lib/email";
import { eq, ilike, count, or, sum, sql, and, isNotNull } from "drizzle-orm";
import {
  ListGuestsQueryParams,
  CreateGuestBody,
  GetGuestParams,
  UpdateGuestBody,
  UpdateGuestParams,
  DeleteGuestParams,
} from "@workspace/api-zod";
import { requireAdmin } from "../middlewares/auth";

const router: IRouter = Router();

async function logAudit(
  guestId: number | null,
  guestName: string,
  action: string,
  previousData: object | null,
  newData: object | null,
) {
  await db.insert(guestAuditTable).values({
    guestId,
    guestName,
    action,
    previousData: previousData as any,
    newData: newData as any,
  });
}

router.get("/guests", async (req, res): Promise<void> => {
  const parsed = ListGuestsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { page = 1, limit = 6, status, search } = parsed.data;
  const offset = (page - 1) * limit;

  const conditions: ReturnType<typeof eq>[] = [];
  if (status) {
    conditions.push(eq(guestsTable.status, status));
  }
  if (search) {
    conditions.push(
      or(
        ilike(guestsTable.parentName, `%${search}%`),
        ilike(guestsTable.childName, `%${search}%`),
      ) as ReturnType<typeof eq>,
    );
  }

  const whereClause =
    conditions.length > 0
      ? conditions.reduce((acc, cond) => sql`${acc} AND ${cond}`)
      : undefined;

  const [totalResult, items] = await Promise.all([
    db.select({ count: count() }).from(guestsTable).where(whereClause),
    db
      .select()
      .from(guestsTable)
      .where(whereClause)
      .orderBy(sql`${guestsTable.createdAt} DESC`)
      .limit(limit)
      .offset(offset),
  ]);

  const totalItems = totalResult[0]?.count ?? 0;
  const totalPages = Math.ceil(totalItems / limit);

  res.json({ items, page, limit, totalItems, totalPages });
});

router.get("/stats", async (_req, res): Promise<void> => {
  const confirmedWhere = eq(guestsTable.status, "confirmed");

  const [[familiesRow], [adultsRow], [childrenRow]] = await Promise.all([
    db.select({ count: count() }).from(guestsTable).where(confirmedWhere),
    db.select({ total: sum(guestsTable.adultsCount) }).from(guestsTable).where(confirmedWhere),
    db.select({ total: sum(guestsTable.childrenCount) }).from(guestsTable).where(confirmedWhere),
  ]);

  const totalAdults = Number(adultsRow?.total ?? 0);
  const totalChildren = Number(childrenRow?.total ?? 0);

  res.json({
    totalFamilies: familiesRow?.count ?? 0,
    totalAdults,
    totalChildren,
    totalPeople: totalAdults + totalChildren,
  });
});

router.get("/admin/confirmed-guests", requireAdmin, async (_req, res): Promise<void> => {
  const guests = await db
    .select()
    .from(guestsTable)
    .where(and(eq(guestsTable.status, "confirmed"), isNotNull(guestsTable.phone)))
    .orderBy(sql`${guestsTable.parentName} ASC`);
  res.json(guests);
});

router.get("/admin/guest-audit", requireAdmin, async (req, res): Promise<void> => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const guestId = req.query.guestId ? Number(req.query.guestId) : undefined;
  const offset = (page - 1) * limit;

  const where = guestId ? eq(guestAuditTable.guestId, guestId) : undefined;

  const [totalResult, items] = await Promise.all([
    db.select({ count: count() }).from(guestAuditTable).where(where),
    db
      .select()
      .from(guestAuditTable)
      .where(where)
      .orderBy(sql`${guestAuditTable.createdAt} DESC`)
      .limit(limit)
      .offset(offset),
  ]);

  const totalItems = totalResult[0]?.count ?? 0;
  const totalPages = Math.ceil(totalItems / limit);

  res.json({ items, page, limit, totalItems, totalPages });
});

router.post("/guests", async (req, res): Promise<void> => {
  const parsed = CreateGuestBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { parentName, childName } = parsed.data;
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

  const duplicateCondition = childName
    ? sql`lower(${guestsTable.parentName}) = lower(${parentName}) AND lower(${guestsTable.childName}) = lower(${childName}) AND ${guestsTable.createdAt} > ${fiveMinutesAgo}`
    : sql`lower(${guestsTable.parentName}) = lower(${parentName}) AND ${guestsTable.childName} IS NULL AND ${guestsTable.createdAt} > ${fiveMinutesAgo}`;

  const existing = await db
    .select({ id: guestsTable.id })
    .from(guestsTable)
    .where(duplicateCondition)
    .limit(1);

  if (existing.length > 0) {
    res.status(409).json({
      error: "Presença já confirmada recentemente. Aguarde alguns minutos para tentar novamente.",
    });
    return;
  }

  const [guest] = await db
    .insert(guestsTable)
    .values({
      parentName,
      childName: childName ?? null,
      phone: parsed.data.phone ?? null,
      email: parsed.data.email ?? null,
      adultsCount: parsed.data.adultsCount,
      childrenCount: parsed.data.childrenCount,
      status: parsed.data.status,
      notes: parsed.data.notes ?? null,
    })
    .returning();

  await logAudit(guest!.id, parentName, "created", null, guest!);

  if (parsed.data.email) {
    const [config] = await db.select().from(eventConfigTable).limit(1);
    if (config) {
      sendConfirmationEmail({
        to: parsed.data.email,
        parentName,
        childName: childName ?? null,
        childNameEvent: config.childName,
        dateLabel: config.dateLabel,
        timeLabel: config.timeLabel,
        location: config.location,
        neighborhood: config.neighborhood,
        theme: config.theme,
      }).catch(() => {});
    }
  }

  res.status(201).json(guest);
});

router.get("/guests/:id", async (req, res): Promise<void> => {
  const params = GetGuestParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [guest] = await db
    .select()
    .from(guestsTable)
    .where(eq(guestsTable.id, params.data.id));

  if (!guest) {
    res.status(404).json({ error: "Convidado não encontrado" });
    return;
  }

  res.json(guest);
});

router.patch("/guests/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = UpdateGuestParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateGuestBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [previous] = await db
    .select()
    .from(guestsTable)
    .where(eq(guestsTable.id, params.data.id));

  if (!previous) {
    res.status(404).json({ error: "Convidado não encontrado" });
    return;
  }

  const updateData: Partial<typeof guestsTable.$inferInsert> = {};
  if (parsed.data.parentName !== undefined) updateData.parentName = parsed.data.parentName;
  if (parsed.data.childName !== undefined) updateData.childName = parsed.data.childName;
  if (parsed.data.phone !== undefined) updateData.phone = parsed.data.phone;
  if (parsed.data.adultsCount !== undefined) updateData.adultsCount = parsed.data.adultsCount;
  if (parsed.data.childrenCount !== undefined) updateData.childrenCount = parsed.data.childrenCount;
  if (parsed.data.status !== undefined) updateData.status = parsed.data.status;
  if (parsed.data.notes !== undefined) updateData.notes = parsed.data.notes;
  if ((parsed.data as any).adminNotes !== undefined) updateData.adminNotes = (parsed.data as any).adminNotes;

  const [guest] = await db
    .update(guestsTable)
    .set(updateData)
    .where(eq(guestsTable.id, params.data.id))
    .returning();

  const action = parsed.data.status && parsed.data.status !== previous.status
    ? `status_changed:${previous.status}→${parsed.data.status}`
    : "updated";

  await logAudit(guest!.id, guest!.parentName, action, previous, guest!);

  res.json(guest);
});

router.delete(
  "/guests/:id",
  requireAdmin,
  async (req, res): Promise<void> => {
    const params = DeleteGuestParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const [guest] = await db
      .delete(guestsTable)
      .where(eq(guestsTable.id, params.data.id))
      .returning();

    if (!guest) {
      res.status(404).json({ error: "Convidado não encontrado" });
      return;
    }

    await logAudit(null, guest.parentName, "deleted", guest, null);

    res.sendStatus(204);
  },
);

export default router;
