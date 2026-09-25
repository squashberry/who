# WHO Control API

This is the production control/API layer for the WHO website Admin panel.

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

Set `database_id` in `wrangler.toml` to the existing WHO D1 database ID when one already exists. D1 bindings use the configured database ID and binding name. See Cloudflare's current Wrangler/D1 configuration guidance.