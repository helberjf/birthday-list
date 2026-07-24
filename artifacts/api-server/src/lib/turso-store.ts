import type { Client } from "@libsql/client";
import { DEFAULT_THEMES } from "@workspace/db/theme-presets";
import type { EventConfig, Guest, GuestAudit, GuestStatus, Photo, Theme } from "./firebase-store";

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

type TursoState = {
  eventConfig: EventConfig;
  guests: Guest[];
  photos: Photo[];
  audit: GuestAudit[];
  themes: Theme[];
  nextGuestId: number;
  nextPhotoId: number;
  nextAuditId: number;
  nextThemeId: number;
};

export class TursoNotConfiguredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TursoNotConfiguredError";
  }
}

function paginate<T>(all: T[], page: number, limit: number): Paginated<T> {
  const totalItems = all.length;
  const offset = (page - 1) * limit;
  return {
    items: all.slice(offset, offset + limit),
    page,
    limit,
    totalItems,
    totalPages: Math.max(1, Math.ceil(totalItems / limit)),
  };
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

function defaultState(): TursoState {
  const now = new Date();
  const themes: Theme[] = DEFAULT_THEMES.map((t, i) => ({
    ...t,
    id: i + 1,
    isBuiltIn: true,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  }));

  return {
    eventConfig: { ...DEFAULT_EVENT_CONFIG },
    guests: [],
    photos: [],
    audit: [],
    themes,
    nextGuestId: 1,
    nextPhotoId: 1,
    nextAuditId: 1,
    nextThemeId: themes.length + 1,
  };
}

function asDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
}

function hydrateState(raw: unknown): TursoState {
  if (!raw || typeof raw !== "object") return defaultState();
  const s = raw as Partial<TursoState>;
  const base = defaultState();

  const guests = Array.isArray(s.guests)
    ? s.guests.map((g) => ({
        ...g,
        createdAt: asDate((g as Guest).createdAt),
        updatedAt: asDate((g as Guest).updatedAt),
      }))
    : [];

  const photos = Array.isArray(s.photos)
    ? s.photos.map((p) => ({
        ...p,
        createdAt: asDate((p as Photo).createdAt),
      }))
    : [];

  const audit = Array.isArray(s.audit)
    ? s.audit.map((a) => ({
        ...a,
        createdAt: asDate((a as GuestAudit).createdAt),
      }))
    : [];

  const themes = Array.isArray(s.themes)
    ? s.themes.map((t) => ({
        ...t,
        createdAt: asDate((t as Theme).createdAt),
        updatedAt: asDate((t as Theme).updatedAt),
      }))
    : base.themes;

  return {
    eventConfig: {
      ...base.eventConfig,
      ...(s.eventConfig ?? {}),
      updatedAt: asDate(s.eventConfig?.updatedAt),
    },
    guests,
    photos,
    audit,
    themes,
    nextGuestId: s.nextGuestId ?? (guests.length + 1),
    nextPhotoId: s.nextPhotoId ?? (photos.length + 1),
    nextAuditId: s.nextAuditId ?? (audit.length + 1),
    nextThemeId: s.nextThemeId ?? (themes.length + 1),
  };
}

function getTursoConfig() {
  const url =
    process.env["DATABASE_URL"] ??
    process.env["TURSO_DATABASE_URL"] ??
    process.env["LIBSQL_URL"];

  if (!url) {
    throw new TursoNotConfiguredError(
      "Turso requires DATABASE_URL (or TURSO_DATABASE_URL/LIBSQL_URL) with a libsql:// URL.",
    );
  }

  const authToken =
    process.env["DATABASE_AUTH_TOKEN"] ??
    process.env["TURSO_AUTH_TOKEN"] ??
    process.env["LIBSQL_AUTH_TOKEN"] ??
    process.env["DATABASE_TOKEN"];

  return { url, authToken };
}

export class TursoStore {
  private client: Client | null = null;
  private clientPromise: Promise<Client> | null = null;
  private initialized = false;
  private state: TursoState | null = null;

  private async ensureClient(): Promise<Client> {
    if (this.client) return this.client;

    if (!this.clientPromise) {
      this.clientPromise = (async () => {
        const config = getTursoConfig();
        const { createClient } = await import("@libsql/client");
        const client = createClient({ url: config.url, authToken: config.authToken });
        this.client = client;
        return client;
      })();
    }

    return this.clientPromise;
  }

  private async ensureLoaded(): Promise<TursoState> {
    if (this.state) return this.state;
    const client = await this.ensureClient();

    if (!this.initialized) {
      await client.execute(`
        CREATE TABLE IF NOT EXISTS app_state (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          payload TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `);
      this.initialized = true;
    }

    const result = await client.execute("SELECT payload FROM app_state WHERE id = 1");
    const row = result.rows[0];
    if (!row) {
      this.state = defaultState();
      await this.persistState();
      return this.state;
    }

    const payload = String(row["payload"] ?? "{}");
    this.state = hydrateState(JSON.parse(payload));
    return this.state;
  }

  private async persistState(): Promise<void> {
    if (!this.state) return;
    const client = await this.ensureClient();

    const payload = JSON.stringify(this.state);
    await client.execute({
      sql: `
        INSERT INTO app_state (id, payload, updated_at)
        VALUES (1, ?, ?)
        ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at
      `,
      args: [payload, new Date().toISOString()],
    });
  }

  async getOrCreateEventConfig(): Promise<EventConfig> {
    const state = await this.ensureLoaded();
    return { ...state.eventConfig };
  }

  async updateEventConfig(data: Partial<Omit<EventConfig, "id" | "updatedAt">>): Promise<EventConfig> {
    const state = await this.ensureLoaded();
    state.eventConfig = { ...state.eventConfig, ...data, updatedAt: new Date() };
    await this.persistState();
    return { ...state.eventConfig };
  }

  async listGuests(params: ListGuestsParams): Promise<Paginated<Guest>> {
    const state = await this.ensureLoaded();
    let filtered = state.guests;
    if (params.status) {
      filtered = filtered.filter((g) => g.status === params.status);
    }
    if (params.search) {
      const q = params.search.toLowerCase();
      filtered = filtered.filter(
        (g) =>
          g.parentName.toLowerCase().includes(q) ||
          (g.childName ?? "").toLowerCase().includes(q),
      );
    }
    const sorted = [...filtered].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
    return paginate(sorted, params.page, params.limit);
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
    const state = await this.ensureLoaded();
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const childName = data.childName ?? null;
    const duplicate = state.guests.some(
      (g) =>
        g.parentName.toLowerCase() === data.parentName.toLowerCase() &&
        (g.childName ?? null)?.toLowerCase() === (childName ?? null)?.toLowerCase() &&
        g.createdAt > fiveMinutesAgo,
    );
    if (duplicate) return { duplicate: true };

    const now = new Date();
    const guest: Guest = {
      id: state.nextGuestId++,
      parentName: data.parentName,
      childName,
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
    state.guests.push(guest);
    await this.persistState();
    return { guest: { ...guest }, duplicate: false };
  }

  async getGuest(id: number): Promise<Guest | null> {
    const state = await this.ensureLoaded();
    return state.guests.find((g) => g.id === id) ?? null;
  }

  async updateGuest(id: number, data: Partial<Guest>): Promise<{ previous: Guest; guest: Guest } | null> {
    const state = await this.ensureLoaded();
    const idx = state.guests.findIndex((g) => g.id === id);
    if (idx === -1) return null;
    const previous = { ...state.guests[idx]! };
    state.guests[idx] = { ...previous, ...data, id, updatedAt: new Date() };
    await this.persistState();
    return { previous, guest: { ...state.guests[idx]! } };
  }

  async deleteGuest(id: number): Promise<Guest | null> {
    const state = await this.ensureLoaded();
    const idx = state.guests.findIndex((g) => g.id === id);
    if (idx === -1) return null;
    const [guest] = state.guests.splice(idx, 1);
    await this.persistState();
    return guest ?? null;
  }

  async listConfirmedGuestsWithPhone(): Promise<Guest[]> {
    const state = await this.ensureLoaded();
    return state.guests
      .filter((g) => g.status === "confirmed" && g.phone)
      .sort((a, b) => a.parentName.localeCompare(b.parentName));
  }

  async getPublicStats() {
    const state = await this.ensureLoaded();
    const confirmed = state.guests.filter((g) => g.status === "confirmed");
    const totalAdults = confirmed.reduce((s, g) => s + g.adultsCount, 0);
    const totalChildren = confirmed.reduce((s, g) => s + g.childrenCount, 0);
    return {
      totalFamilies: confirmed.length,
      totalAdults,
      totalChildren,
      totalPeople: totalAdults + totalChildren,
    };
  }

  async getAdminStats() {
    const state = await this.ensureLoaded();
    const confirmed = state.guests.filter((g) => g.status === "confirmed").length;
    const maybe = state.guests.filter((g) => g.status === "maybe").length;
    const declined = state.guests.filter((g) => g.status === "declined").length;
    const totalAdults = state.guests.reduce((s, g) => s + g.adultsCount, 0);
    const totalChildren = state.guests.reduce((s, g) => s + g.childrenCount, 0);
    return {
      total: state.guests.length,
      confirmed,
      maybe,
      declined,
      totalAdults,
      totalChildren,
    };
  }

  async createGuestAudit(
    guestId: number | null,
    guestName: string,
    action: string,
    previousData: Record<string, unknown> | null,
    newData: Record<string, unknown> | null,
  ): Promise<GuestAudit> {
    const state = await this.ensureLoaded();
    const entry: GuestAudit = {
      id: state.nextAuditId++,
      guestId,
      guestName,
      action,
      previousData,
      newData,
      createdAt: new Date(),
    };
    state.audit.push(entry);
    await this.persistState();
    return { ...entry };
  }

  async listGuestAudit(params: { page: number; limit: number; guestId?: number }): Promise<Paginated<GuestAudit>> {
    const state = await this.ensureLoaded();
    let filtered = state.audit;
    if (params.guestId !== undefined) {
      filtered = filtered.filter((a) => a.guestId === params.guestId);
    }
    const sorted = [...filtered].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
    return paginate(sorted, params.page, params.limit);
  }

  async listPhotos(): Promise<Photo[]> {
    const state = await this.ensureLoaded();
    return [...state.photos].sort(
      (a, b) => a.displayOrder - b.displayOrder || a.createdAt.getTime() - b.createdAt.getTime(),
    );
  }

  async createPhoto(data: { url: string; caption?: string | null; displayOrder?: number }): Promise<Photo> {
    const state = await this.ensureLoaded();
    const photo: Photo = {
      id: state.nextPhotoId++,
      url: data.url,
      caption: data.caption ?? null,
      displayOrder: data.displayOrder ?? state.photos.length,
      createdAt: new Date(),
    };
    state.photos.push(photo);
    await this.persistState();
    return { ...photo };
  }

  async updatePhoto(id: number, data: Partial<Pick<Photo, "caption" | "displayOrder">>): Promise<Photo | null> {
    const state = await this.ensureLoaded();
    const idx = state.photos.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    state.photos[idx] = { ...state.photos[idx]!, ...data };
    await this.persistState();
    return { ...state.photos[idx]! };
  }

  async deletePhoto(id: number): Promise<Photo | null> {
    const state = await this.ensureLoaded();
    const idx = state.photos.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    const [photo] = state.photos.splice(idx, 1);
    await this.persistState();
    return photo ?? null;
  }

  async listThemes(includeInactive = false): Promise<Theme[]> {
    const state = await this.ensureLoaded();
    const list = includeInactive
      ? state.themes
      : state.themes.filter((t) => t.isActive);
    return [...list].sort(
      (a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name),
    );
  }

  async createTheme(data: Omit<Theme, "id" | "isBuiltIn" | "createdAt" | "updatedAt">): Promise<Theme> {
    const state = await this.ensureLoaded();
    const slug = normalizeSlug(data.slug);
    if (!slug) throw new Error("INVALID_SLUG");
    if (state.themes.some((t) => t.slug === slug)) throw new Error("DUPLICATE_SLUG");

    const now = new Date();
    const theme: Theme = {
      ...data,
      id: state.nextThemeId++,
      slug,
      isBuiltIn: false,
      createdAt: now,
      updatedAt: now,
    };
    state.themes.push(theme);
    await this.persistState();
    return { ...theme };
  }

  async updateTheme(id: number, data: Partial<Theme>): Promise<Theme | null> {
    const state = await this.ensureLoaded();
    const idx = state.themes.findIndex((t) => t.id === id);
    if (idx === -1) return null;

    const slug = data.slug !== undefined ? normalizeSlug(data.slug) : undefined;
    if (slug !== undefined && !slug) throw new Error("INVALID_SLUG");
    if (slug && state.themes.some((t) => t.slug === slug && t.id !== id)) throw new Error("DUPLICATE_SLUG");

    state.themes[idx] = {
      ...state.themes[idx]!,
      ...data,
      ...(slug ? { slug } : {}),
      id,
      updatedAt: new Date(),
    };
    await this.persistState();
    return { ...state.themes[idx]! };
  }

  async deleteTheme(id: number): Promise<Theme | null> {
    const state = await this.ensureLoaded();
    const idx = state.themes.findIndex((t) => t.id === id);
    if (idx === -1) return null;
    const theme = state.themes[idx]!;

    if (theme.isBuiltIn) {
      state.themes[idx] = { ...theme, isActive: false };
    } else {
      state.themes.splice(idx, 1);
    }
    await this.persistState();
    return { ...theme };
  }
}
