#!/usr/bin/env bash
# Smoke test del sito servito da nginx (container locale o produzione).
# Uso: deploy/smoke-test.sh [base_url]
#      default: http://127.0.0.1:${PORTFOLIO_PORT:-8085}
set -uo pipefail

BASE="${1:-http://127.0.0.1:${PORTFOLIO_PORT:-8085}}"
failures=0

pass() { echo "ok   - $1"; }
fail() { echo "FAIL - $1"; failures=$((failures + 1)); }

expect_eq() { # descrizione, atteso, ottenuto
  if [[ "$3" == "$2" ]]; then pass "$1"; else fail "$1 (atteso '$2', ottenuto '$3')"; fi
}

expect_match() { # descrizione, regex, testo
  if [[ "$3" =~ $2 ]]; then pass "$1"; else fail "$1 (nessun match per '$2')"; fi
}

status() { curl -s -o /dev/null -w '%{http_code}' "$1"; }

# header URL NOME [opzioni curl...]
header() {
  curl -s -D - -o /dev/null "${@:3}" "$1" | tr -d '\r' | grep -i "^$2:" | head -1 | cut -d' ' -f2-
}

for path in / /it/ /en/ /it/progetti/gestionale-lab/ /en/progetti/gestionale-lab/ \
  /cv/cv-it.pdf /cv/cv-en.pdf /lang-redirect.js /sitemap-index.xml /robots.txt; do
  expect_eq "GET $path -> 200" 200 "$(status "$BASE$path")"
done

expect_eq "slash mancante -> 301" 301 "$(status "$BASE/it/progetti/gestionale-lab")"
expect_eq "redirect con Location relativa" "/it/progetti/gestionale-lab/" \
  "$(header "$BASE/it/progetti/gestionale-lab" location)"

expect_eq "pagina inesistente -> 404" 404 "$(status "$BASE/non-esiste/")"
expect_match "pagina 404 personalizzata" "Pagina non trovata" "$(curl -s "$BASE/non-esiste/")"
# Cartelle senza index.html (es. URL di un caso studio accorciato): 404 personalizzata, non 403 di nginx
expect_eq "cartella senza index -> 404" 404 "$(status "$BASE/it/progetti/")"
expect_match "cartella senza index -> 404 personalizzata" "Pagina non trovata" "$(curl -s "$BASE/it/progetti/")"

expect_match "CSP presente" "default-src 'self'" "$(header "$BASE/it/" content-security-policy)"
expect_eq "nosniff presente" "nosniff" "$(header "$BASE/it/" x-content-type-options)"
expect_eq "HTML sempre rivalidato" "no-cache" "$(header "$BASE/it/" cache-control)"
expect_match "HTML compresso con gzip" "gzip" "$(header "$BASE/it/" content-encoding -H 'Accept-Encoding: gzip')"
expect_match "CV servito come PDF" "application/pdf" "$(header "$BASE/cv/cv-it.pdf" content-type)"

asset="$(curl -s "$BASE/it/" | grep -oE '/_astro/[^"]+\.css' | head -1)"
if [[ -n "$asset" ]]; then
  expect_match "asset /_astro/ immutabili" "immutable" "$(header "$BASE$asset" cache-control)"
  expect_eq "header di sicurezza anche sugli asset" "nosniff" "$(header "$BASE$asset" x-content-type-options)"
else
  fail "nessun CSS /_astro/ trovato in /it/"
fi

echo
if ((failures > 0)); then
  echo "$failures controlli falliti"
  exit 1
fi
echo "Tutti i controlli superati"
