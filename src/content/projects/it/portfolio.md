---
title: Questo sito, dal codice alla produzione
summary: "Il portfolio che stai leggendo: sito statico bilingue, veloce e senza tracciamento, pubblicato su un server gestito da me con Docker e nginx."
stack: [Astro, TypeScript, Docker, nginx, "Let's Encrypt"]
cover: ../../../assets/projects/portfolio.png
coverAlt: Anteprima della home page di questo sito
order: 2
---

## Il problema

Un sito professionale deve caricarsi all'istante, farsi trovare sui motori di ricerca e rispettare la privacy di chi lo visita, senza diventare un costo di manutenzione.

## La soluzione

- Sito statico generato con Astro: nessun database, nessun codice eseguito lato server.
- Italiano e inglese con URL dedicati e indicazioni corrette per i motori di ricerca.
- Font ospitati localmente, nessun cookie e nessuno strumento di tracciamento.
- Controlli automatici a ogni build: link rotti, traduzioni mancanti, metadati SEO.

## Architettura

Il sito è impacchettato in un'immagine Docker leggera basata su nginx. Sul server, un nginx esistente fa da reverse proxy e gestisce i certificati HTTPS con Let's Encrypt. Un aggiornamento si pubblica con un solo comando.

## Il risultato

Pagine leggere e veloci, punteggi Lighthouse alti, e la stessa filiera che uso per mettere online i progetti dei clienti.
