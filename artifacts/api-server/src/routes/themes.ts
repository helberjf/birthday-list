import { Router, type IRouter } from "express";
import {
  CreateThemeBody,
  DeleteThemeParams,
  UpdateThemeBody,
  UpdateThemeParams,
} from "@workspace/api-zod";
import { dataStore } from "../lib/data-store";
import type { Theme } from "../lib/firebase-store";
import { requireAdmin } from "../middlewares/auth";

const router: IRouter = Router();
type CreateThemeData = typeof CreateThemeBody["_output"];
type UpdateThemeData = typeof UpdateThemeBody["_output"];

function toCreateTheme(data: CreateThemeData): Omit<Theme, "id" | "isBuiltIn" | "createdAt" | "updatedAt"> {
  return {
    slug: data.slug,
    name: data.name,
    emoji: data.emoji,
    description: data.description,
    heroBgFrom: data.heroBgFrom,
    heroBgVia: data.heroBgVia,
    heroBgTo: data.heroBgTo,
    cssPrimary: data.cssPrimary,
    cssSecondary: data.cssSecondary,
    cssAccent: data.cssAccent,
    confirmLabel: data.confirmLabel,
    successTitle: data.successTitle,
    successSub: data.successSub,
    confettiColors: data.confettiColors,
    photoRecommendation: data.photoRecommendation,
    photoPrompt: data.photoPrompt,
    isActive: data.isActive,
    displayOrder: data.displayOrder,
  };
}

function toUpdateTheme(data: UpdateThemeData): Partial<Theme> {
  const updateData: Partial<Theme> = {};
  if (data.slug !== undefined) updateData.slug = data.slug;
  if (data.name !== undefined) updateData.name = data.name;
  if (data.emoji !== undefined) updateData.emoji = data.emoji;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.heroBgFrom !== undefined) updateData.heroBgFrom = data.heroBgFrom;
  if (data.heroBgVia !== undefined) updateData.heroBgVia = data.heroBgVia;
  if (data.heroBgTo !== undefined) updateData.heroBgTo = data.heroBgTo;
  if (data.cssPrimary !== undefined) updateData.cssPrimary = data.cssPrimary;
  if (data.cssSecondary !== undefined) updateData.cssSecondary = data.cssSecondary;
  if (data.cssAccent !== undefined) updateData.cssAccent = data.cssAccent;
  if (data.confirmLabel !== undefined) updateData.confirmLabel = data.confirmLabel;
  if (data.successTitle !== undefined) updateData.successTitle = data.successTitle;
  if (data.successSub !== undefined) updateData.successSub = data.successSub;
  if (data.confettiColors !== undefined) updateData.confettiColors = data.confettiColors;
  if (data.photoRecommendation !== undefined) updateData.photoRecommendation = data.photoRecommendation;
  if (data.photoPrompt !== undefined) updateData.photoPrompt = data.photoPrompt;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;
  if (data.displayOrder !== undefined) updateData.displayOrder = data.displayOrder;
  return updateData;
}

function handleThemeError(error: unknown, res: import("express").Response): boolean {
  if (!(error instanceof Error)) return false;
  if (error.message === "INVALID_SLUG") {
    res.status(400).json({ error: "Slug invalido." });
    return true;
  }
  if (error.message === "DUPLICATE_SLUG") {
    res.status(409).json({ error: "Ja existe um tema com esse slug." });
    return true;
  }
  return false;
}

router.get("/themes", async (_req, res): Promise<void> => {
  res.json(await dataStore.listThemes(false));
});

router.get("/admin/themes", requireAdmin, async (_req, res): Promise<void> => {
  res.json(await dataStore.listThemes(true));
});

router.post("/admin/themes", requireAdmin, async (req, res): Promise<void> => {
  const parsed = CreateThemeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const theme = await dataStore.createTheme(toCreateTheme(parsed.data));
    res.status(201).json(theme);
  } catch (error) {
    if (handleThemeError(error, res)) return;
    throw error;
  }
});

router.patch("/admin/themes/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = UpdateThemeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateThemeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData = toUpdateTheme(parsed.data);
  if (Object.keys(updateData).length === 0) {
    res.status(400).json({ error: "Nenhum campo para atualizar." });
    return;
  }

  try {
    const theme = await dataStore.updateTheme(params.data.id, updateData);
    if (!theme) {
      res.status(404).json({ error: "Tema nao encontrado." });
      return;
    }
    res.json(theme);
  } catch (error) {
    if (handleThemeError(error, res)) return;
    throw error;
  }
});

router.delete("/admin/themes/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = DeleteThemeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const theme = await dataStore.deleteTheme(params.data.id);
  if (!theme) {
    res.status(404).json({ error: "Tema nao encontrado." });
    return;
  }

  res.sendStatus(204);
});

export default router;
