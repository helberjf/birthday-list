import cron from "node-cron";
import { db, guestsTable, eventConfigTable } from "@workspace/db";
import { eq, and, isNotNull } from "drizzle-orm";
import { logger } from "./lib/logger";

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("55") ? digits : `55${digits}`;
}

function parseDateLabel(dateLabel: string): Date | null {
  const parts = dateLabel.split("/");
  if (parts.length !== 3) return null;
  const [day, month, year] = parts.map(Number);
  if (!day || !month || !year) return null;
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

async function checkAndSendReminders(): Promise<void> {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  if (!token || !phoneId) return;

  const [config] = await db.select().from(eventConfigTable).limit(1);
  if (!config?.whatsappReminderEnabled) return;

  const eventDate = parseDateLabel(config.dateLabel);
  if (!eventDate) return;

  const daysBefore = parseInt(config.whatsappReminderDaysBefore ?? "3", 10);
  const reminderDate = new Date(eventDate);
  reminderDate.setDate(reminderDate.getDate() - daysBefore);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  reminderDate.setHours(0, 0, 0, 0);

  if (today.getTime() !== reminderDate.getTime()) return;

  logger.info({ daysBefore, eventDate: config.dateLabel }, "Sending scheduled WhatsApp reminders");

  const guests = await db
    .select()
    .from(guestsTable)
    .where(and(eq(guestsTable.status, "confirmed"), isNotNull(guestsTable.phone)));

  const timeWord = daysBefore === 1 ? "amanhã" : `em ${daysBefore} dias`;
  const baseMsg =
    `Olá, {nome}! 🎉\n\n` +
    `Lembrando que a festa do ${config.childName} é ${timeWord}!\n\n` +
    `📅 ${config.dateLabel} às ${config.timeLabel}\n` +
    `📍 ${config.location} — ${config.neighborhood}\n\n` +
    `Nos vemos lá! 🎊`;

  let sent = 0;
  let failed = 0;
  for (const guest of guests) {
    if (!guest.phone) continue;
    const to = formatPhone(guest.phone);
    const msg = baseMsg.replace(/\{nome\}/g, guest.parentName);
    try {
      const resp = await fetch(
        `https://graph.facebook.com/v21.0/${phoneId}/messages`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ messaging_product: "whatsapp", to, type: "text", text: { body: msg } }),
        }
      );
      resp.ok ? sent++ : failed++;
    } catch {
      failed++;
    }
  }
  logger.info({ sent, failed }, "Scheduled reminders complete");
}

export function startScheduler(): void {
  cron.schedule("0 9 * * *", () => {
    checkAndSendReminders().catch((err: unknown) =>
      logger.error({ err }, "Scheduler error")
    );
  });
  logger.info("WhatsApp reminder scheduler started (runs daily at 9am)");
}
