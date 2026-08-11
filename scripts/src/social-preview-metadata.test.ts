import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const html = readFileSync(
  resolve(import.meta.dirname, "../../artifacts/birthday-invite/index.html"),
  "utf8",
);

const requiredTags = [
  '<html lang="pt-BR">',
  '<title>Aniversario da Julia - 16/08/2026</title>',
  '<meta name="description" content="Convite para o aniversario da Julia: domingo, 16 de agosto de 2026, das 13:00 as 18:00, na Rua Jacomo Natal Granzotto, 1480 - Candido Portinari, Ribeirao Preto. Teremos piscina: leve roupa de banho, chinelo e toalha." />',
  '<link rel="canonical" href="https://julia-niver.vercel.app/" />',
  '<meta property="og:type" content="website" />',
  '<meta property="og:url" content="https://julia-niver.vercel.app/" />',
  '<meta property="og:title" content="Aniversario da Julia - 16/08/2026" />',
  '<meta property="og:description" content="Domingo, 16 de agosto de 2026, das 13:00 as 18:00. Rua Jacomo Natal Granzotto, 1480 - Candido Portinari, Ribeirao Preto. Teremos piscina: leve roupa de banho, chinelo e toalha." />',
  '<meta property="og:image" content="https://julia-niver.vercel.app/images/convite-julia.jpg" />',
  '<meta property="og:image:secure_url" content="https://julia-niver.vercel.app/images/convite-julia.jpg" />',
  '<meta property="og:image:width" content="1024" />',
  '<meta property="og:image:height" content="1535" />',
  '<meta property="og:image:type" content="image/jpeg" />',
  '<meta property="og:image:alt" content="Convite da Julia com foto da aniversariante e informacoes da festa" />',
  '<meta name="twitter:card" content="summary_large_image" />',
  '<meta name="twitter:title" content="Aniversario da Julia - 16/08/2026" />',
  '<meta name="twitter:description" content="Domingo, 16 de agosto de 2026, das 13:00 as 18:00. Rua Jacomo Natal Granzotto, 1480 - Candido Portinari, Ribeirao Preto. Teremos piscina: leve roupa de banho, chinelo e toalha." />',
  '<meta name="twitter:image" content="https://julia-niver.vercel.app/images/convite-julia.jpg" />',
];

for (const tag of requiredTags) {
  assert.ok(html.includes(tag), `Missing social preview tag: ${tag}`);
}

assert.ok(!html.includes("Av Rio Pardo"), "Static social fallback must not contain the old address.");

console.log("Birthday invite social preview metadata checks passed.");
