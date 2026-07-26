# UAT hardening release - 26 July 2026

This clean source handover implements the eight pre-handover hardening items:

1. Server-enforced API authentication and role authorisation.
2. Atomic local pilot storage, rolling recovery backups, locking and concurrent-change detection.
3. Aggregated UBO ownership across recorded routes, control qualification and circular-path checks.
4. Full persistent-party and UBO re-screening after approved watchlist updates.
5. Source-backed operational and compliance reports.
6. Retained watchlist versions, original source files, hashes and re-screening statistics.
7. Controlled case-state transitions with mandatory reasons, Operations responses and audit history.
8. Automated regression tests plus production build/type verification.

The local JSON store remains a controlled-pilot component. NIA IT must complete the SQL Server, HTTPS, identity/access, backup/restore, security and UAT gates described in the handover pack before enterprise go-live.
