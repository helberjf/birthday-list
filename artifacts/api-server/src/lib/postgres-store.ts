import {
  db,
  DEFAULT_THEMES,
  eventConfigTable,
  guestAuditTable,
  guestsTable,
  photosTable,
  themesTable,
} from "@workspace/db";
import { and, asc, count, desc, eq, ilike, isNotNull, or, sql, sum } from "drizzle-orm";
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

function normalizeSlug(slug: string) {
  return slug
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function isUniqueViolation(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "23505";
}

function publicCount(value: unknown): number {
  return Number(value ?? 0);
}

export class PostgresStore {
  async getOrCreateEventConfig(): Promise<EventConfig> {
    const [existing] = await db.select().from(eventConfigTable).limit(1);
    if (existing) return existing as EventConfig;

    const [created] = await db.insert(eventConfigTable).values({}).returning();
    return created as EventConfig;
  }

  async updateEventConfig(data: Partial<Omit<EventConfig, "id" | "updatedAt">>): Promise<EventConfig> {
    const config = await this.getOrCreateEventConfig();
    const [updated] = await db
      .update(eventConfigTable)
      .set(data as Partial<typeof eventConfigTable.$inferInsert>)
      .where(eq(eventConfigTable.id, config.id))
      .returning();

    return (updated ?? config) as EventConfig;
  }

  async listGuests(params: ListGuestsParams): Promise<Paginated<Guest>> {
    const conditions = [];
    if (params.status) {
      conditions.push(eq(guestsTable.status, params.status));
    }
    if (params.search) {
      conditions.push(
        or(
          ilike(guestsTable.parentName, `%${params.search}%`),
          ilike(guestsTable.childName, `%${params.search}%`),
        ),
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const offset = (params.page - 1) * params.limit;

    const [totalResult, items] = await Promise.all([
      db.select({ count: count() }).from(guestsTable).where(whereClause),
      db
        .select()
        .from(guestsTable)
        .where(whereClause)
        .orderBy(desc(guestsTable.createdAt))
        .limit(params.limit)
        .offset(offset),
    ]);

    const totalItems = publicCount(totalResult[0]?.count);
    return {
      items: items as Guest[],
      page: params.page,
      limit: params.limit,
      totalItems,
      totalPages: Math.ceil(totalItems / params.limit),
    };
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
    const childName = data.childName ?? null;
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const duplicateCondition = childName
      ? sql`lower(${guestsTable.parentName}) = lower(${data.parentName}) AND lower(${guestsTable.childName}) = lower(${childName}) AND ${guestsTable.createdAt} > ${fiveMinutesAgo}`
      : sql`lower(${guestsTable.parentName}) = lower(${data.parentName}) AND ${guestsTable.childName} IS NULL AND ${guestsTable.createdAt} > ${fiveMinutesAgo}`;

    const existing = await db
      .select({ id: guestsTable.id })
      .from(guestsTable)
      .where(duplicateCondition)
      .limit(1);

    if (existing.length > 0) return { duplicate: true };

    const [guest] = await db
      .insert(guestsTable)
      .values({
        parentName: data.parentName,
        childName,
        phone: data.phone ?? null,
        email: data.email ?? null,
        adultsCount: data.adultsCount,
        childrenCount: data.childrenCount,
        status: data.status,
        notes: data.notes ?? null,
      })
      .returning();

    return { guest: guest as Guest, duplicate: false };
  }

  async getGuest(id: number): Promise<Guest | null> {
    const [guest] = await db.select().from(guestsTable).where(eq(guestsTable.id, id));
    return (guest as Guest | undefined) ?? null;
  }

  async updateGuest(id: number, data: Partial<Guest>): Promise<{ previous: Guest; guest: Guest } | null> {
    const previous = await this.getGuest(id);
    if (!previous) return null;

    const updateData: Partial<typeof guestsTable.$inferInsert> = {};
    if (data.parentName !== undefined) updateData.parentName = data.parentName;
    if (data.childName !== undefined) updateData.childName = data.childName;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.adultsCount !== undefined) updateData.adultsCount = data.adultsCount;
    if (data.childrenCount !== undefined) updateData.childrenCount = data.childrenCount;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.adminNotes !== undefined) updateData.adminNotes = data.adminNotes;

    const [guest] = await db
      .update(guestsTable)
      .set(updateData)
      .where(eq(guestsTable.id, id))
      .returning();

    return { previous, guest: guest as Guest };
  }

  async deleteGuest(id: number): Promise<Guest | null> {
    const [guest] = await db.delete(guestsTable).where(eq(guestsTable.id, id)).returning();
    return (guest as Guest | undefined) ?? null;
  }

  async listConfirmedGuestsWithPhone(): Promise<Guest[]> {
    const guests = await db
      .select()
      .from(guestsTable)
      .where(and(eq(guestsTable.status, "confirmed"), isNotNull(guestsTable.phone)))
      .orderBy(asc(guestsTable.parentName));
    return guests as Guest[];
  }

  async getPublicStats() {
    const confirmedWhere = eq(guestsTable.status, "confirmed");
    const [[familiesRow], [adultsRow], [childrenRow]] = await Promise.all([
      db.select({ count: count() }).from(guestsTable).where(confirmedWhere),
      db.select({ total: sum(guestsTable.adultsCount) }).from(guestsTable).where(confirmedWhere),
      db.select({ total: sum(guestsTable.childrenCount) }).from(guestsTable).where(confirmedWhere),
    ]);

    const totalAdults = publicCount(adultsRow?.total);
    const totalChildren = publicCount(childrenRow?.total);
    return {
      totalFamilies: publicCount(familiesRow?.count),
      totalAdults,
      totalChildren,
      totalPeople: totalAdults + totalChildren,
    };
  }

  async getAdminStats() {
    const [[totalRow], [confirmedRow], [maybeRow], [declinedRow], [adultsRow], [childrenRow]] = await Promise.all([
      db.select({ count: count() }).from(guestsTable),
      db.select({ count: count() }).from(guestsTable).where(eq(guestsTable.status, "confirmed")),
      db.select({ count: count() }).from(guestsTable).where(eq(guestsTable.status, "maybe")),
      db.select({ count: count() }).from(guestsTable).where(eq(guestsTable.status, "declined")),
      db.select({ total: sum(guestsTable.adultsCount) }).from(guestsTable),
      db.select({ total: sum(guestsTable.childrenCount) }).from(guestsTable),
    ]);

    return {
      total: publicCount(totalRow?.count),
      confirmed: publicCount(confirmedRow?.count),
      maybe: publicCount(maybeRow?.count),
      declined: publicCount(declinedRow?.count),
      totalAdults: publicCount(adultsRow?.total),
      totalChildren: publicCount(childrenRow?.total),
    };
  }

  async createGuestAudit(
    guestId: number | null,
    guestName: string,
    action: string,
    previousData: Record<string, unknown> | null,
    newData: Record<string, unknown> | null,
  ): Promise<GuestAudit> {
    const [audit] = await db
      .insert(guestAuditTable)
      .values({
        guestId,
        guestName,
        action,
        previousData: previousData as any,
        newData: newData as any,
      })
      .returning();
    return audit as GuestAudit;
  }

  async listGuestAudit(params: { page: number; limit: number; guestId?: number }): Promise<Paginated<GuestAudit>> {
    const offset = (params.page - 1) * params.limit;
    const whereClause = params.guestId ? eq(guestAuditTable.guestId, params.guestId) : undefined;

    const [totalResult, items] = await Promise.all([
      db.select({ count: count() }).from(guestAuditTable).where(whereClause),
      db
        .select()
        .from(guestAuditTable)
        .where(whereClause)
        .orderBy(desc(guestAuditTable.createdAt))
        .limit(params.limit)
        .offset(offset),
    ]);

    const totalItems = publicCount(totalResult[0]?.count);
    return {
      items: items as GuestAudit[],
      page: params.page,
      limit: params.limit,
      totalItems,
      totalPages: Math.ceil(totalItems / params.limit),
    };
  }

  async listPhotos(): Promise<Photo[]> {
    const photos = await db
      .select()
      .from(photosTable)
      .orderBy(asc(photosTable.displayOrder), asc(photosTable.createdAt));
    return photos as Photo[];
  }

  async createPhoto(data: { url: string; caption?: string | null; displayOrder?: number }): Promise<Photo> {
    const [countResult] = await db.select({ count: count() }).from(photosTable);
    const [photo] = await db
      .insert(photosTable)
      .values({
        url: data.url,
        caption: data.caption ?? null,
        displayOrder: data.displayOrder ?? publicCount(countResult?.count),
      })
      .returning();
    return photo as Photo;
  }

  async updatePhoto(id: number, data: Partial<Pick<Photo, "caption" | "displayOrder">>): Promise<Photo | null> {
    const updateData: Partial<typeof photosTable.$inferInsert> = {};
    if (data.caption !== undefined) updateData.caption = data.caption;
    if (data.displayOrder !== undefined) updateData.displayOrder = data.displayOrder;

    const [photo] = await db.update(photosTable).set(updateData).where(eq(photosTable.id, id)).returning();
    return (photo as Photo | undefined) ?? null;
  }

  async deletePhoto(id: number): Promise<Photo | null> {
    const [photo] = await db.delete(photosTable).where(eq(photosTable.id, id)).returning();
    return (photo as Photo | undefined) ?? null;
  }

  private async seedThemesIfEmpty(): Promise<void> {
    const [existing] = await db.select({ count: count() }).from(themesTable);
    if (publicCount(existing?.count) > 0) return;

    try {
      await db.insert(themesTable).values(
        DEFAULT_THEMES.map((theme) => ({
          ...theme,
          isActive: true,
          isBuiltIn: true,
        })),
      );
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
    }
  }

  async listThemes(includeInactive = false): Promise<Theme[]> {
    await this.seedThemesIfEmpty();
    const query = db
      .select()
      .from(themesTable)
      .orderBy(asc(themesTable.displayOrder), asc(themesTable.name));

    if (includeInactive) {
      return (await query) as Theme[];
    }

    const themes = await db
      .select()
      .from(themesTable)
      .where(eq(themesTable.isActive, true))
      .orderBy(asc(themesTable.displayOrder), asc(themesTable.name));
    return themes as Theme[];
  }

  async createTheme(data: Omit<Theme, "id" | "isBuiltIn" | "createdAt" | "updatedAt">): Promise<Theme> {
    await this.seedThemesIfEmpty();
    const slug = normalizeSlug(data.slug);
    if (!slug) throw new Error("INVALID_SLUG");

    try {
      const [theme] = await db
        .insert(themesTable)
        .values({
          ...data,
          slug,
          isBuiltIn: false,
        })
        .returning();
      return theme as Theme;
    } catch (error) {
      if (isUniqueViolation(error)) throw new Error("DUPLICATE_SLUG");
      throw error;
    }
  }

  async updateTheme(id: number, data: Partial<Theme>): Promise<Theme | null> {
    await this.seedThemesIfEmpty();
    const updateData: Partial<typeof themesTable.$inferInsert> = {};
    if (data.slug !== undefined) updateData.slug = normalizeSlug(data.slug);
    if (data.slug !== undefined && !updateData.slug) throw new Error("INVALID_SLUG");
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

    try {
      const [theme] = await db.update(themesTable).set(updateData).where(eq(themesTable.id, id)).returning();
      return (theme as Theme | undefined) ?? null;
    } catch (error) {
      if (isUniqueViolation(error)) throw new Error("DUPLICATE_SLUG");
      throw error;
    }
  }

  async deleteTheme(id: number): Promise<Theme | null> {
    await this.seedThemesIfEmpty();
    const [existing] = await db.select().from(themesTable).where(eq(themesTable.id, id));
    if (!existing) return null;

    if (existing.isBuiltIn) {
      await db.update(themesTable).set({ isActive: false }).where(eq(themesTable.id, id));
    } else {
      await db.delete(themesTable).where(eq(themesTable.id, id));
    }

    return existing as Theme;
  }
}
