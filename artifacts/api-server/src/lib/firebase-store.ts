import { createSign } from "node:crypto";
import { DEFAULT_THEMES } from "@workspace/db/theme-presets";

type Primitive = string | number | boolean | null | Date;
type JsonLike = Primitive | JsonLike[] | { [key: string]: JsonLike | undefined };

type FirestoreValue =
  | { nullValue: null }
  | { stringValue: string }
  | { integerValue: string }
  | { doubleValue: number }
  | { booleanValue: boolean }
  | { timestampValue: string }
  | { arrayValue: { values?: FirestoreValue[] } }
  | { mapValue: { fields?: Record<string, FirestoreValue> } };

type FirestoreDocument = {
  name: string;
  fields?: Record<string, FirestoreValue>;
};

type FirestoreListResponse = {
  documents?: FirestoreDocument[];
  nextPageToken?: string;
};

type FirebaseConfig = {
  projectId: string;
  databaseId: string;
  emulatorHost?: string;
  clientEmail?: string;
  privateKey?: string;
};

export type GuestStatus = "confirmed" | "maybe" | "declined";

export type EventConfig = {
  id: number;
  childName: string;
  age: string;
  dateLabel: string;
  dateFull: string;
  timeLabel: string;
  location: string;
  neighborhood: string;
  tagline: string;
  inviteImageUrl: string | null;
  heroBgFrom: string;
  heroBgVia: string;
  heroBgTo: string;
  musicUrl: string | null;
  galleryEnabled: boolean;
  galleryTitle: string;
  theme: string;
  spotifyPlaylistUrl: string | null;
  mapsUrl: string | null;
  whatsappReminderEnabled: boolean;
  whatsappReminderDaysBefore: string;
  updatedAt: Date;
};

export type Guest = {
  id: number;
  parentName: string;
  childName: string | null;
  phone: string | null;
  adultsCount: number;
  childrenCount: number;
  status: GuestStatus;
  email: string | null;
  notes: string | null;
  adminNotes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type Photo = {
  id: number;
  url: string;
  caption: string | null;
  displayOrder: number;
  createdAt: Date;
};

export type Theme = {
  id: number;
  slug: string;
  name: string;
  emoji: string;
  description: string;
  heroBgFrom: string;
  heroBgVia: string;
  heroBgTo: string;
  cssPrimary: string;
  cssSecondary: string;
  cssAccent: string;
  confirmLabel: string;
  successTitle: string;
  successSub: string;
  confettiColors: string[];
  photoRecommendation: string;
  photoPrompt: string;
  isActive: boolean;
  isBuiltIn: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

export type GuestAudit = {
  id: number;
  guestId: number | null;
  guestName: string;
  action: string;
  previousData: Record<string, unknown> | null;
  newData: Record<string, unknown> | null;
  createdAt: Date;
};

type ListGuestsParams = {
  page: number;
  limit: number;
  status?: GuestStatus;
  search?: string;
};

type Paginated<T> = {
  items: T[];
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
};

export class FirebaseNotConfiguredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FirebaseNotConfiguredError";
  }
}

export function parseFirebasePrivateKey(value: string): string {
  return value.replace(/\\n/g, "\n");
}

export function toFirestoreFields(input: Record<string, JsonLike | undefined>): Record<string, FirestoreValue> {
  const fields: Record<string, FirestoreValue> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined) continue;
    fields[key] = toFirestoreValue(value);
  }
  return fields;
}

export function fromFirestoreFields(fields: Record<string, FirestoreValue>): Record<string, any> {
  return Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [key, fromFirestoreValue(value)]),
  );
}

function toFirestoreValue(value: JsonLike): FirestoreValue {
  if (value === null) return { nullValue: null };
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map((item) => toFirestoreValue(item)) } };
  }
  return { mapValue: { fields: toFirestoreFields(value) } };
}

function fromFirestoreValue(value: FirestoreValue): any {
  if ("nullValue" in value) return null;
  if ("stringValue" in value) return value.stringValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return Number(value.doubleValue);
  if ("booleanValue" in value) return value.booleanValue;
  if ("timestampValue" in value) return new Date(value.timestampValue);
  if ("arrayValue" in value) return (value.arrayValue.values ?? []).map(fromFirestoreValue);
  if ("mapValue" in value) return fromFirestoreFields(value.mapValue.fields ?? {});
  return null;
}

function parseServiceAccountJson() {
  const raw = process.env["FIREBASE_SERVICE_ACCOUNT_JSON"];
  if (!raw) return null;

  const json = raw.trim().startsWith("{")
    ? raw
    : Buffer.from(raw, "base64").toString("utf8");

  const parsed = JSON.parse(json) as {
    project_id?: string;
    client_email?: string;
    private_key?: string;
  };

  return {
    projectId: parsed.project_id,
    clientEmail: parsed.client_email,
    privateKey: parsed.private_key,
  };
}

function getFirebaseConfig(): FirebaseConfig {
  const serviceAccount = parseServiceAccountJson();
  const projectId =
    process.env["FIREBASE_PROJECT_ID"] ??
    serviceAccount?.projectId ??
    process.env["GCLOUD_PROJECT"];

  if (!projectId) {
    throw new FirebaseNotConfiguredError(
      "Firebase nao configurado. Defina FIREBASE_PROJECT_ID ou FIREBASE_SERVICE_ACCOUNT_JSON.",
    );
  }

  const databaseId = process.env["FIREBASE_DATABASE_ID"] ?? "(default)";
  const emulatorHost = process.env["FIRESTORE_EMULATOR_HOST"];
  if (emulatorHost) {
    return { projectId, databaseId, emulatorHost };
  }

  const clientEmail = process.env["FIREBASE_CLIENT_EMAIL"] ?? serviceAccount?.clientEmail;
  const privateKeyValue = process.env["FIREBASE_PRIVATE_KEY"] ?? serviceAccount?.privateKey;
  const privateKey = privateKeyValue ? parseFirebasePrivateKey(privateKeyValue) : undefined;

  if (!clientEmail || !privateKey) {
    throw new FirebaseNotConfiguredError(
      "Firebase cloud nao configurado. Defina FIREBASE_CLIENT_EMAIL e FIREBASE_PRIVATE_KEY, ou use FIRESTORE_EMULATOR_HOST.",
    );
  }

  return { projectId, databaseId, clientEmail, privateKey };
}

function base64Url(value: string | Buffer): string {
  return Buffer.from(value).toString("base64url");
}

let tokenCache: { accessToken: string; expiresAt: number } | null = null;

async function getAccessToken(config: FirebaseConfig): Promise<string> {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) {
    return tokenCache.accessToken;
  }

  if (!config.clientEmail || !config.privateKey) {
    throw new FirebaseNotConfiguredError("Credenciais Firebase ausentes.");
  }

  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64Url(
    JSON.stringify({
      iss: config.clientEmail,
      scope: "https://www.googleapis.com/auth/datastore",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );
  const unsigned = `${header}.${payload}`;
  const signature = createSign("RSA-SHA256").update(unsigned).sign(config.privateKey);
  const assertion = `${unsigned}.${base64Url(signature)}`;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Falha ao autenticar no Firebase: ${response.status} ${body}`);
  }

  const token = (await response.json()) as { access_token: string; expires_in: number };
  tokenCache = {
    accessToken: token.access_token,
    expiresAt: Date.now() + token.expires_in * 1000,
  };
  return tokenCache.accessToken;
}

class FirestoreRestClient {
  private get baseUrl() {
    const config = getFirebaseConfig();
    const root = config.emulatorHost
      ? `http://${config.emulatorHost}`
      : "https://firestore.googleapis.com";
    return {
      config,
      url: `${root}/v1/projects/${encodeURIComponent(config.projectId)}/databases/${encodeURIComponent(config.databaseId)}/documents`,
    };
  }

  async request<T>(path: string, init: RequestInit = {}, allowNotFound = false): Promise<T | null> {
    const { config, url: baseUrl } = this.baseUrl;
    const headers = new Headers(init.headers);
    if (init.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    if (!config.emulatorHost) {
      headers.set("Authorization", `Bearer ${await getAccessToken(config)}`);
    }

    const response = await fetch(`${baseUrl}/${path.replace(/^\/+/, "")}`, {
      ...init,
      headers,
    });

    if (response.status === 404 && allowNotFound) return null;
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Firestore request failed ${response.status}: ${body}`);
    }
    if (response.status === 204) return null;
    return (await response.json()) as T;
  }
}

const DEFAULT_EVENT_CONFIG: EventConfig = {
  id: 1,
  childName: "Julia",
  age: "5",
  dateLabel: "16/08/2026",
  dateFull: "Domingo, 16 de agosto de 2026",
  timeLabel: "13:00 as 18:00",
  location: "Av Rio Pardo, 4195",
  neighborhood: "Cidade Universitaria - Ribeirao Preto",
  tagline: "Venha viver uma tarde de piscina, brincadeiras e muita alegria!",
  inviteImageUrl: null,
  heroBgFrom: "#4b1238",
  heroBgVia: "#b91d73",
  heroBgTo: "#f7a8cd",
  musicUrl: null,
  galleryEnabled: false,
  galleryTitle: "Fotos da Festa",
  theme: "princesas",
  spotifyPlaylistUrl: "https://open.spotify.com/artist/5jTK9ytb8AJCl28jku90Rv",
  mapsUrl: "https://maps.app.goo.gl/yjUt5rZNPGpfYyfa7?g_st=iw",
  whatsappReminderEnabled: false,
  whatsappReminderDaysBefore: "3",
  updatedAt: new Date(),
};

function asDate(value: unknown, fallback = new Date()): Date {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asNullableString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeSlug(slug: string) {
  return slug
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function paginate<T>(items: T[], page: number, limit: number): Paginated<T> {
  const totalItems = items.length;
  const totalPages = Math.ceil(totalItems / limit);
  const offset = (page - 1) * limit;
  return {
    items: items.slice(offset, offset + limit),
    page,
    limit,
    totalItems,
    totalPages,
  };
}

function normalizeEventConfig(raw: Record<string, any> | null): EventConfig {
  const fallback = DEFAULT_EVENT_CONFIG;
  return {
    id: asNumber(raw?.id, fallback.id),
    childName: asString(raw?.childName, fallback.childName),
    age: asString(raw?.age, fallback.age),
    dateLabel: asString(raw?.dateLabel, fallback.dateLabel),
    dateFull: asString(raw?.dateFull, fallback.dateFull),
    timeLabel: asString(raw?.timeLabel, fallback.timeLabel),
    location: asString(raw?.location, fallback.location),
    neighborhood: asString(raw?.neighborhood, fallback.neighborhood),
    tagline: asString(raw?.tagline, fallback.tagline),
    inviteImageUrl: asNullableString(raw?.inviteImageUrl),
    heroBgFrom: asString(raw?.heroBgFrom, fallback.heroBgFrom),
    heroBgVia: asString(raw?.heroBgVia, fallback.heroBgVia),
    heroBgTo: asString(raw?.heroBgTo, fallback.heroBgTo),
    musicUrl: asNullableString(raw?.musicUrl),
    galleryEnabled: asBoolean(raw?.galleryEnabled, fallback.galleryEnabled),
    galleryTitle: asString(raw?.galleryTitle, fallback.galleryTitle),
    theme: asString(raw?.theme, fallback.theme),
    spotifyPlaylistUrl: asNullableString(raw?.spotifyPlaylistUrl),
    mapsUrl: asNullableString(raw?.mapsUrl),
    whatsappReminderEnabled: asBoolean(raw?.whatsappReminderEnabled, fallback.whatsappReminderEnabled),
    whatsappReminderDaysBefore: asString(raw?.whatsappReminderDaysBefore, fallback.whatsappReminderDaysBefore),
    updatedAt: asDate(raw?.updatedAt, fallback.updatedAt),
  };
}

function normalizeGuest(raw: Record<string, any>): Guest {
  return {
    id: asNumber(raw.id),
    parentName: asString(raw.parentName),
    childName: asNullableString(raw.childName),
    phone: asNullableString(raw.phone),
    adultsCount: asNumber(raw.adultsCount, 1),
    childrenCount: asNumber(raw.childrenCount, 1),
    status: ["confirmed", "maybe", "declined"].includes(raw.status) ? raw.status : "confirmed",
    email: asNullableString(raw.email),
    notes: asNullableString(raw.notes),
    adminNotes: asNullableString(raw.adminNotes),
    createdAt: asDate(raw.createdAt),
    updatedAt: asDate(raw.updatedAt),
  };
}

function normalizePhoto(raw: Record<string, any>): Photo {
  return {
    id: asNumber(raw.id),
    url: asString(raw.url),
    caption: asNullableString(raw.caption),
    displayOrder: asNumber(raw.displayOrder),
    createdAt: asDate(raw.createdAt),
  };
}

function normalizeTheme(raw: Record<string, any>): Theme {
  return {
    id: asNumber(raw.id),
    slug: asString(raw.slug),
    name: asString(raw.name),
    emoji: asString(raw.emoji, "🎉"),
    description: asString(raw.description),
    heroBgFrom: asString(raw.heroBgFrom),
    heroBgVia: asString(raw.heroBgVia),
    heroBgTo: asString(raw.heroBgTo),
    cssPrimary: asString(raw.cssPrimary),
    cssSecondary: asString(raw.cssSecondary),
    cssAccent: asString(raw.cssAccent),
    confirmLabel: asString(raw.confirmLabel),
    successTitle: asString(raw.successTitle),
    successSub: asString(raw.successSub),
    confettiColors: Array.isArray(raw.confettiColors) ? raw.confettiColors.map(String) : ["#ffffff"],
    photoRecommendation: asString(raw.photoRecommendation),
    photoPrompt: asString(raw.photoPrompt),
    isActive: asBoolean(raw.isActive, true),
    isBuiltIn: asBoolean(raw.isBuiltIn),
    displayOrder: asNumber(raw.displayOrder),
    createdAt: asDate(raw.createdAt),
    updatedAt: asDate(raw.updatedAt),
  };
}

function normalizeAudit(raw: Record<string, any>): GuestAudit {
  return {
    id: asNumber(raw.id),
    guestId: raw.guestId === null || raw.guestId === undefined ? null : asNumber(raw.guestId),
    guestName: asString(raw.guestName),
    action: asString(raw.action),
    previousData: raw.previousData ?? null,
    newData: raw.newData ?? null,
    createdAt: asDate(raw.createdAt),
  };
}

export class FirebaseStore {
  private client = new FirestoreRestClient();

  private async listRaw(collection: string): Promise<Record<string, any>[]> {
    const docs: Record<string, any>[] = [];
    let pageToken: string | undefined;

    do {
      const params = new URLSearchParams({ pageSize: "300" });
      if (pageToken) params.set("pageToken", pageToken);
      const response = await this.client.request<FirestoreListResponse>(`${collection}?${params.toString()}`);
      docs.push(...(response?.documents ?? []).map((doc) => fromFirestoreFields(doc.fields ?? {})));
      pageToken = response?.nextPageToken;
    } while (pageToken);

    return docs;
  }

  private async getRaw(collection: string, id: string | number): Promise<Record<string, any> | null> {
    const doc = await this.client.request<FirestoreDocument>(
      `${collection}/${encodeURIComponent(String(id))}`,
      {},
      true,
    );
    return doc ? fromFirestoreFields(doc.fields ?? {}) : null;
  }

  private async saveRaw(collection: string, id: string | number, data: Record<string, JsonLike>): Promise<Record<string, any>> {
    const doc = await this.client.request<FirestoreDocument>(
      `${collection}/${encodeURIComponent(String(id))}`,
      {
        method: "PATCH",
        body: JSON.stringify({ fields: toFirestoreFields(data) }),
      },
    );
    return fromFirestoreFields(doc?.fields ?? {});
  }

  private async deleteRaw(collection: string, id: string | number): Promise<void> {
    await this.client.request(`${collection}/${encodeURIComponent(String(id))}`, { method: "DELETE" }, true);
  }

  private async nextId(collection: string): Promise<number> {
    const items = await this.listRaw(collection);
    return items.reduce((max, item) => Math.max(max, asNumber(item.id)), 0) + 1;
  }

  async getOrCreateEventConfig(): Promise<EventConfig> {
    const raw = await this.getRaw("eventConfig", "default");
    if (raw) return normalizeEventConfig(raw);

    const created = { ...DEFAULT_EVENT_CONFIG, updatedAt: new Date() };
    await this.saveRaw("eventConfig", "default", created);
    return created;
  }

  async updateEventConfig(data: Partial<Omit<EventConfig, "id" | "updatedAt">>): Promise<EventConfig> {
    const current = await this.getOrCreateEventConfig();
    const next = { ...current, ...data, updatedAt: new Date() };
    const saved = await this.saveRaw("eventConfig", "default", next);
    return normalizeEventConfig(saved);
  }

  async listGuests(params: ListGuestsParams): Promise<Paginated<Guest>> {
    const search = params.search?.trim().toLowerCase();
    const guests = (await this.listRaw("guests"))
      .map(normalizeGuest)
      .filter((guest) => !params.status || guest.status === params.status)
      .filter((guest) => {
        if (!search) return true;
        return (
          guest.parentName.toLowerCase().includes(search) ||
          (guest.childName?.toLowerCase().includes(search) ?? false)
        );
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return paginate(guests, params.page, params.limit);
  }

  async createGuest(data: {
    parentName: string;
    childName?: string | null;
    phone?: string | null;
    email?: string | null;
    adultsCount: number;
    childrenCount: number;
    status: GuestStatus;
    notes?: string | null;
  }): Promise<{ guest?: Guest; duplicate: boolean }> {
    const guests = (await this.listRaw("guests")).map(normalizeGuest);
    const lowerParent = data.parentName.toLowerCase();
    const lowerChild = data.childName?.toLowerCase() ?? null;
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;

    const duplicate = guests.some((guest) => {
      const sameParent = guest.parentName.toLowerCase() === lowerParent;
      const sameChild = lowerChild
        ? guest.childName?.toLowerCase() === lowerChild
        : guest.childName === null;
      return sameParent && sameChild && guest.createdAt.getTime() > fiveMinutesAgo;
    });

    if (duplicate) return { duplicate: true };

    const now = new Date();
    const guest: Guest = {
      id: await this.nextId("guests"),
      parentName: data.parentName,
      childName: data.childName ?? null,
      phone: data.phone ?? null,
      email: data.email ?? null,
      adultsCount: data.adultsCount,
      childrenCount: data.childrenCount,
      status: data.status,
      notes: data.notes ?? null,
      adminNotes: null,
      createdAt: now,
      updatedAt: now,
    };
    const saved = await this.saveRaw("guests", guest.id, guest);
    return { guest: normalizeGuest(saved), duplicate: false };
  }

  async getGuest(id: number): Promise<Guest | null> {
    const raw = await this.getRaw("guests", id);
    return raw ? normalizeGuest(raw) : null;
  }

  async updateGuest(id: number, data: Partial<Guest>): Promise<{ previous: Guest; guest: Guest } | null> {
    const previous = await this.getGuest(id);
    if (!previous) return null;
    const next = { ...previous, ...data, updatedAt: new Date() };
    const saved = await this.saveRaw("guests", id, next);
    return { previous, guest: normalizeGuest(saved) };
  }

  async deleteGuest(id: number): Promise<Guest | null> {
    const guest = await this.getGuest(id);
    if (!guest) return null;
    await this.deleteRaw("guests", id);
    return guest;
  }

  async listConfirmedGuestsWithPhone(): Promise<Guest[]> {
    return (await this.listRaw("guests"))
      .map(normalizeGuest)
      .filter((guest) => guest.status === "confirmed" && guest.phone)
      .sort((a, b) => a.parentName.localeCompare(b.parentName));
  }

  async getPublicStats() {
    const confirmed = (await this.listRaw("guests"))
      .map(normalizeGuest)
      .filter((guest) => guest.status === "confirmed");
    const totalAdults = confirmed.reduce((sum, guest) => sum + guest.adultsCount, 0);
    const totalChildren = confirmed.reduce((sum, guest) => sum + guest.childrenCount, 0);
    return {
      totalFamilies: confirmed.length,
      totalAdults,
      totalChildren,
      totalPeople: totalAdults + totalChildren,
    };
  }

  async getAdminStats() {
    const guests = (await this.listRaw("guests")).map(normalizeGuest);
    return {
      total: guests.length,
      confirmed: guests.filter((guest) => guest.status === "confirmed").length,
      maybe: guests.filter((guest) => guest.status === "maybe").length,
      declined: guests.filter((guest) => guest.status === "declined").length,
      totalAdults: guests.reduce((sum, guest) => sum + guest.adultsCount, 0),
      totalChildren: guests.reduce((sum, guest) => sum + guest.childrenCount, 0),
    };
  }

  async createGuestAudit(
    guestId: number | null,
    guestName: string,
    action: string,
    previousData: Record<string, unknown> | null,
    newData: Record<string, unknown> | null,
  ): Promise<GuestAudit> {
    const audit: GuestAudit = {
      id: await this.nextId("guestAudit"),
      guestId,
      guestName,
      action,
      previousData,
      newData,
      createdAt: new Date(),
    };
    const saved = await this.saveRaw("guestAudit", audit.id, audit as unknown as Record<string, JsonLike>);
    return normalizeAudit(saved);
  }

  async listGuestAudit(params: { page: number; limit: number; guestId?: number }): Promise<Paginated<GuestAudit>> {
    const items = (await this.listRaw("guestAudit"))
      .map(normalizeAudit)
      .filter((audit) => params.guestId === undefined || audit.guestId === params.guestId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return paginate(items, params.page, params.limit);
  }

  async listPhotos(): Promise<Photo[]> {
    return (await this.listRaw("photos"))
      .map(normalizePhoto)
      .sort((a, b) => a.displayOrder - b.displayOrder || a.createdAt.getTime() - b.createdAt.getTime());
  }

  async createPhoto(data: { url: string; caption?: string | null; displayOrder?: number }): Promise<Photo> {
    const photos = await this.listPhotos();
    const photo: Photo = {
      id: await this.nextId("photos"),
      url: data.url,
      caption: data.caption ?? null,
      displayOrder: data.displayOrder ?? photos.length,
      createdAt: new Date(),
    };
    const saved = await this.saveRaw("photos", photo.id, photo);
    return normalizePhoto(saved);
  }

  async updatePhoto(id: number, data: Partial<Pick<Photo, "caption" | "displayOrder">>): Promise<Photo | null> {
    const existing = await this.getRaw("photos", id);
    if (!existing) return null;
    const saved = await this.saveRaw("photos", id, { ...normalizePhoto(existing), ...data });
    return normalizePhoto(saved);
  }

  async deletePhoto(id: number): Promise<Photo | null> {
    const photo = await this.getRaw("photos", id);
    if (!photo) return null;
    await this.deleteRaw("photos", id);
    return normalizePhoto(photo);
  }

  private async seedThemesIfEmpty(): Promise<void> {
    const existing = await this.listRaw("themes");
    if (existing.length > 0) return;

    const now = new Date();
    await Promise.all(
      DEFAULT_THEMES.map((theme, index) =>
        this.saveRaw("themes", index + 1, {
          id: index + 1,
          ...theme,
          isActive: true,
          isBuiltIn: true,
          displayOrder: theme.displayOrder ?? index,
          createdAt: now,
          updatedAt: now,
        }),
      ),
    );
  }

  async listThemes(includeInactive = false): Promise<Theme[]> {
    await this.seedThemesIfEmpty();
    return (await this.listRaw("themes"))
      .map(normalizeTheme)
      .filter((theme) => includeInactive || theme.isActive)
      .sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name));
  }

  async createTheme(data: Omit<Theme, "id" | "isBuiltIn" | "createdAt" | "updatedAt">): Promise<Theme> {
    await this.seedThemesIfEmpty();
    const slug = normalizeSlug(data.slug);
    if (!slug) throw new Error("INVALID_SLUG");
    const existing = await this.listThemes(true);
    if (existing.some((theme) => theme.slug === slug)) throw new Error("DUPLICATE_SLUG");

    const now = new Date();
    const theme: Theme = {
      ...data,
      id: await this.nextId("themes"),
      slug,
      isBuiltIn: false,
      createdAt: now,
      updatedAt: now,
    };
    const saved = await this.saveRaw("themes", theme.id, theme);
    return normalizeTheme(saved);
  }

  async updateTheme(id: number, data: Partial<Theme>): Promise<Theme | null> {
    await this.seedThemesIfEmpty();
    const existingRaw = await this.getRaw("themes", id);
    if (!existingRaw) return null;
    const existing = normalizeTheme(existingRaw);
    const slug = data.slug !== undefined ? normalizeSlug(data.slug) : existing.slug;
    if (!slug) throw new Error("INVALID_SLUG");

    const themes = await this.listThemes(true);
    if (themes.some((theme) => theme.id !== id && theme.slug === slug)) {
      throw new Error("DUPLICATE_SLUG");
    }

    const next = { ...existing, ...data, slug, updatedAt: new Date() };
    const saved = await this.saveRaw("themes", id, next);
    return normalizeTheme(saved);
  }

  async deleteTheme(id: number): Promise<Theme | null> {
    await this.seedThemesIfEmpty();
    const existingRaw = await this.getRaw("themes", id);
    if (!existingRaw) return null;
    const existing = normalizeTheme(existingRaw);
    if (existing.isBuiltIn) {
      await this.saveRaw("themes", id, { ...existing, isActive: false, updatedAt: new Date() });
    } else {
      await this.deleteRaw("themes", id);
    }
    return existing;
  }
}

export const firebaseStore = new FirebaseStore();
