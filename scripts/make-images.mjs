// Genera immagini placeholder: anteprima social (public/og.png) e cover dei casi studio.
// Le cover vanno poi sostituite con screenshot reali (stesso nome file, oppure aggiornando il frontmatter).
// Uso: npm run images            (non sovrascrive file esistenti)
//      npm run images -- --force (rigenera tutto)
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { readCssTokens } from './lib/css-tokens.mjs';

const force = process.argv.includes('--force');

// Colori presi da global.css: dopo aver cambiato --accent esegui `npm run images -- --force`
const { bg: BG, text: INK, muted: MUTED, accent: ACCENT } = readCssTokens(
  readFileSync('src/styles/global.css', 'utf8'),
  ['bg', 'text', 'muted', 'accent'],
);

const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

function card({ width, height, eyebrow, title, subtitle }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <rect width="100%" height="100%" fill="${BG}"/>
  <rect x="0" y="${height - 16}" width="100%" height="16" fill="${ACCENT}"/>
  <text x="80" y="${height * 0.34}" font-family="Georgia, serif" font-size="28" letter-spacing="4" fill="${MUTED}">${escape(eyebrow.toUpperCase())}</text>
  <text x="80" y="${height * 0.52}" font-family="Georgia, serif" font-size="72" fill="${INK}">${escape(title)}</text>
  <text x="80" y="${height * 0.66}" font-family="Georgia, serif" font-style="italic" font-size="40" fill="${ACCENT}">${escape(subtitle)}</text>
</svg>`;
}

const outputs = [
  {
    file: 'public/og.png',
    svg: card({ width: 1200, height: 630, eyebrow: 'boarbyte.it', title: 'Christian Esposito', subtitle: 'Gestionali e web app su misura' }),
  },
  {
    file: 'src/assets/projects/gestionale-lab.png',
    svg: card({ width: 1600, height: 1000, eyebrow: 'Caso studio', title: 'Gestionale laboratorio', subtitle: 'Screenshot in arrivo' }),
  },
  {
    file: 'src/assets/projects/portfolio.png',
    svg: card({ width: 1600, height: 1000, eyebrow: 'Caso studio', title: 'Questo sito', subtitle: 'Dal codice alla produzione' }),
  },
];

for (const { file, svg } of outputs) {
  if (existsSync(file) && !force) {
    console.log(`skip ${file} (esiste già)`);
    continue;
  }
  mkdirSync(path.dirname(file), { recursive: true });
  await sharp(Buffer.from(svg)).png().toFile(file);
  console.log(`creato ${file}`);
}
