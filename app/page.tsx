"use client";

import { FormEvent, useMemo, useState } from "react";

type Temperature = "Hot" | "Warm" | "Cold";
type WorkspaceView = "overview" | "leads" | "automations" | "sources" | "analytics" | "settings";

type Lead = {
  id: number;
  name: string;
  email: string;
  source: string;
  budget: number;
  timeline: string;
  property: string;
  location: string;
  score: number;
  temperature: Temperature;
  intent: string;
  status: string;
  updated: string;
};

const seedLeads: Lead[] = [
  { id: 1, name: "Olivia Martin", email: "olivia@example.com", source: "Website", budget: 850000, timeline: "0-30 days", property: "Luxury villa", location: "Palm Jumeirah", score: 94, temperature: "Hot", intent: "Ready to book a viewing", status: "Qualified", updated: "2 min ago" },
  { id: 2, name: "Daniel Kim", email: "daniel@example.com", source: "Facebook", budget: 420000, timeline: "1-3 months", property: "2 bedroom apartment", location: "Dubai Marina", score: 81, temperature: "Hot", intent: "Comparing shortlisted units", status: "Qualified", updated: "18 min ago" },
  { id: 3, name: "Sophia Bennett", email: "sophia@example.com", source: "Referral", budget: 280000, timeline: "3-6 months", property: "Townhouse", location: "JVC", score: 68, temperature: "Warm", intent: "Researching finance options", status: "Nurture", updated: "1 hr ago" },
  { id: 4, name: "Ethan Walker", email: "ethan@example.com", source: "Google Ads", budget: 190000, timeline: "6+ months", property: "Studio apartment", location: "Business Bay", score: 47, temperature: "Cold", intent: "Early market research", status: "Nurture", updated: "3 hrs ago" },
  { id: 5, name: "Maya Rodriguez", email: "maya@example.com", source: "LinkedIn", budget: 510000, timeline: "1-3 months", property: "Investment apartment", location: "Downtown Dubai", score: 76, temperature: "Warm", intent: "Seeking strong rental yield", status: "Review", updated: "5 hrs ago" },
];

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

function getTemperature(score: number): Temperature {
  if (score >= 80) return "Hot";
  if (score >= 60) return "Warm";
  return "Cold";
}

function scoreLead(budget: number, timeline: string, source: string) {
  const budgetPoints = budget >= 500000 ? 38 : budget >= 300000 ? 30 : budget >= 200000 ? 22 : 14;
  const timelinePoints = timeline === "0-30 days" ? 36 : timeline === "1-3 months" ? 28 : timeline === "3-6 months" ? 18 : 8;
  const sourcePoints = source === "Referral" ? 18 : source === "Website" ? 16 : 12;
  return Math.min(98, budgetPoints + timelinePoints + sourcePoints + 6);
}

export default function Home() {
  const [leads, setLeads] = useState(seedLeads);
  const [filter, setFilter] = useState<"All" | Temperature>("All");
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<Lead | null>(null);
  const [activeView, setActiveView] = useState<WorkspaceView>("overview");
  const [showNotifications, setShowNotifications] = useState(false);
  const [followUpCreated, setFollowUpCreated] = useState(false);
  const [exportUrl, setExportUrl] = useState("");

  const visibleLeads = useMemo(() => leads.filter((lead) => {
    const matchesFilter = filter === "All" || lead.temperature === filter;
    const haystack = `${lead.name} ${lead.email} ${lead.location} ${lead.source}`.toLowerCase();
    return matchesFilter && haystack.includes(query.toLowerCase());
  }), [filter, leads, query]);

  const avgScore = Math.round(leads.reduce((sum, lead) => sum + lead.score, 0) / leads.length);
  const hotLeads = leads.filter((lead) => lead.temperature === "Hot").length;
  const qualified = leads.filter((lead) => lead.status === "Qualified").length;

  const viewCopy: Record<Exclude<WorkspaceView, "overview" | "leads">, { title: string; description: string }> = {
    automations: { title: "Automations", description: "Follow-up rules triggered by lead score and buying timeline." },
    sources: { title: "Lead sources", description: "Acquisition performance across your connected marketing channels." },
    analytics: { title: "Pipeline analytics", description: "A live summary of lead quality and sales readiness." },
    settings: { title: "Workspace settings", description: "Configuration for this portfolio demo workspace." },
  };

  function exportLeads() {
    const header = ["Name", "Email", "Score", "Temperature", "Budget", "Timeline", "Source", "Status"];
    const rows = visibleLeads.map((lead) => [lead.name, lead.email, lead.score, lead.temperature, lead.budget, lead.timeline, lead.source, lead.status]);
    const csv = [header, ...rows].map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n");
    setExportUrl(`data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`);
  }

  function addLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const budget = Number(data.get("budget"));
    const timeline = String(data.get("timeline"));
    const source = String(data.get("source"));
    const score = scoreLead(budget, timeline, source);
    const temperature = getTemperature(score);
    const newLead: Lead = {
      id: Date.now(),
      name: String(data.get("name")),
      email: String(data.get("email")),
      source,
      budget,
      timeline,
      property: String(data.get("property")),
      location: String(data.get("location")),
      score,
      temperature,
      intent: timeline === "0-30 days" ? "High purchase intent detected" : "Exploring suitable property options",
      status: score >= 80 ? "Qualified" : "Nurture",
      updated: "Just now",
    };
    setLeads((current) => [newLead, ...current]);
    setSelected(newLead);
    setShowForm(false);
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">LQ</span><span>LeadIQ <b>AI</b></span></div>
        <p className="workspace-label">WORKSPACE</p>
        <nav aria-label="Main navigation">
          <button className={`nav-item ${activeView === "overview" ? "active" : ""}`} onClick={() => setActiveView("overview")}><span>⌁</span>Overview</button>
          <button className={`nav-item ${activeView === "leads" ? "active" : ""}`} onClick={() => setActiveView("leads")}><span>◎</span>Lead intelligence <em>{leads.length}</em></button>
          <button className={`nav-item ${activeView === "automations" ? "active" : ""}`} onClick={() => setActiveView("automations")}><span>↗</span>Automations</button>
          <button className={`nav-item ${activeView === "sources" ? "active" : ""}`} onClick={() => setActiveView("sources")}><span>◇</span>Sources</button>
          <button className={`nav-item ${activeView === "analytics" ? "active" : ""}`} onClick={() => setActiveView("analytics")}><span>▦</span>Analytics</button>
        </nav>
        <div className="sidebar-spacer" />
        <div className="ai-health"><span className="pulse" /><div><strong>AI engine online</strong><small>Last sync 24 sec ago</small></div></div>
        <button className={`nav-item ${activeView === "settings" ? "active" : ""}`} onClick={() => setActiveView("settings")}><span>⚙</span>Settings</button>
        <div className="profile"><span className="avatar">MD</span><div><strong>Muhammad Dawood</strong><small>Workspace admin</small></div><span>⋯</span></div>
      </aside>

      <section className="content">
        <header className="topbar">
          <div><p className="eyebrow">LEAD INTELLIGENCE PLATFORM</p><h1>Good afternoon, Muhammad</h1><p>Here is how your pipeline is performing today.</p></div>
          <div className="top-actions"><button className="icon-button" aria-label="Notifications" aria-expanded={showNotifications} onClick={() => setShowNotifications((current) => !current)}>♢<span /></button><button className="primary-button" onClick={() => setShowForm(true)}>＋ Qualify new lead</button></div>
        </header>

        {showNotifications && <section className="notification-panel" aria-label="Notifications panel"><div className="notification-head"><strong>Notifications</strong><button aria-label="Close notifications" onClick={() => setShowNotifications(false)}>×</button></div><p>2 hot leads are ready for immediate follow-up.</p><p>Your AI scoring engine is online and up to date.</p></section>}

        {activeView !== "overview" && activeView !== "leads" && <section className="workspace-panel" aria-live="polite">
          <p className="eyebrow">WORKSPACE VIEW</p><h2>{viewCopy[activeView].title}</h2><p>{viewCopy[activeView].description}</p>
          {activeView === "automations" && <div className="workspace-grid"><article><strong>Hot lead alert</strong><p>Instant agent notification for scores of 80 or higher.</p><span>Active</span></article><article><strong>Nurture sequence</strong><p>Property recommendations for Warm and Cold prospects.</p><span>Active</span></article></div>}
          {activeView === "sources" && <div className="workspace-grid">{["Website", "Facebook", "Referral", "Google Ads", "LinkedIn"].map((source) => <article key={source}><strong>{source}</strong><p>{leads.filter((lead) => lead.source === source).length} active lead(s)</p></article>)}</div>}
          {activeView === "analytics" && <div className="workspace-grid"><article><strong>{avgScore}/100</strong><p>Average qualification score</p></article><article><strong>{hotLeads}</strong><p>Leads requiring immediate action</p></article><article><strong>{Math.round((qualified / leads.length) * 100)}%</strong><p>Sales-ready qualification rate</p></article></div>}
          {activeView === "settings" && <div className="workspace-grid"><article><strong>Real-time scoring</strong><p>Enabled for every new lead.</p><span>Enabled</span></article><article><strong>Workspace administrator</strong><p>Muhammad Dawood</p></article></div>}
        </section>}

        <section className="metric-grid" aria-label="Lead metrics">
          <article className="metric-card highlight"><div className="metric-head"><span className="metric-icon">↗</span><span className="trend">+18.2%</span></div><strong>{leads.length * 47}</strong><p>Total leads analyzed</p><small>vs. previous 30 days</small></article>
          <article className="metric-card"><div className="metric-head"><span className="metric-icon orange">◆</span><span className="trend">+{hotLeads}</span></div><strong>{hotLeads}</strong><p>Hot leads</p><small>Ready for immediate follow-up</small></article>
          <article className="metric-card"><div className="metric-head"><span className="metric-icon violet">✓</span><span className="trend">+12.4%</span></div><strong>{Math.round((qualified / leads.length) * 100)}%</strong><p>Qualification rate</p><small>{qualified} leads sales-ready</small></article>
          <article className="metric-card"><div className="metric-head"><span className="metric-icon blue">✦</span><span className="trend neutral">Live</span></div><strong>{avgScore}</strong><p>Average AI score</p><small>Across active lead pipeline</small></article>
        </section>

        <section className="insight-strip">
          <div className="insight-orb">✦</div>
          <div><span className="ai-label">AI PIPELINE INSIGHT</span><strong>Your highest-converting leads come from website forms with budgets above $500K.</strong><p>Prioritizing these leads could improve your response-to-viewing rate by an estimated 23%.</p></div>
          <button onClick={() => setFilter("Hot")}>View hot leads →</button>
        </section>

        <section className="lead-panel">
          <div className="panel-header">
            <div><h2>Lead intelligence</h2><p>AI-ranked opportunities across every acquisition source.</p></div>
            <div className="panel-tools"><label className="search"><span>⌕</span><input aria-label="Search leads" placeholder="Search leads..." value={query} onChange={(e) => { setQuery(e.target.value); setExportUrl(""); }} /></label><button className="secondary-button" onClick={exportLeads}>⇩ Export</button>{exportUrl && <a className="download-link" href={exportUrl} download={`leadiq-${filter.toLowerCase()}-leads.csv`}>CSV ready — Download</a>}</div>
          </div>
          <div className="filter-row">
            {(["All", "Hot", "Warm", "Cold"] as const).map((item) => <button key={item} className={filter === item ? "selected" : ""} onClick={() => { setFilter(item); setExportUrl(""); }}>{item}{item !== "All" && <span>{leads.filter((lead) => lead.temperature === item).length}</span>}</button>)}
            <p><span className="live-dot" />Scoring in real time</p>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Lead</th><th>AI score</th><th>Intent signal</th><th>Budget</th><th>Source</th><th>Status</th><th /></tr></thead>
              <tbody>
                {visibleLeads.map((lead) => (
                  <tr key={lead.id} onClick={() => setSelected(lead)} tabIndex={0} onKeyDown={(e) => e.key === "Enter" && setSelected(lead)}>
                    <td><div className="lead-name"><span>{lead.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}</span><div><strong>{lead.name}</strong><small>{lead.email} · {lead.updated}</small></div></div></td>
                    <td><div className="score-cell"><b>{lead.score}</b><div className="score-track"><i style={{ width: `${lead.score}%` }} /></div><span className={`temp ${lead.temperature.toLowerCase()}`}>{lead.temperature}</span></div></td>
                    <td><strong className="intent">{lead.intent}</strong><small>{lead.timeline}</small></td>
                    <td><strong>{money.format(lead.budget)}</strong><small>{lead.property}</small></td>
                    <td><span className="source-badge">{lead.source}</span></td>
                    <td><span className={`status ${lead.status.toLowerCase()}`}>{lead.status}</span></td>
                    <td><button className="row-action" aria-label={`View ${lead.name}`}>›</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {visibleLeads.length === 0 && <div className="empty-state">No leads match this view.</div>}
          </div>
        </section>
      </section>

      {showForm && <div className="modal-backdrop" onMouseDown={() => setShowForm(false)}><section className="modal" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="new-lead-title"><button className="modal-close" onClick={() => setShowForm(false)} aria-label="Close">×</button><span className="modal-kicker">AI QUALIFICATION</span><h2 id="new-lead-title">Analyze a new lead</h2><p>Add the prospect details and LeadIQ will score purchase intent instantly.</p><form onSubmit={addLead}><div className="form-grid"><label>Full name<input name="name" required placeholder="Alex Morgan" /></label><label>Email<input name="email" type="email" required placeholder="alex@example.com" /></label><label>Budget (USD)<input name="budget" type="number" min="50000" required placeholder="450000" /></label><label>Buying timeline<select name="timeline" defaultValue="1-3 months"><option>0-30 days</option><option>1-3 months</option><option>3-6 months</option><option>6+ months</option></select></label><label>Property type<input name="property" required placeholder="2 bedroom apartment" /></label><label>Preferred location<input name="location" required placeholder="Dubai Marina" /></label><label className="full">Lead source<select name="source" defaultValue="Website"><option>Website</option><option>Referral</option><option>Facebook</option><option>Google Ads</option><option>LinkedIn</option></select></label></div><button className="primary-button form-submit">✦ Analyze & qualify lead</button></form></section></div>}

      {selected && <div className="drawer-backdrop" onMouseDown={() => { setSelected(null); setFollowUpCreated(false); }}><aside className="drawer" onMouseDown={(e) => e.stopPropagation()} aria-label="Lead intelligence details"><button className="modal-close" onClick={() => { setSelected(null); setFollowUpCreated(false); }} aria-label="Close">×</button><p className="eyebrow">AI LEAD PROFILE</p><div className="drawer-person"><span>{selected.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}</span><div><h2>{selected.name}</h2><p>{selected.email}</p></div></div><div className="drawer-score"><div><small>QUALIFICATION SCORE</small><strong>{selected.score}<em>/100</em></strong></div><span className={`temp ${selected.temperature.toLowerCase()}`}>{selected.temperature} lead</span></div><div className="reason-box"><span>✦</span><div><strong>AI recommendation</strong><p>{selected.score >= 80 ? "Contact this lead within 15 minutes and offer a viewing slot. Their budget and timeline show strong purchase readiness." : "Add this prospect to a tailored nurture sequence and follow up with matching property options."}</p></div></div><dl><div><dt>Budget</dt><dd>{money.format(selected.budget)}</dd></div><div><dt>Timeline</dt><dd>{selected.timeline}</dd></div><div><dt>Property</dt><dd>{selected.property}</dd></div><div><dt>Location</dt><dd>{selected.location}</dd></div><div><dt>Source</dt><dd>{selected.source}</dd></div><div><dt>CRM status</dt><dd>{selected.status}</dd></div></dl>{followUpCreated && <div className="follow-up-success" role="status">✓ Personalized follow-up created for {selected.name}.</div>}<button className="primary-button drawer-cta" onClick={() => setFollowUpCreated(true)} disabled={followUpCreated}>{followUpCreated ? "Follow-up ready" : "Create personalized follow-up →"}</button></aside></div>}
    </main>
  );
}
