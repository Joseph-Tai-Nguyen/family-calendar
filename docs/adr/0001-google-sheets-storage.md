# ADR-0001: Store user data in a Google Sheet in the user's Drive

- Status: Accepted
- Date: 2026-11-23

## Context

The family wants to own their data, see and edit it in a familiar tool, and back it up to Excel. Hosting is on Cloudflare Workers. A managed database (D1, KV, Postgres) would put sensitive health data on our infrastructure.

## Decision

Each user signs in with Google. The Worker creates **one spreadsheet per user** with the `drive.file` scope and reads or writes it through the Sheets API v4. Each table is one tab with a header row (see `docs/data-model.md`). Saves rewrite all tabs, because the datasets are a few thousand rows at most.

## Consequences

- ✅ Data stays in the user's Drive. It is human-readable and editable, and needs no database to run.
- ✅ The same tabular shape doubles as the .xlsx backup format.
- ⚠️ The Sheets API quota (300 requests per minute per project) is fine for a family, but not for thousands of users.
- ⚠️ A full rewrite is last-writer-wins. Concurrent edits from two devices are reconciled by a timestamp check and a user prompt.
- ⚠️ `drive.file` cannot open a sheet the user created by hand. Restoring from .xlsx is done through the app's import.
