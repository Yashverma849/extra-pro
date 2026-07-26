"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import ConfigurableWatchlistsModule from "./watchlists-module";

type CaseRow = { id: string; entity: string; detail: string; type: string; priority: "Critical" | "High" | "Medium"; owner: string; status: string; age: string };
type Customer = { id: string; name: string; type: string; identifier: string; risk: string; kyc: string; role?: string; department?: string; status?: string; expiry?: string; licence?: string; country?: string; contact?: string; bank?: string; service?: string; contractExpiry?: string };
type AuthUser = { id: string; username: string; fullName: string; role: "ADMIN" | "COMPLIANCE" | "REVIEWER" | "READ_ONLY"; active: boolean; lastLogin: string | null };

const initialCases: CaseRow[] = [];

const initialCustomers: Customer[] = [];

const nav = ["Overview", "Daily controls", "Compliance intake", "Screening", "Cases", "Party master", "UBO Registry", "Watchlists", "Reports", "Audit log"];

function LoginScreen({ onLogin }: { onLogin: (user: AuthUser) => void }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  useEffect(() => {
    if (window.location.search) window.history.replaceState({}, "", window.location.pathname);
  }, []);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/session", { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ username: data.get("username"), password: data.get("password") }) });
      const result = await response.json();
      if (!response.ok) return setError(result.error || "Unable to sign in");
      onLogin(result.user);
    } catch {
      setError("The portal could not complete sign-in. Check the local server and try again.");
    } finally {
      setBusy(false);
    }
  };
  return <main className="login-shell"><section className="login-card"><div className="brand login-brand"><img className="brand-logo login-logo" src="/nia-logo.jpg" alt="The New India Assurance Co. Ltd. logo" /><div><strong>The New India Assurance Co. Ltd.</strong><span>Oman Operations</span><small>AML / CFT Compliance Portal</small></div></div><p className="eyebrow">AUTHORISED USERS ONLY</p><h1>Sign in</h1><p>Use the account created for you by the system administrator.</p>{error && <div className="login-error" role="alert">{error}</div>}<form method="post" action="/api/session" onSubmit={submit}><Field label="Username"><input name="username" required autoFocus autoComplete="username" /></Field><Field label="Password"><div style={{ position: "relative", width: "100%", display: "flex", alignItems: "center" }}><input name="password" type={showPassword ? "text" : "password"} required autoComplete="current-password" style={{ paddingRight: "60px" }} /><button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: "absolute", right: "8px", background: "none", border: "none", cursor: "pointer", fontSize: "11px", color: "#586879", fontWeight: 600, display: "flex", alignItems: "center", gap: "3px" }} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? "🙈 Hide" : "👁️ Show"}</button></div></Field><button type="submit" className="upload-button" disabled={busy}>{busy ? "Signing in..." : "Sign in securely"}</button></form><small>Initial pilot setup uses the administrator account. Named users are created in Admin → Access management.</small><small>Hosted within The New India Assurance Co. Ltd. — Oman Operations internal network. All access is recorded.</small></section></main>;
}

function StatusPill({ children, tone = "slate" }: { children: React.ReactNode; tone?: string }) {
  return <span className={`pill ${tone}`}>{children}</span>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="form-field"><span>{label}</span>{children}</label>;
}

function PageTitle({ eyebrow, title, copy, action }: { eyebrow: string; title: string; copy: string; action?: React.ReactNode }) {
  return <div className="module-title"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{copy}</p></div>{action}</div>;
}

function OnboardingModule({ customers, setCustomers, addCase }: { customers: Customer[]; setCustomers: (rows: Customer[]) => void; addCase: (row: CaseRow) => void }) {
  const [submitted, setSubmitted] = useState("");
  const [role, setRole] = useState("Garage / workshop");
  const [checks, setChecks] = useState<boolean[]>([]);
  const [busy, setBusy] = useState(false);
  const common = ["Commercial Registration / legal identity", "CR or identity validity checked", "Bank account evidence", "Authorised representative identity"];
  const roleChecks: Record<string, string[]> = {
    "Garage / workshop": ["Workshop / municipality licence", "Provider agreement", "Conflict-of-interest declaration"],
    "Hospital / clinic / pharmacy": ["Health authority licence", "Provider / network agreement", "Facility and branch details"],
    "Third-party administrator": ["Regulatory licence", "Ownership and UBO declaration", "Data-processing and security assessment", "Business continuity evidence"],
    "Agent / broker": ["Regulatory licence", "Agency / brokerage agreement", "Fit-and-proper documents"],
    "Surveyor / loss adjuster": ["Professional licence", "Service agreement", "Conflict-of-interest declaration"],
    "Supplier / vendor": ["Service agreement / purchase authority", "Tax / VAT evidence", "Related-employee declaration"],
    "Reinsurer": ["Regulatory status", "Corporate ownership information", "Reinsurance agreement"],
    "Policyholder / insured": ["Civil ID, passport or CR", "KYC information", "Corporate UBO declaration where applicable"],
    "Other counterparty": ["Business licence where applicable", "Service contract", "Business justification"],
  };
  const labels = [...common, ...(roleChecks[role] || [])];
  useEffect(() => setChecks(labels.map(() => false)), [role]);
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setBusy(true);
    const d = new FormData(e.currentTarget);
    const name = String(d.get("name") || "");
    const identifier = String(d.get("identifier") || "");
    const existing = customers.find(item => item.identifier.replace(/\s/g, "").toLowerCase() === identifier.replace(/\s/g, "").toLowerCase());
    if (existing) { setSubmitted(`Not created: identifier already belongs to ${existing.name} (${existing.id}). Open the existing party and add the new role instead.`); setBusy(false); return; }
    const response = await fetch("/api/screen", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, identifier, scope: "All active lists" }) });
    const screening = response.ok ? await response.json() : { matches: [] };
    const id = `P${String(customers.length + 1).padStart(6, "0")}`;
    const missing = labels.filter((_, index) => !checks[index]);
    const record: Customer = {
      id, name, type: String(d.get("type")), identifier, role,
      department: String(d.get("department")), country: String(d.get("country")),
      expiry: String(d.get("expiry")), licence: String(d.get("licence")),
      contact: String(d.get("contact")), bank: String(d.get("bank")),
      service: String(d.get("service")), contractExpiry: String(d.get("contractExpiry")),
      risk: String(d.get("risk")), kyc: missing.length ? "Documents incomplete" : "Pending compliance review",
      status: screening.matches?.length ? "Potential match review" : missing.length ? "Documents incomplete" : "Compliance review",
    };
    const saveResponse = await fetch("/api/parties", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(record) });
    const saved = await saveResponse.json();
    if (!saveResponse.ok) { setSubmitted(`Not created: ${saved.error || "unable to save compliance party"}`); setBusy(false); return; }
    setCustomers([saved.party, ...customers]);
    if (screening.matches?.length) addCase({ id: `AML-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`, entity: name, detail: `${screening.matches.length} potential watchlist match(es) during ${role} compliance review`, type: "Screening", priority: screening.matches[0].score >= 90 ? "Critical" : "High", owner: "Unassigned", status: "New", age: "Now" });
    else if (missing.length) addCase({ id: `REF-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`, entity: name, detail: `${missing.length} compliance information/document item(s) outstanding`, type: "Compliance intake", priority: "Medium", owner: String(d.get("department")), status: "Information requested", age: "Now" });
    setSubmitted(`${id} created for ${name}. Screening completed against active lists; ${missing.length} checklist item(s) remain.`);
    setBusy(false);
  };
  return <>
    <PageTitle eyebrow="COMPLIANCE INTAKE AND ASSESSMENT" title="Review any insurance stakeholder" copy="Record and assess policyholders, providers, intermediaries, payees and vendors without creating or changing them in operational systems." />
    {submitted && <div className="success-banner"><b>Compliance intake recorded.</b> {submitted}</div>}
    <div className="module-grid two">
      <form className="panel form-panel" onSubmit={submit}>
        <div className="panel-head"><div><h2>New compliance review intake</h2><p>The source/core system remains the operational record</p></div><StatusPill tone="blue">Compliance draft</StatusPill></div>
        <div className="form-grid">
          <Field label="Party role *"><select value={role} onChange={e => setRole(e.target.value)}>{Object.keys(roleChecks).map(item => <option key={item}>{item}</option>)}</select></Field>
          <Field label="Party type *"><select name="type"><option>Corporate</option><option>Individual</option></select></Field>
          <Field label="Legal name *"><input name="name" required placeholder="Registered legal or full individual name" /></Field>
          <Field label="Civil ID / Passport / CR *"><input name="identifier" required /></Field>
          <Field label="ID / CR valid until"><input name="expiry" type="date" /></Field>
          <Field label="Country *"><input name="country" required defaultValue="Oman" /></Field>
          <Field label="Licence number"><input name="licence" placeholder="Regulatory / activity licence" /></Field>
          <Field label="Contact person / mobile"><input name="contact" /></Field>
          <Field label="Requesting department *"><select name="department"><option>Motor Claims</option><option>Health</option><option>Claims - Non Motor</option><option>Underwriting</option><option>Marketing</option><option>Procurement / Administration</option><option>Reinsurance</option><option>Finance</option></select></Field>
          <Field label="Initial risk"><select name="risk"><option>Pending assessment</option><option>Standard</option><option>Elevated</option><option>High</option></select></Field>
          <Field label="Service / business activity *"><input name="service" required /></Field>
          <Field label="Contract expiry"><input name="contractExpiry" type="date" /></Field>
          <Field label="Bank account name / masked IBAN"><input name="bank" placeholder="Do not enter an unmasked full account number" /></Field>
        </div>
        <Field label="Business justification"><textarea placeholder="Describe why the relationship is required and expected payments/data access" /></Field>
        <div className="form-actions"><button type="reset" className="outline-button">Clear</button><button className="upload-button" disabled={busy}>{busy ? "Screening and saving..." : "Create compliance assessment"}</button></div>
      </form>
      <section className="panel checklist-panel">
        <div className="panel-head"><div><h2>{role} checklist</h2><p>{checks.filter(Boolean).length} of {checks.length} items ready</p></div><strong className="progress-number">{checks.length ? Math.round(checks.filter(Boolean).length / checks.length * 100) : 0}%</strong></div>
        <div className="progress-bar"><i style={{ width: `${checks.length ? checks.filter(Boolean).length / checks.length * 100 : 0}%` }} /></div>
        {labels.map((label, index) => <label className="check-row" key={label}><input type="checkbox" checked={checks[index]} onChange={() => setChecks(checks.map((v, i) => i === index ? !v : v))} /><span>{label}</span><b>{checks[index] ? "Ready" : "Missing"}</b></label>)}
        <div className="workflow-box"><div><span>1</span><b>Report / information received</b></div><i>→</i><div><span>2</span><b>Compliance assesses</b></div><i>→</i><div><span>3</span><b>Operations implements referral</b></div></div>
      </section>
    </div>
  </>;
}

function ScreeningModule({ addCase }: { addCase: (row: CaseRow) => void }) {
  const [result, setResult] = useState<null | { matches: { score: number; name: string; category: string; referenceNumber: string; partyType: string; identifiers: string[]; remarks: string }[]; activeVersions: { category: string; version: string; records: number }[] }>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const run = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true); setError("");
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name") || "");
    const response = await fetch("/api/screen", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, identifier: form.get("identifier"), scope: form.get("scope") }) });
    const data = await response.json();
    setBusy(false);
    if (!response.ok) return setError(data.error || "Screening failed");
    setResult(data);
    if (data.matches.length) addCase({ id: `AML-2026-${String(Date.now()).slice(-6)}`, entity: name, detail: `${data.matches.length} potential watchlist match(es)`, type: "Screening", priority: data.matches[0].score >= 90 ? "Critical" : "High", owner: "Unassigned", status: "New", age: "Now" });
  };
  return <>
    <PageTitle eyebrow="EXACT + FUZZY MATCHING" title="Screen a person or organisation" copy="Check customers, UBOs, directors, signatories, payers and beneficiaries against active local lists." />
    <div className="module-grid two">
      <form className="panel form-panel" onSubmit={run}>
        <div className="panel-head"><div><h2>Screening request</h2><p>Use all available identifiers to reduce false positives</p></div></div>
        <div className="form-grid">
          <Field label="Full legal name *"><input name="name" required placeholder="English or Arabic name" /></Field>
          <Field label="Party type"><select><option>Individual</option><option>Organisation</option></select></Field>
          <Field label="Civil ID / Passport / CR"><input name="identifier" placeholder="Identifier" /></Field>
          <Field label="Nationality / Country"><input placeholder="Country" /></Field>
          <Field label="Date of birth"><input type="date" /></Field>
          <Field label="Screening scope"><select name="scope"><option>All active lists</option><option>Sanctions only</option><option>PEP only</option><option>Internal watchlist</option></select></Field>
        </div>
        {error && <div className="login-error screening-error">{error}</div>}
        <div className="form-actions"><button className="upload-button" disabled={busy}>{busy ? "Screening active lists..." : "Run screening"}</button></div>
      </form>
      <section className={`panel result-panel ${result?.matches.length ? "match" : result ? "clear" : ""}`}>
        {!result && <div className="empty-state"><span>◎</span><h2>Ready to screen</h2><p>Enter the party’s identity details to compare against the currently active list versions.</p></div>}
        {result && !result.matches.length && <div className="empty-state"><span className="ok">✓</span><h2>No potential match found</h2><p>Screened against {result.activeVersions.length} active list version(s) containing {result.activeVersions.reduce((sum, item) => sum + item.records, 0).toLocaleString()} records.</p><StatusPill tone="green">Screening clear</StatusPill></div>}
        {result && result.matches.length > 0 && <><div className="match-head"><span>!</span><div><h2>{result.matches.length} potential match{result.matches.length > 1 ? "es" : ""}</h2><p>Human review is required. No wrongdoing has been inferred.</p></div></div><div className="screen-match-list">{result.matches.slice(0,5).map(match => <article key={`${match.category}-${match.referenceNumber}-${match.name}`}><div className="match-score"><strong>{match.score}%</strong><span>Similarity</span></div><dl><div><dt>Matched record</dt><dd>{match.name}</dd></div><div><dt>List</dt><dd>{match.category}</dd></div><div><dt>Reference</dt><dd>{match.referenceNumber || "Not provided"}</dd></div><div><dt>Identifiers</dt><dd>{match.identifiers.slice(0,2).join(", ") || "Name only — verify other details"}</dd></div></dl></article>)}</div></>}
      </section>
    </div>
    <section className="panel watchlist-help">
      <h2>FATF PEP assessment - Recommendations 12 and 22</h2>
      <p>A list result is only one input. Apply these checks to the customer and every beneficial owner.</p>
      <div className="form-grid">
        <Field label="PEP classification"><select><option>Not determined</option><option>Foreign PEP</option><option>Domestic PEP</option><option>International organisation PEP</option><option>Family member</option><option>Close associate</option><option>Former PEP</option></select></Field>
        <Field label="Prominent public function"><input placeholder="Position, institution and country" /></Field>
        <Field label="Relationship risk"><select><option>Assessment pending</option><option>Normal / lower risk domestic or IO PEP</option><option>Higher risk</option></select></Field>
        <Field label="Senior management approval"><select><option>Not required / pending assessment</option><option>Required - pending</option><option>Approved</option><option>Declined</option></select></Field>
        <Field label="Source of wealth"><input placeholder="Evidence and verification reference" /></Field>
        <Field label="Source of funds"><input placeholder="Evidence for premium / transaction funds" /></Field>
        <Field label="Family and close associates"><input placeholder="Names and relationships checked" /></Field>
        <Field label="Ongoing monitoring"><select><option>Standard</option><option>Enhanced monitoring required</option><option>Enhanced monitoring active</option></select></Field>
      </div>
      <p><b>Required treatment:</b> foreign PEPs require senior-management approval, reasonable measures to establish source of wealth and funds, and enhanced ongoing monitoring. Apply the same measures to higher-risk domestic and international-organisation PEP relationships. PEP status alone does not imply criminal activity.</p>
    </section>
  </>;
}

function CasesModule({ rows, setRows }: { rows: CaseRow[]; setRows: (rows: CaseRow[]) => void }) {
  const [selected, setSelected] = useState(rows[0]?.id);
  const [reason, setReason] = useState("");
  const [responseNote, setResponseNote] = useState("");
  const [evidenceReference, setEvidenceReference] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const item = rows.find(r => r.id === selected) || rows[0];
  const update = async (status: string) => {
    if (!item || busy) return;
    if (!reason.trim()) return setMessage("Enter the decision reason before changing the case status.");
    setBusy(true);
    setMessage("");
    const response = await fetch(`/api/cases/${encodeURIComponent(item.id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status,
        reason: reason.trim(),
        operationsResponse: responseNote.trim(),
        evidenceReference: evidenceReference.trim(),
      }),
    });
    const result = await response.json();
    setBusy(false);
    if (!response.ok) return setMessage(result.error || "The case could not be updated. Please try again.");
    const nextRows = rows.map(row => row.id === item.id ? { ...row, ...result.case } : row);
    setRows(nextRows);
    setReason("");
    setResponseNote("");
    setEvidenceReference("");
    setMessage(status === "Closed" ? "Case closed after the response was recorded." : `Case status updated to ${status}.`);
  };
  return <>
    <PageTitle eyebrow="COMPLIANCE CASE MANAGEMENT" title="Cases" copy="Assign, investigate, escalate and close every exception with a documented decision." />
    <div className="case-workspace">
      <section className="panel case-list">
        {rows.map(row => <button key={row.id} className={row.id === item?.id ? "selected" : ""} onClick={() => setSelected(row.id)}><div><strong>{row.entity}</strong><span>{row.id} · {row.age}</span></div><StatusPill tone={row.priority === "Critical" ? "red" : row.priority === "High" ? "orange" : "slate"}>{row.priority}</StatusPill><p>{row.detail}</p></button>)}
      </section>
      {item && <section className="panel case-detail">
        <div className="panel-head"><div><p className="eyebrow">{item.id}</p><h2>{item.entity}</h2><p>{item.detail}</p></div><StatusPill tone="blue">{item.status}</StatusPill></div>
        <div className="detail-grid"><div><span>Exception type</span><strong>{item.type}</strong></div><div><span>Priority</span><strong>{item.priority}</strong></div><div><span>Assigned officer</span><strong>{item.owner}</strong></div><div><span>Age</span><strong>{item.age}</strong></div></div>
        <Field label="Compliance analysis"><textarea defaultValue="Review identity details, linked UBO structure and current screening record before decision." /></Field>
        <Field label="Decision reason"><textarea value={reason} onChange={event => setReason(event.target.value)} placeholder="Mandatory for escalation, confirmation, false positive or closure" /></Field>
        <Field label="Operations / business response"><textarea value={responseNote} onChange={event => setResponseNote(event.target.value)} placeholder="Required before using Close after response" /></Field>
        <Field label="Evidence / communication reference"><input value={evidenceReference} onChange={event => setEvidenceReference(event.target.value)} placeholder="Email, memo, ticket or document reference" /></Field>
        <div className="evidence-box"><b>Evidence attached</b><span>Source transaction</span><span>Screening result</span><span>Watchlist record</span><span>Ownership structure</span></div>
        {message && <div className={message.includes("could not") || message.startsWith("Enter") || message.startsWith("Record") ? "login-error" : "success-banner"}>{message}</div>}
        <div className="form-actions spread"><button type="button" disabled={busy || item.status === "Closed"} className="outline-button" onClick={() => void update("Under review")}>Start/reopen review</button><button type="button" disabled={busy} className="outline-button" onClick={() => void update("False positive")}>Clear false positive</button><button type="button" disabled={busy} className="danger-button" onClick={() => void update("Escalated to MLRO")}>Escalate to MLRO</button><button type="button" disabled={busy} className="outline-button" onClick={() => void update("Communicated to Operations")}>Record referral to Operations</button>{item.status === "Communicated to Operations" && <button type="button" disabled={busy} className="outline-button" onClick={() => void update("Operations response received")}>Record response received</button>}<button type="button" disabled={busy || !["Operations response received", "False positive"].includes(item.status)} className="upload-button" onClick={() => void update("Closed")}>{item.status === "Closed" ? "Case closed" : "Close case"}</button></div>
      </section>}
    </div>
  </>;
}

function CustomersModule({ customers, setCustomers }: { customers: Customer[]; setCustomers: (rows: Customer[]) => void }) {
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState("");
  const add = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); const d = new FormData(e.currentTarget);
    const response = await fetch("/api/parties", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: d.get("name"), type: d.get("type"), identifier: d.get("identifier"), risk: "Pending assessment", kyc: "Pending" }) });
    const result = await response.json();
    if (!response.ok) return setMessage(result.error || "Unable to create party");
    setCustomers([result.party, ...customers]); setShowForm(false); setMessage("Compliance party record created.");
  };
  return <>
    <PageTitle eyebrow="COMPLIANCE PARTY REGISTER" title="Party master" copy="Compliance reference records for policyholders, insureds, providers, intermediaries, payees and vendors; operational master data remains in core systems." action={<button className="upload-button" onClick={() => setShowForm(!showForm)}>+ Compliance record</button>} />
    {message && <div className={message.startsWith("Unable") || message.includes("exists") ? "login-error" : "success-banner"}>{message}</div>}
    {showForm && <form className="panel inline-form" onSubmit={add}><Field label="Customer name"><input name="name" required /></Field><Field label="Type"><select name="type"><option>Corporate</option><option>Individual</option></select></Field><Field label="Civil ID / Passport / CR"><input name="identifier" required /></Field><button className="upload-button">Create</button></form>}
    <section className="panel registry-table"><table><thead><tr><th>Party</th><th>Role / Identifier</th><th>Department</th><th>Risk</th><th>Compliance status</th><th>Validity</th></tr></thead><tbody>{customers.length ? customers.map(c => <tr key={c.id}><td><strong>{c.name}</strong><span>{c.id} · {c.type}</span></td><td><strong>{c.role || "Policyholder / customer"}</strong><span>{c.identifier}</span></td><td>{c.department || "Not assigned"}</td><td><StatusPill tone={c.risk === "High" ? "red" : c.risk === "Elevated" ? "orange" : "slate"}>{c.risk}</StatusPill></td><td>{c.status || c.kyc}</td><td>{c.expiry || "Not captured"}</td></tr>) : <tr><td colSpan={6}>No compliance party records have been created.</td></tr>}</tbody></table></section>
  </>;
}

type UboRow = {
  id: string; companyName: string; companyCr: string; ownershipPath: string;
  naturalPersonName: string; naturalPersonIdentifier: string; nationality: string;
  companyRoutePercent: number; naturalPersonPercent: number; effectiveOwnership: number;
  controlBasis: string; controlDetails: string; pepDeclared: string; kycStatus: string;
  verificationStatus: string; verifiedDate: string; nextReviewDate: string; sourceReference: string;
};
type UboAggregate = {
  companyName: string; companyCr: string; naturalPersonName: string; naturalPersonIdentifier: string;
  totalEffectiveOwnership: number; routeCount: number; qualifiesByOwnership: boolean;
  qualifiesByControl: boolean; qualifiesAsUbo: boolean;
};

function UBOModule({ role, setCases }: { role: AuthUser["role"]; setCases: (rows: CaseRow[]) => void }) {
  const [records, setRecords] = useState<UboRow[]>([]);
  const [aggregates, setAggregates] = useState<UboAggregate[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [routePercent, setRoutePercent] = useState(100);
  const [personPercent, setPersonPercent] = useState(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const effective = routePercent * personPercent / 100;
  const load = async () => {
    const response = await fetch("/api/ubo");
    if (response.ok) {
      const result = await response.json();
      setRecords(result.records);
      setAggregates(result.aggregates);
    }
  };
  useEffect(() => { void load(); }, []);
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setMessage(""); setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/ubo", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(form)),
    });
    const result = await response.json();
    if (!response.ok) return setError(result.error || "Unable to save UBO record");
    setMessage(`UBO/control record saved and screened. ${result.potentialMatches} potential watchlist match(es).`);
    setShowForm(false);
    await load();
    const dataResponse = await fetch("/api/data");
    if (dataResponse.ok) setCases((await dataResponse.json()).cases);
  };
  return <>
    <PageTitle eyebrow="OWNERSHIP AND CONTROL" title="UBO Registry" copy="Maintain corporate ownership and control profiles independently of the daily transaction extract." action={role !== "READ_ONLY" ? <button className="upload-button" onClick={() => setShowForm(!showForm)}>+ Add corporate UBO</button> : undefined} />
    <div className="watchlist-help"><p><b>Use this registry for:</b> organisations appearing in daily screening and new corporate/stakeholder onboarding. Add one record for each natural person and each ownership route. The system screens the person when the record is saved.</p></div>
    {message && <div className="success-banner">{message}</div>}
    {error && <div className="login-error">{error}</div>}
    {showForm && <form className="panel form-panel" onSubmit={save}>
      <div className="panel-head"><div><h2>Corporate UBO / control-person profile</h2><p>Record facts from the CR, shareholder register, declaration or other approved evidence</p></div></div>
      <div className="form-grid">
        <Field label="Organisation legal name *"><input name="companyName" required /></Field>
        <Field label="Commercial Registration number *"><input name="companyCr" required /></Field>
        <Field label="Ownership path / intermediate entity"><input name="ownershipPath" defaultValue="Direct ownership" placeholder="Direct ownership or Holding Co A → Company" /></Field>
        <Field label="Natural-person owner / control person *"><input name="naturalPersonName" required /></Field>
        <Field label="Civil ID / passport"><input name="naturalPersonIdentifier" /></Field>
        <Field label="Nationality"><input name="nationality" /></Field>
        <Field label="Ownership of this route in organisation (%)"><input name="companyRoutePercent" type="number" min="0" max="100" step="0.0001" value={routePercent} onChange={event => setRoutePercent(Number(event.target.value))} required /></Field>
        <Field label="Natural-person ownership in route entity (%)"><input name="naturalPersonPercent" type="number" min="0" max="100" step="0.0001" value={personPercent} onChange={event => setPersonPercent(Number(event.target.value))} required /></Field>
        <Field label="Control / qualification basis"><select name="controlBasis"><option>Ownership only</option><option>Voting control</option><option>Right to appoint directors</option><option>Veto or reserved rights</option><option>Control through other means</option><option>Senior-management fallback</option></select></Field>
        <Field label="Control details"><input name="controlDetails" placeholder="Agreement, rights or fallback rationale" /></Field>
        <Field label="PEP declared"><select name="pepDeclared"><option>UNKNOWN</option><option>YES</option><option>NO</option></select></Field>
        <Field label="KYC status"><select name="kycStatus"><option>Pending</option><option>Complete</option><option>Expired</option><option>Enhanced due diligence</option></select></Field>
        <Field label="Verification status"><select name="verificationStatus"><option>Unverified</option><option>Pending documents</option><option>Verified</option><option>Review due</option></select></Field>
        <Field label="Verified date"><input name="verifiedDate" type="date" /></Field>
        <Field label="Next review date"><input name="nextReviewDate" type="date" /></Field>
        <Field label="Source / document reference"><input name="sourceReference" placeholder="CR extract, shareholder register or declaration reference" /></Field>
      </div>
      <div className="calculation"><span>{routePercent}%</span><b>×</b><span>{personPercent}%</span><b>=</b><strong>{effective.toFixed(2)}%</strong></div>
      <div className={effective >= 25 ? "ubo-result qualifies" : "ubo-result"}><b>{effective >= 25 ? "Qualifies by ownership threshold" : "Below ownership threshold for this route"}</b><p>Control through other means and aggregation across multiple recorded routes must also be assessed.</p></div>
      <div className="form-actions"><button type="button" className="outline-button" onClick={() => setShowForm(false)}>Cancel</button><button className="upload-button">Save and screen UBO</button></div>
    </form>}
    <section className="panel registry-table">
      <div className="panel-head"><div><h2>Aggregated UBO assessment</h2><p>All recorded ownership routes for the same natural person are combined.</p></div></div>
      <table><thead><tr><th>Organisation</th><th>Natural person</th><th>Routes</th><th>Aggregated ownership</th><th>Qualification</th></tr></thead><tbody>
        {aggregates.length ? aggregates.map(item => <tr key={`${item.companyCr}-${item.naturalPersonIdentifier || item.naturalPersonName}`}><td><strong>{item.companyName}</strong><span>CR {item.companyCr}</span></td><td><strong>{item.naturalPersonName}</strong><span>{item.naturalPersonIdentifier || "ID not captured"}</span></td><td>{item.routeCount}</td><td><StatusPill tone={item.qualifiesByOwnership ? "green" : "slate"}>{item.totalEffectiveOwnership.toFixed(2)}%</StatusPill></td><td>{item.qualifiesAsUbo ? "UBO" : "Below recorded threshold"}<span>{item.qualifiesByControl ? "Qualifies through control" : "Ownership assessment"}</span></td></tr>) : <tr><td colSpan={5}>No aggregated ownership assessments are available.</td></tr>}
      </tbody></table>
    </section>
    <section className="panel registry-table">
      <div className="panel-head"><div><h2>Corporate UBO and control-person records</h2><p>{records.length} persistent record(s)</p></div></div>
      <table><thead><tr><th>Organisation</th><th>Natural person</th><th>Ownership path</th><th>Effective</th><th>Basis</th><th>PEP / KYC</th><th>Verification</th><th>Source</th></tr></thead><tbody>
        {records.length ? records.map(record => <tr key={record.id}><td><strong>{record.companyName}</strong><span>CR {record.companyCr}</span></td><td><strong>{record.naturalPersonName}</strong><span>{record.naturalPersonIdentifier || "ID not captured"} · {record.nationality}</span></td><td>{record.ownershipPath}<span>{record.companyRoutePercent}% × {record.naturalPersonPercent}%</span></td><td><StatusPill tone={record.effectiveOwnership >= 25 ? "green" : "slate"}>{record.effectiveOwnership.toFixed(2)}%</StatusPill></td><td>{record.controlBasis}<span>{record.controlDetails}</span></td><td>PEP {record.pepDeclared}<span>KYC {record.kycStatus}</span></td><td>{record.verificationStatus}<span>Review {record.nextReviewDate || "not set"}</span></td><td>{record.sourceReference}</td></tr>) : <tr><td colSpan={8}>No UBO records have been created.</td></tr>}
      </tbody></table>
    </section>
  </>;
}

function WatchlistsModule({ addCase }: { addCase: (row: CaseRow) => void }) {
  const [file, setFile] = useState("");
  const [category, setCategory] = useState("UN Consolidated List");
  const [versions, setVersions] = useState<{ id: string; category: string; version: string; recordCount: number; active: boolean; uploadedAt: string; filename: string }[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const load = async () => { const response = await fetch("/api/watchlists"); if (response.ok) setVersions((await response.json()).versions); };
  useEffect(() => { void load(); }, []);
  const activate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/watchlists", { method: "POST", body: form });
    const data = await response.json(); setBusy(false);
    if (!response.ok) return setError(data.error || "Unable to process watchlist");
    setMessage(`${data.version.category} activated with ${data.version.recordCount.toLocaleString()} records. ${data.portfolioMatches} current customer match(es) were converted into cases. The previous version was retained in history.`);
    setFile("");
    await load();
  };
  return <>
    <PageTitle eyebrow="CONTROLLED OFFLINE LISTS" title="Watchlists" copy="Upload, approve, activate and retain every sanctions, PEP and internal-list version." />
    {message && <div className="success-banner"><b>List activated.</b> {message}</div>}
    {error && <div className="login-error watchlist-error">{error}</div>}
    <div className="module-grid two">
      <form className="panel form-panel" onSubmit={activate}><div className="panel-head"><div><h2>Upload and activate list version</h2><p>File structure, duplicate hash and record counts are validated</p></div></div>
        <div className="form-grid"><Field label="List category"><select name="category" value={category} onChange={e => setCategory(e.target.value)}><option>UN Consolidated List</option><option>Oman National List</option><option>PEP List</option><option>Internal Watchlist</option></select></Field><Field label="Issuing authority / source"><input name="source" required defaultValue={category === "UN Consolidated List" ? "United Nations Security Council" : ""} placeholder="Authority / approved source" /></Field><Field label="Effective date"><input name="effectiveDate" required type="date" /></Field><Field label="Version reference"><input name="version" placeholder="Optional — XML generation date used for UN" /></Field></div>
        <label className="mini-drop"><input name="file" required type="file" accept={category === "UN Consolidated List" ? ".xml,application/xml,text/xml" : ".csv,text/csv"} onChange={e => setFile(e.target.files?.[0]?.name || "")} /><span>{file || (category === "UN Consolidated List" ? "Choose official UN Consolidated List XML" : "Choose controlled watchlist CSV")}</span></label>
        <div className="watchlist-help"><p><b>UN:</b> upload either official XML by Name or by Permanent Reference Number—not both for the same version.</p><p><b>Oman, PEP and Internal:</b> convert the authoritative source into the controlled CSV template and retain the original source document as evidence. Multiple aliases or identifiers are separated with <code>|</code>.</p><a href="/Watchlist_Upload_Template.csv" download>Download standard watchlist CSV template</a></div>
        <div className="form-actions"><button className="upload-button" disabled={busy || !file}>{busy ? "Validating and importing..." : "Validate and activate"}</button></div>
      </form>
      <section className="panel version-list"><div className="panel-head"><div><h2>Active versions</h2><p>Evidence retained for each screening run</p></div></div>
        {versions.filter(version => version.active).map(version => <div className="watch-version" key={version.id}><span className="live-dot" /><div><strong>{version.category}</strong><span>{version.version} · {version.recordCount.toLocaleString()} records · {version.filename}</span></div><StatusPill tone="green">Current</StatusPill></div>)}
        {!versions.some(version => version.active) && <div className="empty">No active watchlists. Upload the official UN XML or a controlled CSV to begin real screening.</div>}
        {versions.some(version => !version.active) && <><div className="version-divider">Previous versions</div>{versions.filter(version => !version.active).slice(0,6).map(version => <div className="watch-version historic" key={version.id}><span /><div><strong>{version.category}</strong><span>{version.version} · {version.recordCount.toLocaleString()} records</span></div><StatusPill tone="slate">Retained</StatusPill></div>)}</>}
      </section>
    </div>
  </>;
}

function DailyControlsModule() {
  const [routine, setRoutine] = useState<Record<string, string> | null>(null);
  const [message, setMessage] = useState("");
  const load = async () => {
    const response = await fetch("/api/routine");
    if (response.ok) setRoutine((await response.json()).routine);
  };
  useEffect(() => { void load(); }, []);
  const complete = async (field: string, label: string) => {
    const response = await fetch("/api/data", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ routine: { field, status: "Completed" }, activity: { action: "ROUTINE_COMPLETED", detail: label } }) });
    if (response.ok) {
      setRoutine(current => current ? { ...current, [field]: "Completed" } : current);
      setMessage(`${label} recorded as completed.`);
    }
  };
  const rows = [["dailyUpload","Daily previous-day file uploaded"],["screening","Daily screening completed"],["criticalReviewed","Critical matches reviewed or escalated"],["kycFollowup","KYC and UBO follow-up completed"]];
  return <>
    <PageTitle eyebrow="DAILY COMPLIANCE CONFIRMATION" title="Daily controls" copy="Record completion of the routine checks that appear in the Admin oversight dashboard." />
    {message && <div className="success-banner">{message}</div>}
    <section className="panel daily-control-panel"><div className="panel-head"><div><h2>Business date {routine?.businessDate || "previous working day"}</h2><p>Each confirmation is attributed to the signed-in user and retained in activity history.</p></div></div>{rows.map(([field,label]) => <div className="daily-control-row" key={field}><div><strong>{label}</strong><span>{routine?.[field] === "Completed" ? "Completion recorded" : "Awaiting confirmation"}</span></div><StatusPill tone={routine?.[field] === "Completed" ? "green" : "orange"}>{routine?.[field] || "Pending"}</StatusPill><button className="outline-button" disabled={routine?.[field] === "Completed"} onClick={() => complete(field,label)}>{routine?.[field] === "Completed" ? "Completed" : "Mark completed"}</button></div>)}</section>
  </>;
}

function AdminModule() {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [routine, setRoutine] = useState<{ routines: Record<string, string>[]; activities: { id: string; date: string; user: string; action: string; detail: string }[]; counts: { users: number; cases: number; customers: number } } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState("");
  const load = async () => {
    const [usersResponse, routineResponse] = await Promise.all([fetch("/api/admin/users"), fetch("/api/admin/routine")]);
    if (usersResponse.ok) setUsers((await usersResponse.json()).users);
    if (routineResponse.ok) setRoutine(await routineResponse.json());
  };
  useEffect(() => { void load(); }, []);
  const add = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(data)) });
    const result = await response.json();
    if (!response.ok) return setMessage(result.error);
    setMessage(`${result.user.fullName} can now access the portal.`);
    setShowForm(false);
    await load();
  };
  const toggle = async (user: AuthUser) => {
    await fetch("/api/admin/users", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: user.id, active: !user.active }) });
    await load();
  };
  const latest = routine?.routines?.[0];
  const checks = latest ? [["Daily file uploaded",latest.dailyUpload],["Screening completed",latest.screening],["Critical matches reviewed",latest.criticalReviewed],["KYC follow-up completed",latest.kycFollowup]] : [];
  return <>
    <PageTitle eyebrow="ADMINISTRATION AND OVERSIGHT" title="Admin control centre" copy="Control access and confirm that routine compliance work is completed on time." action={<button className="upload-button" onClick={() => setShowForm(!showForm)}>+ Add user</button>} />
    {message && <div className="success-banner">{message}</div>}
    <section className="admin-metrics">{[["Active users",routine?.counts.users ?? 0],["Shared customers",routine?.counts.customers ?? 0],["Shared cases",routine?.counts.cases ?? 0],["Pending routine tasks",checks.filter(row => row[1] !== "Completed").length]].map(item => <article className="panel" key={item[0]}><span>{item[0]}</span><strong>{item[1]}</strong></article>)}</section>
    <div className="module-grid two admin-grid">
      <section className="panel"><div className="panel-head"><div><h2>Routine compliance status</h2><p>Business date {latest?.businessDate || "Not available"}</p></div><StatusPill tone={checks.every(row => row[1] === "Completed") ? "green" : "orange"}>{checks.every(row => row[1] === "Completed") ? "Complete" : "Attention required"}</StatusPill></div>{checks.map(row => <div className="routine-row" key={row[0]}><span>{row[0]}</span><StatusPill tone={row[1] === "Completed" ? "green" : "orange"}>{row[1]}</StatusPill></div>)}</section>
      <section className="panel"><div className="panel-head"><div><h2>Recent user activity</h2><p>Latest actions across the shared portal</p></div></div>{routine?.activities.slice(0,6).map(item => <div className="activity-row" key={item.id}><div><strong>{item.user}</strong><span>{item.action} · {new Date(item.date).toLocaleString()}</span></div><p>{item.detail}</p></div>)}{!routine?.activities.length && <div className="empty">No activity recorded yet.</div>}</section>
    </div>
    {showForm && <div className="modal-backdrop" onMouseDown={() => setShowForm(false)}><form className="modal" onSubmit={add} onMouseDown={e => e.stopPropagation()}><button type="button" className="close" onClick={() => setShowForm(false)}>×</button><p className="eyebrow">NEW INTRANET USER</p><h2>Give portal access</h2><div className="form-grid admin-user-form"><Field label="Full name"><input name="fullName" required /></Field><Field label="Username"><input name="username" required /></Field><Field label="Temporary password"><input name="password" type="password" minLength={10} required /></Field><Field label="Access role"><select name="role"><option value="COMPLIANCE">Compliance Officer</option><option value="REVIEWER">Reviewer</option><option value="READ_ONLY">Read only</option><option value="ADMIN">Administrator</option></select></Field></div><div className="modal-actions"><button type="button" className="outline-button" onClick={() => setShowForm(false)}>Cancel</button><button className="upload-button">Create user</button></div></form></div>}
    <section className="panel registry-table admin-users"><div className="panel-head"><div><h2>User access</h2><p>Enable or disable access immediately</p></div></div><table><thead><tr><th>Name</th><th>Username</th><th>Role</th><th>Last login</th><th>Status</th><th>Access</th></tr></thead><tbody>{users.map(user => <tr key={user.id}><td><strong>{user.fullName}</strong></td><td>{user.username}</td><td>{user.role.replace("_"," ")}</td><td>{user.lastLogin ? new Date(user.lastLogin).toLocaleString() : "Never"}</td><td><StatusPill tone={user.active ? "green" : "slate"}>{user.active ? "Active" : "Disabled"}</StatusPill></td><td><button className="outline-button" disabled={user.username === "admin"} onClick={() => toggle(user)}>{user.active ? "Disable" : "Enable"}</button></td></tr>)}</tbody></table></section>
  </>;
}

type ReportDefinition = { name: string; columns: string[]; rows: string[][]; frequency: string };

function csvCell(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

function downloadReport(report: ReportDefinition) {
  const csv = [report.columns, ...report.rows].map(row => row.map(csvCell).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${report.name.replaceAll(" ", "_").replaceAll("/", "-")}_${new Date().toISOString().slice(0,10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function printReport(report: ReportDefinition, officerName: string) {
  const popup = window.open("", "_blank", "width=1100,height=760");
  if (!popup) return;
  const headings = report.columns.map(column => `<th>${column}</th>`).join("");
  const rows = report.rows.map(row => `<tr>${row.map(value => `<td>${value}</td>`).join("")}</tr>`).join("");
  popup.document.write(`<!doctype html><html><head><title>${report.name}</title><style>
    body{font-family:Arial,sans-serif;color:#172b3d;margin:32px}header{display:flex;align-items:center;gap:16px;border-bottom:3px solid #2d328f;padding-bottom:16px;margin-bottom:22px}
    header img{width:78px;height:78px;object-fit:contain}h1{margin:0 0 5px;font-size:22px}.company{font-size:13px;font-weight:700;color:#2d328f}.operation{font-size:11px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#56697a}
    p{margin:4px 0;color:#56697a;font-size:12px}table{width:100%;border-collapse:collapse;font-size:11px}
    th{background:#214f73;color:#fff;text-align:left;padding:9px}td{border:1px solid #dce3e9;padding:8px}tr:nth-child(even){background:#f5f8fa}
    footer{margin-top:22px;border-top:1px solid #dce3e9;padding-top:10px;font-size:10px;color:#6b7986}
    @media print{body{margin:12mm}button{display:none}}</style></head><body>
    <header><img src="/nia-logo.jpg" alt="Company logo"><div><div class="company">The New India Assurance Co. Ltd.</div><div class="operation">Oman Operations</div><h1>${report.name}</h1><p>Generated: 25 July 2026 · Prepared by: ${officerName}, Compliance Officer</p></div></header>
    <table><thead><tr>${headings}</tr></thead><tbody>${rows}</tbody></table>
    <footer>The New India Assurance Co. Ltd. — Oman Operations · AML/CFT Portal · Confidential · ${report.rows.length} record(s)</footer>
    <script>window.onload=()=>window.print()</script></body></html>`);
  popup.document.close();
}

function ReportsModule({ cases, customers, officerName }: { cases: CaseRow[]; customers: Customer[]; officerName: string }) {
  const [live, setLive] = useState<any>(null);
  useEffect(() => { void fetch("/api/reports").then(async response => { if (response.ok) setLive(await response.json()); }); }, []);
  const batches: { id: string; businessDate: string; recordCount: number; acceptedCount: number; exceptionCount: number; status: string }[] = live?.batches || [];
  const liveCases: CaseRow[] = live?.cases || cases;
  const liveCustomers: Customer[] = live?.parties || customers;
  const uboAggregates: UboAggregate[] = live?.uboAggregates || [];
  const versions: any[] = live?.watchlistVersions || [];
  const activities: any[] = live?.activities || [];
  const reports: ReportDefinition[] = [
    { name: "Daily AML screening report", frequency: "Updated after every screening batch", columns: ["Batch", "Business date", "Source records", "Accepted", "Exceptions", "Status"], rows: batches.map(batch => [batch.id,batch.businessDate,String(batch.recordCount),String(batch.acceptedCount),String(batch.exceptionCount),batch.status]) },
    { name: "Sanctions screening register", frequency: "Updated after every screening batch", columns: ["Case", "Party", "Match detail", "Priority", "Status", "Officer"], rows: liveCases.filter(c => c.type === "Sanctions" || c.type === "Screening").map(c => [c.id,c.entity,c.detail,c.priority,c.status,c.owner]) },
    { name: "PEP register", frequency: "Current portfolio and case data", columns: ["Case", "Party", "Classification", "Risk", "Status", "Review"], rows: liveCases.filter(c => c.type === "PEP").map(c => [c.id,c.entity,"Potential PEP / related person",c.priority,c.status,"Enhanced due diligence"]) },
    { name: "UBO register", frequency: "Current portfolio and case data", columns: ["Company", "CR", "Natural person", "Identifier", "Aggregated ownership", "Routes", "Qualification"], rows: uboAggregates.map(u => [u.companyName,u.companyCr,u.naturalPersonName,u.naturalPersonIdentifier || "",`${u.totalEffectiveOwnership.toFixed(2)}%`,String(u.routeCount),u.qualifiesAsUbo ? "UBO" : "Below recorded threshold"]) },
    { name: "High-risk customer register", frequency: "Current portfolio and case data", columns: ["Customer ID", "Customer", "Type", "Identifier", "Risk", "KYC"], rows: liveCustomers.filter(c => c.risk === "High").map(c => [c.id,c.name,c.type,c.identifier,c.risk,c.kyc]) },
    { name: "Missing KYC / UBO report", frequency: "Current portfolio and case data", columns: ["Record", "Customer", "Exception", "Priority", "Status"], rows: [...liveCustomers.filter(c => c.kyc !== "Verified").map(c => [c.id,c.name,`KYC ${c.kyc}`,"Medium","Open"]), ...liveCases.filter(c => c.type === "UBO").map(c => [c.id,c.entity,c.detail,c.priority,c.status])] },
    { name: "Case ageing and SLA report", frequency: "Current portfolio and case data", columns: ["Case", "Entity", "Exception", "Priority", "Status", "Age", "Officer"], rows: liveCases.map(c => [c.id,c.entity,c.detail,c.priority,c.status,c.age,c.owner]) },
    { name: "Watchlist version and re-screening report", frequency: "Updated on every approved list upload", columns: ["Source", "Version", "Effective date", "Uploaded", "Records", "Parties screened", "UBOs screened", "Matches"], rows: versions.map(v => [v.category,v.version,v.effectiveDate,new Date(v.uploadedAt).toLocaleString(),String(v.recordCount),String(v.partiesScreened || 0),String(v.uboRecordsScreened || 0),String(v.matchesCreated || 0)]) },
    { name: "Full audit trail", frequency: "Current portfolio and case data", columns: ["Date / time", "User", "Action", "Record", "Change / reason"], rows: activities.map(a => [new Date(a.date).toLocaleString(),a.user,a.action,a.id,a.detail]) },
  ];
  const [selected, setSelected] = useState<ReportDefinition | null>(null);
  return <>
    <PageTitle eyebrow="REPORTING AND DATA INPUT" title="Reports" copy="Download the prescribed previous-day extract format and generate inspection-ready compliance registers." />
    <section className="template-banner"><div><span className="file-badge">XLSX</span><div><h2>Simplified daily AML/CFT upload template</h2><p>35 relevant fields, including six optional PEP indicators. Blank PEP values are stored as UNKNOWN—not “Not a PEP”—and reported indicators create Compliance review flags.</p></div></div><div className="template-actions"><a href="/NIA_AML_Daily_Transactions_Template.csv" download className="outline-button">Download CSV</a><a href="/NIA_AML_Daily_Upload_Template.xlsx" download className="upload-button">Download Excel template</a></div></section>
    <div className="report-grid">{reports.map(report => <article className="panel report-card" key={report.name}><span>▥</span><div><strong>{report.name}</strong><p>{report.frequency} · {report.rows.length} record(s)</p></div><button onClick={() => setSelected(report)}>Generate</button></article>)}</div>
    {selected && <div className="modal-backdrop" onMouseDown={() => setSelected(null)}><section className="modal report-modal" role="dialog" aria-modal="true" onMouseDown={e => e.stopPropagation()}><button className="close" onClick={() => setSelected(null)}>×</button><div className="report-brand"><img src="/nia-logo.jpg" alt="The New India Assurance Co. Ltd. logo" /><div><strong>The New India Assurance Co. Ltd.</strong><span>Oman Operations</span></div></div><p className="eyebrow">GENERATED REPORT</p><h2>{selected.name}</h2><p>Prepared by {officerName} · 25 July 2026 · {selected.rows.length} record(s)</p><div className="report-preview"><table><thead><tr>{selected.columns.map(c => <th key={c}>{c}</th>)}</tr></thead><tbody>{selected.rows.length ? selected.rows.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j}>{cell}</td>)}</tr>) : <tr><td colSpan={selected.columns.length}>No records found for this report.</td></tr>}</tbody></table></div><div className="modal-actions"><button className="outline-button" onClick={() => downloadReport(selected)}>Download CSV</button><button className="upload-button" onClick={() => printReport(selected, officerName)}>Print report</button></div></section></div>}
  </>;
}

function AuditModule() {
  const [logs, setLogs] = useState<string[][]>([]);
  useEffect(() => { void fetch("/api/audit").then(async response => { if (response.ok) setLogs((await response.json()).activities.map((item: { date: string; user: string; action: string; id: string; detail: string }) => [new Date(item.date).toLocaleString(), item.user, item.action, item.id, item.detail])); }); }, []);
  return <>
    <PageTitle eyebrow="IMMUTABLE ACTIVITY HISTORY" title="Audit log" copy="Review who changed what, when it changed and the reason recorded." action={<button className="outline-button" onClick={() => window.print()}>Export current view</button>} />
    <section className="panel registry-table"><table><thead><tr><th>Date / time</th><th>User</th><th>Action</th><th>Record</th><th>Change / reason</th></tr></thead><tbody>{logs.length ? logs.map(r => <tr key={r.join()}>{r.map((c,i)=><td key={c}>{i===2?<StatusPill tone="slate">{c}</StatusPill>:c}</td>)}</tr>) : <tr><td colSpan={5}>No audit activities have been recorded.</td></tr>}</tbody></table></section>
  </>;
}

function Overview({ query, cases, setActive, officerName }: { query: string; cases: CaseRow[]; setActive: (v: string) => void; officerName: string }) {
  const openCases = cases.filter(item => item.status !== "Closed");
  const visible = openCases.filter(c => !query || `${c.id} ${c.entity} ${c.detail}`.toLowerCase().includes(query.toLowerCase()));
  return <>
    <div className="welcome-row"><div><p className="eyebrow">{new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).toUpperCase()}</p><h1>Good morning, {officerName.split(" ")[0]}.</h1><p>Your compliance position will populate after the first upload and screening run.</p></div><div className="batch-summary"><span>Latest batch</span><strong>Not uploaded</strong><StatusPill tone="slate">Pending</StatusPill><small>No operational records</small></div></div>
    {openCases.some(item => item.priority === "Critical") && <div className="alert-banner"><div className="alert-icon">!</div><div><strong>{openCases.filter(item => item.priority === "Critical").length} critical match(es) need review</strong><p>Open the case queue and document the compliance decision.</p></div><button onClick={() => setActive("Cases")}>Review critical cases →</button></div>}
    <section className="metrics">
      <article><div className="metric-head"><span>Policies analysed</span><i className="blue">▥</i></div><strong>0</strong><p>Waiting for daily upload</p></article>
      <article><div className="metric-head"><span>Potential matches</span><i className="red">◎</i></div><strong>{openCases.filter(item => item.type === "Sanctions" || item.type === "Screening").length}</strong><p>{openCases.filter(item => item.priority === "Critical").length} critical</p></article>
      <article><div className="metric-head"><span>Missing UBO records</span><i className="amber">◇</i></div><strong>{openCases.filter(item => item.type === "UBO").length}</strong><p>Current open records</p></article>
      <article><div className="metric-head"><span>Open cases</span><i className="violet">◷</i></div><strong>{openCases.length}</strong><p>Current case queue</p></article>
    </section>
    <section className="control-strip">
      <article className="control-card"><div className="control-top"><span className="control-icon blue">⇄</span><StatusPill tone="green">Independent</StatusPill></div><h3>Compliance intake</h3><p>Review reported parties and refer required actions to Operations; core-system maker-checker remains unchanged.</p><button onClick={() => setActive("Compliance intake")}>Open assessment →</button></article>
      <article className="control-card"><div className="control-top"><span className="control-icon amber">◷</span><strong className="sla-number">7 days</strong></div><h3>KYC completion SLA</h3><p>Alerts at day 3, 5 and 7, escalated by risk and branch.</p><div className="sla-track"><i /><i /><i className="warning" /><i className="danger" /></div></article>
      <article className="control-card"><div className="control-top"><span className="control-icon violet">▤</span><span className="completion">Not assessed</span></div><h3>Daily file quality</h3><div className="doc-list"><span>Structure: pending upload</span><span>Control totals: pending upload</span><span>Parties: pending upload</span><span>Exceptions: not calculated</span></div></article>
    </section>
    <div className="main-grid">
      <section className="panel case-panel"><div className="panel-head"><div><h2>Priority case queue</h2><p>Open cases requiring compliance action</p></div><button className="link-button" onClick={() => setActive("Cases")}>View all cases →</button></div><div className="table-wrap"><table><thead><tr><th>Case / Entity</th><th>Exception</th><th>Priority</th><th>Status</th><th>Age</th></tr></thead><tbody>{visible.slice(0,5).map(item => <tr key={item.id}><td><strong>{item.entity}</strong><span>{item.id}</span></td><td>{item.detail}</td><td><StatusPill tone={item.priority === "Critical" ? "red" : item.priority === "High" ? "orange" : "slate"}>{item.priority}</StatusPill></td><td>{item.status}</td><td>{item.age}</td></tr>)}</tbody></table></div></section>
      <aside className="right-column"><section className="panel risk-panel"><div className="panel-head"><div><h2>Customer risk</h2><p>Active portfolio distribution</p></div></div><div className="empty">No customer risk records have been loaded.</div></section><section className="panel quick-report"><h2>Daily report format</h2><p>Download the approved Excel or CSV input template.</p><button onClick={() => setActive("Reports")} className="upload-button">Open report centre</button></section></aside>
    </div>
  </>;
}

export default function Home() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [active, setActive] = useState("Overview");
  const [query, setQuery] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [accountMessage, setAccountMessage] = useState("");
  const [uploaded, setUploaded] = useState<File | null>(null);
  const [uploadBusinessDate, setUploadBusinessDate] = useState("");
  const [uploadMessage, setUploadMessage] = useState("");
  const [uploadBusy, setUploadBusy] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [caseRows, setCaseRows] = useState(initialCases);
  const [customers, setCustomers] = useState(initialCustomers);
  const addCase = (row: CaseRow) => setCaseRows(current => [row, ...current]);

  useEffect(() => {
    void fetch("/api/session").then(async response => {
      if (!response.ok) return setUser(null);
      const result = await response.json();
      setUser(result.user);
      const dataResponse = await fetch("/api/data");
      if (dataResponse.ok) {
        const data = await dataResponse.json();
        setCaseRows(data.cases.length ? data.cases : initialCases);
        setCustomers(data.customers.length ? data.customers : initialCustomers);
      }
      setDataLoaded(true);
    }).catch(() => {
      setDataLoaded(true);
      setUser(null);
    });
  }, []);
  const module = useMemo(() => {
    const officerName = user?.fullName || "Compliance Officer";
    if (active === "Admin" && user?.role === "ADMIN") return <AdminModule />;
    if (active === "Daily controls") return <DailyControlsModule />;
    if (active === "Compliance intake") return <OnboardingModule customers={customers} setCustomers={setCustomers} addCase={addCase} />;
    if (active === "Screening") return <ScreeningModule addCase={addCase} />;
    if (active === "Cases") return <CasesModule rows={caseRows} setRows={setCaseRows} />;
    if (active === "Party master") return <CustomersModule customers={customers} setCustomers={setCustomers} />;
    if (active === "UBO Registry") return <UBOModule role={user?.role || "READ_ONLY"} setCases={setCaseRows} />;
    if (active === "Watchlists") return <ConfigurableWatchlistsModule role={user?.role || "READ_ONLY"} />;
    if (active === "Reports") return <ReportsModule cases={caseRows} customers={customers} officerName={officerName} />;
    if (active === "Audit log") return <AuditModule />;
    return <Overview query={query} cases={caseRows} setActive={setActive} officerName={officerName} />;
  }, [active, query, caseRows, customers, user]);

  if (user === null) return <LoginScreen onLogin={authenticatedUser => setUser(authenticatedUser)} />;
  const visibleNav = user.role === "ADMIN" ? ["Admin", ...nav] : nav;
  const openCases = caseRows.filter(item => item.status !== "Closed");
  const criticalNotifications = openCases.filter(item => item.priority === "Critical").length;
  const pepNotifications = openCases.filter(item => item.type === "PEP").length;
  const operationsNotifications = openCases.filter(item => item.status === "Communicated to Operations").length;
  const notificationCount = criticalNotifications + pepNotifications + operationsNotifications;
  const notificationItems = [
    criticalNotifications ? `${criticalNotifications} critical case(s) require review` : "",
    pepNotifications ? `${pepNotifications} PEP qualification review(s) are open` : "",
    operationsNotifications ? `${operationsNotifications} case response(s) are awaited from Operations` : "",
  ].filter(Boolean);
  const logout = async () => { await fetch("/api/session", { method: "DELETE" }); setUser(null); setActive("Overview"); };
  const completeUpload = async () => {
    if (!uploaded) return;
    setUploadBusy(true); setUploadMessage("");
    const body = new FormData();
    body.set("file", uploaded); body.set("businessDate", uploadBusinessDate);
    const response = await fetch("/api/uploads", { method: "POST", body });
    const result = await response.json();
    setUploadBusy(false);
    if (!response.ok) return setUploadMessage(result.error || "Upload failed");
    setUploadMessage(`${result.batch.id}: ${result.batch.acceptedCount}/${result.batch.recordCount} records accepted; ${result.batch.exceptionCount} exception(s); ${result.newParties} new party record(s); ${result.potentialMatches} potential match(es); ${result.pepReviewFlags || 0} PEP review flag(s).`);
    setUploaded(null);
  };

  return <main className="app-shell">
    <aside className={`sidebar ${sidebarOpen ? "mobile-open" : ""}`}>
      <div className="brand portal-brand"><img className="brand-logo" src="/nia-logo.jpg" alt="The New India Assurance Co. Ltd. logo" /><div><strong>The New India Assurance Co. Ltd.</strong><span>Oman Operations</span><small>AML / CFT Portal</small></div><button type="button" className="mobile-close-btn" onClick={() => setSidebarOpen(false)} aria-label="Close menu">✕</button></div>
      <nav>{visibleNav.map(item => <button key={item} className={active === item ? "nav-item active" : "nav-item"} onClick={() => { setActive(item); setSidebarOpen(false); }}><span className="nav-icon">{item === "Admin" ? "⚙" : item === "Overview" ? "⌂" : item === "Cases" ? "▣" : item === "Reports" ? "▥" : "◇"}</span><span>{item}</span>{item === "Cases" && <b>{caseRows.length}</b>}</button>)}</nav>
      <div className="sidebar-footer">
        <button type="button" className="logout-btn" onClick={() => { setSidebarOpen(false); logout(); }} title="Sign out of portal">
          <span style={{ fontSize: "14px" }}>🚪</span><span>Sign out</span>
        </button>
      </div>
    </aside>
    {sidebarOpen && <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} role="presentation" />}
    <section className="workspace">
      <header className="topbar">
        <button type="button" className="mobile-toggle-btn" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Toggle navigation menu">{sidebarOpen ? "✕" : "☰"}</button>
        <label className="search"><span>⌕</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search customers, CR, Civil ID or case number..." /></label>
        <div className="top-actions"><div className="as-of"><span className="live-dot" /> Portfolio screened<br/><small>{new Date().toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</small></div><button className="icon-button" aria-label="Notifications" aria-expanded={showNotifications} onClick={() => setShowNotifications(!showNotifications)}>♧{notificationCount > 0 && <i>{notificationCount}</i>}</button>{showNotifications && <div className="popover"><strong>Notifications</strong>{notificationItems.length ? notificationItems.map(item => <p key={item}>{item}</p>) : <p>No active case notifications.</p>}<button className="link-button" onClick={() => { setActive("Cases"); setShowNotifications(false); }}>Open case queue →</button></div>}<button className="upload-button" onClick={() => setShowUpload(true)}>+ Upload daily file</button></div>
      </header>
      <div className="content">{module}</div>
    </section>
    {showUpload && <div className="modal-backdrop" role="presentation" onMouseDown={() => setShowUpload(false)}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="upload-title" onMouseDown={e => e.stopPropagation()}><button className="close" onClick={() => setShowUpload(false)}>×</button><div className="upload-icon">⇧</div><p className="eyebrow">DAILY SCREENING BATCH</p><h2 id="upload-title">Upload previous-day report</h2><p>CSV/XLSX rows are validated, reconciled, stored and screened. The source file is retained unchanged for audit.</p><Field label="Business date in the report"><input type="date" value={uploadBusinessDate} onChange={e => setUploadBusinessDate(e.target.value)} required /></Field>{uploaded ? <div className="upload-success"><b>{uploaded.name}</b><span>{(uploaded.size / 1024).toFixed(1)} KB selected for validation.</span></div> : <label className="drop-zone"><input type="file" accept=".csv,.xlsx" onChange={e => setUploaded(e.target.files?.[0] || null)} /><strong>Choose the daily report file</strong><span>CSV or XLSX · maximum 50 MB</span></label>}{uploadMessage && <div className={uploadMessage.includes(":") ? "upload-success" : "login-error"}><b>Upload result</b><span>{uploadMessage}</span></div>}<div className="modal-note"><span>i</span><p><strong>Enter the date actually contained in the report.</strong><br/>Duplicate files and Source_Record_ID values are blocked. Missing optional compliance fields create follow-up, not full-file rejection.</p></div><div className="modal-actions"><a href="/NIA_AML_Daily_Upload_Template.xlsx" download className="outline-button">Get template</a><button className="outline-button" onClick={() => setShowUpload(false)}>Close</button><button className="upload-button" disabled={!uploaded || !uploadBusinessDate || uploadBusy} onClick={completeUpload}>{uploadBusy ? "Validating and screening..." : "Create screening batch"}</button></div></section></div>}
    {showAccount && <div className="modal-backdrop" onMouseDown={() => setShowAccount(false)}><form className="modal profile-modal" onSubmit={async e => { e.preventDefault(); const data = new FormData(e.currentTarget); const response = await fetch("/api/account/password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentPassword: data.get("currentPassword"), newPassword: data.get("newPassword") }) }); const result = await response.json(); if (!response.ok) return setAccountMessage(result.error); setAccountMessage("Password changed. Please sign in again."); setTimeout(() => void logout(), 1200); }} onMouseDown={e => e.stopPropagation()}><button type="button" className="close" onClick={() => setShowAccount(false)}>×</button><p className="eyebrow">MY ACCOUNT</p><h2>{user.fullName}</h2><p>{user.role.replace("_"," ")} · {user.username}</p>{accountMessage && <div className="login-error">{accountMessage}</div>}<Field label="Current password"><input name="currentPassword" type="password" required /></Field><Field label="New password (minimum 10 characters)"><input name="newPassword" type="password" minLength={10} required /></Field><div className="modal-actions"><button type="button" className="outline-button" onClick={logout}>Sign out</button><button className="upload-button">Change password</button></div></form></div>}
  </main>;
}
