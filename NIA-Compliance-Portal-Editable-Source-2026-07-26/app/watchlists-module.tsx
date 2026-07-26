"use client";

import { FormEvent, useEffect, useState } from "react";

type Role = "ADMIN" | "COMPLIANCE" | "REVIEWER" | "READ_ONLY";
type WatchlistSource = {
  id: string; code: string; name: string; authority: string;
  classification: "MANDATORY_OMAN_TFS" | "ADDITIONAL_EXTERNAL" | "PEP" | "INTERNAL";
  treatment: string; legalBasis: string; format: "UN_XML" | "STANDARD_CSV";
  active: boolean; statutoryLocked: boolean;
};
type WatchlistVersion = {
  id: string; sourceId: string; category: string; classification: string; treatment: string;
  version: string; recordCount: number; active: boolean; uploadedAt: string; filename: string;
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="form-field"><span>{label}</span>{children}</label>;
}

function Classification({ value }: { value: string }) {
  const labels: Record<string, string> = {
    MANDATORY_OMAN_TFS: "Mandatory Oman TFS",
    ADDITIONAL_EXTERNAL: "Additional external sanctions",
    PEP: "PEP risk screening",
    INTERNAL: "NIA internal watchlist",
  };
  return <>{labels[value] || value}</>;
}

export default function ConfigurableWatchlistsModule({ role }: { role: Role }) {
  const [file, setFile] = useState("");
  const [sourceId, setSourceId] = useState("source-un");
  const [sources, setSources] = useState<WatchlistSource[]>([]);
  const [versions, setVersions] = useState<WatchlistVersion[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const selectedSource = sources.find(source => source.id === sourceId);

  const load = async () => {
    const response = await fetch("/api/watchlists");
    if (!response.ok) return;
    const data = await response.json();
    setVersions(data.versions);
    setSources(data.sources);
    if (!data.sources.some((source: WatchlistSource) => source.id === sourceId && source.active)) {
      setSourceId(data.sources.find((source: WatchlistSource) => source.active)?.id || "");
    }
  };
  useEffect(() => { void load(); }, []);

  const activate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    const response = await fetch("/api/watchlists", { method: "POST", body: new FormData(event.currentTarget) });
    const data = await response.json(); setBusy(false);
    if (!response.ok) return setError(data.error || "Unable to process watchlist");
    setMessage(`${data.version.category} activated with ${data.version.recordCount.toLocaleString()} records. ${data.portfolioMatches} current customer match(es) were converted into cases.`);
    setFile(""); await load();
  };

  const createSource = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    const response = await fetch("/api/watchlist-sources", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
    const data = await response.json(); setBusy(false);
    if (!response.ok) return setError(data.error || "Unable to create watchlist source");
    setMessage(`${data.source.name} added as a separately governed watchlist source.`);
    event.currentTarget.reset(); await load(); setSourceId(data.source.id);
  };

  const toggleSource = async (source: WatchlistSource) => {
    setError(""); setMessage("");
    const response = await fetch("/api/watchlist-sources", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: source.id, active: !source.active }) });
    const data = await response.json();
    if (!response.ok) return setError(data.error || "Unable to update source");
    setMessage(`${source.name} marked ${data.source.active ? "active" : "inactive"}.`);
    await load();
  };

  return <>
    <div className="module-title"><div><p className="eyebrow">CONTROLLED OFFLINE LISTS</p><h1>Watchlists</h1><p>UN and Oman remain protected mandatory sources. Admin may add separately governed external, PEP or internal sources.</p></div></div>
    {message && <div className="success-banner">{message}</div>}
    {error && <div className="login-error watchlist-error">{error}</div>}
    <div className="module-grid two">
      <form className="panel form-panel" onSubmit={activate}>
        <div className="panel-head"><div><h2>Upload and activate list version</h2><p>File structure, duplicate hash and record counts are validated</p></div></div>
        <div className="form-grid">
          <Field label="Configured watchlist source"><select name="sourceId" value={sourceId} onChange={event => { setSourceId(event.target.value); setFile(""); }}>{sources.filter(source => source.active).map(source => <option key={source.id} value={source.id}>{source.name}</option>)}</select></Field>
          <Field label="Issuing authority"><input value={selectedSource?.authority || ""} readOnly /></Field>
          <Field label="Effective date"><input name="effectiveDate" required type="date" /></Field>
          <Field label="Version reference"><input name="version" placeholder="Official publication or retrieval reference" /></Field>
        </div>
        {selectedSource && <div className="watchlist-help"><p><b><Classification value={selectedSource.classification} />:</b> {selectedSource.treatment}</p><p><b>Basis:</b> {selectedSource.legalBasis}</p></div>}
        <label className="mini-drop"><input name="file" required type="file" accept={selectedSource?.format === "UN_XML" ? ".xml,application/xml,text/xml" : ".csv,text/csv"} onChange={event => setFile(event.target.files?.[0]?.name || "")} /><span>{file || (selectedSource?.format === "UN_XML" ? "Choose official UN Consolidated List XML" : "Choose controlled standard CSV")}</span></label>
        <div className="watchlist-help"><p><b>UN:</b> official XML by Name or PRN. <b>Other configured sources:</b> controlled standard CSV independently reconciled to the official source. Do not mix OFAC, UK or EU entries into the Internal Watchlist.</p><a href="/Watchlist_Upload_Template.csv" download>Download standard watchlist CSV template</a></div>
        <div className="form-actions"><button className="upload-button" disabled={busy || !file}>{busy ? "Validating and importing..." : "Validate and activate"}</button></div>
      </form>
      <section className="panel version-list">
        <div className="panel-head"><div><h2>Active versions</h2><p>Evidence retained for each screening run</p></div></div>
        {versions.filter(version => version.active).map(version => <div className="watch-version" key={version.id}><span className="live-dot" /><div><strong>{version.category}</strong><span><Classification value={version.classification} /> · {version.version} · {version.recordCount.toLocaleString()} records · {version.filename}</span></div><span className={`pill ${version.classification === "MANDATORY_OMAN_TFS" ? "orange" : "green"}`}>{version.classification === "MANDATORY_OMAN_TFS" ? "Mandatory" : "Current"}</span></div>)}
        {!versions.some(version => version.active) && <div className="empty">No active list versions. Upload an approved version to begin real screening.</div>}
        {versions.some(version => !version.active) && <><div className="version-divider">Previous versions</div>{versions.filter(version => !version.active).slice(0, 6).map(version => <div className="watch-version historic" key={version.id}><span /><div><strong>{version.category}</strong><span>{version.version} · {version.recordCount.toLocaleString()} records</span></div><span className="pill slate">Retained</span></div>)}</>}
      </section>
    </div>
    <section className="panel version-list">
      <div className="panel-head"><div><h2>Watchlist sources</h2><p>UN and Oman statutory classifications are protected. Other sources retain their separate authority and response.</p></div></div>
      {sources.map(source => <div className="watch-version" key={source.id}><span className={source.active ? "live-dot" : ""} /><div><strong>{source.name} <small>({source.code})</small></strong><span><Classification value={source.classification} /> · {source.authority} · {source.format === "UN_XML" ? "Official XML" : "Standard CSV"}</span><small>{source.treatment}</small></div><span className={`pill ${source.statutoryLocked ? "orange" : source.active ? "green" : "slate"}`}>{source.statutoryLocked ? "Protected" : source.active ? "Active" : "Inactive"}</span>{role === "ADMIN" && !source.statutoryLocked && <button className="outline-button" type="button" onClick={() => toggleSource(source)}>{source.active ? "Disable" : "Enable"}</button>}</div>)}
    </section>
    {role === "ADMIN" && <form className="panel form-panel" onSubmit={createSource}>
      <div className="panel-head"><div><h2>Add approved watchlist source</h2><p>Use a separate source for OFAC, UK, EU or another approved authority. New sources cannot be classified as mandatory Oman TFS.</p></div></div>
      <div className="form-grid">
        <Field label="Display name *"><input name="name" required placeholder="Example: OFAC Sanctions" /></Field>
        <Field label="Short code *"><input name="code" required placeholder="Example: OFAC" /></Field>
        <Field label="Issuing authority *"><input name="authority" required placeholder="Official authority" /></Field>
        <Field label="Classification *"><select name="classification" required><option value="ADDITIONAL_EXTERNAL">Additional external sanctions</option><option value="PEP">PEP risk screening</option><option value="INTERNAL">Internal watchlist</option></select></Field>
        <Field label="Legal / policy basis *"><input name="legalBasis" required placeholder="Group policy, contract, applicable foreign law or procedure" /></Field>
        <Field label="Required match treatment *"><input name="treatment" required placeholder="Required escalation and action" /></Field>
      </div>
      <div className="watchlist-help"><b>Protected control:</b> only the system-defined UN Consolidated List and Oman National List carry Mandatory Oman TFS classification. Compliance/Legal must approve the basis and response for every additional source.</div>
      <div className="form-actions"><button className="upload-button" disabled={busy}>{busy ? "Saving..." : "Add watchlist source"}</button></div>
    </form>}
  </>;
}
