/** Legge i valori delle custom property (es. --accent) da un foglio di stile. */
export function readCssTokens(css, names) {
  const tokens = {};
  for (const name of names) {
    const match = css.match(new RegExp(`--${name}\\s*:\\s*([^;]+);`));
    if (!match) throw new Error(`Variabile CSS --${name} non trovata`);
    tokens[name] = match[1].trim();
  }
  return tokens;
}
