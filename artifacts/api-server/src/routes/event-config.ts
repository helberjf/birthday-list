import { Router, type IRouter } from "express";
import { db, eventConfigTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAdmin } from "../middlewares/auth";

const router: IRouter = Router();

async function getOrCreateConfig() {
  const [existing] = await db.select().from(eventConfigTable).limit(1);
  if (existing) return existing;
  const [created] = await db.insert(eventConfigTable).values({}).returning();
  return created!;
}

router.get("/event-config", async (_req, res): Promise<void> => {
  const config = await getOrCreateConfig();
  res.json(config);
});

router.put("/event-config", requireAdmin, async (req, res): Promise<void> => {
  const {
    childName, age, dateLabel, dateFull, timeLabel, location,
    neighborhood, tagline, inviteImageUrl, heroBgFrom, heroBgVia, heroBgTo,
    musicUrl, galleryEnabled, galleryTitle, theme,
    spotifyPlaylistUrl, mapsUrl, whatsappReminderEnabled, whatsappReminderDaysBefore,
  } = req.body;

  const config = await getOrCreateConfig();

  const [updated] = await db
    .update(eventConfigTable)
    .set({
      ...(childName !== undefined && { childName }),
      ...(age !== undefined && { age }),
      ...(dateLabel !== undefined && { dateLabel }),
      ...(dateFull !== undefined && { dateFull }),
      ...(timeLabel !== undefined && { timeLabel }),
      ...(location !== undefined && { location }),
      ...(neighborhood !== undefined && { neighborhood }),
      ...(tagline !== undefined && { tagline }),
      ...(inviteImageUrl !== undefined && { inviteImageUrl }),
      ...(heroBgFrom !== undefined && { heroBgFrom }),
      ...(heroBgVia !== undefined && { heroBgVia }),
      ...(heroBgTo !== undefined && { heroBgTo }),
      ...(musicUrl !== undefined && { musicUrl }),
      ...(galleryEnabled !== undefined && { galleryEnabled }),
      ...(galleryTitle !== undefined && { galleryTitle }),
      ...(theme !== undefined && { theme }),
      ...(spotifyPlaylistUrl !== undefined && { spotifyPlaylistUrl }),
      ...(mapsUrl !== undefined && { mapsUrl }),
      ...(whatsappReminderEnabled !== undefined && { whatsappReminderEnabled }),
      ...(whatsappReminderDaysBefore !== undefined && { whatsappReminderDaysBefore }),
    })
    .where(eq(eventConfigTable.id, config.id))
    .returning();

  res.json(updated ?? config);
});

export default router;
