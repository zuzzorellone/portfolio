# Portfolio personale — Design

**Data:** 2026-10-15
**Autore:** Christian Esposito
**Stato:** approvata; revisionata il 2026-10-15 (orientamento recruiter-first)

## 1. Obiettivo

Un portfolio snello, leggibile e accattivante che serva due pubblici:

- **Recruiter (prioritario, revisione del 2026-10-15):** devono trovare subito fatti verificabili — ruolo, anni, settore, responsabilità, stack, formazione, disponibilità — e scaricare il CV. Niente tono pubblicitario.
- **Privati / PMI (secondario):** una sezione sobria "Freelance" spiega cosa posso realizzare su commessa e come contattarmi.

Obiettivo nei prossimi 6-12 mesi: impiego o freelance; preferenza per lavoro remoto o ibrido (Roma).

### Profilo da raccontare

- Dal 2020 sviluppatore backend in un'azienda di consulenza IT (anonima), su un cliente del settore energetico: evolutive su un applicativo enterprise on-premise, analisi dei requisiti e tecniche, stime, supporto utenti.
- Stack al lavoro: Java, JSF, IBM FileNet, Oracle DB, WebLogic, Maven, SVN. Progetti personali: Spring Boot, React, Docker, Git, nginx, Linux.
- Laurea L-31 Scienze e tecnologie informatiche, Università Pegaso: tesi a dicembre 2026, proclamazione prevista a inizio 2027.
- Disponibile per impiego o freelance; Roma, remoto o ibrido.

### Criteri di successo

- Un recruiter capisce ruolo, esperienza, stack e disponibilità dalla sola hero e scarica il CV in un clic.
- Un privato/PMI trova la sezione Freelance dal menu e il contatto in un clic.
- Lighthouse ≥ 95 su Performance, Accessibility, Best Practices, SEO (mobile).
- Sito interamente disponibile in italiano e inglese.
- Deploy riproducibile sul VPS esistente con un solo comando.

## 2. Struttura e contenuti

### Home (`/it`, `/en`)

Una pagina lunga a sezioni, in quest'ordine:

1. **Hero = scheda profilo** — etichetta (ruolo + anni), titolo fattuale, una riga su lavoro attuale e progetti personali, stato di disponibilità (impiego/freelance, Roma, remoto o ibrido). CTA: **"Scarica il CV"** (principale) e **"Contattami"**; icone GitHub e LinkedIn. A destra una card con 3 fatti verificabili (anni e settore, stack enterprise, laurea).
2. **Esperienza e formazione** — voce di lavoro con responsabilità puntuali, laurea con data prevista, stack diviso in "Al lavoro" e "Progetti personali". Link al CV.
3. **Progetti personali** — card dei casi studio (gestionale di laurea, questo sito) che rimandano alle pagine dedicate.
4. **Freelance** — sezione sobria: una frase, tre ambiti (gestionali, web app, messa online e manutenzione) e una riga sul metodo di lavoro.
5. **Contatti** — tono neutro ("opportunità di lavoro o progetti freelance"): email, GitHub, LinkedIn, eventuale link per prenotare una call.

### Pagina caso studio (`/[lang]/progetti/[slug]`)

Struttura fissa: **Problema → Soluzione → Architettura → Risultato**, con screenshot (dati fittizi per il gestionale). In testa: titolo, sommario, stack, e pulsanti **GitHub** e **Demo live** mostrati **solo se valorizzati**.

### CV

PDF statici: `cv-it.pdf`, `cv-en.pdf`. Forniti dall'autore; il sito li linka soltanto.

### Fuori scope (per ora)

Blog, form contatti con backend, toggle tema chiaro/scuro, animazioni pesanti, analytics.

## 3. Identità e stile visivo

- **Direzione:** editoriale pulita — sfondo bianco caldo, testo quasi nero, **un solo colore d'accento**, tipografia grande e curata, molto spazio bianco.
- **Elementi:** sezioni separate da linee sottili ed etichette maiuscole piccole; servizi numerati (01, 02, 03); card casi studio con screenshot, titolo e tag stack.
- **Da definire in implementazione:** colore d'accento e coppia di font (2-3 varianti a confronto).
- **Nome mostrato e dominio:** configurabili in un unico file (`src/config.ts`). Il sito si presenta con nome e cognome; un eventuale brand (es. "Boarbyte") è un parametro opzionale, non vincola la struttura.
- **Responsive:** mobile-first, leggibile da 360px in su.
- **Accessibilità:** contrasto AA, navigazione da tastiera, focus visibile, `alt` sulle immagini, `lang` corretto per pagina.

## 4. Architettura tecnica

### Stack

- **Astro** (output statico), TypeScript.
- Zero JavaScript lato client di default; isole interattive solo se strettamente necessarie.
- CSS scoped nei componenti + variabili globali per colori/tipografia (nessun framework CSS obbligatorio).

### Struttura progetto

```
src/
  config.ts              # nome, brand opzionale, dominio, link social, email, link call
  content/
    projects/
      it/<slug>.md
      en/<slug>.md
  content.config.ts      # schema collection projects
  i18n/
    it.json
    en.json
    utils.ts             # helper t(), lingua corrente, URL nell'altra lingua
  components/            # Header, LangSwitch, Hero, Services, CaseStudyCard,
                         # Process, Experience, Contact, Footer
  layouts/
    Base.astro           # <head>, SEO, Open Graph, hreflang, header/footer
    CaseStudy.astro
  pages/
    index.astro          # redirect alla lingua del browser (default it)
    [lang]/index.astro
    [lang]/progetti/[slug].astro
    404.astro
public/
  cv/cv-it.pdf, cv/cv-en.pdf
  images/
```

### Schema caso studio

| Campo | Tipo | Obbligatorio |
|---|---|---|
| `title` | string | sì |
| `summary` | string | sì |
| `stack` | string[] | sì |
| `cover` | immagine | sì |
| `order` | number | sì (ordinamento in home) |
| `github` | URL | no |
| `demo` | URL | no |

Lo slug è condiviso tra lingue (stesso nome file in `it/` e `en/`), così il selettore lingua porta alla pagina corrispondente.

### i18n

- Route `/it/...` e `/en/...`; `/` reindirizza in base ad `Accept-Language` lato client con fallback `it`.
- Testi dell'interfaccia in `it.json` / `en.json`; contenuti lunghi in Markdown per lingua.
- Il build **fallisce** se manca una chiave di traduzione o un caso studio esiste in una sola lingua.

### SEO

Title e description per pagina e lingua, Open Graph + immagine di anteprima, `hreflang` reciproci, `canonical`, sitemap, `robots.txt`.

## 5. Deploy

Il VPS ha già **nginx sull'host** che serve più siti.

- **Dockerfile multi-stage:** stage Node per `astro build` → immagine finale `nginx:alpine` con i soli file statici.
- **nginx del container:** gzip, cache lunga per asset con hash, cache breve per HTML, header di sicurezza (CSP, X-Content-Type-Options, Referrer-Policy), pagina 404.
- **docker-compose.yml:** container esposto solo su `127.0.0.1:<porta>`, `restart: unless-stopped`.
- **nginx dell'host:** esempio di blocco `server {}` reverse proxy in `deploy/host-nginx.conf.example`; HTTPS via certbot sull'host.
- **Dominio:** `boarbyte.it` (parametro in `src/config.ts`). Il sito si presenta come "Christian Esposito"; "Boarbyte" compare come firma/logo secondario.
- **Opzionale (fase successiva):** GitHub Action per build e deploy automatico al push.

Git (init, commit, push) è gestito dall'autore, non dagli strumenti.

## 6. Verifica

- `astro check` e build senza errori né warning.
- Controllo automatico dei link interni.
- Verifica completezza traduzioni (vedi i18n).
- Lighthouse mobile ≥ 95 sulle 4 categorie, su home e una pagina caso studio.
- Test manuale: container avviato in locale, navigazione IT/EN, download CV, link GitHub/Demo presenti solo quando valorizzati.

## 7. Contenuti da fornire (autore)

- Testi definitivi: headline, servizi, esperienza (bozze possono essere proposte in implementazione).
- CV in PDF (IT, EN).
- Screenshot del gestionale con dati fittizi; eventuali link GitHub/demo.
- Link LinkedIn, GitHub, email, link prenotazione call.
- Registrazione di `boarbyte.it` e configurazione DNS/email.
