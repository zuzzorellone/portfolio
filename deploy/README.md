# Deploy su VPS

Il sito gira in un container nginx che ascolta solo su `127.0.0.1:8085`.
Il nginx già presente sul VPS fa da reverse proxy e gestisce HTTPS con certbot.

## Prima del primo deploy

- [ ] CV reali in `public/cv/cv-it.pdf` e `public/cv/cv-en.pdf` (ora sono placeholder)
- [ ] `src/config.ts`: email, P.IVA (se presente), LinkedIn, GitHub, link prenotazione call
- [ ] Cover reali dei casi studio in `src/assets/projects/` (screenshot con dati fittizi)
- [ ] Testi rivisti in `src/i18n/*.json` e `src/content/projects/`
- [ ] DNS: record `A` (e `AAAA` se il VPS ha IPv6) per `boarbyte.it` e `www.boarbyte.it` verso l'IP del VPS

## Primo deploy

```bash
# sul VPS
git clone <url-del-repo> ~/portfolio && cd ~/portfolio
docker compose up -d --build        # PORTFOLIO_PORT=xxxx per cambiare porta
deploy/smoke-test.sh                # verifica il container in locale

sudo cp deploy/host-nginx.conf.example /etc/nginx/sites-available/boarbyte.it
# adatta porta/nomi se necessario
sudo ln -s /etc/nginx/sites-available/boarbyte.it /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d boarbyte.it -d www.boarbyte.it

deploy/smoke-test.sh https://boarbyte.it
```

## Aggiornamenti

```bash
cd ~/portfolio && git pull && docker compose up -d --build && deploy/smoke-test.sh
```

Il build nel container esegue test e controlli: se qualcosa non va, l'immagine non viene creata
e il sito online resta quello precedente.
