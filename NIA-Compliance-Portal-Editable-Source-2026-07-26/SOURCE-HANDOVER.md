# NIA Oman AML/CFT Compliance Portal — Source Handover

## Purpose

This folder is the editable source snapshot for the controlled pilot/UAT version of the NIA Oman AML/CFT Compliance Portal. NIA IT can place it in an approved internal Git repository, modify it, rebuild it and maintain it.

This source snapshot is not the enterprise-production approval. Complete the controls and acceptance gates in `handover/NIA_AML_CFT_Portal_IT_Handover_UAT_Pack.docx` before final go-live.

## Release identification

- Source baseline: configurable watchlist-source release dated 25 July 2026, based on commit `51c30da`
- Source handover date: 25 July 2026
- Runtime requirement: Node.js 22.13.0 or later
- Package manager: pnpm, using the supplied `pnpm-lock.yaml`
- Current pilot persistence: local JSON store
- Required enterprise persistence: Microsoft SQL Server, to be implemented and tested by NIA IT

## Main folders

- `app/` — portal pages, styling and server API routes
- `lib/` — authentication, persistence, watchlist parsing/screening and protected source-policy logic
- `public/` — NIA logo and controlled CSV/XLSX templates
- `deployment/` — Windows pilot startup, firewall and backup utilities
- `tests/` — automated policy, PEP, UBO and login-safety tests
- `handover/` — IT handover/UAT pack and role-based user manual

## Intentionally excluded

The source ZIP does not contain:

- `.git` history or remote configuration
- `node_modules`
- compiled `.next`, `dist` or packaged runtime output
- `.env` files, certificates, secrets or passwords
- runtime `data`, uploaded files, sessions or user accounts
- test/UAT customer records
- temporary, cache or packaging folders

## First controlled checkout

1. Extract the ZIP into an approved development location.
2. Verify the ZIP SHA-256 value supplied with the handover.
3. Create a new private repository on NIA’s internal source-control platform.
4. Review this snapshot for secrets using NIA’s approved scanning tool.
5. Commit the accepted baseline and protect the main branch.
6. Require peer review, automated tests and change tickets for production changes.

## Install and run for development

From the extracted source folder, with approved access to NIA’s internal dependency registry:

```powershell
pnpm install --frozen-lockfile
pnpm dev
```

The development server must use anonymised test data only.

## Build and verify

```powershell
pnpm install --frozen-lockfile
pnpm test
pnpm build
```

The delivered Windows runtime package was built separately. NIA IT should create its own repeatable internal build/release pipeline and must not treat a developer workstation build as a production release.

## Enterprise work required

Before enterprise go-live, NIA IT must at minimum:

1. Replace the pilot JSON persistence with Microsoft SQL Server, including constraints, transactions, migrations and reconciliation.
2. Configure internal HTTPS, DNS, certificate monitoring and secure session cookies.
3. Integrate Active Directory/SSO or implement a formally approved central identity control.
4. Move secrets and environment settings to NIA’s approved protected configuration mechanism.
5. Implement least-privilege service and database accounts and protected document/upload storage.
6. Complete backup, isolated restore and disaster-recovery testing.
7. Complete dependency, vulnerability, penetration, file-upload and role/API authorisation testing.
8. Run the documented UAT scenarios and obtain all required business, Compliance, IT, security and go-live approvals.

## Current operating boundary

The portal receives reports and compliance information, screens parties, creates cases and records referrals. It does not modify the policy, claims, finance, receipt, vendor or customer master systems. Operations implements authorised actions in those systems under existing maker–checker controls.

## Configurable watchlist sources

- UN Consolidated List and Oman National List are system-defined, active and locked as `MANDATORY_OMAN_TFS`.
- Admin cannot create another mandatory source or disable either protected source.
- Admin may separately add `ADDITIONAL_EXTERNAL`, `PEP` or `INTERNAL` sources.
- OFAC, the UK Sanctions List and EU sanctions must be configured as separate external sources, not mixed into the Internal Watchlist.
- Each source records its issuing authority, legal/policy basis, required match treatment, status and audit history.
- Additional external matches follow their configured legal, contractual or group-policy treatment and do not automatically become Oman statutory freezing cases.

## Maintenance ownership

- NIA IT: source control, build/release, host, database, HTTPS, identity, backups, monitoring, security and technical support.
- NIA Compliance: AML/CFT rules, watchlist governance, risk methodology, screening decisions, case procedures, approvals and regulatory interpretation.

## Optional PEP indicators in the daily extract

The daily CSV/XLSX template accepts `PEP_DECLARED`, `PEP_CATEGORY`,
`PUBLIC_POSITION`, `PEP_COUNTRY`, `PEP_RELATED_PERSON` and
`PEP_SOURCE_REFERENCE`. Blank or unavailable values are normalized to
`UNKNOWN`, never to `NO`. A positive declaration, supporting indicator or
inconsistent negative declaration generates a PEP review case for human
qualification. It does not create an automatic adverse decision.

## Persistent corporate UBO profiles

Corporate ownership is maintained in the portal rather than repeated in the
daily transaction extract. `uboRecords` stores the organisation name and CR,
ownership path, natural-person identity, nationality, route percentages,
calculated effective ownership, control basis/details, PEP declaration, KYC and
verification status, review dates and supporting source reference. Saving a
record screens the natural person against all active lists. Duplicate
company/person/path combinations are rejected. Complex multi-route aggregation,
circular structures and nominee arrangements remain subject to independent
Compliance verification and the enterprise SQL Server enhancement.
- NIA Operations: source-report completeness and implementation of authorised actions in core systems.

## Important pilot limitations

The current pilot still has limitations documented in the IT handover pack, including JSON storage, local authentication, incomplete enterprise document management, limited UBO ownership calculation and some partially source-backed reports. These limitations must be resolved, constrained or formally accepted before production.
