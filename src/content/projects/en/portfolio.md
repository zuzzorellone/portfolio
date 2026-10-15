---
title: This website, from code to production
summary: "The portfolio you are reading: a fast, bilingual, tracking-free static site, running on a server I manage with Docker and nginx."
stack: [Astro, TypeScript, Docker, nginx, "Let's Encrypt"]
cover: ../../../assets/projects/portfolio.png
coverAlt: Preview of this website's home page
order: 2
---

## The problem

A professional website has to load instantly, be easy to find on search engines and respect visitors' privacy, without becoming a maintenance burden.

## The solution

- Static site generated with Astro: no database, no server-side code.
- Italian and English with dedicated URLs and correct hints for search engines.
- Self-hosted fonts, no cookies and no tracking tools.
- Automatic checks on every build: broken links, missing translations, SEO metadata.

## Architecture

The site is packaged in a lightweight nginx-based Docker image. On the server, an existing nginx acts as reverse proxy and handles HTTPS certificates with Let's Encrypt. An update ships with a single command.

## The outcome

Light, fast pages, high Lighthouse scores, and the same pipeline I use to put client projects online.
