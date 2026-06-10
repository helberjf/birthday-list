import { Router, type IRouter } from "express";
import jwt from "jsonwebtoken";
import {
  CreateGuestBody,
  DeleteGuestParams,
  GetGuestParams,
  ListGuestsQueryParams,
  UpdateGuestBody,
  UpdateGuestParams,
} from "@workspace/api-zod";
import { dataStore } from "../lib/data-store";
import type { Guest, GuestStatus } from "../lib/firebase-store";
import { sendConfirmationEmail } from "../lib/email";
import { requireAdmin } from "../middlewares/auth";

function isAdminRequest(req: import("express").Request): boolean {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return false;
  const secret = process.env["JWT_SECRET"];
  if (!secret) return false;
  try {
    const payload = jwt.verify(header.slice(7), secret) as { role: string };
    return payload.role === "admin";
  } catch {
    return false;
  }
}

function toPublicGuest(g: Guest) {
  return {
    id: g.id,
    parentName: g.parentName,
    childName: g.childName,
    adultsCount: g.adultsCount,
    childrenCount: g.childrenCount,
    status: g.status,
  };
}

const router: IRouter = Router();

async function logAudit(
  guestId: number | null,
  guestName: string,
  action: string,
  previousData: object | null,
  newData: object | null,
) {
  await dataStore.createGuestAudit(
    guestId,
    guestName,
    action,
    previousData as Record<string, unknown> | null,
    newData as Record<string, unknown> | null,
  );
}

router.get("/guests", async (req, res): Promise<void> => {
  const parsed = ListGuestsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { page = 1, limit = 6, status, search } = parsed.data;
  const guests = await dataStore.listGuests({ page, limit, status: status as GuestStatus | undefined, search });

  res.json({
    ...guests,
    items: isAdminRequest(req) ? guests.items : guests.items.map(toPublicGuest),
  });
});

router.get("/stats", async (_req, res): Promise<void> => {
  res.json(await dataStore.getPublicStats());
});

router.get("/admin/confirmed-guests", requireAdmin, async (_req, res): Promise<void> => {
  res.json(await dataStore.listConfirmedGuestsWithPhone());
});

router.get("/admin/guest-audit", requireAdmin, async (req, res): Promise<void> => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const guestId = req.query.guestId ? Number(req.query.guestId) : undefined;

  res.json(await dataStore.listGuestAudit({ page, limit, guestId }));
});

router.post("/guests", async (req, res): Promise<void> => {
  const parsed = CreateGuestBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { parentName, childName } = parsed.data;
  const result = await dataStore.createGuest({
    parentName,
    childName: childName ?? null,
    phone: parsed.data.phone ?? null,
    email: parsed.data.email ?? null,
    adultsCount: parsed.data.adultsCount,
    childrenCount: parsed.data.childrenCount,
    status: parsed.data.status,
    notes: parsed.data.notes ?? null,
  });

  if (result.duplicate || !result.guest) {
    res.status(409).json({
      error: "Presenca ja confirmada recentemente. Aguarde alguns minutos para tentar novamente.",
    });
    return;
  }

  await logAudit(result.guest.id, parentName, "created", null, result.guest);

  if (parsed.data.email) {
    const config = await dataStore.getOrCreateEventConfig();
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

  res.status(201).json(result.guest);
});

router.get("/guests/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = GetGuestParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const guest = await dataStore.getGuest(params.data.id);
  if (!guest) {
    res.status(404).json({ error: "Convidado nao encontrado" });
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

  const updateData: Partial<Guest> = {};
  if (parsed.data.parentName !== undefined) updateData.parentName = parsed.data.parentName;
  if (parsed.data.childName !== undefined) updateData.childName = parsed.data.childName;
  if (parsed.data.phone !== undefined) updateData.phone = parsed.data.phone;
  if (parsed.data.adultsCount !== undefined) updateData.adultsCount = parsed.data.adultsCount;
  if (parsed.data.childrenCount !== undefined) updateData.childrenCount = parsed.data.childrenCount;
  if (parsed.data.status !== undefined) updateData.status = parsed.data.status;
  if (parsed.data.notes !== undefined) updateData.notes = parsed.data.notes;
  if ((parsed.data as any).email !== undefined) updateData.email = (parsed.data as any).email;
  if ((parsed.data as any).adminNotes !== undefined) updateData.adminNotes = (parsed.data as any).adminNotes;

  const result = await dataStore.updateGuest(params.data.id, updateData);
  if (!result) {
    res.status(404).json({ error: "Convidado nao encontrado" });
    return;
  }

  const action =
    parsed.data.status && parsed.data.status !== result.previous.status
      ? `status_changed:${result.previous.status}->${parsed.data.status}`
      : "updated";

  await logAudit(result.guest.id, result.guest.parentName, action, result.previous, result.guest);

  res.json(result.guest);
});

router.delete("/guests/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = DeleteGuestParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const guest = await dataStore.deleteGuest(params.data.id);
  if (!guest) {
    res.status(404).json({ error: "Convidado nao encontrado" });
    return;
  }

  await logAudit(null, guest.parentName, "deleted", guest, null);

  res.sendStatus(204);
});

export default router;
