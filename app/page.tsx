"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type Temperature = "Hot" | "Warm" | "Cold";
type PipelineStage = "New" | "Contacted" | "Qualified" | "Proposal" | "Won" | "Lost";
type WorkspaceView = "overview" | "leads" | "pipeline" | "automations" | "sources" | "analytics" | "settings";

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
  pipeline_stage: PipelineStage;
  updated: string;
};

type LeadNote = { id: number; lead_id: number; body: string; created_at: string };
type LeadTask = { id: number; lead_id: number; title: string; due_date: string | null; is_complete: boolean; created_at: string };
type LeadActivity = { id: number; lead_id: number; kind: string; description: string; created_at: string };
type LeadEmail = { id: number; lead_id: number; recipient: string; subject: string; body: string; status: string; created_at: string };

type LeadInsert = Omit<Lead, "id">;

const csvColumns = ["name", "email", "budget", "timeline", "property", "location", "source"] as const;
const allowedTimelines = new Set(["0-30 days", "1-3 months", "3-6 months", "6+ months"]);
const pipelineStages: PipelineStage[] = ["New", "Contacted", "Qualified", "Proposal", "Won", "Lost"];

const seedLeads: Lead[] = [
  { id: 1, name: "Olivia Martin", email: "olivia@example.com", source: "Website", budget: 850000, timeline: "0-30 days", property: "Luxury villa", location: "Palm Jumeirah", score: 94, temperature: "Hot", intent: "Ready to book a viewing", status: "Qualified", pipeline_stage: "Qualified", updated: "2 min ago" },
  { id: 2, name: "Daniel Kim", email: "daniel@example.com", source: "Facebook", budget: 420000, timeline: "1-3 months", property: "2 bedroom apartment", location: "Dubai Marina", score: 81, temperature: "Hot", intent: "Comparing shortlisted units", status: "Qualified", pipeline_stage: "Contacted", updated: "18 min ago" },
  { id: 3, name: "Sophia Bennett", email: "sophia@example.com", source: "Referral", budget: 280000, timeline: "3-6 months", property: "Townhouse", location: "JVC", score: 68, temperature: "Warm", intent: "Researching finance options", status: "Nurture", pipeline_stage: "New", updated: "1 hr ago" },
  { id: 4, name: "Ethan Walker", email: "ethan@example.com", source: "Google Ads", budget: 190000, timeline: "6+ months", property: "Studio apartment", location: "Business Bay", score: 47, temperature: "Cold", intent: "Early market research", status: "Nurture", pipeline_stage: "New", updated: "3 hrs ago" },
  { id: 5, name: "Maya Rodriguez", email: "maya@example.com", source: "LinkedIn", budget: 510000, timeline: "1-3 months", property: "Investment apartment", location: "Downtown Dubai", score: 76, temperature: "Warm", intent: "Seeking strong rental yield", status: "Review", pipeline_stage: "Proposal", updated: "5 hrs ago" },
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

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"' && quoted && text[index + 1] === '"') {
      cell += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      row.push(cell.trim());
      cell = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += character;
    }
  }
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

export default function Home() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filter, setFilter] = useState<"All" | Temperature>("All");
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<Lead | null>(null);
  const [activeView, setActiveView] = useState<WorkspaceView>("overview");
  const [showNotifications, setShowNotifications] = useState(false);
  const [exportUrl, setExportUrl] = useState("");
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured);
  const [userId, setUserId] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [authMessage, setAuthMessage] = useState("");
  const [savingLead, setSavingLead] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [csvLeads, setCsvLeads] = useState<LeadInsert[]>([]);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const [csvFileName, setCsvFileName] = useState("");
  const [importingCsv, setImportingCsv] = useState(false);
  const [importMessage, setImportMessage] = useState("");
  const [notes, setNotes] = useState<LeadNote[]>([]);
  const [tasks, setTasks] = useState<LeadTask[]>([]);
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [emails, setEmails] = useState<LeadEmail[]>([]);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [leadActionMessage, setLeadActionMessage] = useState("");

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user.id ?? "");
      setUserEmail(data.session?.user.email ?? "");
      setAuthReady(true);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user.id ?? "");
      setUserEmail(session?.user.email ?? "");
      setAuthReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!supabase || !userId) return;

    async function loadLeads() {
      const { data, error } = await supabase!.from("leads").select("id,name,email,source,budget,timeline,property,location,score,temperature,intent,status,pipeline_stage,updated").order("created_at", { ascending: false });
      if (error) {
        setAuthMessage(error.message);
        return;
      }
      if (data.length > 0) {
        setLeads(data as Lead[]);
        return;
      }

      const starterRows = seedLeads.map((lead) => ({ name: lead.name, email: lead.email, source: lead.source, budget: lead.budget, timeline: lead.timeline, property: lead.property, location: lead.location, score: lead.score, temperature: lead.temperature, intent: lead.intent, status: lead.status, pipeline_stage: lead.pipeline_stage, updated: lead.updated, user_id: userId }));
      const seeded = await supabase!.from("leads").insert(starterRows).select("id,name,email,source,budget,timeline,property,location,score,temperature,intent,status,pipeline_stage,updated");
      if (seeded.error) setAuthMessage(seeded.error.message);
      else setLeads(seeded.data as Lead[]);
    }
    loadLeads();
  }, [userId]);

  useEffect(() => {
    if (!supabase || !selected) return;

    const leadId = selected.id;
    Promise.all([
      supabase.from("lead_notes").select("id,lead_id,body,created_at").eq("lead_id", leadId).order("created_at", { ascending: false }),
      supabase.from("lead_tasks").select("id,lead_id,title,due_date,is_complete,created_at").eq("lead_id", leadId).order("created_at", { ascending: false }),
      supabase.from("lead_activities").select("id,lead_id,kind,description,created_at").eq("lead_id", leadId).order("created_at", { ascending: false }),
      supabase.from("lead_emails").select("id,lead_id,recipient,subject,body,status,created_at").eq("lead_id", leadId).order("created_at", { ascending: false }),
    ]).then(([noteResult, taskResult, activityResult, emailResult]) => {
      if (noteResult.error || taskResult.error || activityResult.error || emailResult.error) {
        setLeadActionMessage(noteResult.error?.message ?? taskResult.error?.message ?? activityResult.error?.message ?? emailResult.error?.message ?? "Could not load CRM history.");
        return;
      }
      setNotes(noteResult.data as LeadNote[]);
      setTasks(taskResult.data as LeadTask[]);
      setActivities(activityResult.data as LeadActivity[]);
      setEmails(emailResult.data as LeadEmail[]);
    });
  }, [selected]);

  const visibleLeads = useMemo(() => leads.filter((lead) => {
    const matchesFilter = filter === "All" || lead.temperature === filter;
    const haystack = `${lead.name} ${lead.email} ${lead.location} ${lead.source}`.toLowerCase();
    return matchesFilter && haystack.includes(query.toLowerCase());
  }), [filter, leads, query]);

  const avgScore = leads.length ? Math.round(leads.reduce((sum, lead) => sum + lead.score, 0) / leads.length) : 0;
  const hotLeads = leads.filter((lead) => lead.temperature === "Hot").length;
  const qualified = leads.filter((lead) => lead.status === "Qualified").length;

  const viewCopy: Record<Exclude<WorkspaceView, "overview" | "leads" | "pipeline">, { title: string; description: string }> = {
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

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    setAuthMessage("Connecting securely...");
    const data = new FormData(event.currentTarget);
    const credentials = { email: String(data.get("email")), password: String(data.get("password")) };
    const result = authMode === "signin"
      ? await supabase.auth.signInWithPassword(credentials)
      : await supabase.auth.signUp({
          ...credentials,
          options: { emailRedirectTo: window.location.origin },
        });
    if (result.error) setAuthMessage(result.error.message);
    else if (authMode === "signup" && !result.data.session) setAuthMessage("Check your email to confirm the account, then sign in.");
    else setAuthMessage("");
  }

  async function signOut() {
    if (!supabase) return;
    setUserId("");
    setUserEmail("");
    setLeads([]);
    setSelected(null);
    setAuthMessage("");
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) setAuthMessage(error.message);
  }

  async function addLead(event: FormEvent<HTMLFormElement>) {
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
      pipeline_stage: "New",
      updated: "Just now",
    };
    setSavingLead(true);
    const result = await supabase!.from("leads").insert({ ...newLead, id: undefined, user_id: userId }).select("id,name,email,source,budget,timeline,property,location,score,temperature,intent,status,pipeline_stage,updated").single();
    setSavingLead(false);
    if (result.error) {
      setAuthMessage(result.error.message);
      return;
    }
    const savedLead = result.data as Lead;
    setLeads((current) => [savedLead, ...current]);
    setSelected(savedLead);
    setShowForm(false);
  }

  async function prepareCsv(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setCsvLeads([]);
    setCsvErrors([]);
    setImportMessage("");
    if (!file) return;
    setCsvFileName(file.name);

    const rows = parseCsv(await file.text());
    if (rows.length < 2) {
      setCsvErrors(["The file needs a header row and at least one lead."]);
      return;
    }

    const headers = rows[0].map((header) => header.trim().toLowerCase().replaceAll(" ", "_"));
    const missing = csvColumns.filter((column) => !headers.includes(column));
    if (missing.length) {
      setCsvErrors([`Missing required column${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}.`]);
      return;
    }

    const prepared: LeadInsert[] = [];
    const errors: string[] = [];
    rows.slice(1).forEach((values, rowIndex) => {
      const valueFor = (column: typeof csvColumns[number]) => values[headers.indexOf(column)]?.trim() ?? "";
      const name = valueFor("name");
      const email = valueFor("email");
      const budget = Number(valueFor("budget").replaceAll(/[$,]/g, ""));
      const timeline = valueFor("timeline");
      const property = valueFor("property");
      const location = valueFor("location");
      const source = valueFor("source");
      const rowNumber = rowIndex + 2;

      if (!name || !email || !property || !location || !source) errors.push(`Row ${rowNumber}: complete every required field.`);
      else if (!/^\S+@\S+\.\S+$/.test(email)) errors.push(`Row ${rowNumber}: email is not valid.`);
      else if (!Number.isFinite(budget) || budget < 50000) errors.push(`Row ${rowNumber}: budget must be at least 50000.`);
      else if (!allowedTimelines.has(timeline)) errors.push(`Row ${rowNumber}: timeline must be 0-30 days, 1-3 months, 3-6 months, or 6+ months.`);
      else {
        const score = scoreLead(budget, timeline, source);
        prepared.push({
          name, email, budget, timeline, property, location, source, score,
          temperature: getTemperature(score),
          intent: timeline === "0-30 days" ? "High purchase intent detected" : "Exploring suitable property options",
          status: score >= 80 ? "Qualified" : "Nurture",
          pipeline_stage: "New",
          updated: "Just now",
        });
      }
    });
    setCsvLeads(prepared);
    setCsvErrors(errors.slice(0, 8));
  }

  async function importCsvLeads() {
    if (!supabase || !userId || !csvLeads.length || csvErrors.length) return;
    setImportingCsv(true);
    setImportMessage("");
    const rows = csvLeads.map((lead) => ({ ...lead, user_id: userId }));
    const result = await supabase.from("leads").insert(rows).select("id,name,email,source,budget,timeline,property,location,score,temperature,intent,status,pipeline_stage,updated");
    setImportingCsv(false);
    if (result.error) {
      setImportMessage(result.error.message);
      return;
    }
    const saved = result.data as Lead[];
    setLeads((current) => [...saved, ...current]);
    setImportMessage(`${saved.length} lead${saved.length === 1 ? "" : "s"} imported, scored, and saved.`);
    setCsvLeads([]);
    setCsvFileName("");
  }

  async function recordActivity(leadId: number, kind: LeadActivity["kind"], description: string) {
    if (!supabase || !userId) return;
    const result = await supabase.from("lead_activities").insert({ lead_id: leadId, user_id: userId, kind, description }).select("id,lead_id,kind,description,created_at").single();
    if (!result.error && selected?.id === leadId) setActivities((current) => [result.data as LeadActivity, ...current]);
  }

  async function moveLead(lead: Lead, pipelineStage: PipelineStage) {
    if (!supabase || lead.pipeline_stage === pipelineStage) return;
    setLeadActionMessage("Updating pipeline...");
    const result = await supabase.from("leads").update({ pipeline_stage: pipelineStage, updated: "Just now" }).eq("id", lead.id).select("id,name,email,source,budget,timeline,property,location,score,temperature,intent,status,pipeline_stage,updated").single();
    if (result.error) {
      setLeadActionMessage(result.error.message);
      return;
    }
    const updatedLead = result.data as Lead;
    setLeads((current) => current.map((item) => item.id === lead.id ? updatedLead : item));
    if (selected?.id === lead.id) setSelected(updatedLead);
    setLeadActionMessage(`Moved to ${pipelineStage}.`);
    await recordActivity(lead.id, "stage_changed", `Pipeline stage changed from ${lead.pipeline_stage} to ${pipelineStage}.`);
  }

  async function addNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !selected || !userId) return;
    const form = event.currentTarget;
    const body = String(new FormData(form).get("note")).trim();
    if (!body) return;
    const result = await supabase.from("lead_notes").insert({ lead_id: selected.id, user_id: userId, body }).select("id,lead_id,body,created_at").single();
    if (result.error) {
      setLeadActionMessage(result.error.message);
      return;
    }
    setNotes((current) => [result.data as LeadNote, ...current]);
    form.reset();
    setLeadActionMessage("Note saved.");
    await recordActivity(selected.id, "note_added", "A private note was added.");
  }

  async function addTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !selected || !userId) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const title = String(data.get("task")).trim();
    const dueDate = String(data.get("due_date")) || null;
    if (!title) return;
    const result = await supabase.from("lead_tasks").insert({ lead_id: selected.id, user_id: userId, title, due_date: dueDate }).select("id,lead_id,title,due_date,is_complete,created_at").single();
    if (result.error) {
      setLeadActionMessage(result.error.message);
      return;
    }
    setTasks((current) => [result.data as LeadTask, ...current]);
    form.reset();
    setLeadActionMessage("Task created.");
    await recordActivity(selected.id, "task_added", `Task created: ${title}`);
  }

  async function toggleTask(task: LeadTask) {
    if (!supabase || !selected) return;
    const result = await supabase.from("lead_tasks").update({ is_complete: !task.is_complete }).eq("id", task.id).select("id,lead_id,title,due_date,is_complete,created_at").single();
    if (result.error) {
      setLeadActionMessage(result.error.message);
      return;
    }
    setTasks((current) => current.map((item) => item.id === task.id ? result.data as LeadTask : item));
    if (!task.is_complete) await recordActivity(selected.id, "task_completed", `Task completed: ${task.title}`);
  }

  function prepareEmail(template: "viewing" | "options" | "check-in") {
    if (!selected) return;
    const firstName = selected.name.split(" ")[0];
    const templates = {
      viewing: {
        subject: `Let’s arrange your ${selected.property} viewing`,
        body: `Hi ${firstName},\n\nThank you for your interest in a ${selected.property} in ${selected.location}. I’d be happy to arrange a viewing and share the best available options within your ${money.format(selected.budget)} budget.\n\nWould you be available for a quick call today?\n\nBest regards,\nMuhammad`,
      },
      options: {
        subject: `${selected.property} options selected for you`,
        body: `Hi ${firstName},\n\nI’ve shortlisted several ${selected.property} options in ${selected.location} that match your requirements and buying timeline.\n\nReply with a convenient time and I’ll walk you through the strongest opportunities.\n\nBest regards,\nMuhammad`,
      },
      "check-in": {
        subject: `Checking in on your property search`,
        body: `Hi ${firstName},\n\nI wanted to check whether you are still exploring property options in ${selected.location}. I can send an updated shortlist based on current availability.\n\nPlease let me know what would be most helpful.\n\nBest regards,\nMuhammad`,
      },
    };
    setEmailSubject(templates[template].subject);
    setEmailBody(templates[template].body);
    setLeadActionMessage("Email template prepared. Review it before sending.");
  }

  async function sendEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !selected || sendingEmail) return;
    setSendingEmail(true);
    setLeadActionMessage("Sending email securely...");
    const { data } = await supabase.auth.getSession();
    const response = await fetch("/api/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token ?? ""}` },
      body: JSON.stringify({ leadId: selected.id, subject: emailSubject, body: emailBody }),
    });
    const result = await response.json() as { email?: LeadEmail; error?: string; demo?: boolean };
    setSendingEmail(false);
    if (!response.ok || !result.email) {
      setLeadActionMessage(result.error ?? "Email could not be sent.");
      return;
    }
    setEmails((current) => [result.email!, ...current]);
    setActivities((current) => [{ id: Date.now(), lead_id: selected.id, kind: "email_sent", description: result.demo ? `Demo email saved: ${emailSubject}` : `Email sent: ${emailSubject}`, created_at: new Date().toISOString() }, ...current]);
    setEmailSubject("");
    setEmailBody("");
    setLeadActionMessage(result.demo ? `Demo email saved for ${selected.email}. No external email was sent.` : `Email sent to ${selected.email}.`);
  }

  async function updateLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !selected) return;
    const data = new FormData(event.currentTarget);
    const budget = Number(data.get("budget"));
    const timeline = String(data.get("timeline"));
    const source = String(data.get("source"));
    const score = scoreLead(budget, timeline, source);
    const updates = {
      name: String(data.get("name")), email: String(data.get("email")), budget, timeline,
      property: String(data.get("property")), location: String(data.get("location")), source,
      score, temperature: getTemperature(score), status: score >= 80 ? "Qualified" : "Nurture", updated: "Just now",
    };
    const result = await supabase.from("leads").update(updates).eq("id", selected.id).select("id,name,email,source,budget,timeline,property,location,score,temperature,intent,status,pipeline_stage,updated").single();
    if (result.error) {
      setLeadActionMessage(result.error.message);
      return;
    }
    const updatedLead = result.data as Lead;
    setLeads((current) => current.map((lead) => lead.id === updatedLead.id ? updatedLead : lead));
    setSelected(updatedLead);
    setShowEdit(false);
    setLeadActionMessage("Lead details updated.");
    await recordActivity(updatedLead.id, "updated", "Lead contact and qualification details were updated.");
  }

  async function deleteLead() {
    if (!supabase || !selected || !window.confirm(`Delete ${selected.name} and all related CRM history?`)) return;
    const leadId = selected.id;
    const result = await supabase.from("leads").delete().eq("id", leadId);
    if (result.error) {
      setLeadActionMessage(result.error.message);
      return;
    }
    setLeads((current) => current.filter((lead) => lead.id !== leadId));
    setSelected(null);
    setLeadActionMessage("");
  }

  if (!isSupabaseConfigured) return <main className="auth-shell"><section className="auth-card"><span className="brand-mark">LQ</span><p className="eyebrow">SETUP REQUIRED</p><h1>Connect Supabase</h1><p>Add <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to start the secure workspace.</p></section></main>;

  if (!authReady) return <main className="auth-shell"><section className="auth-card"><span className="brand-mark">LQ</span><h1>Loading secure workspace...</h1></section></main>;

  if (!userId) return <main className="auth-shell"><section className="auth-card"><span className="brand-mark">LQ</span><p className="eyebrow">SECURE WORKSPACE</p><h1>{authMode === "signin" ? "Welcome back" : "Create your account"}</h1><p>{authMode === "signin" ? "Sign in to access your private lead pipeline." : "Create a protected LeadIQ AI workspace in seconds."}</p><form onSubmit={submitAuth}><label>Email address<input name="email" type="email" required placeholder="you@example.com" /></label><label>Password<input name="password" type="password" minLength={6} required placeholder="At least 6 characters" /></label><button className="primary-button">{authMode === "signin" ? "Sign in" : "Create account"}</button></form>{authMessage && <div className="auth-message" role="status">{authMessage}</div>}<button className="auth-switch" onClick={() => { setAuthMode(authMode === "signin" ? "signup" : "signin"); setAuthMessage(""); }}>{authMode === "signin" ? "Need an account? Sign up" : "Already registered? Sign in"}</button><small>Recruiter demo credentials will be listed in the project README after setup.</small></section></main>;

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">LQ</span><span>LeadIQ <b>AI</b></span></div>
        <p className="workspace-label">WORKSPACE</p>
        <nav aria-label="Main navigation">
          <button className={`nav-item ${activeView === "overview" ? "active" : ""}`} onClick={() => setActiveView("overview")}><span>⌁</span>Overview</button>
          <button className={`nav-item ${activeView === "leads" ? "active" : ""}`} onClick={() => setActiveView("leads")}><span>◎</span>Lead intelligence <em>{leads.length}</em></button>
          <button className={`nav-item ${activeView === "pipeline" ? "active" : ""}`} onClick={() => setActiveView("pipeline")}><span>▤</span>Sales pipeline</button>
          <button className={`nav-item ${activeView === "automations" ? "active" : ""}`} onClick={() => setActiveView("automations")}><span>↗</span>Automations</button>
          <button className={`nav-item ${activeView === "sources" ? "active" : ""}`} onClick={() => setActiveView("sources")}><span>◇</span>Sources</button>
          <button className={`nav-item ${activeView === "analytics" ? "active" : ""}`} onClick={() => setActiveView("analytics")}><span>▦</span>Analytics</button>
        </nav>
        <div className="sidebar-spacer" />
        <div className="ai-health"><span className="pulse" /><div><strong>AI engine online</strong><small>Last sync 24 sec ago</small></div></div>
        <button className={`nav-item ${activeView === "settings" ? "active" : ""}`} onClick={() => setActiveView("settings")}><span>⚙</span>Settings</button>
        <div className="profile"><span className="avatar">MD</span><div><strong>{userEmail.split("@")[0]}</strong><small>Authenticated workspace</small></div><button className="profile-logout" onClick={signOut}>Sign out</button></div>
      </aside>

      <section className="content">
        <header className="topbar">
          <div><p className="eyebrow">LEAD INTELLIGENCE PLATFORM</p><h1>Good afternoon, Muhammad</h1><p>Here is how your pipeline is performing today.</p></div>
          <div className="top-actions"><button className="icon-button" aria-label="Notifications" aria-expanded={showNotifications} onClick={() => setShowNotifications((current) => !current)}>♢<span /></button><button className="primary-button" onClick={() => setShowForm(true)}>＋ Qualify new lead</button></div>
        </header>

        {showNotifications && <section className="notification-panel" aria-label="Notifications panel"><div className="notification-head"><strong>Notifications</strong><button aria-label="Close notifications" onClick={() => setShowNotifications(false)}>×</button></div><p>{hotLeads} hot lead(s) are ready for immediate follow-up.</p><p>Your AI scoring engine is online and synced with Supabase.</p></section>}

        {activeView === "pipeline" && <section className="workspace-panel pipeline-panel" aria-live="polite">
          <p className="eyebrow">LIVE SALES PIPELINE</p><h2>Move every opportunity toward closing</h2><p>Change stages from each card while LeadIQ keeps the activity history.</p>
          <div className="pipeline-board">{pipelineStages.map((stage) => <section className="pipeline-column" key={stage}><header><strong>{stage}</strong><span>{leads.filter((lead) => lead.pipeline_stage === stage).length}</span></header><div>{leads.filter((lead) => lead.pipeline_stage === stage).map((lead) => <article className="pipeline-card" key={lead.id} onClick={() => setSelected(lead)}><div><strong>{lead.name}</strong><span className={`temp ${lead.temperature.toLowerCase()}`}>{lead.temperature}</span></div><p>{lead.property} · {money.format(lead.budget)}</p><small>{lead.source} · Score {lead.score}</small><label onClick={(event) => event.stopPropagation()}>Stage<select aria-label={`Pipeline stage for ${lead.name}`} value={lead.pipeline_stage} onChange={(event) => moveLead(lead, event.target.value as PipelineStage)}>{pipelineStages.map((option) => <option key={option}>{option}</option>)}</select></label></article>)}</div></section>)}</div>
        </section>}

        {activeView !== "overview" && activeView !== "leads" && activeView !== "pipeline" && <section className="workspace-panel" aria-live="polite">
          <p className="eyebrow">WORKSPACE VIEW</p><h2>{viewCopy[activeView].title}</h2><p>{viewCopy[activeView].description}</p>
          {activeView === "automations" && <div className="workspace-grid"><article><strong>Hot lead alert</strong><p>Instant agent notification for scores of 80 or higher.</p><span>Active</span></article><article><strong>Nurture sequence</strong><p>Property recommendations for Warm and Cold prospects.</p><span>Active</span></article></div>}
          {activeView === "sources" && <div className="workspace-grid">{["Website", "Facebook", "Referral", "Google Ads", "LinkedIn"].map((source) => <article key={source}><strong>{source}</strong><p>{leads.filter((lead) => lead.source === source).length} active lead(s)</p></article>)}</div>}
          {activeView === "analytics" && <div className="workspace-grid"><article><strong>{avgScore}/100</strong><p>Average qualification score</p></article><article><strong>{hotLeads}</strong><p>Leads requiring immediate action</p></article><article><strong>{leads.length ? Math.round((qualified / leads.length) * 100) : 0}%</strong><p>Sales-ready qualification rate</p></article></div>}
          {activeView === "settings" && <div className="workspace-grid"><article><strong>Real-time scoring</strong><p>Enabled for every new lead.</p><span>Enabled</span></article><article><strong>Workspace administrator</strong><p>Muhammad Dawood</p></article></div>}
        </section>}

        <section className="metric-grid" aria-label="Lead metrics">
          <article className="metric-card highlight"><div className="metric-head"><span className="metric-icon">↗</span><span className="trend">+18.2%</span></div><strong>{leads.length * 47}</strong><p>Total leads analyzed</p><small>vs. previous 30 days</small></article>
          <article className="metric-card"><div className="metric-head"><span className="metric-icon orange">◆</span><span className="trend">+{hotLeads}</span></div><strong>{hotLeads}</strong><p>Hot leads</p><small>Ready for immediate follow-up</small></article>
          <article className="metric-card"><div className="metric-head"><span className="metric-icon violet">✓</span><span className="trend">+12.4%</span></div><strong>{leads.length ? Math.round((qualified / leads.length) * 100) : 0}%</strong><p>Qualification rate</p><small>{qualified} leads sales-ready</small></article>
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
            <div className="panel-tools"><label className="search"><span>⌕</span><input aria-label="Search leads" placeholder="Search leads..." value={query} onChange={(e) => { setQuery(e.target.value); setExportUrl(""); }} /></label><button className="secondary-button" onClick={() => { setShowImport(true); setImportMessage(""); }}>↑ Import CSV</button><button className="secondary-button" onClick={exportLeads}>⇩ Export</button>{exportUrl && <a className="download-link" href={exportUrl} download={`leadiq-${filter.toLowerCase()}-leads.csv`}>CSV ready — Download</a>}</div>
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

      {showForm && <div className="modal-backdrop" onMouseDown={() => setShowForm(false)}><section className="modal" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="new-lead-title"><button className="modal-close" onClick={() => setShowForm(false)} aria-label="Close">×</button><span className="modal-kicker">AI QUALIFICATION</span><h2 id="new-lead-title">Analyze a new lead</h2><p>Add the prospect details and LeadIQ will score purchase intent instantly.</p><form onSubmit={addLead}><div className="form-grid"><label>Full name<input name="name" required placeholder="Alex Morgan" /></label><label>Email<input name="email" type="email" required placeholder="alex@example.com" /></label><label>Budget (USD)<input name="budget" type="number" min="50000" required placeholder="450000" /></label><label>Buying timeline<select name="timeline" defaultValue="1-3 months"><option>0-30 days</option><option>1-3 months</option><option>3-6 months</option><option>6+ months</option></select></label><label>Property type<input name="property" required placeholder="2 bedroom apartment" /></label><label>Preferred location<input name="location" required placeholder="Dubai Marina" /></label><label className="full">Lead source<select name="source" defaultValue="Website"><option>Website</option><option>Referral</option><option>Facebook</option><option>Google Ads</option><option>LinkedIn</option></select></label></div><button className="primary-button form-submit" disabled={savingLead}>{savingLead ? "Saving securely..." : "✦ Analyze & qualify lead"}</button></form></section></div>}

      {showImport && <div className="modal-backdrop" onMouseDown={() => setShowImport(false)}><section className="modal import-modal" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="csv-import-title"><button className="modal-close" onClick={() => setShowImport(false)} aria-label="Close">×</button><span className="modal-kicker">BULK QUALIFICATION</span><h2 id="csv-import-title">Import leads from CSV</h2><p>Upload a spreadsheet export. Every valid row will be scored and saved to your secure workspace.</p><a className="template-link" href="/leadiq-import-template.csv" download>Download CSV template</a><label className="csv-drop"><input type="file" accept=".csv,text/csv" onChange={prepareCsv} /><span>↑</span><strong>{csvFileName || "Choose a CSV file"}</strong><small>Required: name, email, budget, timeline, property, location, source</small></label>{csvLeads.length > 0 && <div className="import-summary"><strong>{csvLeads.length} valid lead{csvLeads.length === 1 ? "" : "s"} ready</strong><span>{csvLeads.filter((lead) => lead.temperature === "Hot").length} Hot · {csvLeads.filter((lead) => lead.temperature === "Warm").length} Warm · {csvLeads.filter((lead) => lead.temperature === "Cold").length} Cold</span></div>}{csvErrors.length > 0 && <div className="import-errors" role="alert"><strong>Fix these CSV issues</strong>{csvErrors.map((error) => <p key={error}>{error}</p>)}</div>}{importMessage && <div className="import-message" role="status">{importMessage}</div>}<button className="primary-button form-submit" onClick={importCsvLeads} disabled={!csvLeads.length || csvErrors.length > 0 || importingCsv}>{importingCsv ? "Importing securely..." : `Import ${csvLeads.length || ""} lead${csvLeads.length === 1 ? "" : "s"}`}</button></section></div>}

      {selected && showEdit && <div className="modal-backdrop" onMouseDown={() => setShowEdit(false)}><section className="modal" onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="edit-lead-title"><button className="modal-close" onClick={() => setShowEdit(false)} aria-label="Close">×</button><span className="modal-kicker">CRM RECORD</span><h2 id="edit-lead-title">Edit lead</h2><p>Update the contact and qualification details stored in Supabase.</p><form onSubmit={updateLead}><div className="form-grid"><label>Full name<input name="name" defaultValue={selected.name} required /></label><label>Email<input name="email" type="email" defaultValue={selected.email} required /></label><label>Budget (USD)<input name="budget" type="number" min="50000" defaultValue={selected.budget} required /></label><label>Buying timeline<select name="timeline" defaultValue={selected.timeline}><option>0-30 days</option><option>1-3 months</option><option>3-6 months</option><option>6+ months</option></select></label><label>Property type<input name="property" defaultValue={selected.property} required /></label><label>Preferred location<input name="location" defaultValue={selected.location} required /></label><label className="full">Lead source<select name="source" defaultValue={selected.source}><option>Website</option><option>Referral</option><option>Facebook</option><option>Google Ads</option><option>LinkedIn</option></select></label></div><button className="primary-button form-submit">Save lead changes</button></form></section></div>}

      {selected && <div className="drawer-backdrop" onMouseDown={() => { setSelected(null); setLeadActionMessage(""); }}><aside className="drawer crm-drawer" onMouseDown={(event) => event.stopPropagation()} aria-label="Lead CRM details"><button className="modal-close" onClick={() => { setSelected(null); setLeadActionMessage(""); }} aria-label="Close">×</button><p className="eyebrow">COMPLETE LEAD PROFILE</p><div className="drawer-person"><span>{selected.name.split(" ").map((name) => name[0]).join("").slice(0, 2)}</span><div><h2>{selected.name}</h2><p>{selected.email}</p></div></div>
        <div className="drawer-actions"><button onClick={() => setShowEdit(true)}>Edit lead</button><button className="danger-button" onClick={deleteLead}>Delete</button></div>
        <div className="drawer-score"><div><small>QUALIFICATION SCORE</small><strong>{selected.score}<em>/100</em></strong></div><span className={`temp ${selected.temperature.toLowerCase()}`}>{selected.temperature} lead</span></div>
        <label className="stage-control">Pipeline stage<select value={selected.pipeline_stage} onChange={(event) => moveLead(selected, event.target.value as PipelineStage)}>{pipelineStages.map((stage) => <option key={stage}>{stage}</option>)}</select></label>
        <div className="reason-box"><span>✦</span><div><strong>AI recommendation</strong><p>{selected.score >= 80 ? "Contact this lead within 15 minutes and offer a viewing slot. Their budget and timeline show strong purchase readiness." : "Add this prospect to a tailored nurture sequence and follow up with matching property options."}</p></div></div>
        <dl><div><dt>Budget</dt><dd>{money.format(selected.budget)}</dd></div><div><dt>Timeline</dt><dd>{selected.timeline}</dd></div><div><dt>Property</dt><dd>{selected.property}</dd></div><div><dt>Location</dt><dd>{selected.location}</dd></div><div><dt>Source</dt><dd>{selected.source}</dd></div><div><dt>CRM status</dt><dd>{selected.status}</dd></div></dl>
        {leadActionMessage && <div className="crm-message" role="status">{leadActionMessage}</div>}
        <section className="crm-section email-section"><div className="crm-section-title"><h3>Email outreach</h3><span>{emails.length} saved</span></div><p className="email-demo-note">Demo delivery mode · messages are saved to CRM history but are not sent externally.</p><div className="email-templates"><button type="button" onClick={() => prepareEmail("viewing")}>Viewing invite</button><button type="button" onClick={() => prepareEmail("options")}>Property options</button><button type="button" onClick={() => prepareEmail("check-in")}>Check-in</button></div><form className="email-form" onSubmit={sendEmail}><label>To<input value={selected.email} readOnly /></label><label>Subject<input value={emailSubject} onChange={(event) => setEmailSubject(event.target.value)} required maxLength={240} placeholder="Choose a template or write a subject" /></label><label>Message<textarea value={emailBody} onChange={(event) => setEmailBody(event.target.value)} required maxLength={10000} placeholder="Write a personalized message..." /></label><button disabled={sendingEmail}>{sendingEmail ? "Saving..." : "Save demo email"}</button></form><div className="email-history">{emails.map((email) => <article key={email.id}><div><strong>{email.subject}</strong><small>To {email.recipient} · {new Date(email.created_at).toLocaleString()}</small></div><span className={`email-status ${email.status}`}>{email.status}</span></article>)}{emails.length === 0 && <p className="crm-empty">No email outreach saved for this lead yet.</p>}</div></section>
        <section className="crm-section"><div className="crm-section-title"><h3>Tasks</h3><span>{tasks.filter((task) => !task.is_complete).length} open</span></div><form className="task-form" onSubmit={addTask}><input name="task" required placeholder="Follow up with lead" /><input name="due_date" type="date" aria-label="Task due date" /><button>Add</button></form><div className="crm-list">{tasks.map((task) => <label className={task.is_complete ? "crm-item complete" : "crm-item"} key={task.id}><input type="checkbox" checked={task.is_complete} onChange={() => toggleTask(task)} /><span><strong>{task.title}</strong><small>{task.due_date ? `Due ${task.due_date}` : "No due date"}</small></span></label>)}{tasks.length === 0 && <p className="crm-empty">No tasks yet.</p>}</div></section>
        <section className="crm-section"><div className="crm-section-title"><h3>Private notes</h3><span>{notes.length}</span></div><form className="note-form" onSubmit={addNote}><textarea name="note" required placeholder="Add context for the next follow-up..." /><button>Save note</button></form><div className="crm-list">{notes.map((note) => <article className="crm-item" key={note.id}><span><strong>{note.body}</strong><small>{new Date(note.created_at).toLocaleString()}</small></span></article>)}{notes.length === 0 && <p className="crm-empty">No notes yet.</p>}</div></section>
        <section className="crm-section"><div className="crm-section-title"><h3>Activity</h3><span>{activities.length}</span></div><div className="activity-list">{activities.map((activity) => <article key={activity.id}><i /><div><strong>{activity.description}</strong><small>{new Date(activity.created_at).toLocaleString()}</small></div></article>)}{activities.length === 0 && <p className="crm-empty">Stage changes and actions will appear here.</p>}</div></section>
      </aside></div>}
    </main>
  );
}
