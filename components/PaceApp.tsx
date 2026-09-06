"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AppwriteException, Models } from "appwrite";
import { getAppwriteServices, databaseId, tasksTableId, ID, Permission, Query, Role } from "@/lib/appwrite";

type Priority = "Low" | "Medium" | "High";
type TaskType = "Assignment" | "Exam" | "Project" | "Revision" | "Other";
type Task = { id: string; title: string; subject: string; due: string; minutes: number; priority: Priority; type: TaskType; done: boolean; createdAt: string };
type Settings = { dailyCapacity: number; schoolDaysOnly: boolean; weekendCapacity: number; breakMinutes: number };
type Allocation = { date: string; taskId: string; minutes: number };
type AuthMode = "login" | "signup";

const PRIORITY_WEIGHT: Record<Priority, number> = { High: 0, Medium: 1, Low: 2 };
const TASK_TYPES: TaskType[] = ["Assignment", "Exam", "Project", "Revision", "Other"];
const DEFAULT_SETTINGS: Settings = { dailyCapacity: 120, schoolDaysOnly: false, weekendCapacity: 120, breakMinutes: 10 };
const SETTINGS_KEY = "pace:settings:v3";

function todayKey() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
function addDays(key: string, amount: number) { const [y, m, d] = key.split("-").map(Number); const date = new Date(y, m - 1, d); date.setDate(date.getDate() + amount); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
function dayDiff(from: string, to: string) { const [fy, fm, fd] = from.split("-").map(Number); const [ty, tm, td] = to.split("-").map(Number); return Math.round((new Date(ty, tm - 1, td).getTime() - new Date(fy, fm - 1, fd).getTime()) / 86400000); }
function dateLabel(key: string, short = false) { const [y, m, d] = key.split("-").map(Number); return new Intl.DateTimeFormat(undefined, short ? { month: "short", day: "numeric" } : { weekday: "short", month: "short", day: "numeric" }).format(new Date(y, m - 1, d)); }
function isWeekend(key: string) { const [y, m, d] = key.split("-").map(Number); const day = new Date(y, m - 1, d).getDay(); return day === 0 || day === 6; }
function starterTasks() { const now = new Date().toISOString(); return [
  { title: "Chemistry Chapter 4 revision", subject: "Chemistry", due: addDays(todayKey(), 3), minutes: 90, priority: "High" as Priority, type: "Revision" as TaskType, done: false, createdAt: now },
  { title: "History source analysis", subject: "History", due: addDays(todayKey(), 4), minutes: 60, priority: "Medium" as Priority, type: "Assignment" as TaskType, done: false, createdAt: now },
  { title: "Math practice set", subject: "Mathematics", due: addDays(todayKey(), 6), minutes: 75, priority: "High" as Priority, type: "Assignment" as TaskType, done: false, createdAt: now },
]; }
function planner(tasks: Task[], settings: Settings, today: string) {
  const allocations: Allocation[] = [];
  const remaining = new Map(tasks.filter(t => !t.done).map(t => [t.id, t.minutes]));
  const overdue = tasks.filter(t => !t.done && t.due < today);
  const maxDay = Math.max(1, ...tasks.filter(t => !t.done).map(t => Math.max(0, dayDiff(today, t.due))));
  for (let offset = 0; offset <= maxDay; offset++) {
    const date = addDays(today, offset); if (settings.schoolDaysOnly && isWeekend(date)) continue;
    let capacity = isWeekend(date) ? settings.weekendCapacity : settings.dailyCapacity;
    const ordered = [...tasks].filter(t => !t.done && (remaining.get(t.id) ?? 0) > 0 && t.due >= date).sort((a, b) => a.due.localeCompare(b.due) || PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority] || b.minutes - a.minutes || a.createdAt.localeCompare(b.createdAt));
    for (const task of ordered) { if (capacity <= 0) break; const left = remaining.get(task.id) ?? 0; const slice = Math.min(left, capacity); if (slice > 0) { allocations.push({ date, taskId: task.id, minutes: slice }); remaining.set(task.id, left - slice); capacity -= slice; } }
  }
  const unscheduled = tasks.filter(t => !t.done && (remaining.get(t.id) ?? 0) > 0).map(t => ({ task: t, minutes: remaining.get(t.id) ?? 0 }));
  const total = tasks.filter(t => !t.done).reduce((n, t) => n + t.minutes, 0);
  return { allocations, unscheduled, total, scheduled: allocations.reduce((n, a) => n + a.minutes, 0), overdue };
}
function cleanError(error: unknown) { if (error instanceof AppwriteException) return error.message || "Appwrite returned an error."; if (error instanceof Error) return error.message; return "Something went wrong. Please try again."; }

export default function PaceApp() {
  const { account, tablesDB } = getAppwriteServices();
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [newMinutes, setNewMinutes] = useState(45);
  const [newPriority, setNewPriority] = useState<Priority>("Medium");
  const [newType, setNewType] = useState<TaskType>("Assignment");
  const [newDue, setNewDue] = useState(addDays(todayKey(), 3));
  const today = todayKey();

  async function loadTasks(currentUser: Models.User<Models.Preferences>) {
    const result = await tablesDB.listRows({ databaseId, tableId: tasksTableId, queries: [Query.equal("userId", currentUser.$id), Query.limit(500)] });
    setTasks(result.rows.map((row) => ({ id: row.$id, title: String(row.title), subject: String(row.subject ?? "General"), due: String(row.dueDate ?? today), minutes: Number(row.estimatedMinutes ?? 5), priority: (row.priority ?? "Medium") as Priority, type: (row.type ?? "Assignment") as TaskType, done: Boolean(row.completed), createdAt: String(row.$createdAt) })));
  }

  async function seedStarterTasks(currentUser: Models.User<Models.Preferences>) {
    const existing = await tablesDB.listRows({ databaseId, tableId: tasksTableId, queries: [Query.equal("userId", currentUser.$id), Query.limit(1)] });
    if (existing.total > 0) return;
    for (const task of starterTasks()) {
      await tablesDB.createRow({ databaseId, tableId: tasksTableId, rowId: ID.unique(), data: { userId: currentUser.$id, title: task.title, subject: task.subject, dueDate: `${task.due}T23:59:00.000Z`, estimatedMinutes: task.minutes, difficulty: "medium", completed: false, priority: task.priority, type: task.type }, permissions: [Permission.read(Role.user(currentUser.$id)), Permission.update(Role.user(currentUser.$id)), Permission.delete(Role.user(currentUser.$id))] });
    }
    await loadTasks(currentUser);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const current = await account.get();
        if (!cancelled) setUser(current);
      } catch { if (!cancelled) setUser(null); }
      finally { if (!cancelled) setAuthReady(true); }
    })();
    return () => { cancelled = true; };
  }, [account]);

  useEffect(() => {
    if (!user) { setTasks([]); setReady(false); return; }
    let cancelled = false;
    (async () => {
      setBusy(true); setNotice("");
      try {
        await seedStarterTasks(user);
        await loadTasks(user);
        const raw = localStorage.getItem(`${SETTINGS_KEY}:${user.$id}`);
        if (raw) { try { setSettings({ ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) }); } catch { setSettings(DEFAULT_SETTINGS); } }
        if (!cancelled) setReady(true);
      } catch (error) { if (!cancelled) setNotice(cleanError(error)); }
      finally { if (!cancelled) setBusy(false); }
    })();
    return () => { cancelled = true; };
  }, [user]);

  useEffect(() => { if (user) localStorage.setItem(`${SETTINGS_KEY}:${user.$id}`, JSON.stringify(settings)); }, [settings, user]);

  const active = useMemo(() => tasks.filter(t => !t.done), [tasks]);
  const plan = useMemo(() => planner(tasks, settings, today), [tasks, settings, today]);
  const nextTask = useMemo(() => { const allocation = plan.allocations.find(a => a.date === today && a.minutes > 0); if (allocation) return tasks.find(t => t.id === allocation.taskId); return [...active].sort((a, b) => a.due.localeCompare(b.due) || PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority] || a.minutes - b.minutes)[0]; }, [active, plan.allocations, tasks, today]);
  const pressure = plan.unscheduled.length || plan.overdue.length ? "Needs attention" : plan.total > settings.dailyCapacity * 3 ? "Tight" : "On track";
  const week = Array.from({ length: 7 }, (_, i) => addDays(today, i));
  const totalRemaining = active.reduce((sum, task) => sum + task.minutes, 0);

  async function submitAuth(event: FormEvent) {
    event.preventDefault(); setAuthError(""); setAuthBusy(true);
    try {
      if (authMode === "signup") { await account.create({ userId: ID.unique(), email: authEmail.trim(), password: authPassword, name: authName.trim() || undefined }); }
      await account.createEmailPasswordSession({ email: authEmail.trim(), password: authPassword });
      setUser(await account.get()); setAuthPassword("");
    } catch (error) { setAuthError(cleanError(error)); }
    finally { setAuthBusy(false); }
  }
  async function logout() { setBusy(true); try { await account.deleteSession({ sessionId: "current" }); setUser(null); setTasks([]); setShowTools(false); } catch (error) { setNotice(cleanError(error)); } finally { setBusy(false); } }
  async function addTask() {
    if (!user || !newTitle.trim() || !newDue) return;
    setBusy(true); setNotice("");
    try {
      const row = await tablesDB.createRow({ databaseId, tableId: tasksTableId, rowId: ID.unique(), data: { userId: user.$id, title: newTitle.trim(), subject: newSubject.trim() || "General", dueDate: `${newDue}T23:59:00.000Z`, estimatedMinutes: Math.max(5, Math.round(newMinutes || 5)), difficulty: "medium", completed: false, priority: newPriority, type: newType }, permissions: [Permission.read(Role.user(user.$id)), Permission.update(Role.user(user.$id)), Permission.delete(Role.user(user.$id))] });
      setTasks(current => [...current, { id: row.$id, title: newTitle.trim(), subject: newSubject.trim() || "General", due: newDue, minutes: Math.max(5, Math.round(newMinutes || 5)), priority: newPriority, type: newType, done: false, createdAt: row.$createdAt }]);
      setNewTitle(""); setNewSubject(""); setNewMinutes(45); setNewPriority("Medium"); setNewType("Assignment"); setNewDue(addDays(today, 3)); setShowForm(false);
    } catch (error) { setNotice(cleanError(error)); } finally { setBusy(false); }
  }
  async function toggleTask(id: string) {
    const task = tasks.find(t => t.id === id); if (!task) return;
    setBusy(true); try { await tablesDB.updateRow({ databaseId, tableId: tasksTableId, rowId: id, data: { completed: !task.done } }); setTasks(current => current.map(t => t.id === id ? { ...t, done: !t.done } : t)); } catch (error) { setNotice(cleanError(error)); } finally { setBusy(false); }
  }
  async function deleteTask(id: string) {
    setBusy(true); try { await tablesDB.deleteRow({ databaseId, tableId: tasksTableId, rowId: id }); setTasks(current => current.filter(t => t.id !== id)); } catch (error) { setNotice(cleanError(error)); } finally { setBusy(false); }
  }
  async function resetWorkspace() {
    if (!user || !window.confirm("Reset your PACE workspace? This permanently deletes every task in this account.")) return;
    setBusy(true); try { for (const task of tasks) await tablesDB.deleteRow({ databaseId, tableId: tasksTableId, rowId: task.id }); setTasks([]); setSettings(DEFAULT_SETTINGS); setShowTools(false); } catch (error) { setNotice(cleanError(error)); } finally { setBusy(false); }
  }
  function exportData() { const blob = new Blob([JSON.stringify({ app: "PACE", version: 3, exportedAt: new Date().toISOString(), tasks, settings }, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "pace-workspace.json"; a.click(); URL.revokeObjectURL(url); }
  function importData(file: File) { const reader = new FileReader(); reader.onload = async () => { try { const data = JSON.parse(String(reader.result)); if (!Array.isArray(data.tasks)) throw new Error("Invalid PACE workspace"); for (const raw of data.tasks) { const task = raw as Task; if (!task.title || !task.due) continue; await tablesDB.createRow({ databaseId, tableId: tasksTableId, rowId: ID.unique(), data: { userId: user?.$id, title: String(task.title).slice(0, 255), subject: String(task.subject || "General").slice(0, 100), dueDate: `${task.due}T23:59:00.000Z`, estimatedMinutes: Math.max(5, Number(task.minutes) || 5), difficulty: "medium", completed: Boolean(task.done), priority: (task.priority || "Medium") as Priority, type: (task.type || "Other") as TaskType }, permissions: [Permission.read(Role.user(user!.$id)), Permission.update(Role.user(user!.$id)), Permission.delete(Role.user(user!.$id))] }); } await loadTasks(user!); setSettings({ ...DEFAULT_SETTINGS, ...(data.settings || {}) }); setShowTools(false); } catch (error) { setNotice(cleanError(error)); } }; reader.readAsText(file); }

  if (!authReady) return <main className="auth-shell"><div className="auth-card"><span className="kicker">PACE / SECURE WORKSPACE</span><h1>Loading your workspace.</h1><p>Connecting to your private PACE account…</p></div></main>;
  if (!user) return <main className="auth-shell"><div className="auth-card"><div className="brand auth-brand"><span className="brand-mark">P</span><span>PACE</span></div><span className="kicker">ACADEMIC WORKLOAD INTELLIGENCE</span><h1>{authMode === "login" ? "Welcome back." : "Build your private workspace."}</h1><p>{authMode === "login" ? "Sign in to keep your workload synced to your account." : "Create an account so your tasks belong to you—not this browser."}</p><form onSubmit={submitAuth}><label>Name {authMode === "signup" ? <input value={authName} onChange={e => setAuthName(e.target.value)} placeholder="Your name" autoComplete="name" /> : null}</label><label>Email<input type="email" required value={authEmail} onChange={e => setAuthEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" /></label><label>Password<input type="password" required minLength={8} value={authPassword} onChange={e => setAuthPassword(e.target.value)} placeholder="At least 8 characters" autoComplete={authMode === "login" ? "current-password" : "new-password"} /></label>{authError && <div className="auth-error">{authError}</div>}<button className="primary full" disabled={authBusy}>{authBusy ? "Working…" : authMode === "login" ? "Sign in →" : "Create account →"}</button></form><button className="auth-switch" onClick={() => { setAuthMode(authMode === "login" ? "signup" : "login"); setAuthError(""); }}>{authMode === "login" ? "Need an account? Create one" : "Already have an account? Sign in"}</button><small className="auth-foot">Your PACE tasks are stored in Appwrite with per-user row permissions.</small></div></main>;

  return <main>
    <header className="topbar"><a className="brand" href="#top" aria-label="PACE home"><span className="brand-mark">P</span><span>PACE</span></a><nav><a href="#plan">Plan</a><a href="#workload">Workload</a><a href="#insights">Insights</a><a href="#how">How it works</a></nav><div className="top-actions"><button className="ghost" onClick={() => setShowTools(v => !v)}>Workspace</button><button className="ghost" onClick={() => setShowForm(true)}>+ Add task</button></div></header>
    <section className="hero" id="top"><div className="eyebrow"><span className="live-dot" /> STUDENT WORKLOAD INTELLIGENCE</div><h1>Academic workload,<br /><em>made realistic.</em></h1><p className="hero-copy">PACE turns assignments, exams, effort, priorities, and the time you actually have into a plan you can realistically follow.</p><div className="hero-actions"><button className="primary" onClick={() => setShowForm(true)}>Build my plan <span>→</span></button><a className="text-link" href="#how">See how PACE works ↓</a></div><div className="hero-note">Private per account · Synced securely · {user.name || user.email}</div></section>
    {notice && <div className="notice"><span>{notice}</span><button onClick={() => setNotice("")}>×</button></div>}
    <section className="dashboard" id="plan"><div className="section-heading"><div><span className="kicker">01 / YOUR PLAN</span><h2>A plan that knows your limits.</h2></div><span className={`status ${pressure === "On track" ? "good" : "warn"}`}>● {ready && !busy ? pressure : "Syncing"}</span></div><div className="grid"><article className="panel focus-panel"><div className="panel-label">NEXT UP <span>Recommended</span></div>{nextTask ? <><h3>{nextTask.title}</h3><p className="reason">{plan.allocations.find(a => a.taskId === nextTask.id)?.minutes ?? Math.min(nextTask.minutes, settings.dailyCapacity)} minutes today · {nextTask.priority.toLowerCase()} priority · due {dateLabel(nextTask.due)}.</p><div className="task-meta"><span>{nextTask.subject}</span><span>{nextTask.type}</span><span>{nextTask.minutes} min total</span></div><button className="complete" disabled={busy} onClick={() => toggleTask(nextTask.id)}>Mark complete</button></> : <><h3>You’re clear.</h3><p className="reason">No unfinished work is currently in your PACE workspace.</p></>}</article><article className="panel capacity-panel"><div className="panel-label">DAILY CAPACITY</div><div className="capacity-number">{settings.dailyCapacity}<small>min / day</small></div><input aria-label="Daily study capacity" type="range" min="30" max="360" step="15" value={settings.dailyCapacity} onChange={e => setSettings(s => ({ ...s, dailyCapacity: Number(e.target.value) }))} /><div className="range-labels"><span>30m</span><span>360m</span></div><p><strong>{totalRemaining} minutes</strong> remain across {active.length} active {active.length === 1 ? "item" : "items"}. PACE allocates work across your available days instead of pretending every day is unlimited.</p></article></div><div className="week-head"><div><span className="kicker">SEVEN-DAY PLAN</span><h3>What fits, day by day.</h3></div><div className="pressure"><span /> {plan.scheduled}m scheduled · {plan.unscheduled.reduce((n, x) => n + x.minutes, 0)}m unscheduled</div></div><div className="week-grid">{week.map((date, index) => { const dayItems = plan.allocations.filter(a => a.date === date); const used = dayItems.reduce((n, a) => n + a.minutes, 0); const cap = isWeekend(date) ? settings.weekendCapacity : settings.dailyCapacity; return <div className={`day ${index === 0 ? "today" : ""}`} key={date}><div className="day-title"><span>{index === 0 ? "Today" : dateLabel(date).split(",")[0]}</span><b>{dateLabel(date, true)}</b></div>{dayItems.map(a => { const task = tasks.find(t => t.id === a.taskId); return task ? <button className="mini-task" key={`${a.taskId}-${date}`} onClick={() => toggleTask(task.id)}><i className={task.priority.toLowerCase()} />{task.title}<small>{a.minutes}m</small></button> : null; })}{used < cap && <div className="empty">{cap - used}m open</div>}</div>; })}</div></section>
    <section className="work-section" id="workload"><div className="section-heading"><div><span className="kicker">02 / WORKLOAD</span><h2>Everything, without the noise.</h2></div><span className="count">{active.length} active · {tasks.length - active.length} done</span></div><div className="task-list">{tasks.length === 0 ? <div className="empty-state"><strong>Your workspace is empty.</strong><p>Add your first assignment and PACE will build the schedule around it.</p></div> : tasks.map(task => <div className={`task-row ${task.done ? "done" : ""}`} key={task.id}><button className="check" aria-label={`Mark ${task.title} complete`} onClick={() => toggleTask(task.id)}>{task.done ? "✓" : ""}</button><div className="task-main"><strong>{task.title}</strong><span>{task.subject} · {task.type}</span></div><span className={`priority ${task.priority.toLowerCase()}`}>{task.priority}</span><span className="duration">{task.minutes} min</span><span className="due">{dateLabel(task.due, true)}</span><button className="delete" aria-label={`Delete ${task.title}`} onClick={() => deleteTask(task.id)}>×</button></div>)}</div><button className="add-row" onClick={() => setShowForm(true)}>+ Add another task</button></section>
    <section className="insights" id="insights"><div className="section-heading"><div><span className="kicker">03 / INSIGHTS</span><h2>See the pressure before it becomes panic.</h2></div></div><div className="insight-grid"><article><span>ACTIVE LOAD</span><strong>{totalRemaining} min</strong><p>Total unfinished work currently stored in your private PACE workspace.</p></article><article><span>HIGH PRIORITY</span><strong>{active.filter(t => t.priority === "High").length} items</strong><p>High-priority work is placed ahead of lower-priority tasks when capacity is tight.</p></article><article><span>PLANNING STATUS</span><strong>{pressure}</strong><p>{plan.unscheduled.length ? `${plan.unscheduled.reduce((n, x) => n + x.minutes, 0)} minutes cannot fit before their deadlines.` : "Your current workload fits inside the planning window."}</p></article></div></section>
    <section className="how" id="how"><span className="kicker">04 / METHOD</span><h2>Simple rules. Better decisions.</h2><div className="method-grid"><div><b>01</b><h3>Capture</h3><p>Put the work in once. Title, subject, effort, deadline, priority, and type are enough.</p></div><div><b>02</b><h3>Respect limits</h3><p>Your daily capacity is a constraint, not a suggestion. PACE never assumes infinite study time.</p></div><div><b>03</b><h3>Prioritize</h3><p>Deadline, priority, effort, and available capacity determine what gets scheduled first.</p></div><div><b>04</b><h3>Adjust</h3><p>Change capacity or mark work complete and the seven-day plan recalculates immediately.</p></div></div></section>
    <section className="privacy"><div><span className="kicker">PRIVACY</span><h2>Your workload belongs to your account.</h2><p>PACE now uses Appwrite authentication and a private Tasks table. Every task is tagged to the signed-in account, and each row receives read, update, and delete permissions for its owner only. PACE does not use a shared task board.</p></div><div className="privacy-card"><span>ACCOUNT SECURITY</span><strong>Private by row.</strong><small>Table-level access is limited to creating rows. Row security and owner permissions protect each user's tasks.</small></div></section>
    <footer><span>PACE / Academic workload intelligence</span><button className="footer-account" onClick={logout}>Sign out · {user.name || user.email}</button><span className="footer-credit">Created by Koglesh R. Murugan · Build. Learn. Ship.</span></footer>
    {showTools && <div className="workspace-pop"><div className="panel-label">ACCOUNT WORKSPACE</div><strong>{user.name || user.email}</strong><span>{user.email}</span><button onClick={exportData}>Export workspace</button><label className="file-button">Import workspace<input type="file" accept="application/json,.json" onChange={e => { const file = e.target.files?.[0]; if (file) importData(file); e.currentTarget.value = ""; }} /></label><button className="danger-button" onClick={resetWorkspace}>Reset workspace</button><button className="auth-switch" onClick={logout}>Sign out</button></div>}
    {showForm && <div className="modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setShowForm(false); }}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="add-task-title"><button className="close" aria-label="Close" onClick={() => setShowForm(false)}>×</button><span className="kicker">NEW WORKLOAD ITEM</span><h2 id="add-task-title">Add a task.</h2><p>PACE will place it around your existing workload and capacity.</p><label>Title<input autoFocus value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="e.g. Physics problem set" /></label><div className="form-grid"><label>Subject<input value={newSubject} onChange={e => setNewSubject(e.target.value)} placeholder="Physics" /></label><label>Type<select value={newType} onChange={e => setNewType(e.target.value as TaskType)}>{TASK_TYPES.map(type => <option key={type}>{type}</option>)}</select></label><label>Due date<input type="date" value={newDue} onChange={e => setNewDue(e.target.value)} /></label><label>Minutes<input type="number" min="5" max="1440" step="5" value={newMinutes} onChange={e => setNewMinutes(Number(e.target.value))} /></label><label>Priority<select value={newPriority} onChange={e => setNewPriority(e.target.value as Priority)}><option>Low</option><option>Medium</option><option>High</option></select></label></div><button className="primary full" disabled={busy || !newTitle.trim()} onClick={addTask}>{busy ? "Saving…" : "Add to PACE →"}</button></div></div>}
  </main>;
}
