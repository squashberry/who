# WHO Control API

This is the production control/API layer for the WHO website Admin panel. It is intentionally deployed as `who-control-api` so it does not overwrite the existing mobile `who-api` Worker.

## Important

The older `who-app` repository contains the architecture/config contract, but no deployed Worker or D1 implementation. This Worker is the fresh implementation of that contract.

The mobile WHO API can share the same D1 database. Do not create a second database when an existing WHO D1 database already exists.

## Routes

Public:
- GET `/health`
- GET `/config`
- POST `/presence/heartbeat`
- POST `/announcement/response`

Admin-protected:
- GET `/admin/verify`
- GET `/admin/bootstrap`
- GET/PUT `/admin/config`
- GET `/admin/stats`
- GET `/admin/users`
- GET `/admin/reports`
- POST `/admin/reports/:id/resolve`
- GET `/admin/crashes`
- POST `/admin/crashes/:id/status`
- GET `/admin/feedback`
- GET `/admin/audit`
- POST `/admin/intelligence/lookup`

## Required secret

Set `ADMIN_API_KEY` as a Worker secret. Never commit it.

## D1

Use the same existing WHO D1 database that backs the mobile API when you want Admin changes to become the app's live remote configuration. The deploy script refuses to create a new database automatically. Do not change the Flutter app's `who-api` URL until the shared D1/schema is verified.