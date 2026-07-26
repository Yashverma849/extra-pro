# NIA Oman AML/CFT Compliance Portal

This repository contains the editable source for the New India Assurance Co. Ltd. — Oman Operations intranet compliance portal.

## Application boundary

The portal runs independently from policy, claims, finance and provider systems. It receives controlled uploads, screens parties against locally maintained watchlists, records corporate ownership and UBO details, creates compliance cases and retains an audit trail. It does not write to operational systems.

## Local development

Requirements:

- Node.js 22.13 or later
- pnpm

Commands:

```powershell
pnpm install --frozen-lockfile
pnpm dev
pnpm test
pnpm build
```

The development environment must contain anonymised test data only.

## Authentication

The pilot uses the portal’s own server-side authentication:

- `lib/auth.ts` validates the protected session cookie.
- `app/api/session/route.ts` performs sign-in and sign-out.
- `lib/server-store.ts` stores password hashes and session records in the pilot data store.
- Admin users create and manage named portal accounts through Access management.

NIA IT must replace or integrate this pilot authentication with approved enterprise identity and access controls before final production go-live.

## Production handover

Read `SOURCE-HANDOVER.md` and the documents in `handover/`. Enterprise go-live requires NIA IT to complete SQL Server persistence, HTTPS, access controls, backup/restore testing, security testing, UAT and formal approval.
