---
title: Management software for a medical lab
summary: "Web application for a clinical analysis lab: check-in, tests and reports, with role-based access. Patients download their report without signing up, using their tax code and a token."
stack: [Java, Spring Boot, React, PostgreSQL, Docker]
cover: ../../../assets/projects/gestionale-lab.png
coverAlt: Home page of the patient portal, for booking visits and downloading lab reports
order: 1
---

<!-- DRAFT: to be reviewed with the real details of the thesis project -->

## The problem

A medical lab handles dozens of patients, test requests and reports every day. With separate tools (paper, spreadsheets, outdated software) waiting times grow and so does the risk of errors on sensitive data.

## The solution

A single web application that follows the patient from check-in to report:

- patient check-in and records;
- test requests and status tracking;
- report entry and lookup;
- a patient portal to book visits online and download reports **with no account and no login**: patients get an email with a link and a token, and the link opens the download page already filled in with their Italian tax code and the token. They can also enter both by hand;
- separate roles (front desk, technicians, doctors, administration) with dedicated permissions.

## Architecture

REST backend in Java with Spring Boot, React frontend, relational database. The whole application runs in Docker containers, so development and production environments are identical.

## The outcome

One entry point for all staff, fewer manual steps, and health data protected by role-based access control. Patients skip queues, phone calls and passwords: they get their report in a few seconds.
