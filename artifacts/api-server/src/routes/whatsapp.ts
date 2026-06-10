import { Router, type IRouter } from "express";
import { dataStore } from "../lib/data-store";
import { requireAdmin } from "../middlewares/auth";

const router: IRouter = Router();

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("55") ? digits : `55${digits}`;
}

router.get("/admin/whatsapp/status", requireAdmin, async (_req, res): Promise<void> => {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  res.json({
    configured: !!(token && phoneId),
    phoneId: phoneId ? `***${phoneId.slice(-4)}` : null,
  });
});

router.post("/admin/send-whatsapp", requireAdmin, async (req, res): Promise<void> => {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;

  if (!token || !phoneId) {
    res.status(503).json({
      error: "WhatsApp API não configurada. Defina as variáveis WHATSAPP_TOKEN e WHATSAPP_PHONE_ID.",
    });
    return;
  }

  const { message, guestIds } = req.body as { message: string; guestIds?: number[] };
  if (!message || typeof message !== "string" || message.trim().length === 0) {
    res.status(400).json({ error: "Mensagem inválida ou vazia." });
    return;
  }

  let guests = await dataStore.listConfirmedGuestsWithPhone();

  if (guestIds && Array.isArray(guestIds) && guestIds.length > 0) {
    guests = guests.filter((g) => guestIds.includes(g.id));
  }

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const guest of guests) {
    if (!guest.phone) continue;
    const to = formatPhone(guest.phone);
    const personalizedMsg = message.replace(/\{nome\}/g, guest.parentName);

    try {
      const resp = await fetch(
        `https://graph.facebook.com/v21.0/${phoneId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to,
            type: "text",
            text: { body: personalizedMsg },
          }),
        },
      );

      if (resp.ok) {
        sent++;
      } else {
        failed++;
        const err = (await resp.json().catch(() => ({}))) as any;
        errors.push(`${guest.parentName}: ${err?.error?.message ?? "Erro desconhecido"}`);
      }
    } catch {
      failed++;
      errors.push(`${guest.parentName}: Erro de conexão`);
    }
  }

  res.json({ sent, failed, errors });
});

export default router;
