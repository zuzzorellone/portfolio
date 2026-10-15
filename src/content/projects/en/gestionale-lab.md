---
title: Management software for a medical lab
summary: "Web application to manage patient check-in, tests and reports for a clinical analysis laboratory, with role-based access."
stack: [Java, Spring Boot, React, PostgreSQL, Docker]
cover: ../../../assets/projects/gestionale-lab.png
coverAlt: Screenshot of the management software showing today's check-ins (sample data)
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
- separate roles (front desk, technicians, doctors, administration) with dedicated permissions.

## Architecture

REST backend in Java with Spring Boot, React frontend, relational database. The whole application runs in Docker containers, so development and production environments are identical.

## The outcome

One entry point for all staff, fewer manual steps, and health data protected by role-based access control.
