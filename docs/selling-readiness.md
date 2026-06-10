# Selling Readiness Checklist

Use this app as a repeatable birthday invite product by changing the event config, image, theme, and guest data for each child/customer.

## Admin Personalization

The admin now covers the core CRUD needed for a personalized sale:

- Event data: child name, age, date, full date, time, address, neighborhood/city, and invite message.
- Main invite image: external URL or upload.
- Theme: select an active theme and copy its hero colors into the event.
- Theme catalog: create, edit, duplicate, activate/deactivate, and remove themes.
- Photo guidance: each theme includes a photo recommendation and an AI image prompt.
- Optional content: background music, gallery title/visibility, Spotify playlist, custom Google Maps URL, and WhatsApp reminders.
- Guest management: view, edit, delete, filter, export, and audit guest RSVPs.

## Recommended Sales Workflow

1. Create or connect a fresh database for the customer/event.
2. Run `pnpm --filter @workspace/db run push` with `DATABASE_URL` set.
3. Open admin and configure the event details.
4. Pick a theme, then upload or paste the main image.
5. Use the theme's "Foto recomendada" and "Prompt para gerar imagem" to produce the invite art.
6. Test the public page, RSVP form, map, QR code, music, and gallery.
7. Share the final public URL with the customer.

## Photo Recommendation

For best results, ask for a bright vertical photo of the child:

- Good natural light or soft studio light.
- Simple background.
- Face visible and not cropped.
- Outfit matching the selected theme palette.
- Leave visual space around the child for decorations and layout.

## Prompt Pattern

Use the selected theme prompt from admin. Keep these rules:

- Do not ask for readable text in the image.
- Do not ask for logos, official character faces, or protected brand marks.
- Generate in vertical 4:5 or 9:16.
- Add clean visual space where the app text will sit.

## Commercial Cautions

Some theme names are based on popular child-party requests. For commercial sales, avoid using official logos, copied character art, or claiming endorsement. Prefer "inspired by" visual direction and generated/generic decorative elements.

## Operational Notes

- Uploads on Vercel require `BLOB_READ_WRITE_TOKEN`; otherwise use an external image URL.
- WhatsApp reminders require `WHATSAPP_TOKEN` and `WHATSAPP_PHONE_ID`.
- Admin login requires `ADMIN_PASSWORD` and `JWT_SECRET`.
- Built-in themes are seeded automatically when `/api/themes` or `/api/admin/themes` is first called and the theme table is empty.
