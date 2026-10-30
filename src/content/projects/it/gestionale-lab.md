---
title: Gestionale per laboratorio di analisi
summary: "Applicazione web per un laboratorio di analisi cliniche: accettazione, esami e referti, con accessi per ruolo. I pazienti scaricano il referto senza registrarsi, con codice fiscale e token."
stack: [Java, Spring Boot, React, PostgreSQL, Docker]
cover: ../../../assets/projects/gestionale-lab.png
coverAlt: Home page del portale per i pazienti, con prenotazione delle visite e download dei referti
order: 1
---

<!-- BOZZA: da rivedere con i dettagli reali del progetto di laurea -->

## Il problema

Un laboratorio di analisi gestisce ogni giorno decine di pazienti, richieste di esami e referti. Con strumenti separati (carta, fogli di calcolo, software datati) aumentano i tempi di attesa e il rischio di errori su dati sensibili.

## La soluzione

Un gestionale web unico che accompagna il paziente dall'accettazione al referto:

- accettazione e anagrafica dei pazienti;
- gestione delle richieste e dello stato degli esami;
- inserimento e consultazione dei referti;
- un portale per i pazienti, che prenotano la visita online e scaricano il referto **senza account né login**: ricevono una mail con un link e un token, e il link apre la pagina di download già compilata con codice fiscale e token. Chi preferisce può inserirli a mano;
- ruoli distinti (accettazione, tecnici, medici, amministrazione) con permessi dedicati.

## Architettura

Backend REST in Java con Spring Boot, frontend React, database relazionale. L'intera applicazione è containerizzata con Docker per avere ambienti identici in sviluppo e in produzione.

## Il risultato

Un unico punto di accesso per tutto il personale, meno passaggi manuali e dati sanitari protetti da controlli di accesso per ruolo. Per i pazienti niente code, telefonate o password da ricordare: il referto si scarica in pochi secondi.
