NIA AML/CFT COMPLIANCE PORTAL - WINDOWS INTRANET SETUP
======================================================

1. Copy the complete NIA-Compliance-Intranet folder to the always-on Windows host.

2. Open Windows PowerShell as Administrator.
   Run:
   powershell -ExecutionPolicy Bypass -File ALLOW_PORTAL_THROUGH_FIREWALL.ps1

3. Pilot: double-click START_NIA_PORTAL.cmd.
   Production: ask IT to run INSTALL_STARTUP_TASK.ps1 as Administrator under
   a dedicated restricted Windows service account.

4. On the host, open:
   http://localhost:3000

5. Initial administrator account:
   Username: admin
   Password: ChangeMe123!

   Immediately click the three-dot account menu and change this password.

6. In the Admin section, create the Compliance Officer and any other users.
   Their own names will appear after they sign in.

7. Find the host's IPv4 address by running ipconfig.
   Other authorised computers on the same NIA network use:
   http://HOST-IP-ADDRESS:3000

8. Keep the host computer awake and connected to the internal network.
   Configure a fixed IP address or internal DNS name with IT.

9. Run BACKUP_PORTAL_DATA.cmd regularly and copy the backup to an approved
   protected internal backup location.

WATCHLIST FILES
---------------
- UN Consolidated List: upload the official XML by Name OR by Permanent
  Reference Number. Do not upload both files for the same UN version.
- Oman National List: obtain it from the National Counter-Terrorism Committee.
  Convert the official publication into the controlled CSV template and retain
  the source publication with the compliance evidence.
- UN and Oman are protected Mandatory Oman TFS sources and cannot be disabled.
- Admin may add OFAC, UK, EU or another approved source separately under
  Watchlists > Add approved watchlist source.
- Additional sources must record authority, legal/policy basis and required
  match treatment. They cannot be classified as Mandatory Oman TFS.
- Do not mix OFAC, UK or EU records into the NIA Internal Watchlist.
- PEP, Internal and configured external sources use Watchlist_Upload_Template.csv.
- The daily CSV/XLSX template contains six optional PEP indicator fields:
  PEP_DECLARED, PEP_CATEGORY, PUBLIC_POSITION, PEP_COUNTRY,
  PEP_RELATED_PERSON and PEP_SOURCE_REFERENCE.
- Blank PEP values are stored as UNKNOWN and are never treated as "Not a PEP".
  A declared or supporting PEP indicator creates a Compliance qualification case;
  it does not automatically reject, freeze or classify the party.
- Do not place shareholder/UBO structures in the daily transaction file. Use
  UBO Registry > Add corporate UBO for organisations found in daily screening
  or for new corporate/stakeholder onboarding. Add each natural person and each
  ownership path separately; the portal calculates effective ownership, blocks
  duplicate company/person/path records and screens the person when saved.
- Use the pipe symbol | between multiple aliases, identifiers, dates or
  nationalities in one CSV cell.
- Every upload is hashed, versioned and recorded. Activating a new version
  screens the shared customer master and creates cases for potential matches.

IMPORTANT SECURITY NOTES
------------------------
- Do not expose TCP port 3000 to the public internet.
- Use only an NIA Domain or Private Windows network profile.
- Restrict access to authorised internal computers where possible.
- Ask IT to add an internal HTTPS certificate before processing real customer data.
- Protect this folder because it contains the shared database and audit history.

MANDATORY BEFORE PRODUCTION
---------------------------
- IT must provide an internal DNS name and HTTPS certificate/reverse proxy.
- Set NIA_COOKIE_SECURE=1 only after HTTPS is enabled.
- Replace the initial admin password before allowing other users.
- Run the host under a dedicated restricted Windows account.
- Restrict NTFS permissions on this folder, data and backups.
- Schedule BACKUP_PORTAL_DATA.cmd and test restoration on another machine.
- Add endpoint monitoring for /api/health and sufficient disk-space alerts.
- Perform vulnerability scanning, penetration testing, UAT and formal sign-off.
- Confirm retention, privacy, breach response and access-review procedures.
- The included JSON store is suitable for a controlled low-volume pilot.
  Before a wider/high-concurrency rollout, migrate the repository to the
  organisation's approved SQL Server and complete migration/UAT.
