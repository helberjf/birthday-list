import type { Theme } from "@workspace/api-client-react";
import { DEFAULT_THEMES, type DefaultTheme } from "../../../../lib/db/src/theme-presets";

export type ThemeView = DefaultTheme & {
  id?: number;
  isActive?: boolean;
  isBuiltIn?: boolean;
};

export const FALLBACK_THEMES: ThemeView[] = DEFAULT_THEMES.map((theme) => ({
  ...theme,
  isActive: true,
  isBuiltIn: true,
}));

export function normalizeThemeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function toThemeView(theme: Theme): ThemeView {
  return {
    slug: theme.slug,
    name: theme.name,
    emoji: theme.emoji,
    description: theme.description,
    heroBgFrom: theme.heroBgFrom,
    heroBgVia: theme.heroBgVia,
    heroBgTo: theme.heroBgTo,
    cssPrimary: theme.cssPrimary,
    cssSecondary: theme.cssSecondary,
    cssAccent: theme.cssAccent,
    confirmLabel: theme.confirmLabel,
    successTitle: theme.successTitle,
    successSub: theme.successSub,
    confettiColors: theme.confettiColors,
    photoRecommendation: theme.photoRecommendation,
    photoPrompt: theme.photoPrompt,
    displayOrder: theme.displayOrder,
    id: theme.id,
    isActive: theme.isActive,
    isBuiltIn: theme.isBuiltIn,
  };
}

export function getThemeCatalog(themes?: Theme[] | null, includeInactive = false): ThemeView[] {
  const source = themes?.length ? themes.map(toThemeView) : FALLBACK_THEMES;
  return source
    .filter((theme) => includeInactive || theme.isActive !== false)
    .sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name));
}

export function getThemeBySlug(themes: ThemeView[], slug?: string | null): ThemeView {
  const normalized = normalizeThemeSlug(slug ?? "");
  return (
    themes.find((theme) => theme.slug === normalized && theme.isActive !== false) ??
    FALLBACK_THEMES.find((theme) => theme.slug === normalized) ??
    FALLBACK_THEMES[0]!
  );
}

export function getThemeCssVars(theme: ThemeView) {
  return {
    "--color-primary": theme.cssPrimary,
    "--color-secondary": theme.cssSecondary,
    "--color-accent": theme.cssAccent,
    "--color-background": `color-mix(in srgb, ${theme.cssAccent} 10%, white)`,
    "--color-foreground": `color-mix(in srgb, ${theme.cssPrimary} 70%, black)`,
    "--color-muted": `color-mix(in srgb, ${theme.cssSecondary} 12%, white)`,
    "--color-muted-foreground": `color-mix(in srgb, ${theme.cssPrimary} 55%, #64748b)`,
    "--color-card": `color-mix(in srgb, ${theme.cssAccent} 5%, white)`,
    "--color-card-foreground": `color-mix(in srgb, ${theme.cssPrimary} 70%, black)`,
    "--color-border": `color-mix(in srgb, ${theme.cssPrimary} 18%, white)`,
    "--color-input": `color-mix(in srgb, ${theme.cssSecondary} 10%, white)`,
    "--color-ring": theme.cssSecondary,
    "--party-hero-from": theme.heroBgFrom,
    "--party-hero-via": theme.heroBgVia,
    "--party-hero-to": theme.heroBgTo,
  };
}

export function themeToFormDefaults(theme: ThemeView, order = 999) {
  return {
    slug: theme.slug,
    name: theme.name,
    emoji: theme.emoji,
    description: theme.description,
    heroBgFrom: theme.heroBgFrom,
    heroBgVia: theme.heroBgVia,
    heroBgTo: theme.heroBgTo,
    cssPrimary: theme.cssPrimary,
    cssSecondary: theme.cssSecondary,
    cssAccent: theme.cssAccent,
    confirmLabel: theme.confirmLabel,
    successTitle: theme.successTitle,
    successSub: theme.successSub,
    confettiColors: theme.confettiColors.join(", "),
    photoRecommendation: theme.photoRecommendation,
    photoPrompt: theme.photoPrompt,
    isActive: theme.isActive !== false,
    displayOrder: theme.displayOrder || order,
  };
}

export const BLANK_THEME_FORM = themeToFormDefaults(
  {
    slug: "tema-personalizado",
    name: "Tema Personalizado",
    emoji: "🎉",
    description: "Tema criado para uma festa infantil personalizada.",
    heroBgFrom: "#264653",
    heroBgVia: "#2a9d8f",
    heroBgTo: "#e9c46a",
    cssPrimary: "hsl(197 52% 24%)",
    cssSecondary: "hsl(173 58% 39%)",
    cssAccent: "hsl(43 74% 64%)",
    confirmLabel: "🎉 CONFIRMAR PRESENCA",
    successTitle: "Presenca Confirmada!",
    successSub: "A festa ficou mais especial!",
    confettiColors: ["#264653", "#2a9d8f", "#e9c46a", "#ffffff"],
    photoRecommendation: "Use uma foto bem iluminada, com fundo neutro e roupa nas cores principais do tema.",
    photoPrompt:
      "Create a premium vertical birthday invitation hero image for a custom child party theme with joyful balloons, cake decor, soft studio lighting, clean background zones for text, no readable text, no logos, no watermarks, high resolution, 4:5 aspect ratio.",
    displayOrder: 999,
  },
);
