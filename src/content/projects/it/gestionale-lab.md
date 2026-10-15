---
title: Gestionale per laboratorio di analisi
summary: "Applicazione web per gestire accettazione dei pazienti, esami e referti di un laboratorio di analisi cliniche, con accessi differenziati per ruolo."
stack: [Java, Spring Boot, React, PostgreSQL, Docker]
cover: ../../../assets/projects/gestionale-lab.png
coverAlt: Schermata del gestionale con l'elenco delle accettazioni del giorno (dati fittizi)
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
- ruoli distinti (accettazione, tecnici, medici, amministrazione) con permessi dedicati.

## Architettura

Backend REST in Java con Spring Boot, frontend React, database relazionale. L'intera applicazione è containerizzata con Docker per avere ambienti identici in sviluppo e in produzione.

## Il risultato

Un unico punto di accesso per tutto il personale, meno passaggi manuali e dati sanitari protetti da controlli di accesso per ruolo.
