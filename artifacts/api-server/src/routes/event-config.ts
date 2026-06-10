import { Router, type IRouter } from "express";
import { dataStore } from "../lib/data-store";
import { requireAdmin } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/event-config", async (_req, res): Promise<void> => {
  const config = await dataStore.getOrCreateEventConfig();
  res.json(config);
});

router.put("/event-config", requireAdmin, async (req, res): Promise<void> => {
  const {
    childName,
    age,
    dateLabel,
    dateFull,
    timeLabel,
    location,
    neighborhood,
    tagline,
    inviteImageUrl,
    heroBgFrom,
    heroBgVia,
    heroBgTo,
    musicUrl,
    galleryEnabled,
    galleryTitle,
    theme,
    spotifyPlaylistUrl,
    mapsUrl,
    whatsappReminderEnabled,
    whatsappReminderDaysBefore,
  } = req.body;

  const updated = await dataStore.updateEventConfig({
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
  });

  res.json(updated);
});

export default router;
