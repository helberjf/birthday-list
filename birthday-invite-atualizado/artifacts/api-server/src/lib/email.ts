const THEME_EMOJI: Record<string, string> = {
  minecraft: "⚔️", mario: "🍄", princesas: "👸", futebol: "⚽",
  spiderman: "🕷️", roblox: "🎮", sonic: "⚡", dinossauro: "🦕",
  sereia: "🧜", unicornio: "🦄", astronauta: "🚀", pokemon: "⚡",
  frozen: "❄️", safari: "🦁",
};

export async function sendConfirmationEmail(params: {
  to: string;
  parentName: string;
  childName?: string | null;
  childNameEvent: string;
  dateLabel: string;
  timeLabel: string;
  location: string;
  neighborhood: string;
  theme?: string | null;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;
  const from = process.env.RESEND_FROM_EMAIL ?? "festa@resend.dev";

  const emoji = THEME_EMOJI[params.theme ?? "minecraft"] ?? "🎉";
  const greeting = params.childName
    ? `${params.parentName} (com ${params.childName})`
    : params.parentName;

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:20px;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,0.1)">
    <div style="background:linear-gradient(135deg,#1a6b2a 0%,#2d8a40 50%,#4caf50 100%);padding:36px 28px;text-align:center">
      <div style="font-size:56px;margin-bottom:12px">${emoji}</div>
      <h1 style="margin:0;color:#fff;font-size:26px;font-weight:800;letter-spacing:-0.5px">Presença Confirmada! 🎉</h1>
      <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:15px">Festa de aniversário do(a) <strong>${params.childNameEvent}</strong></p>
    </div>
    <div style="padding:32px 28px">
      <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6">
        Olá, <strong>${greeting}</strong>! 👋<br>
        Sua presença foi confirmada com sucesso. Mal podemos esperar para vê-lo(a) na festa!
      </p>
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:14px;padding:20px;margin-bottom:24px">
        <h2 style="margin:0 0 14px;font-size:14px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px">Detalhes do Evento</h2>
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
          <span style="font-size:20px">📅</span>
          <span style="font-size:15px;color:#111827;font-weight:600">${params.dateLabel}</span>
        </div>
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
          <span style="font-size:20px">🕐</span>
          <span style="font-size:15px;color:#374151">${params.timeLabel}</span>
        </div>
        <div style="display:flex;align-items:flex-start;gap:10px">
          <span style="font-size:20px">📍</span>
          <span style="font-size:15px;color:#374151">${params.location}<br><span style="color:#6b7280;font-size:13px">${params.neighborhood}</span></span>
        </div>
      </div>
      <div style="background:#ecfdf5;border:1px solid #6ee7b7;border-radius:12px;padding:14px;text-align:center">
        <p style="margin:0;font-size:13px;color:#059669;font-weight:600">
          🎊 Nos vemos na festa! Vai ser incrível!
        </p>
      </div>
    </div>
    <div style="padding:16px 28px 24px;text-align:center;border-top:1px solid #f3f4f6">
      <p style="margin:0;font-size:12px;color:#9ca3af">Este email foi enviado automaticamente pelo sistema de convites.</p>
    </div>
  </div>
</body>
</html>`;

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [params.to],
        subject: `Presença confirmada na festa de ${params.childNameEvent}! ${emoji}`,
        html,
      }),
    });
  } catch {
    // silently ignore - don't fail the RSVP if email sending fails
  }
}
