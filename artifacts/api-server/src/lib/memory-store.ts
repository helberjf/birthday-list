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
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const DEFAULT_EVENT_CONFIG: EventConfig = {
  id: 1,
  childName: "",
  age: "",
  dateLabel: "",
  dateFull: "",
  timeLabel: "",
  location: "",
  neighborhood: "",
  tagline: "",
  inviteImageUrl: null,
  heroBgFrom: "#f9a8d4",
  heroBgVia: "#fde68a",
  heroBgTo: "#bbf7d0",
  musicUrl: null,
  galleryEnabled: false,
  galleryTitle: "Galeria",
  theme: "default",
  spotifyPlaylistUrl: null,
  mapsUrl: null,
  whatsappReminderEnabled: false,
  whatsappReminderDaysBefore: "1",
  updatedAt: new Date(),
};

export class MemoryStore {
  private eventConfig: EventConfig = { ...DEFAULT_EVENT_CONFIG };
  private guests: Guest[] = [];
  private photos: Photo[] = [];
  private audit: GuestAudit[] = [];
  private themes: Theme[] = DEFAULT_THEMES.map((t, i) => ({
    ...t,
    id: i + 1,
    isBuiltIn: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));
  private nextGuestId = 1;
  private nextPhotoId = 1;
  private nextAuditId = 1;
  private nextThemeId = this.themes.length + 1;

  async getOrCreateEventConfig(): Promise<EventConfig> {
    return { ...this.eventConfig };
  }

  async updateEventConfig(data: Partial<Omit<EventConfig, "id" | "updatedAt">>): Promise<EventConfig> {
    this.eventConfig = { ...this.eventConfig, ...data, updatedAt: new Date() };
    return { ...this.eventConfig };
  }

  async listGuests(params: ListGuestsParams): Promise<Paginated<Guest>> {
    let filtered = this.guests;
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
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const childName = data.childName ?? null;
    const duplicate = this.guests.some(
      (g) =>
        g.parentName.toLowerCase() === data.parentName.toLowerCase() &&
        (g.childName ?? null)?.toLowerCase() === (childName ?? null)?.toLowerCase() &&
        g.createdAt > fiveMinutesAgo,
    );
    if (duplicate) return { duplicate: true };

    const now = new Date();
    const guest: Guest = {
      id: this.nextGuestId++,
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
    this.guests.push(guest);
    return { guest: { ...guest }, duplicate: false };
  }

  async getGuest(id: number): Promise<Guest | null> {
    return this.guests.find((g) => g.id === id) ?? null;
  }

  async updateGuest(id: number, data: Partial<Guest>): Promise<{ previous: Guest; guest: Guest } | null> {
    const idx = this.guests.findIndex((g) => g.id === id);
    if (idx === -1) return null;
    const previous = { ...this.guests[idx]! };
    this.guests[idx] = { ...previous, ...data, id, updatedAt: new Date() };
    return { previous, guest: { ...this.guests[idx]! } };
  }

  async deleteGuest(id: number): Promise<Guest | null> {
    const idx = this.guests.findIndex((g) => g.id === id);
    if (idx === -1) return null;
    const [guest] = this.guests.splice(idx, 1);
    return guest ?? null;
  }

  async listConfirmedGuestsWithPhone(): Promise<Guest[]> {
    return this.guests
      .filter((g) => g.status === "confirmed" && g.phone)
      .sort((a, b) => a.parentName.localeCompare(b.parentName));
  }

  async getPublicStats() {
    const confirmed = this.guests.filter((g) => g.status === "confirmed");
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
    const confirmed = this.guests.filter((g) => g.status === "confirmed").length;
    const maybe = this.guests.filter((g) => g.status === "maybe").length;
    const declined = this.guests.filter((g) => g.status === "declined").length;
    const totalAdults = this.guests.reduce((s, g) => s + g.adultsCount, 0);
    const totalChildren = this.guests.reduce((s, g) => s + g.childrenCount, 0);
    return {
      total: this.guests.length,
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
    const entry: GuestAudit = {
      id: this.nextAuditId++,
      guestId,
      guestName,
      action,
      previousData,
      newData,
      createdAt: new Date(),
    };
    this.audit.push(entry);
    return { ...entry };
  }

  async listGuestAudit(params: { page: number; limit: number; guestId?: number }): Promise<Paginated<GuestAudit>> {
    let filtered = this.audit;
    if (params.guestId !== undefined) {
      filtered = filtered.filter((a) => a.guestId === params.guestId);
    }
    const sorted = [...filtered].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
    return paginate(sorted, params.page, params.limit);
  }

  async listPhotos(): Promise<Photo[]> {
    return [...this.photos].sort(
      (a, b) => a.displayOrder - b.displayOrder || a.createdAt.getTime() - b.createdAt.getTime(),
    );
  }

  async createPhoto(data: { url: string; caption?: string | null; displayOrder?: number }): Promise<Photo> {
    const photo: Photo = {
      id: this.nextPhotoId++,
      url: data.url,
      caption: data.caption ?? null,
      displayOrder: data.displayOrder ?? this.photos.length,
      createdAt: new Date(),
    };
    this.photos.push(photo);
    return { ...photo };
  }

  async updatePhoto(id: number, data: Partial<Pick<Photo, "caption" | "displayOrder">>): Promise<Photo | null> {
    const idx = this.photos.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    this.photos[idx] = { ...this.photos[idx]!, ...data };
    return { ...this.photos[idx]! };
  }

  async deletePhoto(id: number): Promise<Photo | null> {
    const idx = this.photos.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    const [photo] = this.photos.splice(idx, 1);
    return photo ?? null;
  }

  async listThemes(includeInactive = false): Promise<Theme[]> {
    const list = includeInactive
      ? this.themes
      : this.themes.filter((t) => t.isActive);
    return [...list].sort(
      (a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name),
    );
  }

  async createTheme(data: Omit<Theme, "id" | "isBuiltIn" | "createdAt" | "updatedAt">): Promise<Theme> {
    const slug = normalizeSlug(data.slug);
    if (!slug) throw new Error("INVALID_SLUG");
    if (this.themes.some((t) => t.slug === slug)) throw new Error("DUPLICATE_SLUG");

    const now = new Date();
    const theme: Theme = {
      ...data,
      id: this.nextThemeId++,
      slug,
      isBuiltIn: false,
      createdAt: now,
      updatedAt: now,
    };
    this.themes.push(theme);
    return { ...theme };
  }

  async updateTheme(id: number, data: Partial<Theme>): Promise<Theme | null> {
    const idx = this.themes.findIndex((t) => t.id === id);
    if (idx === -1) return null;

    const slug = data.slug !== undefined ? normalizeSlug(data.slug) : undefined;
    if (slug !== undefined && !slug) throw new Error("INVALID_SLUG");
    if (slug && this.themes.some((t) => t.slug === slug && t.id !== id)) throw new Error("DUPLICATE_SLUG");

    this.themes[idx] = {
      ...this.themes[idx]!,
      ...data,
      ...(slug ? { slug } : {}),
      id,
      updatedAt: new Date(),
    };
    return { ...this.themes[idx]! };
  }

  async deleteTheme(id: number): Promise<Theme | null> {
    const idx = this.themes.findIndex((t) => t.id === id);
    if (idx === -1) return null;
    const theme = this.themes[idx]!;

    if (theme.isBuiltIn) {
      this.themes[idx] = { ...theme, isActive: false };
    } else {
      this.themes.splice(idx, 1);
    }
    return { ...theme };
  }
}
