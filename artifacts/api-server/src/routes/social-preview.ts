import type { Request, Response } from "express";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { dataStore } from "../lib/data-store";

const DEFAULT_IMAGE_SIZE = { width: "1024", height: "1535" };
const DEFAULT_IMAGE_PATH = "/images/convite-julia.jpg";

let cachedHtmlTemplate: string | null = null;

function firstHeaderValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function getRequestOrigin(req: Request): string {
  const host = firstHeaderValue(req.headers["x-forwarded-host"]) ?? req.headers.host ?? "julia-niver.vercel.app";
  const fallbackProtocol = host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https";
  const protocol = firstHeaderValue(req.headers["x-forwarded-proto"]) ?? req.protocol ?? fallbackProtocol;
  return `${protocol}://${host}`.replace(/\/$/, "");
}

function escapeHtmlAttribute(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function replaceTitle(html: string, title: string): string {
  return html.replace(/<title>.*?<\/title>/i, `<title>${escapeHtmlAttribute(title)}</title>`);
}

function replaceLinkTag(html: string, rel: string, href: string): string {
  const escapedHref = escapeHtmlAttribute(href);
  const pattern = new RegExp(`<link(?=[^>]*\\srel=["']${rel}["'])(?=[^>]*\\shref=)[^>]*>`, "i");
  const replacement = `<link rel="${rel}" href="${escapedHref}" />`;
  return pattern.test(html) ? html.replace(pattern, replacement) : html.replace("</head>", `    ${replacement}\n  </head>`);
}

export function replaceMetaTag(
  html: string,
  attribute: "name" | "property",
  key: string,
  content: string,
): string {
  const escapedContent = escapeHtmlAttribute(content);
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`<meta(?=[^>]*\\s${attribute}=["']${escapedKey}["'])(?=[^>]*\\scontent=)[^>]*>`, "i");
  const replacement = `<meta ${attribute}="${key}" content="${escapedContent}" />`;
  return pattern.test(html) ? html.replace(pattern, replacement) : html.replace("</head>", `    ${replacement}\n  </head>`);
}

function absoluteUrl(url: string | null | undefined, origin: string): string {
  const candidate = url?.trim() || DEFAULT_IMAGE_PATH;
  try {
    return new URL(candidate, origin).toString();
  } catch {
    return new URL(DEFAULT_IMAGE_PATH, origin).toString();
  }
}

function joinAddress(location: string, neighborhood: string): string {
  return [location, neighborhood].map((part) => part.trim()).filter(Boolean).join(" - ");
}

async function loadHtmlTemplate(req: Request, origin: string): Promise<string> {
  if (cachedHtmlTemplate) return cachedHtmlTemplate;

  const bundledTemplate = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "frontend-index.html");
  const localCandidates = [
    bundledTemplate,
    path.resolve(process.cwd(), "artifacts", "birthday-invite", "dist", "public", "index.html"),
  ];

  if (!process.env["VERCEL"]) {
    localCandidates.push(path.resolve(process.cwd(), "artifacts", "birthday-invite", "index.html"));
  }

  for (const candidate of localCandidates) {
    if (existsSync(candidate)) {
      cachedHtmlTemplate = readFileSync(candidate, "utf8");
      return cachedHtmlTemplate;
    }
  }

  const response = await fetch(new URL("/index.html", origin), {
    headers: {
      "user-agent": firstHeaderValue(req.headers["user-agent"]) ?? "birthday-list-social-preview",
    },
  });

  if (!response.ok) {
    throw new Error(`Unable to load frontend HTML template: ${response.status}`);
  }

  cachedHtmlTemplate = await response.text();
  return cachedHtmlTemplate;
}

export async function socialPreviewHandler(req: Request, res: Response): Promise<void> {
  const origin = getRequestOrigin(req);
  const canonicalUrl = `${origin}/`;
  const config = await dataStore.getOrCreateEventConfig();
  const title = `Aniversario da ${config.childName} - ${config.dateLabel}`;
  const address = joinAddress(config.location, config.neighborhood);
  const description = `${config.dateFull}, das ${config.timeLabel}. ${address}. Teremos piscina: leve roupa de banho, chinelo e toalha.`;
  const pageDescription = `Convite para o aniversario da ${config.childName}: ${config.dateFull.toLowerCase()}, das ${config.timeLabel}, em ${address}. Teremos piscina: leve roupa de banho, chinelo e toalha.`;
  const imageUrl = absoluteUrl(config.inviteImageUrl, origin);
  const imageAlt = `Convite da ${config.childName} com foto da aniversariante e informacoes da festa`;

  let html = await loadHtmlTemplate(req, origin);
  html = replaceTitle(html, title);
  html = replaceLinkTag(html, "canonical", canonicalUrl);
  html = replaceMetaTag(html, "name", "description", pageDescription);
  html = replaceMetaTag(html, "property", "og:url", canonicalUrl);
  html = replaceMetaTag(html, "property", "og:title", title);
  html = replaceMetaTag(html, "property", "og:description", description);
  html = replaceMetaTag(html, "property", "og:image", imageUrl);
  html = replaceMetaTag(html, "property", "og:image:secure_url", imageUrl);
  html = replaceMetaTag(html, "property", "og:image:width", DEFAULT_IMAGE_SIZE.width);
  html = replaceMetaTag(html, "property", "og:image:height", DEFAULT_IMAGE_SIZE.height);
  html = replaceMetaTag(html, "property", "og:image:alt", imageAlt);
  html = replaceMetaTag(html, "name", "twitter:title", title);
  html = replaceMetaTag(html, "name", "twitter:description", description);
  html = replaceMetaTag(html, "name", "twitter:image", imageUrl);

  res.setHeader("content-type", "text/html; charset=utf-8");
  res.setHeader("cache-control", "public, max-age=0, must-revalidate");
  res.send(html);
}
