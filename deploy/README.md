# Mettere online il portfolio

Il deploy è automatico: **un push su `master`** fa partire il workflow
`.github/workflows/deploy.yml`, che

1. costruisce l'immagine Docker per ARM (il server Oracle Ampere): il Dockerfile esegue test,
   build e `check-dist`, quindi se qualcosa fallisce l'immagine non nasce e il sito online resta
   quello precedente;
2. la pubblica nel registro del repo, `ghcr.io/<owner>/<repo>`, con i tag `latest` e il commit;
3. entra nel server via SSH, copia `deploy/docker-compose.yml`, scarica la nuova immagine e
   riavvia il container; aspetta che risponda sano, altrimenti il workflow fallisce e mostra i log.

Si può lanciare anche a mano da GitHub: Actions → Deploy → Run workflow.

---

## Prima del primo deploy

- [ ] CV reali in `public/cv/cv-it.pdf` e `public/cv/cv-en.pdf` (senza dati che non vuoi pubblici:
      restano nella storia del repo)
- [ ] `src/config.ts`: email, P.IVA (se presente), LinkedIn, GitHub, link prenotazione call
- [ ] Cover reali dei casi studio in `src/assets/projects/` (screenshot con dati fittizi)
- [ ] Testi rivisti in `src/i18n/*.json` e `src/content/projects/`

## Preparazione (una volta sola)

### 1. DNS

Nel pannello di `boarbyte.it` aggiungi due record **A**, `@` e `www`, verso l'IP pubblico del
server Oracle (e `AAAA` se il server ha IPv6). Le porte 80 e 443 sono già aperte per gli altri
siti dietro Nginx Proxy Manager.

### 2. Utente e cartella sul server

Si usa lo stesso utente `deploy` degli altri progetti (nel gruppo `docker`). Basta la cartella:

```sh
sudo -u deploy mkdir -p /home/deploy/portfolio
```

Il file `.env` non va creato a mano: lo scrive il workflow con l'immagine in uso. Il sito non ha
segreti.

### 3. Secrets del repo

Su GitHub: Settings → Secrets and variables → Actions. Il job usa l'environment `production`,
che GitHub crea da solo al primo deploy; i secrets possono stare a livello di repo.

| Secret | Valore |
| --- | --- |
| `DEPLOY_SSH_KEY` | la chiave **privata** di deploy (tutto il file, non il `.pub`); può essere la stessa di wargrind |
| `DEPLOY_KNOWN_HOSTS` | l'output di `ssh-keyscan -H <IP-del-server>` |
| `DEPLOY_HOST` | l'IP (o il nome) del server |
| `DEPLOY_USER` | `deploy` |

Variabili facoltative (stessa pagina, scheda Variables): `DEPLOY_PATH` (default `portfolio`,
relativo alla home dell'utente) e `DEPLOY_PORT` (default `22`).

### 4. Primo deploy

Fai un push su `master` (o lancia il workflow a mano) e aspetta che finisca in verde. Sul server
dovresti vedere il container:

```sh
cd ~/portfolio && docker compose ps
```

### 5. Nginx Proxy Manager

1. **Hosts → Proxy Hosts → Add Proxy Host**
   - Domain names: `boarbyte.it`
   - Scheme `http`, Forward Hostname `portfolio`, Forward Port `80`
   - Scheda SSL: *Request a new SSL Certificate*, *Force SSL*, *HTTP/2*, *HSTS enabled*
2. **Hosts → Redirection Hosts → Add Redirection Host**, per avere un solo indirizzo canonico:
   - Domain names: `www.boarbyte.it`
   - Forward to `boarbyte.it`, HTTP code `301`, *Preserve Path* attivo
   - Scheda SSL: nuovo certificato e *Force SSL*

Header di sicurezza, cache e compressione li imposta già il nginx del container
(`deploy/nginx/`): in NPM non serve aggiungere niente.

### 6. Verifica

Dal tuo computer:

```sh
deploy/smoke-test.sh https://boarbyte.it
```

---

## Tornare a una versione precedente

Ogni deploy pubblica anche un'immagine con lo SHA del commit. Sul server:

```sh
cd ~/portfolio
sed -i 's#^PORTFOLIO_IMAGE=.*#PORTFOLIO_IMAGE=ghcr.io/<owner>/<repo>:<sha>#' .env
docker compose up -d
```

L'immagine è privata: se non è già sul server serve un `docker login ghcr.io` con un token che
abbia il permesso `read:packages`. Più semplice: `git revert` del commit sbagliato e push su
`master`, che rifà il deploy da solo.

## Provare l'immagine in locale

Il `docker-compose.yml` nella root costruisce l'immagine e la espone su `127.0.0.1:8085`:

```sh
docker compose up -d --build
deploy/smoke-test.sh
```
