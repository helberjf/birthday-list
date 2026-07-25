import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Users, CheckCircle2, HelpCircle, XCircle, LogOut, Search,
  Edit2, Trash2, Loader2, Baby, UserRound, Settings, ListChecks,
  Save, Image, Palette, Upload, Link as LinkIcon, RotateCcw,
  FileDown, FileSpreadsheet, MessageCircle, Camera, Bell,
  History, ArrowUp, ArrowDown, Plus, X, Music2, Eye,
  Copy, Check, ChevronLeft, ChevronRight, Clock, Sparkles,
  Send, AlertCircle, Wifi, WifiOff, FileText, MapPin,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import {
  useGetAdminStats, useListGuests, useUpdateGuest, useDeleteGuest,
  useGetEventConfig, useUpdateEventConfig,
  useListPhotos, useCreatePhoto, useUpdatePhoto, useDeletePhoto,
  useListConfirmedGuests, useListGuestAudit,
  useGetWhatsAppStatus, useSendWhatsApp,
  useListAdminThemes, useCreateTheme, useUpdateTheme, useDeleteTheme,
  listGuests, getListGuestsQueryKey, getGetAdminStatsQueryKey,
  getGetEventConfigQueryKey, getListPhotosQueryKey,
  getListAdminThemesQueryKey, getListThemesQueryKey,
  type Guest, type Photo, type CreateThemeBody, type UpdateThemeBody,
} from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  BLANK_THEME_FORM,
  getThemeBySlug,
  getThemeCatalog,
  normalizeThemeSlug,
  themeToFormDefaults,
  type ThemeView,
} from "@/lib/themes";

type Tab = "guests" | "gallery" | "reminders" | "audit" | "config";

const THEME_PRESETS = [
  { id: "minecraft",  name: "Minecraft",    emoji: "⚔️", from: "#1a6b2a", via: "#2d8a40", to: "#4caf50" },
  { id: "mario",      name: "Super Mario",  emoji: "🍄", from: "#7B0000", via: "#c62828", to: "#ef9a9a" },
  { id: "princesas",  name: "Princesas",    emoji: "👸", from: "#4a148c", via: "#880e4f", to: "#f48fb1" },
  { id: "futebol",    name: "Futebol",      emoji: "⚽", from: "#1b5e20", via: "#2e7d32", to: "#81c784" },
  { id: "spiderman",  name: "Homem Aranha", emoji: "🕷️", from: "#7B0000", via: "#c62828", to: "#1a237e" },
  { id: "roblox",     name: "Roblox",       emoji: "🎮", from: "#7a0000", via: "#cc0000", to: "#ff6666" },
  { id: "sonic",      name: "Sonic",        emoji: "⚡", from: "#002266", via: "#0050c8", to: "#6699ff" },
  { id: "dinossauro", name: "Dinossauro",   emoji: "🦕", from: "#1b3a1b", via: "#3d6b3d", to: "#8bc34a" },
  { id: "sereia",     name: "Sereia",       emoji: "🧜‍♀️", from: "#004d52", via: "#00838f", to: "#80deea" },
  { id: "unicornio",  name: "Unicórnio",    emoji: "🦄", from: "#4a148c", via: "#880e4f", to: "#f8bbd9" },
  { id: "astronauta", name: "Astronauta",   emoji: "🚀", from: "#0a0a2a", via: "#1a237e", to: "#3949ab" },
  { id: "pokemon",    name: "Pokémon",      emoji: "⚡", from: "#b71c1c", via: "#e53935", to: "#ffca28" },
  { id: "frozen",     name: "Frozen",       emoji: "❄️", from: "#01579b", via: "#0277bd", to: "#b3e5fc" },
  { id: "safari",     name: "Safari",       emoji: "🦁", from: "#4e342e", via: "#795548", to: "#ffca28" },
] as const;

const BG_PRESETS = [
  { label: "Minecraft Verde",  from: "#1a6b2a", via: "#2d8a40", to: "#4caf50" },
  { label: "Céu Noturno",      from: "#0d1b4b", via: "#1a3580", to: "#1565C0" },
  { label: "Pôr do Sol",       from: "#7B2D00", via: "#BF360C", to: "#FF7043" },
  { label: "Oceano",           from: "#003B6F", via: "#0277BD", to: "#29B6F6" },
  { label: "Roxo Mágico",      from: "#2E0057", via: "#6A1B9A", to: "#AB47BC" },
  { label: "Rosa Candy",       from: "#880E4F", via: "#C2185B", to: "#F06292" },
  { label: "Cinza Moderno",    from: "#1C1C1E", via: "#2C2C2E", to: "#3A3A3C" },
  { label: "Dourado Real",     from: "#5D4037", via: "#8D6E63", to: "#FFD54F" },
];

const STATUS_LABEL: Record<string, string> = {
  confirmed: "Confirmado",
  maybe: "Talvez",
  declined: "Não vai",
};

const ACTION_LABEL: Record<string, { label: string; color: string }> = {
  created:       { label: "Criado",              color: "bg-green-100 text-green-700" },
  updated:       { label: "Atualizado",           color: "bg-blue-100 text-blue-700" },
  deleted:       { label: "Excluído",             color: "bg-red-100 text-red-700" },
};

function cleanPhone(phone: string) { return phone.replace(/\D/g, ""); }
function buildWhatsAppUrl(phone: string, name: string, event: { dateLabel: string; timeLabel: string; location: string; neighborhood: string; childName: string }) {
  const number = cleanPhone(phone).startsWith("55") ? cleanPhone(phone) : `55${cleanPhone(phone)}`;
  const msg = `Olá, ${name}! 🎮 Lembrando que a festa do ${event.childName} é no dia ${event.dateLabel} às ${event.timeLabel}.\n📍 ${event.location} — ${event.neighborhood}\n\nNos vemos lá! 🎉`;
  return `https://wa.me/${number}?text=${encodeURIComponent(msg)}`;
}

/* ── Export helpers ─────────────────────────────────── */
function guestRow(g: Guest) {
  return {
    "Responsável": g.parentName, "Criança": g.childName || "—",
    "WhatsApp": g.phone || "—", "Adultos": g.adultsCount, "Crianças": g.childrenCount,
    "Total": g.adultsCount + g.childrenCount, "Status": STATUS_LABEL[g.status] ?? g.status,
    "Obs. Público": g.notes || "—", "Data RSVP": format(new Date(g.createdAt), "dd/MM/yyyy HH:mm"),
  };
}
async function fetchAllGuests(authHeaders: Record<string, string>) {
  return listGuests({ page: 1, limit: 9999 }, { headers: authHeaders } as RequestInit);
}
function exportExcel(guests: Guest[]) {
  const data = guests.map(guestRow);
  const ws = XLSX.utils.json_to_sheet(data);
  ws["!cols"] = Object.keys(data[0] ?? {}).map(k => ({ wch: Math.max(k.length, 14) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Convidados");
  XLSX.writeFile(wb, `convidados-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
}
function exportPDF(guests: Guest[]) {
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Lista de Convidados", 14, 15);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")} · ${guests.length} respostas`, 14, 22);
  autoTable(doc, {
    startY: 28,
    head: [["Responsável","Criança","WhatsApp","Ad.","Cr.","Total","Status","Data"]],
    body: guests.map(g => [g.parentName, g.childName||"—", g.phone||"—", g.adultsCount, g.childrenCount, g.adultsCount+g.childrenCount, STATUS_LABEL[g.status]||g.status, format(new Date(g.createdAt),"dd/MM/yyyy")]),
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [45, 138, 64], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [240, 249, 240] },
  });
  doc.save(`convidados-${format(new Date(), "yyyy-MM-dd")}.pdf`);
}

/* ═══════════════════════════════════════════════════════
   MAIN
═══════════════════════════════════════════════════════ */
export default function AdminDashboard() {
  const { isAuthenticated, authHeaders, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<Tab>("guests");

  useEffect(() => { if (!isAuthenticated) setLocation("/admin/login"); }, [isAuthenticated, setLocation]);
  if (!isAuthenticated || !authHeaders) return null;

  const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "guests",    label: "Convidados", icon: ListChecks },
    { id: "gallery",   label: "Galeria",    icon: Camera },
    { id: "reminders", label: "Lembretes",  icon: Bell },
    { id: "audit",     label: "Histórico",  icon: History },
    { id: "config",    label: "Configs",    icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-muted/20 pb-20">
      <header className="bg-white border-b border-border sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-lg sm:text-2xl font-display text-primary">Painel do Organizador</h1>
          <button onClick={logout}
            className="flex items-center gap-2 text-muted-foreground hover:text-destructive transition-colors font-bold px-3 py-2 rounded-lg hover:bg-destructive/10 text-sm">
            <LogOut className="w-4 h-4" /> <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
        <div className="max-w-5xl mx-auto px-2 flex border-t border-border overflow-x-auto">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`flex items-center gap-1.5 px-3 py-3 text-xs sm:text-sm font-bold border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                activeTab === id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}>
              <Icon className="w-3.5 h-3.5" /> {label}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {activeTab === "guests" && <><StatsGrid authHeaders={authHeaders} /><GuestManager authHeaders={authHeaders} /></>}
        {activeTab === "gallery" && <GalleryManager authHeaders={authHeaders} />}
        {activeTab === "reminders" && <MassReminder authHeaders={authHeaders} />}
        {activeTab === "audit" && <AuditLog authHeaders={authHeaders} />}
        {activeTab === "config" && <EventConfigEditor authHeaders={authHeaders} />}
      </main>
    </div>
  );
}

/* ── Stats Grid ─────────────────────────────────────── */
function StatsGrid({ authHeaders }: { authHeaders: Record<string, string> }) {
  const { data: stats, isLoading } = useGetAdminStats({ request: authHeaders });
  if (isLoading) return <div className="h-24 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  if (!stats) return null;
  const cards = [
    { label: "Respostas",      value: stats.total,         icon: Users,        color: "text-blue-500",   bg: "bg-blue-100" },
    { label: "Confirmados",    value: stats.confirmed,     icon: CheckCircle2, color: "text-green-600",  bg: "bg-green-100" },
    { label: "Talvez",         value: stats.maybe,         icon: HelpCircle,   color: "text-yellow-600", bg: "bg-yellow-100" },
    { label: "Não vão",        value: stats.declined,      icon: XCircle,      color: "text-red-500",    bg: "bg-red-100" },
    { label: "Total Adultos",  value: stats.totalAdults,   icon: UserRound,    color: "text-violet-500", bg: "bg-violet-100" },
    { label: "Total Crianças", value: stats.totalChildren, icon: Baby,         color: "text-pink-500",   bg: "bg-pink-100" },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((s, i) => {
        const Icon = s.icon;
        return (
          <div key={i} className="bg-white p-4 rounded-2xl shadow-sm border border-border flex flex-col items-center text-center gap-2">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.bg}`}><Icon className={`w-5 h-5 ${s.color}`} /></div>
            <p className="text-2xl font-display">{s.value}</p>
            <p className="text-xs font-bold text-muted-foreground leading-tight">{s.label}</p>
          </div>
        );
      })}
    </div>
  );
}

/* ── Guest Manager ──────────────────────────────────── */
function GuestManager({ authHeaders }: { authHeaders: Record<string, string> }) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
  const [exporting, setExporting] = useState<"" | "excel" | "pdf">("");
  const { data: eventConfig } = useGetEventConfig();
  const queryClient = useQueryClient();

  useEffect(() => { const t = setTimeout(() => setDebouncedSearch(search), 300); return () => clearTimeout(t); }, [search]);

  const { data, isLoading } = useListGuests(
    { page, limit: 10, search: debouncedSearch, status: statusFilter || undefined },
    { request: authHeaders },
  );

  const deleteMutation = useDeleteGuest({
    request: authHeaders,
    mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListGuestsQueryKey() }); queryClient.invalidateQueries({ queryKey: getGetAdminStatsQueryKey() }); } },
  });

  const quickConfirm = useUpdateGuest({
    request: authHeaders,
    mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListGuestsQueryKey() }); queryClient.invalidateQueries({ queryKey: getGetAdminStatsQueryKey() }); } },
  });

  const handleDelete = (guest: Guest) => {
    const name = guest.childName ? `${guest.childName} (com ${guest.parentName})` : guest.parentName;
    if (window.confirm(`Excluir a resposta de "${name}"?`)) deleteMutation.mutate({ id: guest.id });
  };

  const handleExport = async (type: "excel" | "pdf") => {
    setExporting(type);
    try { const all = await fetchAllGuests(authHeaders); type === "excel" ? exportExcel(all.items) : exportPDF(all.items); }
    catch { alert("Erro ao exportar."); }
    finally { setExporting(""); }
  };

  const statusMap: Record<string, { label: string; badge: string }> = {
    confirmed: { label: "Confirmado", badge: "bg-green-100 text-green-700" },
    maybe:     { label: "Talvez",     badge: "bg-yellow-100 text-yellow-700" },
    declined:  { label: "Não vai",    badge: "bg-red-100 text-red-700" },
  };

  const whatsappEvent = { dateLabel: eventConfig?.dateLabel ?? "—", timeLabel: eventConfig?.timeLabel ?? "—", location: eventConfig?.location ?? "—", neighborhood: eventConfig?.neighborhood ?? "—", childName: eventConfig?.childName ?? "—" };

  return (
    <div className="bg-white rounded-3xl shadow-md border border-border overflow-hidden">
      <div className="p-4 sm:p-6 border-b border-border bg-slate-50/50">
        <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center mb-4">
          <h2 className="text-xl font-bold">Lista de Convidados</h2>
          <div className="flex items-center gap-2 flex-wrap">
            {data && <span className="text-xs font-medium text-muted-foreground bg-muted/40 px-3 py-1 rounded-full">{data.totalItems} respostas</span>}
            <button onClick={() => handleExport("excel")} disabled={exporting !== ""}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg disabled:opacity-60">
              {exporting === "excel" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5" />} Excel
            </button>
            <button onClick={() => handleExport("pdf")} disabled={exporting !== ""}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg disabled:opacity-60">
              {exporting === "pdf" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} PDF
            </button>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Buscar nome..." className="pl-9 h-11 rounded-xl bg-white text-sm" />
          </div>
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            className="h-11 rounded-xl border border-input bg-white px-3 outline-none focus:ring-2 focus:ring-primary/20 text-sm">
            <option value="">Todos os status</option>
            <option value="confirmed">Confirmados</option>
            <option value="maybe">Talvez</option>
            <option value="declined">Não vão</option>
          </select>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="block sm:hidden divide-y divide-border">
        {isLoading ? <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></div>
          : data?.items.length === 0 ? <div className="p-8 text-center text-muted-foreground text-sm">Nenhuma resposta encontrada.</div>
          : data?.items.map(guest => (
            <div key={guest.id} className="p-4 flex gap-3 items-start">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 font-display text-primary">
                {(guest.childName || guest.parentName).charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    {guest.childName ? (<><p className="font-bold text-sm truncate">{guest.childName}</p><p className="text-xs text-muted-foreground truncate">com {guest.parentName}</p></>) : <p className="font-bold text-sm truncate">{guest.parentName}</p>}
                    {guest.phone && <p className="text-xs text-muted-foreground">{guest.phone}</p>}
                    {guest.adminNotes && <p className="text-xs text-amber-600 font-medium mt-0.5 italic">📋 {guest.adminNotes}</p>}
                  </div>
                  <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-bold ${statusMap[guest.status]?.badge}`}>{statusMap[guest.status]?.label}</span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-600 font-bold px-2 py-0.5 rounded-full"><UserRound className="w-3 h-3" /> {guest.adultsCount}</span>
                  <span className="inline-flex items-center gap-1 text-xs bg-pink-50 text-pink-600 font-bold px-2 py-0.5 rounded-full"><Baby className="w-3 h-3" /> {guest.childrenCount}</span>
                  <span className="text-xs text-muted-foreground ml-auto">{format(new Date(guest.createdAt), "dd/MM HH:mm")}</span>
                </div>
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                {guest.status !== "confirmed" && (
                  <button onClick={() => quickConfirm.mutate({ id: guest.id, data: { status: "confirmed" } })}
                    className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg" title="Confirmar"><CheckCircle2 className="w-4 h-4" /></button>
                )}
                {guest.phone && (
                  <a href={buildWhatsAppUrl(guest.phone, guest.parentName, whatsappEvent)} target="_blank" rel="noopener noreferrer"
                    className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg"><MessageCircle className="w-4 h-4" /></a>
                )}
                <button onClick={() => setEditingGuest(guest)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                <button onClick={() => handleDelete(guest)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-muted/20 text-muted-foreground text-xs uppercase font-bold tracking-wider">
            <tr>
              <th className="p-4 pl-6">Data</th><th className="p-4">Responsável / Criança</th>
              <th className="p-4 text-center">Ad.</th><th className="p-4 text-center">Cr.</th>
              <th className="p-4">Status</th><th className="p-4 text-right pr-6">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? <tr><td colSpan={6} className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></td></tr>
              : data?.items.length === 0 ? <tr><td colSpan={6} className="p-8 text-center text-muted-foreground text-sm">Nenhuma resposta encontrada.</td></tr>
              : data?.items.map(guest => (
                <tr key={guest.id} className="hover:bg-muted/5 transition-colors">
                  <td className="p-4 pl-6 text-xs text-muted-foreground whitespace-nowrap">{format(new Date(guest.createdAt), "dd/MM 'às' HH:mm")}</td>
                  <td className="p-4">
                    <p className="text-sm font-medium">{guest.parentName}</p>
                    {guest.childName && <p className="text-xs text-muted-foreground italic">Criança: {guest.childName}</p>}
                    {guest.phone && <p className="text-xs text-muted-foreground">{guest.phone}</p>}
                    {guest.adminNotes && <p className="text-xs text-amber-600 font-medium italic mt-0.5">📋 {guest.adminNotes}</p>}
                  </td>
                  <td className="p-4 text-center font-bold text-blue-600">{guest.adultsCount}</td>
                  <td className="p-4 text-center font-bold text-pink-500">{guest.childrenCount}</td>
                  <td className="p-4"><span className={`px-2.5 py-1 rounded-full text-xs font-bold ${statusMap[guest.status]?.badge}`}>{statusMap[guest.status]?.label}</span></td>
                  <td className="p-4 pr-6 text-right">
                    <div className="flex justify-end gap-1">
                      {guest.status !== "confirmed" && (
                        <button onClick={() => quickConfirm.mutate({ id: guest.id, data: { status: "confirmed" } })}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg" title="Confirmar presença"><CheckCircle2 className="w-4 h-4" /></button>
                      )}
                      {guest.phone && (
                        <a href={buildWhatsAppUrl(guest.phone, guest.parentName, whatsappEvent)} target="_blank" rel="noopener noreferrer"
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg" title="WhatsApp"><MessageCircle className="w-4 h-4" /></a>
                      )}
                      <button onClick={() => setEditingGuest(guest)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(guest)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {data && data.totalPages > 1 && (
        <div className="p-4 border-t border-border flex justify-between items-center bg-slate-50/50">
          <span className="text-xs font-medium text-muted-foreground">Pág. {page} de {data.totalPages}</span>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-4 py-2 rounded-lg bg-white border border-border text-xs font-bold disabled:opacity-50 hover:bg-muted/20">Anterior</button>
            <button onClick={() => setPage(p => Math.min(data.totalPages, p + 1))} disabled={page === data.totalPages}
              className="px-4 py-2 rounded-lg bg-white border border-border text-xs font-bold disabled:opacity-50 hover:bg-muted/20">Próxima</button>
          </div>
        </div>
      )}
      {editingGuest && <EditGuestModal guest={editingGuest} onClose={() => setEditingGuest(null)} authHeaders={authHeaders} />}
    </div>
  );
}

/* ── Edit Guest Modal ───────────────────────────────── */
const updateSchema = z.object({
  parentName: z.string().min(2), childName: z.string().optional().nullable(),
  phone: z.string().optional().nullable(), adultsCount: z.coerce.number().min(1),
  childrenCount: z.coerce.number().min(0), status: z.enum(["confirmed", "maybe", "declined"]),
  notes: z.string().optional().nullable(), adminNotes: z.string().optional().nullable(),
});

function EditGuestModal({ guest, onClose, authHeaders }: { guest: Guest; onClose: () => void; authHeaders: Record<string, string> }) {
  const queryClient = useQueryClient();
  const form = useForm({
    resolver: zodResolver(updateSchema),
    defaultValues: {
      parentName: guest.parentName, childName: guest.childName ?? "", phone: guest.phone ?? "",
      adultsCount: guest.adultsCount, childrenCount: guest.childrenCount,
      status: guest.status as "confirmed"|"maybe"|"declined", notes: guest.notes ?? "",
      adminNotes: guest.adminNotes ?? "",
    },
  });
  const updateMutation = useUpdateGuest({
    request: authHeaders,
    mutation: {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListGuestsQueryKey() }); queryClient.invalidateQueries({ queryKey: getGetAdminStatsQueryKey() }); onClose(); },
    },
  });
  const onSubmit = (data: z.infer<typeof updateSchema>) =>
    updateMutation.mutate({ id: guest.id, data: { ...data, childName: data.childName?.trim() || null, adminNotes: data.adminNotes?.trim() || null } });

  return (
    <div className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-border flex justify-between items-center">
          <h3 className="text-lg font-bold">Editar Resposta</h3>
          <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground rounded-lg"><XCircle className="w-5 h-5" /></button>
        </div>
        <form onSubmit={form.handleSubmit(onSubmit)} className="p-5 space-y-4 max-h-[72vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-bold block mb-1">Responsável</label><Input {...form.register("parentName")} className="rounded-xl bg-muted/20 h-11 text-sm" /></div>
            <div><label className="text-xs font-bold block mb-1">Criança</label><Input {...form.register("childName")} className="rounded-xl bg-muted/20 h-11 text-sm" placeholder="—" /></div>
          </div>
          <div><label className="text-xs font-bold block mb-1">WhatsApp</label><Input {...form.register("phone")} className="rounded-xl bg-muted/20 h-11 text-sm" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-bold flex items-center gap-1 mb-1"><UserRound className="w-3 h-3 text-blue-500" /> Adultos</label><Input type="number" {...form.register("adultsCount")} min={1} className="rounded-xl bg-muted/20 h-11 text-sm" /></div>
            <div><label className="text-xs font-bold flex items-center gap-1 mb-1"><Baby className="w-3 h-3 text-pink-500" /> Crianças</label><Input type="number" {...form.register("childrenCount")} min={0} className="rounded-xl bg-muted/20 h-11 text-sm" /></div>
          </div>
          <div>
            <label className="text-xs font-bold block mb-1">Status</label>
            <select {...form.register("status")} className="w-full h-11 rounded-xl border border-input bg-muted/20 px-3 text-sm">
              <option value="confirmed">Confirmado</option><option value="maybe">Talvez</option><option value="declined">Não vai</option>
            </select>
          </div>
          <div><label className="text-xs font-bold block mb-1">Obs. do convidado</label><Textarea {...form.register("notes")} className="rounded-xl bg-muted/20 text-sm min-h-[60px] resize-none" /></div>
          <div className="border border-amber-200 bg-amber-50 rounded-xl p-3">
            <label className="text-xs font-bold text-amber-700 flex items-center gap-1.5 mb-1.5">
              <FileText className="w-3.5 h-3.5" /> Anotações Privadas (só você vê)
            </label>
            <Textarea {...form.register("adminNotes")} className="rounded-xl bg-white text-sm min-h-[60px] resize-none border-amber-200" placeholder="Ex: alérgico a amendoim, vai de ônibus, trazer bolo..." />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-3 font-bold text-muted-foreground hover:bg-muted/20 rounded-xl text-sm">Cancelar</button>
            <button type="submit" disabled={updateMutation.isPending}
              className="flex-1 px-4 py-3 bg-primary text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-2 text-sm">
              {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Gallery Manager ────────────────────────────────── */
function GalleryManager({ authHeaders }: { authHeaders: Record<string, string> }) {
  const queryClient = useQueryClient();
  const { data: photos = [], isLoading } = useListPhotos();
  const [newUrl, setNewUrl] = useState("");
  const [newCaption, setNewCaption] = useState("");
  const [addMode, setAddMode] = useState<"url" | "upload">("url");
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editCaption, setEditCaption] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const createMutation = useCreatePhoto({
    request: authHeaders,
    mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListPhotosQueryKey() }); setNewUrl(""); setNewCaption(""); } },
  });
  const updateMutation = useUpdatePhoto({
    request: authHeaders,
    mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListPhotosQueryKey() }); setEditingId(null); } },
  });
  const deleteMutation = useDeletePhoto({
    request: authHeaders,
    mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListPhotosQueryKey() }) },
  });

  const sorted = [...photos].sort((a, b) => a.displayOrder - b.displayOrder);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData(); fd.append("image", file);
      const res = await fetch(`${import.meta.env.BASE_URL}api/admin/upload-image`, { method: "POST", headers: authHeaders, body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Erro");
      setNewUrl(json.url);
    } catch (err: any) { alert(err.message); } finally { setUploading(false); }
  };

  const handleAdd = () => {
    if (!newUrl.trim()) return;
    createMutation.mutate({ data: { url: newUrl.trim(), caption: newCaption.trim() || null, displayOrder: sorted.length } });
  };

  const movePhoto = (photo: Photo, dir: "up" | "down") => {
    const idx = sorted.findIndex(p => p.id === photo.id);
    const newOrder = dir === "up" ? Math.max(0, photo.displayOrder - 1) : photo.displayOrder + 1;
    if (dir === "up" && idx === 0) return;
    if (dir === "down" && idx === sorted.length - 1) return;
    updateMutation.mutate({ id: photo.id, data: { displayOrder: newOrder } });
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-3xl shadow-md border border-border overflow-hidden">
        <div className="p-5 border-b border-border bg-slate-50/50">
          <h2 className="text-xl font-bold flex items-center gap-2"><Camera className="w-5 h-5 text-muted-foreground" /> Galeria de Fotos</h2>
          <p className="text-xs text-muted-foreground mt-1">Adicione fotos para exibir no site após a festa. Ative a galeria nas Configurações.</p>
        </div>
        <div className="p-5 space-y-3">
          <div className="flex gap-2 mb-2">
            {(["url","upload"] as const).map(mode => (
              <button key={mode} onClick={() => setAddMode(mode)} type="button"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${addMode === mode ? "bg-primary text-white border-primary" : "bg-white border-border text-muted-foreground"}`}>
                {mode === "url" ? <><LinkIcon className="w-3.5 h-3.5" /> URL</> : <><Upload className="w-3.5 h-3.5" /> Upload</>}
              </button>
            ))}
          </div>
          {addMode === "url" ? (
            <Input value={newUrl} onChange={e => setNewUrl(e.target.value)} placeholder="https://exemplo.com/foto.jpg" className="h-11 rounded-xl bg-muted/20 text-sm" />
          ) : (
            <div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
              <button onClick={() => fileRef.current?.click()} disabled={uploading} type="button"
                className="flex items-center gap-2 w-full px-4 py-2.5 bg-muted/40 hover:bg-muted/60 border border-dashed border-border rounded-xl text-sm font-bold text-muted-foreground disabled:opacity-50">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {uploading ? "Enviando..." : newUrl ? "✓ Imagem carregada — clique para trocar" : "Escolher arquivo (JPG, PNG, WebP)"}
              </button>
            </div>
          )}
          <Input value={newCaption} onChange={e => setNewCaption(e.target.value)} placeholder="Legenda (opcional)" className="h-11 rounded-xl bg-muted/20 text-sm" />
          <button onClick={handleAdd} disabled={createMutation.isPending || !newUrl.trim()}
            className="w-full flex items-center justify-center gap-2 bg-primary text-white font-bold py-2.5 rounded-xl text-sm hover:bg-primary/90 disabled:opacity-50">
            {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Adicionar Foto
          </button>
        </div>
      </div>

      {isLoading ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        : sorted.length === 0 ? (
          <div className="bg-white rounded-3xl border border-dashed border-border p-10 text-center text-muted-foreground text-sm">
            Nenhuma foto ainda. Adicione a primeira foto acima!
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {sorted.map((photo, idx) => (
              <div key={photo.id} className="bg-white rounded-2xl border border-border overflow-hidden shadow-sm">
                <div className="relative aspect-video bg-muted/20">
                  <img src={photo.url} alt={photo.caption ?? ""} className="w-full h-full object-cover"
                    onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  <div className="absolute top-2 right-2 flex gap-1">
                    <button onClick={() => movePhoto(photo, "up")} disabled={idx === 0} className="w-7 h-7 bg-black/40 hover:bg-black/60 text-white rounded-lg flex items-center justify-center disabled:opacity-30">
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => movePhoto(photo, "down")} disabled={idx === sorted.length - 1} className="w-7 h-7 bg-black/40 hover:bg-black/60 text-white rounded-lg flex items-center justify-center disabled:opacity-30">
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="p-3">
                  {editingId === photo.id ? (
                    <div className="flex gap-2">
                      <Input value={editCaption} onChange={e => setEditCaption(e.target.value)} className="h-9 text-sm rounded-lg flex-1" placeholder="Legenda..." autoFocus />
                      <button onClick={() => updateMutation.mutate({ id: photo.id, data: { caption: editCaption.trim() || null } })}
                        className="w-9 h-9 bg-primary text-white rounded-lg flex items-center justify-center"><Check className="w-4 h-4" /></button>
                      <button onClick={() => setEditingId(null)} className="w-9 h-9 bg-muted/40 rounded-lg flex items-center justify-center"><X className="w-4 h-4" /></button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm text-muted-foreground truncate italic">{photo.caption || "Sem legenda"}</p>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => { setEditingId(photo.id); setEditCaption(photo.caption ?? ""); }}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 className="w-3.5 h-3.5" /></button>
                        <button onClick={() => { if (window.confirm("Excluir esta foto?")) deleteMutation.mutate({ id: photo.id }); }}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  );
}

/* ── Mass Reminder ──────────────────────────────────── */
function WhatsAppApiSection({ authHeaders }: { authHeaders: Record<string, string> }) {
  const { data: status } = useGetWhatsAppStatus({ request: authHeaders });
  const sendMutation = useSendWhatsApp({ request: authHeaders });
  const [results, setResults] = useState<{ name: string; ok: boolean }[]>([]);
  const [sending, setSending] = useState(false);
  const { data: guests = [] } = useListConfirmedGuests({ request: authHeaders });
  const { data: eventConfig } = useGetEventConfig();

  const configured = status?.configured ?? false;

  const sendAll = async () => {
    if (!eventConfig) return;
    setSending(true);
    setResults([]);
    const msg = `Olá, {nome}! 🎉\n\nLembrando que a festa do ${eventConfig.childName} é dia ${eventConfig.dateLabel} às ${eventConfig.timeLabel}.\n\n📍 ${eventConfig.location} — ${eventConfig.neighborhood}\n\nNos vemos lá! 🎊`;
    try {
      const data = await sendMutation.mutateAsync({ data: { message: msg } });
      const rs: { name: string; ok: boolean }[] = [];
      for (let i = 0; i < (data.sent ?? 0); i++) rs.push({ name: `Enviado ${i+1}`, ok: true });
      for (const err of (data.errors ?? [])) rs.push({ name: err, ok: false });
      setResults(rs);
    } catch {
      setResults([{ name: "Erro ao enviar. Verifique a configuração da API.", ok: false }]);
    }
    setSending(false);
  };

  return (
    <div className="bg-white rounded-3xl shadow-md border border-border overflow-hidden">
      <div className="p-5 border-b border-border bg-slate-50/50">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Send className="w-5 h-5 text-muted-foreground" /> WhatsApp API (automático)
        </h2>
        <p className="text-xs text-muted-foreground mt-1">Envio automático via Meta Cloud API. Requer <code className="bg-muted px-1 rounded text-[11px]">WHATSAPP_TOKEN</code> e <code className="bg-muted px-1 rounded text-[11px]">WHATSAPP_PHONE_ID</code> configurados.</p>
      </div>
      <div className="p-5 space-y-4">
        <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium ${configured ? "bg-green-50 text-green-700 border border-green-200" : "bg-yellow-50 text-yellow-700 border border-yellow-200"}`}>
          {configured ? <Wifi className="w-4 h-4 shrink-0" /> : <WifiOff className="w-4 h-4 shrink-0" />}
          {configured ? "API configurada e pronta para uso" : "API não configurada — adicione as variáveis de ambiente WHATSAPP_TOKEN e WHATSAPP_PHONE_ID"}
        </div>
        {configured && (
          <>
            <div className="text-sm text-muted-foreground">
              {guests.filter(g => g.phone).length} convidados confirmados com telefone serão notificados.
            </div>
            <button onClick={sendAll} disabled={sending || guests.filter(g => g.phone).length === 0}
              className="flex items-center gap-2 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-bold px-5 py-3 rounded-xl text-sm transition-colors w-full justify-center">
              {sending ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</> : <><Send className="w-4 h-4" /> Enviar lembrete para todos</>}
            </button>
          </>
        )}
        {results.length > 0 && (
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {results.map((r, i) => (
              <div key={i} className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg ${r.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                {r.ok ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
                {r.name} — {r.ok ? "enviado" : "falhou"}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MassReminder({ authHeaders }: { authHeaders: Record<string, string> }) {
  const { data: guests = [], isLoading } = useListConfirmedGuests({ request: authHeaders });
  const { data: eventConfig } = useGetEventConfig();
  const [template, setTemplate] = useState("");
  const [copiedAll, setCopiedAll] = useState(false);

  useEffect(() => {
    if (eventConfig) {
      setTemplate(
        `Olá, {nome}! 🎮\n\nLembrando que a festa do ${eventConfig.childName} é no dia ${eventConfig.dateLabel} às ${eventConfig.timeLabel}.\n\n📍 ${eventConfig.location} — ${eventConfig.neighborhood}\n\nNos vemos lá! 🎉`
      );
    }
  }, [eventConfig]);

  const buildUrl = (guest: Guest) => {
    const msg = template.replace(/{nome}/g, guest.parentName);
    const number = cleanPhone(guest.phone ?? "").startsWith("55") ? cleanPhone(guest.phone ?? "") : `55${cleanPhone(guest.phone ?? "")}`;
    return `https://wa.me/${number}?text=${encodeURIComponent(msg)}`;
  };

  const copyAllPhones = async () => {
    const phones = guests.map(g => g.phone).filter(Boolean).join("\n");
    await navigator.clipboard.writeText(phones).catch(() => {});
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-3xl shadow-md border border-border overflow-hidden">
        <div className="p-5 border-b border-border bg-slate-50/50">
          <h2 className="text-xl font-bold flex items-center gap-2"><Bell className="w-5 h-5 text-muted-foreground" /> Lembretes em Massa</h2>
          <p className="text-xs text-muted-foreground mt-1">Envie lembretes via WhatsApp para os confirmados com telefone cadastrado.</p>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="text-xs font-bold block mb-1.5">Mensagem do lembrete <span className="font-normal text-muted-foreground">(use {"{nome}"} para o nome do responsável)</span></label>
            <Textarea value={template} onChange={e => setTemplate(e.target.value)}
              className="min-h-[120px] rounded-xl bg-muted/20 text-sm resize-none font-mono" />
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{guests.length} convidado{guests.length !== 1 ? "s" : ""} confirmado{guests.length !== 1 ? "s" : ""} com telefone</span>
            <button onClick={copyAllPhones}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-muted/40 hover:bg-muted/60 text-xs font-bold rounded-lg transition-colors">
              {copiedAll ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedAll ? "Copiado!" : "Copiar todos os telefones"}
            </button>
          </div>
        </div>
      </div>

      {isLoading ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        : guests.length === 0 ? (
          <div className="bg-white rounded-3xl border border-dashed border-border p-10 text-center text-muted-foreground text-sm">
            Nenhum convidado confirmado com telefone cadastrado ainda.
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-md border border-border overflow-hidden">
            <div className="divide-y divide-border">
              {guests.map(guest => (
                <div key={guest.id} className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0 font-display text-green-700">
                    {(guest.childName || guest.parentName).charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    {guest.childName ? (
                      <><p className="font-bold text-sm truncate">{guest.childName}</p><p className="text-xs text-muted-foreground truncate">com {guest.parentName}</p></>
                    ) : <p className="font-bold text-sm truncate">{guest.parentName}</p>}
                    <p className="text-xs text-muted-foreground">{guest.phone}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 text-xs text-muted-foreground">
                    <UserRound className="w-3.5 h-3.5" /> {guest.adultsCount}
                    <Baby className="w-3.5 h-3.5 ml-1" /> {guest.childrenCount}
                  </div>
                  <a href={buildUrl(guest)} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white font-bold px-3 py-2 rounded-xl text-xs transition-colors shrink-0">
                    <MessageCircle className="w-4 h-4" /> Enviar
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
      <WhatsAppApiSection authHeaders={authHeaders} />
    </div>
  );
}

/* ── Audit Log ──────────────────────────────────────── */
function AuditLog({ authHeaders }: { authHeaders: Record<string, string> }) {
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<number | null>(null);
  const { data, isLoading } = useListGuestAudit({ page, limit: 20 }, { request: authHeaders });

  const getActionInfo = (action: string) => {
    if (action.startsWith("status_changed")) return { label: "Status alterado", color: "bg-purple-100 text-purple-700" };
    return ACTION_LABEL[action] ?? { label: action, color: "bg-muted text-muted-foreground" };
  };

  return (
    <div className="bg-white rounded-3xl shadow-md border border-border overflow-hidden">
      <div className="p-5 border-b border-border bg-slate-50/50">
        <h2 className="text-xl font-bold flex items-center gap-2"><History className="w-5 h-5 text-muted-foreground" /> Histórico de Alterações</h2>
        <p className="text-xs text-muted-foreground mt-1">Registro de todas as criações, edições e exclusões de convidados.</p>
      </div>

      {isLoading ? <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></div>
        : !data || data.items.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground text-sm">Nenhum histórico ainda. As ações nos convidados aparecerão aqui.</div>
        ) : (
          <div className="divide-y divide-border">
            {data.items.map(entry => {
              const info = getActionInfo(entry.action);
              return (
                <div key={entry.id} className="px-5 py-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-muted/30 flex items-center justify-center shrink-0 mt-0.5">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm">{entry.guestName}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${info.color}`}>{info.label}</span>
                        {entry.action.includes("→") && (
                          <span className="text-xs text-muted-foreground font-mono">({entry.action.split(":")[1]})</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{format(new Date(entry.createdAt), "dd/MM/yyyy 'às' HH:mm:ss")}</p>
                    </div>
                    {(entry.previousData != null || entry.newData != null) && (
                      <button onClick={() => setExpanded(expanded === entry.id ? null : entry.id)}
                        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 shrink-0">
                        <Eye className="w-3.5 h-3.5" /> Detalhes
                      </button>
                    )}
                  </div>
                  {expanded === entry.id && (
                    <div className="mt-3 ml-11 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {entry.previousData != null && (
                        <div className="bg-red-50 border border-red-100 rounded-xl p-3">
                          <p className="text-xs font-bold text-red-600 mb-1">Antes</p>
                          <pre className="text-xs text-red-800 whitespace-pre-wrap overflow-auto max-h-40 font-mono">
                            {JSON.stringify(entry.previousData as object, null, 2)}
                          </pre>
                        </div>
                      )}
                      {entry.newData != null && (
                        <div className="bg-green-50 border border-green-100 rounded-xl p-3">
                          <p className="text-xs font-bold text-green-600 mb-1">Depois</p>
                          <pre className="text-xs text-green-800 whitespace-pre-wrap overflow-auto max-h-40 font-mono">
                            {JSON.stringify(entry.newData as object, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

      {data && data.totalPages > 1 && (
        <div className="p-4 border-t border-border flex justify-between items-center bg-slate-50/50">
          <span className="text-xs text-muted-foreground">Pág. {page} de {data.totalPages} · {data.totalItems} registros</span>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="w-9 h-9 rounded-lg bg-white border border-border flex items-center justify-center disabled:opacity-50 hover:bg-muted/20"><ChevronLeft className="w-4 h-4" /></button>
            <button onClick={() => setPage(p => Math.min(data.totalPages, p + 1))} disabled={page === data.totalPages}
              className="w-9 h-9 rounded-lg bg-white border border-border flex items-center justify-center disabled:opacity-50 hover:bg-muted/20"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Event Config Editor ────────────────────────────── */
const configSchema = z.object({
  childName: z.string().min(1), age: z.string().min(1), dateLabel: z.string().min(1),
  dateFull: z.string().min(1), timeLabel: z.string().min(1), location: z.string().min(1),
  neighborhood: z.string().min(1), tagline: z.string().min(1),
  inviteImageUrl: z.string().nullable().optional(),
  heroBgFrom: z.string().min(1), heroBgVia: z.string().min(1), heroBgTo: z.string().min(1),
  musicUrl: z.string().nullable().optional(),
  galleryEnabled: z.boolean().optional(),
  galleryTitle: z.string().min(1).optional(),
  theme: z.string().optional(),
  spotifyPlaylistUrl: z.string().nullable().optional(),
  mapsUrl: z.string().nullable().optional(),
  whatsappReminderEnabled: z.boolean().optional(),
  whatsappReminderDaysBefore: z.string().optional(),
});
type ConfigValues = z.infer<typeof configSchema>;

const themeFormSchema = z.object({
  slug: z.string().trim().min(2, "Slug precisa ter ao menos 2 caracteres."),
  name: z.string().trim().min(2, "Nome precisa ter ao menos 2 caracteres."),
  emoji: z.string().trim().min(1, "Informe um emoji."),
  description: z.string().trim().min(1, "Descricao obrigatoria."),
  heroBgFrom: z.string().trim().min(1, "Cor inicial obrigatoria."),
  heroBgVia: z.string().trim().min(1, "Cor do meio obrigatoria."),
  heroBgTo: z.string().trim().min(1, "Cor final obrigatoria."),
  cssPrimary: z.string().trim().min(1, "CSS primaria obrigatoria."),
  cssSecondary: z.string().trim().min(1, "CSS secundaria obrigatoria."),
  cssAccent: z.string().trim().min(1, "CSS de destaque obrigatoria."),
  confirmLabel: z.string().trim().min(1, "Texto do botao obrigatorio."),
  successTitle: z.string().trim().min(1, "Titulo de sucesso obrigatorio."),
  successSub: z.string().trim().min(1, "Subtitulo de sucesso obrigatorio."),
  confettiColors: z.string().trim().min(1, "Informe ao menos uma cor de confete."),
  photoRecommendation: z.string().trim().min(1, "Recomendacao de foto obrigatoria."),
  photoPrompt: z.string().trim().min(1, "Prompt de imagem obrigatorio."),
  isActive: z.boolean(),
  displayOrder: z.coerce.number().min(0),
});
type ThemeFormValues = z.infer<typeof themeFormSchema>;

function themeFormToPayload(data: ThemeFormValues): CreateThemeBody {
  return {
    ...data,
    slug: normalizeThemeSlug(data.slug),
    confettiColors: data.confettiColors
      .split(",")
      .map((color) => color.trim())
      .filter(Boolean),
  };
}

function EventConfigEditor({ authHeaders }: { authHeaders: Record<string, string> }) {
  const queryClient = useQueryClient();
  const { data: config, isLoading } = useGetEventConfig();
  const { data: adminThemes } = useListAdminThemes({ request: authHeaders });
  const [saved, setSaved] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageMode, setImageMode] = useState<"url" | "upload">("url");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const DEFAULT_IMG = `${import.meta.env.BASE_URL}images/convite-julia.jpg`;

  const form = useForm<ConfigValues>({
    resolver: zodResolver(configSchema),
    defaultValues: {
      childName: "Julia", age: "5", dateLabel: "16/08/2026", dateFull: "Domingo, 16 de agosto de 2026", timeLabel: "13:00 às 18:00",
      location: "Av Rio Pardo, 4195", neighborhood: "Cidade Universitária - Ribeirão Preto", tagline: "Venha viver uma tarde de piscina, brincadeiras e muita alegria!",
      inviteImageUrl: null, heroBgFrom: "#4b1238", heroBgVia: "#b91d73", heroBgTo: "#f7a8cd",
      musicUrl: null, galleryEnabled: false, galleryTitle: "Fotos da Festa 📸",
      theme: "princesas",
      spotifyPlaylistUrl: "https://open.spotify.com/artist/5jTK9ytb8AJCl28jku90Rv",
      mapsUrl: "https://maps.app.goo.gl/yjUt5rZNPGpfYyfa7?g_st=iw",
      whatsappReminderEnabled: false,
      whatsappReminderDaysBefore: "3",
    },
  });

  const watchedFrom = form.watch("heroBgFrom");
  const watchedVia  = form.watch("heroBgVia");
  const watchedTo   = form.watch("heroBgTo");
  const watchedImgUrl = form.watch("inviteImageUrl");
  const watchedGalleryEnabled = form.watch("galleryEnabled");
  const watchedTheme = form.watch("theme");
  const themeOptions = getThemeCatalog(adminThemes, true);
  const activeThemeOptions = themeOptions.filter((theme) => theme.isActive !== false);
  const selectedTheme = getThemeBySlug(themeOptions, watchedTheme);

  useEffect(() => {
    if (config) {
      form.reset({
        childName: config.childName, age: config.age, dateLabel: config.dateLabel, dateFull: config.dateFull,
        timeLabel: config.timeLabel, location: config.location, neighborhood: config.neighborhood, tagline: config.tagline,
        inviteImageUrl: config.inviteImageUrl ?? null, heroBgFrom: config.heroBgFrom, heroBgVia: config.heroBgVia, heroBgTo: config.heroBgTo,
        musicUrl: config.musicUrl ?? null, galleryEnabled: config.galleryEnabled, galleryTitle: config.galleryTitle,
        theme: (config as unknown as Record<string, unknown>).theme as string ?? "emily-vik",
        spotifyPlaylistUrl: (config as unknown as Record<string, unknown>).spotifyPlaylistUrl as string ?? null,
        mapsUrl: (config as unknown as Record<string, unknown>).mapsUrl as string ?? null,
        whatsappReminderEnabled: (config as unknown as Record<string, unknown>).whatsappReminderEnabled as boolean ?? false,
        whatsappReminderDaysBefore: (config as unknown as Record<string, unknown>).whatsappReminderDaysBefore as string ?? "3",
      });
      setPreviewUrl(config.inviteImageUrl ?? null);
    }
  }, [config, form]);

  const updateMutation = useUpdateEventConfig({
    request: authHeaders,
    mutation: {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetEventConfigQueryKey() }); setSaved(true); setTimeout(() => setSaved(false), 2500); },
    },
  });

  const onSubmit = (data: ConfigValues) => updateMutation.mutate({ data });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploadingImage(true);
    try {
      const fd = new FormData(); fd.append("image", file);
      const res = await fetch(`${import.meta.env.BASE_URL}api/admin/upload-image`, { method: "POST", headers: authHeaders, body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Erro");
      form.setValue("inviteImageUrl", json.url); setPreviewUrl(json.url);
    } catch (err: any) { alert(err.message ?? "Erro ao enviar imagem"); } finally { setUploadingImage(false); }
  };

  const textFields: { name: keyof ConfigValues; label: string; hint: string; multiline?: boolean }[] = [
    { name: "childName",    label: "Nome da criança",     hint: 'Ex: "Bento"' },
    { name: "age",          label: "Idade",               hint: 'Ex: "5"' },
    { name: "dateLabel",    label: "Data (curta)",        hint: 'Ex: "15/04/2026"' },
    { name: "dateFull",     label: "Data (completa)",     hint: 'Ex: "Quarta-feira, 15 de Abril de 2026"' },
    { name: "timeLabel",    label: "Horário",             hint: 'Ex: "18h00 às 22h00"' },
    { name: "location",     label: "Endereço",            hint: 'Ex: "Rua Luz Interior, 120"' },
    { name: "neighborhood", label: "Bairro / Cidade",     hint: 'Ex: "Estrela Sul — Serelepe"' },
    { name: "tagline",      label: "Mensagem do convite", hint: "Frase de chamada no formulário", multiline: true },
  ];

  if (isLoading) return <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-primary" /></div>;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
      {/* Dados do evento */}
      <div className="bg-white rounded-3xl shadow-md border border-border overflow-hidden">
        <div className="p-5 border-b border-border bg-slate-50/50 flex items-center gap-3">
          <Settings className="w-5 h-5 text-muted-foreground" />
          <div><h2 className="text-base font-bold">Dados do Evento</h2><p className="text-xs text-muted-foreground">Textos exibidos no site público.</p></div>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {textFields.map(({ name, label, hint, multiline }) => (
              <div key={name} className={multiline ? "sm:col-span-2" : ""}>
                <Label className="text-sm font-bold block mb-1.5">{label}</Label>
                {multiline
                  ? <Textarea {...form.register(name as any)} className="rounded-xl bg-muted/20 text-sm min-h-[80px] resize-none" placeholder={hint} />
                  : <Input {...form.register(name as any)} className="rounded-xl bg-muted/20 h-11 text-sm" placeholder={hint} />}
                {form.formState.errors[name] && <p className="text-destructive text-xs mt-1">{form.formState.errors[name]?.message}</p>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Foto */}
      <div className="bg-white rounded-3xl shadow-md border border-border overflow-hidden">
        <div className="p-5 border-b border-border bg-slate-50/50 flex items-center gap-3">
          <Image className="w-5 h-5 text-muted-foreground" />
          <div><h2 className="text-base font-bold">Foto do Convite</h2><p className="text-xs text-muted-foreground">Imagem principal do convite.</p></div>
        </div>
        <div className="p-5 flex flex-col sm:flex-row gap-5 items-start">
          <div className="relative w-32 h-32 rounded-xl overflow-hidden border-2 border-dashed border-border bg-muted/20 shrink-0">
            <img src={previewUrl || (watchedImgUrl as string) || DEFAULT_IMG} alt="Prévia" className="w-full h-full object-cover"
              onError={e => { (e.target as HTMLImageElement).src = DEFAULT_IMG; }} />
            {(previewUrl || watchedImgUrl) && (
              <button type="button" onClick={() => { form.setValue("inviteImageUrl", null); setPreviewUrl(null); }}
                className="absolute top-1 right-1 w-6 h-6 bg-destructive text-white rounded-full flex items-center justify-center">
                <RotateCcw className="w-3 h-3" />
              </button>
            )}
          </div>
          <div className="flex-1 space-y-3">
            <div className="flex gap-2">
              {(["url","upload"] as const).map(mode => (
                <button key={mode} type="button" onClick={() => setImageMode(mode)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${imageMode === mode ? "bg-primary text-white border-primary" : "bg-white border-border text-muted-foreground"}`}>
                  {mode === "url" ? <><LinkIcon className="w-3.5 h-3.5" /> URL</> : <><Upload className="w-3.5 h-3.5" /> Upload</>}
                </button>
              ))}
            </div>
            {imageMode === "url" ? (
              <Input value={(watchedImgUrl as string) ?? ""} onChange={e => { form.setValue("inviteImageUrl", e.target.value || null); setPreviewUrl(e.target.value || null); }}
                placeholder="https://exemplo.com/foto.jpg" className="h-10 rounded-xl bg-muted/20 text-sm" />
            ) : (
              <>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                <button type="button" disabled={uploadingImage} onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2.5 bg-muted/40 hover:bg-muted/60 border border-dashed border-border rounded-xl text-sm font-bold text-muted-foreground disabled:opacity-50">
                  {uploadingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {uploadingImage ? "Enviando..." : "Escolher arquivo (máx. 8MB)"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tema da Festa */}
      <div className="bg-white rounded-3xl shadow-md border border-border overflow-hidden">
        <div className="p-5 border-b border-border bg-slate-50/50 flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-muted-foreground" />
          <div>
            <h2 className="text-base font-bold">Tema da Festa</h2>
            <p className="text-xs text-muted-foreground">Muda as cores, textos e confetes automaticamente.</p>
          </div>
        </div>
        <div className="p-5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
          {activeThemeOptions.map(t => {
            const active = watchedTheme === t.slug;
            return (
              <button key={t.slug} type="button"
                onClick={() => {
                  form.setValue("theme", t.slug);
                  form.setValue("heroBgFrom", t.heroBgFrom);
                  form.setValue("heroBgVia", t.heroBgVia);
                  form.setValue("heroBgTo", t.heroBgTo);
                }}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 transition-all ${active ? "border-primary shadow-md scale-[1.04]" : "border-border hover:border-muted-foreground/40"}`}>
                <div className="w-full h-10 rounded-xl" style={{ background: `linear-gradient(to bottom right, ${t.heroBgFrom}, ${t.heroBgVia}, ${t.heroBgTo})` }} />
                <span className="text-2xl leading-none">{t.emoji}</span>
                <span className={`text-xs font-bold ${active ? "text-primary" : "text-muted-foreground"}`}>{t.name}</span>
              </button>
            );
          })}
        </div>
        <div className="px-5 pb-5">
          <div className="rounded-2xl border border-border bg-muted/20 p-4 space-y-2">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Foto recomendada para {selectedTheme.name}</p>
            <p className="text-sm text-foreground/80">{selectedTheme.photoRecommendation}</p>
            <div>
              <p className="text-xs font-bold text-muted-foreground mb-1">Prompt para gerar imagem</p>
              <Textarea value={selectedTheme.photoPrompt} readOnly className="rounded-xl bg-white text-xs min-h-[96px] resize-none" />
            </div>
          </div>
        </div>
        <ThemeCatalogManager authHeaders={authHeaders} themes={themeOptions} />
      </div>

      {/* Cor de fundo */}
      <div className="bg-white rounded-3xl shadow-md border border-border overflow-hidden">
        <div className="p-5 border-b border-border bg-slate-50/50 flex items-center gap-3">
          <Palette className="w-5 h-5 text-muted-foreground" />
          <div><h2 className="text-base font-bold">Cor de Fundo</h2><p className="text-xs text-muted-foreground">Personalize o gradiente do hero independentemente do tema.</p></div>
          <div className="ml-auto h-8 w-24 rounded-lg border border-border" style={{ background: `linear-gradient(to right, ${watchedFrom}, ${watchedVia}, ${watchedTo})` }} />
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {BG_PRESETS.map(p => {
              const active = watchedFrom === p.from && watchedTo === p.to;
              return (
                <button key={p.label} type="button"
                  onClick={() => { form.setValue("heroBgFrom", p.from); form.setValue("heroBgVia", p.via); form.setValue("heroBgTo", p.to); }}
                  className={`relative h-12 rounded-xl border-2 overflow-hidden transition-all ${active ? "border-primary scale-[1.03] shadow-md" : "border-transparent hover:border-muted-foreground/30"}`}
                  style={{ background: `linear-gradient(to right, ${p.from}, ${p.via}, ${p.to})` }} title={p.label}>
                  <span className="absolute bottom-0 inset-x-0 bg-black/30 text-white text-[10px] font-bold py-0.5 text-center px-1 truncate">{p.label}</span>
                </button>
              );
            })}
          </div>
          <div className="border-t border-border pt-4 flex gap-4 flex-wrap">
            {([["heroBgFrom","Início"],["heroBgVia","Meio"],["heroBgTo","Fim"]] as const).map(([name, label]) => (
              <label key={name} className="flex flex-col items-center gap-1 cursor-pointer">
                <span className="text-xs font-bold text-muted-foreground">{label}</span>
                <div className="relative">
                  <div className="w-10 h-10 rounded-xl border-2 border-border" style={{ backgroundColor: form.watch(name) }} />
                  <input type="color" value={form.watch(name)} onChange={e => form.setValue(name, e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                </div>
                <span className="text-[10px] text-muted-foreground font-mono">{form.watch(name)}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Música */}
      <div className="bg-white rounded-3xl shadow-md border border-border overflow-hidden">
        <div className="p-5 border-b border-border bg-slate-50/50 flex items-center gap-3">
          <Music2 className="w-5 h-5 text-muted-foreground" />
          <div><h2 className="text-base font-bold">Música de Fundo</h2><p className="text-xs text-muted-foreground">Cole o link direto de um arquivo .mp3 (Google Drive, Dropbox, etc.).</p></div>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <Label className="text-sm font-bold block mb-1.5">URL da Música (MP3)</Label>
            <Input value={(form.watch("musicUrl") as string) ?? ""} onChange={e => form.setValue("musicUrl", e.target.value || null)}
              placeholder="https://exemplo.com/musica.mp3" className="rounded-xl bg-muted/20 h-11 text-sm" />
            <p className="text-xs text-muted-foreground mt-1.5">Deixe em branco para não tocar música. Um botão de play será exibido para os convidados.</p>
          </div>
          {form.watch("musicUrl") && (
            <div className="flex items-center gap-2 p-3 bg-muted/20 rounded-xl">
              <Music2 className="w-4 h-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground flex-1 truncate">Pré-visualizar: <a href={form.watch("musicUrl") ?? ""} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">abrir link</a></p>
              <button type="button" onClick={() => form.setValue("musicUrl", null)} className="text-xs text-destructive hover:underline font-bold">Remover</button>
            </div>
          )}
        </div>
      </div>

      {/* Galeria */}
      <div className="bg-white rounded-3xl shadow-md border border-border overflow-hidden">
        <div className="p-5 border-b border-border bg-slate-50/50 flex items-center gap-3">
          <Camera className="w-5 h-5 text-muted-foreground" />
          <div><h2 className="text-base font-bold">Configurações da Galeria</h2><p className="text-xs text-muted-foreground">Controle se a galeria de fotos fica visível no site público.</p></div>
          <div className="ml-auto">
            <button type="button" onClick={() => form.setValue("galleryEnabled", !watchedGalleryEnabled)}
              className={`relative w-12 h-6 rounded-full transition-colors ${watchedGalleryEnabled ? "bg-primary" : "bg-muted"}`}>
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${watchedGalleryEnabled ? "translate-x-6" : "translate-x-0.5"}`} />
            </button>
          </div>
        </div>
        <div className="p-5">
          <Label className="text-sm font-bold block mb-1.5">Título da Galeria</Label>
          <Input {...form.register("galleryTitle")} placeholder="Fotos da Festa 📸" className="rounded-xl bg-muted/20 h-11 text-sm" />
          {!watchedGalleryEnabled && <p className="text-xs text-muted-foreground mt-2">A galeria está oculta. Ative o toggle acima para exibí-la no site.</p>}
        </div>
      </div>

      {/* Spotify */}
      <div className="bg-white rounded-3xl shadow-md border border-border overflow-hidden">
        <div className="p-5 border-b border-border bg-slate-50/50 flex items-center gap-3">
          <Music2 className="w-5 h-5 text-[#1DB954]" />
          <div><h2 className="text-base font-bold">🎵 Playlist do Spotify</h2><p className="text-xs text-muted-foreground">Embed de playlist aparece no site público abaixo do mapa.</p></div>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <Label className="text-sm font-bold block mb-1.5">URL da Playlist</Label>
            <Input value={(form.watch("spotifyPlaylistUrl") as string) ?? ""}
              onChange={e => form.setValue("spotifyPlaylistUrl", e.target.value || null)}
              placeholder="https://open.spotify.com/playlist/..." className="rounded-xl bg-muted/20 h-11 text-sm" />
            <p className="text-xs text-muted-foreground mt-1.5">Cole o link de qualquer playlist pública do Spotify. Deixe em branco para ocultar.</p>
          </div>
        </div>
      </div>

      {/* Maps URL */}
      <div className="bg-white rounded-3xl shadow-md border border-border overflow-hidden">
        <div className="p-5 border-b border-border bg-slate-50/50 flex items-center gap-3">
          <MapPin className="w-5 h-5 text-muted-foreground" />
          <div><h2 className="text-base font-bold">📍 Link do Google Maps</h2><p className="text-xs text-muted-foreground">URL personalizada para o botão de mapa (opcional).</p></div>
        </div>
        <div className="p-5">
          <Label className="text-sm font-bold block mb-1.5">URL do Maps</Label>
          <Input value={(form.watch("mapsUrl") as string) ?? ""}
            onChange={e => form.setValue("mapsUrl", e.target.value || null)}
            placeholder="https://maps.google.com/..." className="rounded-xl bg-muted/20 h-11 text-sm" />
          <p className="text-xs text-muted-foreground mt-1.5">Deixe em branco para gerar automaticamente com base no endereço.</p>
        </div>
      </div>

      {/* WhatsApp Lembrete */}
      <div className="bg-white rounded-3xl shadow-md border border-border overflow-hidden">
        <div className="p-5 border-b border-border bg-slate-50/50 flex items-center gap-3">
          <span className="text-lg">📲</span>
          <div><h2 className="text-base font-bold">Lembrete WhatsApp Automático</h2><p className="text-xs text-muted-foreground">Envia mensagem para confirmados X dias antes da festa (requer config de servidor).</p></div>
          <div className="ml-auto">
            <button type="button"
              onClick={() => form.setValue("whatsappReminderEnabled", !(form.watch("whatsappReminderEnabled") as boolean))}
              className={`relative w-12 h-6 rounded-full transition-colors ${form.watch("whatsappReminderEnabled") ? "bg-[#25D366]" : "bg-muted"}`}>
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.watch("whatsappReminderEnabled") ? "translate-x-6" : "translate-x-0.5"}`} />
            </button>
          </div>
        </div>
        {form.watch("whatsappReminderEnabled") && (
          <div className="p-5">
            <Label className="text-sm font-bold block mb-1.5">Quantos dias antes da festa?</Label>
            <Input type="number" min="1" max="30"
              value={(form.watch("whatsappReminderDaysBefore") as string) ?? "3"}
              onChange={e => form.setValue("whatsappReminderDaysBefore", e.target.value)}
              className="rounded-xl bg-muted/20 h-11 text-sm w-32" />
            <p className="text-xs text-muted-foreground mt-1.5">Requer as variáveis <code className="bg-muted px-1 rounded">WHATSAPP_TOKEN</code> e <code className="bg-muted px-1 rounded">WHATSAPP_PHONE_ID</code> no servidor.</p>
          </div>
        )}
      </div>

      {/* Save */}
      <div className="flex items-center justify-end gap-3 py-2">
        {saved && <span className="text-green-600 text-sm font-bold flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> Salvo com sucesso!</span>}
        <button type="submit" disabled={updateMutation.isPending}
          className="flex items-center gap-2 bg-primary text-white font-bold px-8 py-3 rounded-xl shadow-md hover:bg-primary/90 disabled:opacity-70 text-sm">
          {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Salvar Tudo
        </button>
      </div>
    </form>
  );
}

function ThemeCatalogManager({
  authHeaders,
  themes,
}: {
  authHeaders: Record<string, string>;
  themes: ThemeView[];
}) {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [editingTheme, setEditingTheme] = useState<ThemeView | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<ThemeFormValues>({
    resolver: zodResolver(themeFormSchema),
    defaultValues: BLANK_THEME_FORM,
  });

  const refreshThemes = () => {
    queryClient.invalidateQueries({ queryKey: getListAdminThemesQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListThemesQueryKey() });
  };

  const closeEditor = () => {
    setIsOpen(false);
    setEditingTheme(null);
    setFormError(null);
    form.reset(BLANK_THEME_FORM);
  };

  const createMutation = useCreateTheme({
    request: authHeaders,
    mutation: { onSuccess: () => { refreshThemes(); closeEditor(); } },
  });
  const updateMutation = useUpdateTheme({
    request: authHeaders,
    mutation: { onSuccess: () => { refreshThemes(); closeEditor(); } },
  });
  const deleteMutation = useDeleteTheme({
    request: authHeaders,
    mutation: { onSuccess: refreshThemes },
  });

  const busy = createMutation.isPending || updateMutation.isPending;

  const openNewTheme = () => {
    const nextOrder = Math.max(0, ...themes.map((theme) => theme.displayOrder)) + 10;
    setFormError(null);
    setEditingTheme(null);
    form.reset({
      ...BLANK_THEME_FORM,
      slug: `tema-personalizado-${nextOrder}`,
      displayOrder: nextOrder,
    });
    setIsOpen(true);
  };

  const openEditTheme = (theme: ThemeView) => {
    setFormError(null);
    setEditingTheme(theme);
    form.reset(themeToFormDefaults(theme));
    setIsOpen(true);
  };

  const duplicateTheme = (theme: ThemeView) => {
    const nextOrder = Math.max(0, ...themes.map((item) => item.displayOrder)) + 10;
    setFormError(null);
    setEditingTheme(null);
    form.reset({
      ...themeToFormDefaults(theme, nextOrder),
      slug: `${theme.slug}-novo`,
      name: `${theme.name} Novo`,
      displayOrder: nextOrder,
    });
    setIsOpen(true);
  };

  const submitTheme = form.handleSubmit(
    (values) => {
      setFormError(null);
      const payload = themeFormToPayload(values);
      if (editingTheme?.id) {
        updateMutation.mutate({ id: editingTheme.id, data: payload as UpdateThemeBody });
        return;
      }
      createMutation.mutate({ data: payload });
    },
    (errors) => {
      const firstError = Object.values(errors)[0]?.message;
      setFormError(typeof firstError === "string" ? firstError : "Verifique os campos obrigatorios.");
    },
  );

  const toggleTheme = (theme: ThemeView) => {
    if (!theme.id) return;
    updateMutation.mutate({ id: theme.id, data: { isActive: theme.isActive === false } });
  };

  const removeTheme = (theme: ThemeView) => {
    if (!theme.id) return;
    const action = theme.isBuiltIn ? "desativar" : "excluir";
    if (window.confirm(`Tem certeza que deseja ${action} o tema "${theme.name}"?`)) {
      deleteMutation.mutate({ id: theme.id });
    }
  };

  return (
    <div className="border-t border-border bg-slate-50/50">
      <div className="p-5 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold">Gerenciar temas do site</h3>
            <p className="text-xs text-muted-foreground">Crie, edite, desative ou remova temas para vender convites personalizados.</p>
          </div>
          <button type="button" onClick={openNewTheme}
            className="inline-flex items-center justify-center gap-2 bg-primary text-white rounded-xl px-4 py-2 text-sm font-bold hover:bg-primary/90">
            <Plus className="w-4 h-4" /> Novo tema
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {themes.map((theme) => (
            <div key={theme.slug} className={`bg-white border rounded-2xl p-3 shadow-sm ${theme.isActive === false ? "opacity-60 border-dashed" : "border-border"}`}>
              <div className="flex items-start gap-3">
                <div className="w-14 h-14 rounded-xl border border-border shrink-0 flex items-center justify-center text-2xl"
                  style={{ background: `linear-gradient(to bottom right, ${theme.heroBgFrom}, ${theme.heroBgVia}, ${theme.heroBgTo})` }}>
                  {theme.emoji}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <p className="font-bold text-sm truncate">{theme.name}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${theme.isActive === false ? "bg-muted text-muted-foreground" : "bg-green-100 text-green-700"}`}>
                      {theme.isActive === false ? "Inativo" : "Ativo"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{theme.slug}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{theme.photoRecommendation}</p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-1.5 mt-3">
                <button type="button" onClick={() => duplicateTheme(theme)}
                  className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-muted/40" title="Duplicar">
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={() => openEditTheme(theme)}
                  className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-muted/40" title="Editar">
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={() => toggleTheme(theme)} disabled={!theme.id || updateMutation.isPending}
                  className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-muted/40 disabled:opacity-40" title={theme.isActive === false ? "Ativar" : "Desativar"}>
                  <Eye className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={() => removeTheme(theme)} disabled={!theme.id || deleteMutation.isPending}
                  className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-destructive hover:bg-destructive/10 disabled:opacity-40" title={theme.isBuiltIn ? "Desativar tema padrao" : "Excluir"}>
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {isOpen && (
          <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold">{editingTheme ? `Editar ${editingTheme.name}` : "Criar tema"}</h3>
                <p className="text-xs text-muted-foreground">O prompt nao deve incluir texto escrito, logos ou personagens protegidos.</p>
              </div>
              <button type="button" onClick={closeEditor} className="w-9 h-9 rounded-lg border border-border flex items-center justify-center hover:bg-muted/40">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="sm:col-span-2">
                  <Label className="text-xs font-bold block mb-1.5">Nome</Label>
                  <Input {...form.register("name")} className="h-10 rounded-xl bg-muted/20 text-sm" />
                </div>
                <div>
                  <Label className="text-xs font-bold block mb-1.5">Slug</Label>
                  <Input {...form.register("slug")} onBlur={(e) => form.setValue("slug", normalizeThemeSlug(e.target.value))}
                    className="h-10 rounded-xl bg-muted/20 text-sm" />
                </div>
                <div>
                  <Label className="text-xs font-bold block mb-1.5">Emoji</Label>
                  <Input {...form.register("emoji")} className="h-10 rounded-xl bg-muted/20 text-sm" />
                </div>
              </div>

              <div>
                <Label className="text-xs font-bold block mb-1.5">Descricao</Label>
                <Textarea {...form.register("description")} className="rounded-xl bg-muted/20 text-sm min-h-[70px] resize-none" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {([["heroBgFrom", "Hero inicio"], ["heroBgVia", "Hero meio"], ["heroBgTo", "Hero fim"]] as const).map(([name, label]) => (
                  <div key={name}>
                    <Label className="text-xs font-bold block mb-1.5">{label}</Label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={form.watch(name)} onChange={(e) => form.setValue(name, e.target.value)}
                        className="w-10 h-10 rounded-lg border border-border bg-transparent" />
                      <Input {...form.register(name)} className="h-10 rounded-xl bg-muted/20 text-sm font-mono" />
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {([["cssPrimary", "CSS primaria"], ["cssSecondary", "CSS secundaria"], ["cssAccent", "CSS destaque"]] as const).map(([name, label]) => (
                  <div key={name}>
                    <Label className="text-xs font-bold block mb-1.5">{label}</Label>
                    <Input {...form.register(name)} className="h-10 rounded-xl bg-muted/20 text-sm font-mono" placeholder="hsl(130 55% 28%)" />
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs font-bold block mb-1.5">Botao RSVP</Label>
                  <Input {...form.register("confirmLabel")} className="h-10 rounded-xl bg-muted/20 text-sm" />
                </div>
                <div>
                  <Label className="text-xs font-bold block mb-1.5">Titulo sucesso</Label>
                  <Input {...form.register("successTitle")} className="h-10 rounded-xl bg-muted/20 text-sm" />
                </div>
                <div>
                  <Label className="text-xs font-bold block mb-1.5">Subtitulo sucesso</Label>
                  <Input {...form.register("successSub")} className="h-10 rounded-xl bg-muted/20 text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs font-bold block mb-1.5">Confete (hex separados por virgula)</Label>
                  <Input {...form.register("confettiColors")} className="h-10 rounded-xl bg-muted/20 text-sm font-mono" />
                </div>
                <div>
                  <Label className="text-xs font-bold block mb-1.5">Ordem</Label>
                  <Input type="number" min="0" {...form.register("displayOrder")} className="h-10 rounded-xl bg-muted/20 text-sm" />
                </div>
                <label className="flex items-end gap-2 text-sm font-bold text-muted-foreground pb-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 accent-primary" {...form.register("isActive")} />
                  Tema ativo
                </label>
              </div>

              <div>
                <Label className="text-xs font-bold block mb-1.5">Recomendacao de foto</Label>
                <Textarea {...form.register("photoRecommendation")} className="rounded-xl bg-muted/20 text-sm min-h-[70px] resize-none" />
              </div>

              <div>
                <Label className="text-xs font-bold block mb-1.5">Prompt de imagem por IA</Label>
                <Textarea {...form.register("photoPrompt")} className="rounded-xl bg-muted/20 text-sm min-h-[120px] resize-none" />
              </div>

              {(createMutation.isError || updateMutation.isError) && (
                <p className="text-sm text-destructive font-bold bg-destructive/10 rounded-xl p-3">Nao foi possivel salvar o tema. Confira slug unico e campos obrigatorios.</p>
              )}
              {formError && (
                <p className="text-sm text-destructive font-bold bg-destructive/10 rounded-xl p-3">{formError}</p>
              )}

              <div className="flex items-center justify-end gap-2">
                <button type="button" onClick={closeEditor}
                  className="px-4 py-2 rounded-xl border border-border text-sm font-bold hover:bg-muted/40">Cancelar</button>
                <button type="button" onClick={submitTheme} disabled={busy}
                  className="inline-flex items-center gap-2 bg-primary text-white rounded-xl px-5 py-2 text-sm font-bold hover:bg-primary/90 disabled:opacity-60">
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {editingTheme ? "Salvar tema" : "Criar tema"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
