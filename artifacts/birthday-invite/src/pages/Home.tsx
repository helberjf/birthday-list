import { useState, useEffect, useRef, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { QRCodeCanvas } from "qrcode.react";
import {
  CheckCircle2, HelpCircle, XCircle, Heart, Loader2,
  Baby, UserRound, Plus, Minus, MapPin, Clock, Calendar,
  ChevronDown, ChevronLeft, ChevronRight, Users, Menu, X, Lock,
  QrCode, Download, Share2, Music2, Pause, Play, ZoomIn,
} from "lucide-react";

import {
  useCreateGuest, useListGuests, useGetPublicStats,
  useGetEventConfig, useAdminLogin, useListPhotos, useListThemes,
  getListGuestsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { getThemeBySlug, getThemeCatalog, getThemeCssVars, type ThemeView } from "@/lib/themes";

function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

const rsvpSchema = z.object({
  parentName: z.string().min(2, "Insira seu nome completo."),
  childName: z.string().optional().nullable().or(z.literal("")),
  phone: z.string().optional().nullable(),
  email: z.string().email("Email inválido.").optional().nullable().or(z.literal("")),
  adultsCount: z.coerce.number().min(1, "Mínimo 1 adulto."),
  childrenCount: z.coerce.number().min(0),
  status: z.enum(["confirmed", "maybe", "declined"]),
  notes: z.string().optional().nullable(),
});
type RsvpFormValues = z.infer<typeof rsvpSchema>;

const statusConfig = {
  confirmed: { label: "Vou sim! ⚔️",  color: "bg-secondary text-white border-secondary", icon: CheckCircle2 },
  maybe:     { label: "Talvez 🤔",     color: "bg-accent text-foreground border-accent",  icon: HelpCircle },
  declined:  { label: "Não vou 💔",    color: "bg-destructive text-white border-destructive", icon: XCircle },
};

const THEME_PRESETS = [
  { id: "minecraft",  name: "Minecraft",     emoji: "⚔️", from: "#1a6b2a", via: "#2d8a40", to: "#4caf50",
    css: { "--color-primary": "hsl(130 55% 28%)", "--color-secondary": "hsl(122 45% 42%)", "--color-accent": "hsl(42 95% 52%)" },
    confirmLabel: "⚔️ CONFIRMAR PRESENÇA", successTitle: "Missão Aceita!", successSub: "Nos vemos na festa! 🎮",
    confetti: ["#4CAF50","#F6C453","#1a6b2a","#ffffff"] },
  { id: "mario",      name: "Super Mario",   emoji: "🍄", from: "#7B0000", via: "#c62828", to: "#ef9a9a",
    css: { "--color-primary": "hsl(0 72% 35%)", "--color-secondary": "hsl(48 100% 42%)", "--color-accent": "hsl(48 100% 52%)" },
    confirmLabel: "⭐ CONFIRMAR PRESENÇA", successTitle: "Wahoo! Presença confirmada!", successSub: "Vamos juntos salvar a princesa! 🍄⭐",
    confetti: ["#e53935","#FFD700","#1565C0","#43A047"] },
  { id: "princesas",  name: "Princesas",     emoji: "👸", from: "#4a148c", via: "#880e4f", to: "#f48fb1",
    css: { "--color-primary": "hsl(300 65% 35%)", "--color-secondary": "hsl(340 80% 55%)", "--color-accent": "hsl(300 40% 75%)" },
    confirmLabel: "👸 CONFIRMAR PRESENÇA", successTitle: "Você é uma princesa!", successSub: "Será mágico! 💎✨",
    confetti: ["#E91E63","#9C27B0","#FFF8E1","#FF80AB"] },
  { id: "futebol",    name: "Futebol",       emoji: "⚽", from: "#1b5e20", via: "#2e7d32", to: "#81c784",
    css: { "--color-primary": "hsl(123 57% 23%)", "--color-secondary": "hsl(48 100% 35%)", "--color-accent": "hsl(48 100% 52%)" },
    confirmLabel: "⚽ CONFIRMAR PRESENÇA", successTitle: "GOOOOOL! Confirmado!", successSub: "Você está escalado! 🏆🥇",
    confetti: ["#2e7d32","#FFEE58","#ffffff","#1565C0"] },
  { id: "spiderman",  name: "Homem Aranha",  emoji: "🕷️", from: "#7B0000", via: "#c62828", to: "#1a237e",
    css: { "--color-primary": "hsl(0 100% 32%)", "--color-secondary": "hsl(234 68% 38%)", "--color-accent": "hsl(0 0% 85%)" },
    confirmLabel: "🕷️ CONFIRMAR PRESENÇA", successTitle: "Com grandes poderes...", successSub: "Vem a festa! 🕸️🕷️",
    confetti: ["#c62828","#1a237e","#ffffff","#FFD700"] },
  { id: "roblox",     name: "Roblox",        emoji: "🎮", from: "#7a0000", via: "#cc0000", to: "#ff6666",
    css: { "--color-primary": "hsl(0 80% 35%)", "--color-secondary": "hsl(0 0% 15%)", "--color-accent": "hsl(0 100% 60%)" },
    confirmLabel: "🎮 ENTRAR NA FESTA!", successTitle: "Game On! Tô dentro!", successSub: "A festa vai ser épica! 🕹️",
    confetti: ["#cc0000","#ffffff","#1a1a1a","#ff4444"] },
  { id: "sonic",      name: "Sonic",         emoji: "⚡", from: "#002266", via: "#0050c8", to: "#6699ff",
    css: { "--color-primary": "hsl(215 100% 35%)", "--color-secondary": "hsl(42 100% 50%)", "--color-accent": "hsl(42 100% 65%)" },
    confirmLabel: "⚡ GO FAST! CONFIRMAR", successTitle: "Sonic Speed! Confirmado!", successSub: "Mais rápido que o Sonic! 💨",
    confetti: ["#0050c8","#FFD700","#cc0000","#ffffff"] },
  { id: "dinossauro", name: "Dinossauro",    emoji: "🦕", from: "#1b3a1b", via: "#3d6b3d", to: "#8bc34a",
    css: { "--color-primary": "hsl(120 45% 22%)", "--color-secondary": "hsl(40 70% 45%)", "--color-accent": "hsl(80 65% 50%)" },
    confirmLabel: "🦕 CONFIRMAR PRESENÇA", successTitle: "ROAR! Presença confirmada!", successSub: "Prepare-se para a era dos dinos! 🦖",
    confetti: ["#4caf50","#8d6e63","#ffeb3b","#ff7043"] },
  { id: "sereia",     name: "Sereia",        emoji: "🧜‍♀️", from: "#004d52", via: "#00838f", to: "#80deea",
    css: { "--color-primary": "hsl(185 85% 28%)", "--color-secondary": "hsl(270 70% 48%)", "--color-accent": "hsl(185 100% 60%)" },
    confirmLabel: "🧜‍♀️ NADAR ATÉ LÁ!", successTitle: "Mergulhou na festa!", successSub: "Vem nadar conosco! 🐚🌊",
    confetti: ["#00bcd4","#9c27b0","#4dd0e1","#ffffff"] },
  { id: "unicornio",  name: "Unicórnio",     emoji: "🦄", from: "#4a148c", via: "#880e4f", to: "#f8bbd9",
    css: { "--color-primary": "hsl(285 65% 42%)", "--color-secondary": "hsl(330 80% 52%)", "--color-accent": "hsl(47 100% 55%)" },
    confirmLabel: "🦄 VOAR ATÉ LÁ!", successTitle: "Mágico! Presença confirmada!", successSub: "A magia começa! 🌈✨",
    confetti: ["#9c27b0","#e91e63","#ffd700","#ffffff"] },
  { id: "astronauta", name: "Astronauta",    emoji: "🚀", from: "#0a0a2a", via: "#1a237e", to: "#3949ab",
    css: { "--color-primary": "hsl(230 70% 42%)", "--color-secondary": "hsl(0 0% 70%)", "--color-accent": "hsl(30 100% 55%)" },
    confirmLabel: "🚀 MISSÃO CONFIRMADA!", successTitle: "Houston, temos festa!", successSub: "Decolar para a diversão! 🌙⭐",
    confetti: ["#1565c0","#ffffff","#ff6f00","#c0c0c0"] },
  { id: "pokemon",    name: "Pokémon",       emoji: "⚡", from: "#b71c1c", via: "#e53935", to: "#ffca28",
    css: { "--color-primary": "hsl(0 85% 38%)", "--color-secondary": "hsl(48 100% 45%)", "--color-accent": "hsl(48 100% 60%)" },
    confirmLabel: "⚡ ESCOLHO VOCÊ!", successTitle: "Capturado! Confirmado!", successSub: "Vamos todos juntos! Pika! ⚡",
    confetti: ["#e53935","#ffca28","#1565c0","#ffffff"] },
  { id: "frozen",     name: "Frozen",        emoji: "❄️", from: "#01579b", via: "#0277bd", to: "#b3e5fc",
    css: { "--color-primary": "hsl(200 80% 33%)", "--color-secondary": "hsl(195 100% 72%)", "--color-accent": "hsl(200 50% 82%)" },
    confirmLabel: "❄️ VAMOS CONGELAR!", successTitle: "Let It Go! Confirmado!", successSub: "A magia do gelo te espera! ❄️",
    confetti: ["#0288d1","#b3e5fc","#ffffff","#546e7a"] },
  { id: "safari",     name: "Safari",        emoji: "🦁", from: "#4e342e", via: "#795548", to: "#ffca28",
    css: { "--color-primary": "hsl(25 60% 28%)", "--color-secondary": "hsl(45 80% 48%)", "--color-accent": "hsl(38 100% 58%)" },
    confirmLabel: "🦁 RUMO À SAVANA!", successTitle: "Safari confirmado!", successSub: "A aventura começa! 🦒🐘",
    confetti: ["#795548","#ffca28","#f57c00","#4caf50"] },
] as const;
type ThemeId = typeof THEME_PRESETS[number]["id"];
function getTheme(id?: string | null) {
  return THEME_PRESETS.find(t => t.id === id) ?? THEME_PRESETS[0]!;
}

const DEFAULT_EVENT = {
  childName: "Bento", age: "5",
  dateLabel: "15/04/2026", dateFull: "Quarta-feira, 15 de Abril de 2026",
  timeLabel: "18h00 às 22h00", location: "Rua Luz Interior, 120",
  neighborhood: "Estrela Sul — Serelepe",
  tagline: "Venha se divertir, jogar, dar risada e fazer parte dessa missão especial!",
  inviteImageUrl: null as string | null | undefined,
  heroBgFrom: "#1a6b2a", heroBgVia: "#2d8a40", heroBgTo: "#4caf50",
  musicUrl: null as string | null | undefined,
  galleryEnabled: false,
  galleryTitle: "Fotos da Festa 📸",
  theme: "minecraft" as string,
  spotifyPlaylistUrl: null as string | null | undefined,
  mapsUrl: null as string | null | undefined,
  whatsappReminderEnabled: false,
  whatsappReminderDaysBefore: "3",
};

function parseEventDate(dateLabel: string, timeLabel: string): Date | null {
  const parts = dateLabel.split("/");
  if (parts.length !== 3) return null;
  const [day, month, year] = parts.map(Number);
  const hourMatch = timeLabel.match(/(\d+)h(\d{2})/);
  const hours = hourMatch ? Number(hourMatch[1]) : 18;
  const mins  = hourMatch ? Number(hourMatch[2]) : 0;
  const d = new Date(year, month - 1, day, hours, mins);
  return isNaN(d.getTime()) ? null : d;
}

function getTimeLeft(target: Date) {
  const diff = target.getTime() - Date.now();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, ended: true };
  return {
    days:    Math.floor(diff / 86400000),
    hours:   Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
    ended: false,
  };
}

/* ══════════════════════════════════════════════════════ */
export default function Home() {
  const { data: eventConfig } = useGetEventConfig();
  const { data: themes } = useListThemes();
  const EVENT = { ...DEFAULT_EVENT, ...eventConfig };
  const themeCatalog = getThemeCatalog(themes);
  const theme = getThemeBySlug(themeCatalog, EVENT.theme);
  const [qrOpen, setQrOpen] = useState(false);
  const siteUrl = window.location.origin + import.meta.env.BASE_URL.replace(/\/$/, "");

  useEffect(() => {
    const root = document.documentElement;
    const cssVars = getThemeCssVars(theme);
    Object.entries(cssVars).forEach(([k, v]) => root.style.setProperty(k, v));
    return () => Object.keys(cssVars).forEach(k => root.style.removeProperty(k));
  }, [theme.cssAccent, theme.cssPrimary, theme.cssSecondary]);

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden">
      <HeroSection event={EVENT} />
      <CountdownSection event={EVENT} />
      <RsvpSection event={EVENT} theme={theme} />
      <GuestListSection />
      <MapsSection event={EVENT} />
      <SpotifySection event={EVENT} />
      <GallerySection event={EVENT} />
      <footer className="py-10 text-center text-muted-foreground text-xs font-medium bg-muted/10 border-t border-border">
        <p className="flex items-center justify-center gap-1.5 mb-3">
          Feito com <Heart className="w-3.5 h-3.5 text-destructive fill-destructive" /> para o {EVENT.childName}
        </p>
        <button onClick={() => setQrOpen(true)}
          className="inline-flex items-center gap-2 text-primary hover:underline font-bold text-sm">
          <QrCode className="w-4 h-4" /> Compartilhar convite (QR Code)
        </button>
      </footer>

      <button onClick={() => setQrOpen(true)}
        className="fixed bottom-6 right-4 z-30 bg-primary text-white shadow-lg rounded-2xl px-4 py-3 flex items-center gap-2 font-bold text-sm hover:bg-primary/90 transition-all hover:scale-105 active:scale-95">
        <Share2 className="w-4 h-4" /> Compartilhar
      </button>

      <MusicPlayer musicUrl={EVENT.musicUrl} />
      <QRModal open={qrOpen} onClose={() => setQrOpen(false)} url={siteUrl} childName={EVENT.childName} />
    </div>
  );
}

/* ── Music Player ────────────────────────────────────── */
function MusicPlayer({ musicUrl }: { musicUrl?: string | null }) {
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!musicUrl) return;
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    const audio = new Audio(musicUrl);
    audio.loop = true;
    audio.volume = 0.25;
    audioRef.current = audio;
    setPlaying(false);
    return () => { audio.pause(); };
  }, [musicUrl]);

  const toggle = useCallback(() => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      setLoading(true);
      audioRef.current.play()
        .then(() => setPlaying(true))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [playing]);

  if (!musicUrl) return null;

  return (
    <motion.button
      onClick={toggle}
      initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 1 }}
      className="fixed bottom-6 left-4 z-30 bg-[#1a3a1e] text-white shadow-lg rounded-2xl px-4 py-3 flex items-center gap-2 font-bold text-sm hover:bg-[#2d6a35] transition-all hover:scale-105 active:scale-95 border border-white/10"
      title={playing ? "Pausar música" : "Tocar música"}>
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> :
        playing ? <Pause className="w-4 h-4 fill-white" /> : <Music2 className="w-4 h-4" />}
      <span>{playing ? "Pausar" : "Música"}</span>
      {playing && (
        <span className="flex gap-0.5 items-end h-4">
          {[0, 1, 2].map(i => (
            <motion.span key={i} className="w-0.5 bg-accent rounded-sm"
              animate={{ height: ["4px", "12px", "4px"] }}
              transition={{ duration: 0.6, delay: i * 0.15, repeat: Infinity }} />
          ))}
        </span>
      )}
    </motion.button>
  );
}

/* ── Gallery Section ─────────────────────────────────── */
function GallerySection({ event }: { event: typeof DEFAULT_EVENT }) {
  const { data: photos = [] } = useListPhotos();
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  if (!event.galleryEnabled || photos.length === 0) return null;

  const prev = () => setLightboxIdx(i => i !== null ? (i - 1 + photos.length) % photos.length : null);
  const next = () => setLightboxIdx(i => i !== null ? (i + 1) % photos.length : null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (lightboxIdx === null) return;
      if (e.key === "Escape") setLightboxIdx(null);
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightboxIdx]);

  return (
    <section className="py-10 px-4 bg-gradient-to-b from-background to-[#e8f5e9]">
      <div className="max-w-lg mx-auto">
        <div className="mb-6 text-center">
          <div className="inline-block bg-primary px-6 py-2 rounded-xl">
            <h2 className="font-display text-2xl sm:text-3xl text-white drop-shadow-[1px_1px_0_rgba(0,0,0,0.4)]">
              {event.galleryTitle}
            </h2>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {photos.map((photo, idx) => (
            <motion.div key={photo.id}
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05 }}
              className="relative group cursor-pointer rounded-2xl overflow-hidden border-2 border-border shadow-sm aspect-square"
              onClick={() => setLightboxIdx(idx)}>
              <img src={photo.url} alt={photo.caption ?? `Foto ${idx + 1}`}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                <ZoomIn className="text-white opacity-0 group-hover:opacity-100 w-8 h-8 drop-shadow-md transition-opacity" />
              </div>
              {photo.caption && (
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                  <p className="text-white text-xs font-medium truncate">{photo.caption}</p>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxIdx !== null && (
          <>
            <motion.div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setLightboxIdx(null)} />
            <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <motion.div className="relative max-w-2xl w-full"
                initial={{ scale: 0.85 }} animate={{ scale: 1 }} exit={{ scale: 0.85 }}
                onClick={e => e.stopPropagation()}>
                <img src={photos[lightboxIdx]!.url} alt={photos[lightboxIdx]!.caption ?? ""}
                  className="w-full max-h-[75vh] object-contain rounded-2xl shadow-2xl" />
                {photos[lightboxIdx]!.caption && (
                  <p className="text-white text-center mt-3 font-medium text-sm drop-shadow">{photos[lightboxIdx]!.caption}</p>
                )}
                <p className="text-white/50 text-center text-xs mt-1">{lightboxIdx + 1} / {photos.length}</p>
              </motion.div>
              <button onClick={() => setLightboxIdx(null)}
                className="absolute top-4 right-4 z-60 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white">
                <X className="w-5 h-5" />
              </button>
              {photos.length > 1 && (
                <>
                  <button onClick={(e) => { e.stopPropagation(); prev(); }}
                    className="absolute left-2 top-1/2 -translate-y-1/2 z-60 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white">
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); next(); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 z-60 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white">
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </section>
  );
}

/* ── QR Code Modal ──────────────────────────────────── */
function QRModal({ open, onClose, url, childName }: { open: boolean; onClose: () => void; url: string; childName: string }) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const handleDownload = useCallback(() => {
    const canvas = canvasRef.current?.querySelector("canvas");
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `convite-${childName.toLowerCase()}-qr.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }, [childName]);
  const handleShare = useCallback(async () => {
    if (navigator.share) {
      await navigator.share({ title: `Convite do ${childName}`, url }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(url).catch(() => {});
      alert("Link copiado para a área de transferência!");
    }
  }, [url, childName]);
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
            <motion.div className="bg-white rounded-3xl shadow-2xl w-full max-w-xs p-6 text-center"
              initial={{ scale: 0.85, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.85, y: 20 }}
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-xl text-primary">QR Code do Convite</h3>
                <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
              </div>
              <p className="text-xs text-muted-foreground mb-4">Escaneie para abrir o convite no celular</p>
              <div ref={canvasRef} className="flex justify-center mb-4">
                <div className="p-3 border-4 border-primary rounded-2xl bg-white">
                  <QRCodeCanvas value={url} size={180} includeMargin={false}
                    imageSettings={{ src: `${import.meta.env.BASE_URL}images/convite.jpeg`, excavate: true, width: 36, height: 36 }} />
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground mb-4 break-all">{url}</p>
              <div className="flex gap-2">
                <button onClick={handleDownload}
                  className="flex-1 flex items-center justify-center gap-2 bg-muted/40 hover:bg-muted/60 text-foreground font-bold py-2.5 rounded-xl text-sm transition-colors">
                  <Download className="w-4 h-4" /> Baixar
                </button>
                <button onClick={handleShare}
                  className="flex-1 flex items-center justify-center gap-2 bg-primary text-white font-bold py-2.5 rounded-xl text-sm hover:bg-primary/90 transition-colors">
                  <Share2 className="w-4 h-4" /> Compartilhar
                </button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ── Admin Login Drawer ─────────────────────────────── */
const loginSchema = z.object({ password: z.string().min(1) });
function AdminLoginDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { login } = useAuth();
  const form = useForm<{ password: string }>({ resolver: zodResolver(loginSchema), defaultValues: { password: "" } });
  const mutation = useAdminLogin({ mutation: { onSuccess: (data) => { login(data.token); onClose(); } } });
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div className="fixed top-4 right-4 z-50 w-72 bg-white rounded-2xl shadow-2xl p-5 border border-border"
            initial={{ opacity: 0, scale: 0.85, y: -10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.85, y: -10 }}
            transition={{ type: "spring", bounce: 0.3, duration: 0.4 }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2"><Lock className="w-4 h-4 text-primary" /><span className="font-bold text-sm">Área do Organizador</span></div>
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={form.handleSubmit((d) => mutation.mutate({ data: d }))} className="space-y-3">
              <Input type="password" {...form.register("password")} placeholder="Senha de acesso"
                className="h-11 rounded-xl text-center tracking-widest bg-muted/30" autoFocus />
              {mutation.isError && <p className="text-destructive text-xs text-center font-medium">{(mutation.error as any)?.error ?? "Senha incorreta."}</p>}
              <button type="submit" disabled={mutation.isPending}
                className="w-full bg-primary text-white font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors">
                {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Entrar"}
              </button>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ── Hero ───────────────────────────────────────────── */
function HeroSection({ event }: { event: typeof DEFAULT_EVENT }) {
  const [adminOpen, setAdminOpen] = useState(false);
  const imageUrl = event.inviteImageUrl || `${import.meta.env.BASE_URL}images/convite.jpeg`;
  return (
    <section className="relative flex flex-col items-center justify-start overflow-hidden pt-8 pb-0"
      style={{ background: `linear-gradient(to bottom, ${event.heroBgFrom}, ${event.heroBgVia}, ${event.heroBgTo})` }}>
      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{
        backgroundImage: `repeating-linear-gradient(0deg,#000 0,#000 1px,transparent 1px,transparent 32px),repeating-linear-gradient(90deg,#000 0,#000 1px,transparent 1px,transparent 32px)`,
      }} />
      <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-[#87CEEB]/60 to-transparent pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 h-8"
        style={{ backgroundImage: `repeating-linear-gradient(90deg, #8B6914 0px, #8B6914 32px, #7a5c10 32px, #7a5c10 64px)` }} />
      <button onClick={() => setAdminOpen(true)}
        className="absolute top-3 right-3 z-20 w-9 h-9 bg-black/25 hover:bg-black/40 backdrop-blur-sm rounded-lg flex items-center justify-center transition-colors">
        <Menu className="w-5 h-5 text-white" />
      </button>
      <AdminLoginDrawer open={adminOpen} onClose={() => setAdminOpen(false)} />
      <motion.div initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5 }}
        className="relative z-10 mb-4 text-center px-10">
        <h1 className="font-display text-4xl sm:text-5xl md:text-6xl leading-none text-white drop-shadow-[3px_3px_0_rgba(0,0,0,0.6)]"
          style={{ WebkitTextStroke: "1px rgba(0,0,0,0.3)" }}>VOCÊ ESTÁ CONVIDADO!</h1>
      </motion.div>
      <motion.div initial={{ scale: 0.88, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, type: "spring", bounce: 0.3 }} className="relative z-10 w-full max-w-sm sm:max-w-md px-4">
        <div className="glow-border rounded-2xl overflow-hidden border-4 border-accent shadow-2xl">
          <img src={imageUrl} alt={`Convite de ${event.childName}`} className="w-full h-auto object-contain block" />
        </div>
      </motion.div>
      <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.55, type: "spring", bounce: 0.4 }}
        className="relative z-10 mt-6 mb-12 px-4 w-full max-w-xs sm:max-w-sm flex flex-col items-center gap-3">
        <motion.button onClick={() => document.getElementById("rsvp-section")?.scrollIntoView({ behavior: "smooth" })}
          animate={{ y: [0, -7, 0] }} transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
          whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }}
          className="relative w-full overflow-hidden rounded-2xl font-display text-xl sm:text-2xl text-foreground select-none cursor-pointer"
          style={{ background: "linear-gradient(180deg,#FFD54F 0%,#FFA000 100%)", boxShadow: "inset 0 -5px 0 0 rgba(0,0,0,0.35), 0 5px 0 0 rgba(0,0,0,0.28), 0 8px 20px rgba(0,0,0,0.3)", textShadow: "1px 2px 0 rgba(0,0,0,0.35)" }}>
          <motion.span className="absolute inset-0 pointer-events-none"
            style={{ background: "linear-gradient(110deg, transparent 20%, rgba(255,255,255,0.55) 50%, transparent 80%)", transform: "skewX(-15deg)" }}
            animate={{ x: ["-120%", "140%"] }} transition={{ duration: 2.2, repeat: Infinity, repeatDelay: 1.2 }} />
          <span className="relative px-6 py-4 flex items-center justify-center gap-2">⚔️ CONFIRMAR PRESENÇA</span>
        </motion.button>
        <motion.div animate={{ y: [0, 6, 0] }} transition={{ duration: 0.9, repeat: Infinity }}
          className="text-accent drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
          <ChevronDown className="w-7 h-7 stroke-[3]" />
        </motion.div>
      </motion.div>
    </section>
  );
}

/* ── Countdown ──────────────────────────────────────── */
function CountdownSection({ event }: { event: typeof DEFAULT_EVENT }) {
  const target = parseEventDate(event.dateLabel, event.timeLabel);
  const [timeLeft, setTimeLeft] = useState(() => target ? getTimeLeft(target) : null);
  useEffect(() => {
    if (!target) return;
    const iv = setInterval(() => setTimeLeft(getTimeLeft(target)), 1000);
    return () => clearInterval(iv);
  }, [event.dateLabel, event.timeLabel]);
  if (!timeLeft) return null;
  const units = [
    { label: "Dias",     value: timeLeft.days },
    { label: "Horas",    value: timeLeft.hours },
    { label: "Minutos",  value: timeLeft.minutes },
    { label: "Segundos", value: timeLeft.seconds },
  ];
  return (
    <section className="py-8 px-4 bg-gradient-to-b from-[#1a3a1e] to-[#1e4a22]">
      <div className="max-w-lg mx-auto text-center">
        <p className="text-accent font-display text-xl sm:text-2xl mb-4 drop-shadow-[1px_1px_0_rgba(0,0,0,0.5)]">
          {timeLeft.ended ? "🎉 A festa chegou!" : "⏱️ FALTAM PARA A FESTA"}
        </p>
        {timeLeft.ended ? (
          <p className="text-white/80 font-bold">O grande dia do {event.childName} chegou! 🎮🎂</p>
        ) : (
          <div className="grid grid-cols-4 gap-2 sm:gap-4">
            {units.map(({ label, value }) => (
              <div key={label} className="flex flex-col items-center">
                <div className="w-full aspect-square sm:w-16 sm:h-16 flex items-center justify-center rounded-xl sm:rounded-2xl border-b-4 border-black/30"
                  style={{ background: "linear-gradient(180deg, #5a8a35 0%, #3d6324 100%)", boxShadow: "inset 0 2px 0 rgba(255,255,255,0.15), 0 4px 8px rgba(0,0,0,0.4)" }}>
                  <span className="font-display text-2xl sm:text-3xl text-white drop-shadow-[1px_2px_0_rgba(0,0,0,0.5)]">
                    {String(value).padStart(2, "0")}
                  </span>
                </div>
                <span className="text-white/70 text-[10px] sm:text-xs font-bold mt-1.5 tracking-wider uppercase">{label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/* ── Counter Field ──────────────────────────────────── */
function CounterField({ label, icon: Icon, value, onChange, min = 0, accentClass }: {
  label: string; icon: React.ElementType; value: number;
  onChange: (v: number) => void; min?: number; accentClass: string;
}) {
  return (
    <div className="flex items-center justify-between bg-background rounded-xl px-4 py-3 border border-border">
      <div className="flex items-center gap-2"><Icon className={cn("w-5 h-5", accentClass)} /><span className="font-bold text-sm">{label}</span></div>
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => onChange(Math.max(min, value - 1))}
          className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center hover:bg-border transition-colors active:scale-90"><Minus className="w-4 h-4" /></button>
        <span className="w-6 text-center font-display text-2xl">{value}</span>
        <button type="button" onClick={() => onChange(value + 1)}
          className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center hover:bg-primary/80 transition-colors active:scale-90"><Plus className="w-4 h-4 text-white" /></button>
      </div>
    </div>
  );
}

/* ── RSVP Section ───────────────────────────────────── */
function RsvpSection({ event, theme }: { event: typeof DEFAULT_EVENT; theme: ThemeView }) {
  const queryClient = useQueryClient();
  const [isSuccess, setIsSuccess] = useState(false);
  const [submittedName, setSubmittedName] = useState("");
  const siteUrl = window.location.origin + import.meta.env.BASE_URL.replace(/\/$/, "");
  const activeTheme = theme;
  const form = useForm<RsvpFormValues>({
    resolver: zodResolver(rsvpSchema),
    defaultValues: { parentName: "", childName: "", phone: "", email: "", adultsCount: 1, childrenCount: 1, status: "confirmed", notes: "" },
  });
  const adultsCount   = form.watch("adultsCount");
  const childrenCount = form.watch("childrenCount");
  const mutation = useCreateGuest({
    mutation: {
      onSuccess: () => {
        setSubmittedName(form.getValues("parentName"));
        setIsSuccess(true);
        queryClient.invalidateQueries({ queryKey: getListGuestsQueryKey() });
        const end = Date.now() + 3000;
        const rand = (a: number, b: number) => Math.random() * (b - a) + a;
        const colors = [...activeTheme.confettiColors];
        const iv = setInterval(() => {
          if (Date.now() > end) return clearInterval(iv);
          const n = 50 * ((end - Date.now()) / 3000);
          const base = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };
          confetti({ ...base, particleCount: n, colors, origin: { x: rand(0.1, 0.35), y: Math.random() - 0.2 } });
          confetti({ ...base, particleCount: n, colors, origin: { x: rand(0.65, 0.9), y: Math.random() - 0.2 } });
        }, 250);
      },
    },
  });
  const onSubmit = (data: RsvpFormValues) =>
    mutation.mutate({ data: { ...data, childName: data.childName?.trim() || null } });
  const whatsappShareUrl = `https://wa.me/?text=${encodeURIComponent(`Vou na festa do ${event.childName}! 🎉 Confirme sua presença aqui: ${siteUrl}`)}`;

  return (
    <section id="rsvp-section" className="py-10 px-4 bg-background">
      <div className="max-w-lg mx-auto">
        <div className="mb-6 text-center">
          <div className="inline-block bg-primary px-6 py-2 rounded-t-xl">
            <h2 className="font-display text-2xl sm:text-3xl text-white drop-shadow-[1px_1px_0_rgba(0,0,0,0.4)]">📋 Lista de Presença</h2>
          </div>
          <div className="bg-secondary/20 border border-secondary/30 rounded-b-xl rounded-tr-xl px-4 py-3">
            <div className="flex flex-col gap-1.5 text-sm font-medium text-foreground/80">
              <span className="flex items-center gap-2"><Calendar className="w-4 h-4 text-accent shrink-0" />{event.dateFull}</span>
              <span className="flex items-center gap-2"><Clock className="w-4 h-4 text-accent shrink-0" />{event.timeLabel}</span>
              <span className="flex items-center gap-2"><MapPin className="w-4 h-4 text-accent shrink-0" />{event.location} — {event.neighborhood}</span>
            </div>
          </div>
        </div>
        <div className="bg-card border-2 border-border rounded-2xl shadow-lg overflow-hidden">
          <div className="h-3 bg-gradient-to-r from-secondary via-[#5dc760] to-secondary" />
          <div className="p-5 sm:p-7">
            <AnimatePresence mode="wait">
              {isSuccess ? (
                <motion.div key="ok" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-8 flex flex-col items-center gap-4">
                  <div className="w-20 h-20 bg-secondary/20 rounded-full flex items-center justify-center text-4xl">
                    {activeTheme.emoji}
                  </div>
                  <div>
                    <h3 className="text-3xl font-display text-primary">{activeTheme.successTitle}</h3>
                    <p className="text-muted-foreground text-sm mt-1">
                      {submittedName ? `Olá, ${submittedName}! ` : ""}{activeTheme.successSub}
                    </p>
                  </div>
                  <a href={whatsappShareUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 bg-[#25D366] hover:bg-[#1fba59] text-white font-bold px-5 py-3 rounded-2xl text-sm transition-colors shadow-md">
                    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current shrink-0"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    Compartilhar no WhatsApp
                  </a>
                  <button onClick={() => { setIsSuccess(false); form.reset(); }} className="text-primary font-bold hover:underline text-sm">
                    Registrar outro convidado
                  </button>
                </motion.div>
              ) : (
                <motion.form key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="space-y-1">
                    <Label className="text-sm font-bold flex items-center gap-1.5"><UserRound className="w-4 h-4 text-primary" /> Seu nome (responsável) *</Label>
                    <Input {...form.register("parentName")} className="h-12 rounded-xl bg-background text-base" placeholder="Ex: Maria Silva" autoComplete="name" />
                    {form.formState.errors.parentName && <p className="text-destructive text-xs">{form.formState.errors.parentName.message}</p>}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm font-bold flex items-center gap-1.5">
                      <Baby className="w-4 h-4 text-secondary" /> Nome da criança <span className="ml-1 text-xs font-normal text-muted-foreground">(opcional)</span>
                    </Label>
                    <Input {...form.register("childName")} className="h-12 rounded-xl bg-background text-base" placeholder="Deixe vazio se vier sem criança" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm font-bold">WhatsApp <span className="font-normal text-muted-foreground text-xs">(opcional)</span></Label>
                    <Input {...form.register("phone")} type="tel" className="h-12 rounded-xl bg-background text-base" placeholder="(99) 99999-9999" autoComplete="tel" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm font-bold">Email <span className="font-normal text-muted-foreground text-xs">(opcional — receba a confirmação por email)</span></Label>
                    <Input {...form.register("email")} type="email" className="h-12 rounded-xl bg-background text-base" placeholder="seu@email.com" autoComplete="email" />
                    {form.formState.errors.email && <p className="text-destructive text-xs">{form.formState.errors.email.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-bold">Quantas pessoas virão?</Label>
                    <CounterField label="Adultos" icon={UserRound} value={adultsCount} onChange={v => form.setValue("adultsCount", v, { shouldValidate: true })} min={1} accentClass="text-primary" />
                    <CounterField label="Crianças" icon={Baby} value={childrenCount} onChange={v => form.setValue("childrenCount", v, { shouldValidate: true })} min={0} accentClass="text-secondary" />
                    <p className="text-xs text-center text-muted-foreground">Total: <strong>{adultsCount + childrenCount}</strong> {adultsCount + childrenCount === 1 ? "pessoa" : "pessoas"}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-bold">Você vai comparecer? *</Label>
                    <div className="flex flex-col gap-2">
                      {(Object.entries(statusConfig) as [keyof typeof statusConfig, typeof statusConfig[keyof typeof statusConfig]][]).map(([val, cfg]) => {
                        const selected = form.watch("status") === val;
                        const Icon = cfg.icon;
                        return (
                          <label key={val} className={cn("flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all",
                            selected ? `${cfg.color} shadow-md` : "border-border bg-background hover:bg-muted/40 text-muted-foreground")}>
                            <input type="radio" value={val} className="sr-only" {...form.register("status")} />
                            <Icon className={cn("w-5 h-5 shrink-0", selected ? "text-white" : "")} />
                            <span className="font-bold text-sm">{cfg.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm font-bold">Observações (alergias, etc.)</Label>
                    <Textarea {...form.register("notes")} className="min-h-[80px] rounded-xl bg-background text-base resize-none" placeholder="Escreva aqui..." />
                  </div>
                  <button type="submit" disabled={mutation.isPending}
                    className="btn-mc w-full bg-secondary text-white py-4 rounded-xl font-display text-xl sm:text-2xl mt-2 flex items-center justify-center gap-2">
                    {mutation.isPending ? <><Loader2 className="w-5 h-5 animate-spin" /> Enviando...</> : activeTheme.confirmLabel}
                  </button>
                  {mutation.isError && (
                    <p className="text-center text-destructive font-medium bg-destructive/10 p-3 rounded-xl text-sm">
                      {(mutation.error as any)?.error ?? "Erro ao enviar. Tente novamente."}
                    </p>
                  )}
                </motion.form>
              )}
            </AnimatePresence>
          </div>
          <div className="h-5" style={{ backgroundImage: "repeating-linear-gradient(90deg,#8B6914 0px,#8B6914 20px,#7a5c10 20px,#7a5c10 40px)" }} />
        </div>
      </div>
    </section>
  );
}

/* ── Guest List + Stats ─────────────────────────────── */
function GuestListSection() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useListGuests({ page, limit: 6, status: "confirmed" });
  const { data: stats } = useGetPublicStats();
  if (isLoading) return <div className="py-12 text-center"><Loader2 className="w-7 h-7 animate-spin text-primary mx-auto" /></div>;
  if (!data || data.items.length === 0) return null;
  return (
    <section className="py-10 px-4 bg-gradient-to-b from-[#e8f5e9] to-background">
      <div className="max-w-lg mx-auto space-y-6">
        {stats && (
          <div className="bg-primary rounded-2xl overflow-hidden shadow-lg border-2 border-primary/60">
            <div className="px-5 pt-4 pb-2 text-center">
              <h2 className="font-display text-2xl sm:text-3xl text-white drop-shadow-[1px_1px_0_rgba(0,0,0,0.4)]">🎮 Aventureiros Confirmados</h2>
            </div>
            <div className="grid grid-cols-3 gap-px bg-white/20 mx-3 mb-4 rounded-xl overflow-hidden">
              {[
                { icon: Users,     val: stats.totalPeople,   label: "Total\nPessoas", color: "text-accent" },
                { icon: UserRound, val: stats.totalAdults,   label: "Adultos",        color: "text-blue-300" },
                { icon: Baby,      val: stats.totalChildren, label: "Crianças",       color: "text-pink-300" },
              ].map(({ icon: Icon, val, label, color }) => (
                <div key={label} className="bg-primary/90 px-3 py-4 text-center flex flex-col items-center gap-1">
                  <Icon className={`w-5 h-5 ${color}`} />
                  <span className="font-display text-3xl text-white leading-none">{val}</span>
                  <span className="text-white/80 text-xs font-bold leading-tight whitespace-pre-line">{label}</span>
                </div>
              ))}
            </div>
            <p className="text-center text-white/70 text-xs font-medium pb-3">
              {stats.totalFamilies} {stats.totalFamilies === 1 ? "família confirmada" : "famílias confirmadas"}
            </p>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {data.items.map((guest, i) => {
            const initial = (guest.childName || guest.parentName).charAt(0).toUpperCase();
            return (
              <motion.div key={guest.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                className="bg-card border-2 border-secondary/20 rounded-xl p-4 flex items-center gap-3 shadow-sm hover:border-secondary/50 transition-colors">
                <div className="w-11 h-11 rounded-lg bg-primary flex items-center justify-center shrink-0 border-2 border-primary/60"
                  style={{ boxShadow: "inset 0 2px 0 rgba(255,255,255,0.2), 0 2px 0 rgba(0,0,0,0.3)" }}>
                  <span className="font-display text-white text-xl leading-none">{initial}</span>
                </div>
                <div className="flex-1 min-w-0">
                  {guest.childName
                    ? (<><p className="font-bold text-foreground truncate text-sm">{guest.childName}</p><p className="text-xs text-muted-foreground truncate">com {guest.parentName}</p></>)
                    : <p className="font-bold text-foreground truncate text-sm">{guest.parentName}</p>}
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    <span className="mc-badge bg-blue-50 border-blue-200 text-blue-700"><UserRound className="w-3 h-3" /> {guest.adultsCount}</span>
                    {guest.childrenCount > 0 && <span className="mc-badge bg-pink-50 border-pink-200 text-pink-600"><Baby className="w-3 h-3" /> {guest.childrenCount}</span>}
                    <span className="mc-badge bg-green-50 border-green-200 text-green-700"><CheckCircle2 className="w-3 h-3" /> Confirmado</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
        {data.totalPages > 1 && (
          <div className="flex justify-center items-center gap-3">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-4 py-2 rounded-lg bg-card border border-border text-sm font-bold disabled:opacity-40 hover:bg-muted transition-colors">← Anterior</button>
            <span className="text-sm font-bold text-muted-foreground">{page} / {data.totalPages}</span>
            <button onClick={() => setPage(p => Math.min(data.totalPages, p + 1))} disabled={page === data.totalPages}
              className="px-4 py-2 rounded-lg bg-card border border-border text-sm font-bold disabled:opacity-40 hover:bg-muted transition-colors">Próxima →</button>
          </div>
        )}
      </div>
    </section>
  );
}

/* ── Maps Section ───────────────────────────────────── */
function MapsSection({ event }: { event: typeof DEFAULT_EVENT }) {
  const query = encodeURIComponent(`${event.location}, ${event.neighborhood}`);
  const googleMapsUrl = event.mapsUrl || `https://www.google.com/maps/search/?api=1&query=${query}`;
  const wazeUrl = `https://waze.com/ul?q=${query}&navigate=yes`;
  return (
    <section className="bg-background py-8 px-4">
      <div className="max-w-lg mx-auto">
        <div className="mb-4">
          <div className="inline-block bg-primary px-6 py-2 rounded-xl">
            <h2 className="font-display text-xl sm:text-2xl text-white drop-shadow-[1px_1px_0_rgba(0,0,0,0.4)]">📍 Como Chegar</h2>
          </div>
        </div>
        <div className="bg-card border-2 border-border rounded-2xl overflow-hidden shadow-md">
          <div className="relative w-full" style={{ height: "240px" }}>
            <iframe src={`https://maps.google.com/maps?q=${query}&output=embed&hl=pt-BR&z=16`}
              className="w-full h-full border-0" allowFullScreen loading="lazy"
              referrerPolicy="no-referrer-when-downgrade" title="Mapa do evento" />
          </div>
          <div className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm text-foreground">{event.location}</p>
                <p className="text-xs text-muted-foreground">{event.neighborhood}</p>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 bg-primary text-white font-bold px-3 py-2 rounded-xl text-xs hover:bg-primary/90 transition-colors">
                <MapPin className="w-3.5 h-3.5" /> Google Maps
              </a>
              <a href={wazeUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 bg-[#00C0F0] text-white font-bold px-3 py-2 rounded-xl text-xs hover:bg-[#00a8d4] transition-colors">
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current shrink-0"><path d="M20.54 6.63C19.08 4.35 16.72 2.7 14 2.18V2a2 2 0 0 0-4 0v.18C7.28 2.7 4.92 4.35 3.46 6.63A10 10 0 0 0 2 12c0 5.52 4.48 10 10 10s10-4.48 10-10a10 10 0 0 0-1.46-5.37zM9 16a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm6 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/></svg>
                Waze
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function SpotifySection({ event }: { event: typeof DEFAULT_EVENT }) {
  const url = event.spotifyPlaylistUrl;
  if (!url) return null;
  const embedUrl = url
    .replace("open.spotify.com/", "open.spotify.com/embed/")
    .split("?")[0];
  return (
    <section className="bg-background py-6 px-4">
      <div className="max-w-lg mx-auto">
        <div className="mb-4">
          <div className="inline-block bg-primary px-6 py-2 rounded-xl">
            <h2 className="font-display text-xl sm:text-2xl text-white drop-shadow-[1px_1px_0_rgba(0,0,0,0.4)]">🎵 Playlist da Festa</h2>
          </div>
        </div>
        <iframe src={embedUrl} width="100%" height="152" frameBorder="0"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy" className="rounded-2xl shadow-md" title="Playlist da festa" />
      </div>
    </section>
  );
}
