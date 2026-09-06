"use client";

import { useEffect, useMemo, useState } from "react";

type Priority = "Low" | "Medium" | "High";
type TaskType = "Assignment" | "Exam" | "Project" | "Revision" | "Other";
type Task = { id: string; title: string; subject: string; due: string; minutes: number; priority: Priority; type: TaskType; done: boolean; createdAt: string };
type Settings = { dailyCapacity: number; schoolDaysOnly: boolean; weekendCapacity: number; breakMinutes: number };
type StoredState = { version: 2; tasks: Task[]; settings: Settings; workspaceCreatedAt: string };
type Allocation = { date: string; taskId: string; minutes: number };

const PRIORITY_WEIGHT: Record<Priority, number> = { High: 0, Medium: 1, Low: 2 };
const TASK_TYPES: TaskType[] = ["Assignment", "Exam", "Project", "Revision", "Other"];
const DEFAULT_SETTINGS: Settings = { dailyCapacity: 120, schoolDaysOnly: false, weekendCapacity: 120, breakMinutes: 10 };

function todayKey() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
function addDays(key: string, amount: number) { const [y, m, d] = key.split("-").map(Number); const date = new Date(y, m - 1, d); date.setDate(date.getDate() + amount); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
function dayDiff(from: string, to: string) { const [fy, fm, fd] = from.split("-").map(Number); const [ty, tm, td] = to.split("-").map(Number); return Math.round((new Date(ty, tm - 1, td).getTime() - new Date(fy, fm - 1, fd).getTime()) / 86400000); }
function dateLabel(key: string, short = false) { const [y, m, d] = key.split("-").map(Number); return new Intl.DateTimeFormat(undefined, short ? { month: "short", day: "numeric" } : { weekday: "short", month: "short", day: "numeric" }).format(new Date(y, m - 1, d)); }
function isWeekend(key: string) { const [y, m, d] = key.split("-").map(Number); const day = new Date(y, m - 1, d).getDay(); return day === 0 || day === 6; }
function makeId() { return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`; }

function createStarterTasks(): Task[] { return [
  { id: makeId(), title: "Chemistry Chapter 4 revision", subject: "Chemistry", due: addDays(todayKey(), 3), minutes: 90, priority: "High", type: "Revision", done: false, createdAt: new Date().toISOString() },
  { id: makeId(), title: "History source analysis", subject: "History", due: addDays(todayKey(), 4), minutes: 60, priority: "Medium", type: "Assignment", done: false, createdAt: new Date().toISOString() },
  { id: makeId(), title: "Math practice set", subject: "Mathematics", due: addDays(todayKey(), 6), minutes: 75, priority: "High", type: "Assignment", done: false, createdAt: new Date().toISOString() },
]; }

function planner(tasks: Task[], settings: Settings, today: string) {
  const allocations: Allocation[] = [];
  const remaining = new Map(tasks.filter(t => !t.done).map(t => [t.id, t.minutes]));
  const dueToday = tasks.filter(t => !t.done && t.due < today);
  const maxDay = Math.max(1, ...tasks.filter(t => !t.done).map(t => Math.max(0, dayDiff(today, t.due))));
  for (let offset = 0; offset <= maxDay; offset++) {
    const date = addDays(today, offset);
    const weekend = isWeekend(date);
    if (settings.schoolDaysOnly && weekend) continue;
    let capacity = weekend ? settings.weekendCapacity : settings.dailyCapacity;
    const ordered = [...tasks].filter(t => !t.done && (remaining.get(t.id) ?? 0) > 0 && t.due >= date).sort((a, b) => a.due.localeCompare(b.due) || PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority] || b.minutes - a.minutes || a.createdAt.localeCompare(b.createdAt));
    for (const task of ordered) {
      if (capacity <= 0) break;
      const left = remaining.get(task.id) ?? 0;
      const slice = Math.min(left, capacity);
      if (slice > 0) { allocations.push({ date, taskId: task.id, minutes: slice }); remaining.set(task.id, left - slice); capacity -= slice; }
    }
  }
  const unscheduled = tasks.filter(t => !t.done && (remaining.get(t.id) ?? 0) > 0).map(t => ({ task: t, minutes: remaining.get(t.id) ?? 0 }));
  const total = tasks.filter(t => !t.done).reduce((n, t) => n + t.minutes, 0);
  const scheduled = allocations.reduce((n, a) => n + a.minutes, 0);
  return { allocations, unscheduled, total, scheduled, overdue: dueToday };
}

export default function Home() {
  const [workspaceId, setWorkspaceId] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [newMinutes, setNewMinutes] = useState(45);
  const [newPriority, setNewPriority] = useState<Priority>("Medium");
  const [newType, setNewType] = useState<TaskType>("Assignment");
  const [newDue, setNewDue] = useState(addDays(todayKey(), 3));
  const today = todayKey();

  useEffect(() => {
    const idKey = "pace:workspace-id";
    let id = localStorage.getItem(idKey);
    if (!id) { id = makeId(); localStorage.setItem(idKey, id); }
    setWorkspaceId(id);
    const raw = localStorage.getItem(`pace:workspace:${id}`);
    if (raw) {
      try { const parsed = JSON.parse(raw) as StoredState; if (parsed.version === 2 && Array.isArray(parsed.tasks)) { setTasks(parsed.tasks); setSettings({ ...DEFAULT_SETTINGS, ...parsed.settings }); } else { setTasks(createStarterTasks()); } }
      catch { setTasks(createStarterTasks()); }
    } else setTasks(createStarterTasks());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || !workspaceId) return;
    const payload: StoredState = { version: 2, tasks, settings, workspaceCreatedAt: new Date().toISOString() };
    localStorage.setItem(`pace:workspace:${workspaceId}`, JSON.stringify(payload));
  }, [ready, workspaceId, tasks, settings]);

  useEffect(() => {
    if (!workspaceId) return;
    const onStorage = (event: StorageEvent) => { if (event.key === `pace:workspace:${workspaceId}` && event.newValue) { try { const next = JSON.parse(event.newValue) as StoredState; setTasks(next.tasks); setSettings({ ...DEFAULT_SETTINGS, ...next.settings }); } catch {} } };
    window.addEventListener("storage", onStorage); return () => window.removeEventListener("storage", onStorage);
  }, [workspaceId]);

  const active = useMemo(() => tasks.filter(t => !t.done), [tasks]);
  const plan = useMemo(() => planner(tasks, settings, today), [tasks, settings, today]);
  const nextTask = useMemo(() => {
    const allocation = plan.allocations.find(a => a.date === today && a.minutes > 0);
    if (allocation) return tasks.find(t => t.id === allocation.taskId);
    return [...active].sort((a, b) => a.due.localeCompare(b.due) || PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority] || a.minutes - b.minutes)[0];
  }, [active, plan.allocations, tasks, today]);
  const highPriority = active.filter(t => t.priority === "High").length;
  const pressure = plan.unscheduled.length || plan.overdue.length ? "Needs attention" : plan.total > settings.dailyCapacity * 3 ? "Tight" : "On track";
  const week = Array.from({ length: 7 }, (_, i) => addDays(today, i));
  const totalRemaining = active.reduce((sum, task) => sum + task.minutes, 0);

  function addTask() {
    if (!newTitle.trim() || !newDue) return;
    setTasks(current => [...current, { id: makeId(), title: newTitle.trim(), subject: newSubject.trim() || "General", due: newDue, minutes: Math.max(5, Math.round(newMinutes || 5)), priority: newPriority, type: newType, done: false, createdAt: new Date().toISOString() }]);
    setNewTitle(""); setNewSubject(""); setNewMinutes(45); setNewPriority("Medium"); setNewType("Assignment"); setNewDue(addDays(today, 3)); setShowForm(false);
  }
  function toggleTask(id: string) { setTasks(current => current.map(t => t.id === id ? { ...t, done: !t.done } : t)); }
  function deleteTask(id: string) { setTasks(current => current.filter(t => t.id !== id)); }
  function newWorkspace() { const id = makeId(); localStorage.setItem("pace:workspace-id", id); setWorkspaceId(id); setTasks([]); setSettings(DEFAULT_SETTINGS); setShowTools(false); }
  function exportData() { const blob = new Blob([JSON.stringify({ app: "PACE", version: 2, exportedAt: new Date().toISOString(), tasks, settings }, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "pace-workspace.json"; a.click(); URL.revokeObjectURL(url); }
  function importData(file: File) { const reader = new FileReader(); reader.onload = () => { try { const data = JSON.parse(String(reader.result)); if (!Array.isArray(data.tasks) || !data.settings) throw new Error("Invalid PACE file"); setTasks(data.tasks); setSettings({ ...DEFAULT_SETTINGS, ...data.settings }); setShowTools(false); } catch { alert("That file is not a valid PACE workspace export."); } }; reader.readAsText(file); }

  return <main>
    <header className="topbar"><a className="brand" href="#top" aria-label="PACE home"><span className="brand-mark">P</span><span>PACE</span></a><nav><a href="#plan">Plan</a><a href="#workload">Workload</a><a href="#insights">Insights</a><a href="#how">How it works</a></nav><div className="top-actions"><button className="ghost" onClick={() => setShowTools(v => !v)}>Workspace</button><button className="ghost" onClick={() => setShowForm(true)}>+ Add task</button></div></header>

    <section className="hero" id="top"><div className="eyebrow"><span className="live-dot" /> STUDENT WORKLOAD INTELLIGENCE</div><h1>Academic workload,<br /><em>made realistic.</em></h1><p className="hero-copy">PACE turns assignments, exams, effort, priorities, and the time you actually have into a plan you can realistically follow.</p><div className="hero-actions"><button className="primary" onClick={() => setShowForm(true)}>Build my plan <span>→</span></button><a className="text-link" href="#how">See how PACE works ↓</a></div><div className="hero-note">Private by default · No account required · Your workload stays in this browser</div></section>

    <section className="dashboard" id="plan"><div className="section-heading"><div><span className="kicker">01 / YOUR PLAN</span><h2>A plan that knows your limits.</h2></div><span className={`status ${pressure === "On track" ? "good" : "warn"}`}>● {ready ? pressure : "Loading locally"}</span></div>
      <div className="grid"><article className="panel focus-panel"><div className="panel-label">NEXT UP <span>Recommended</span></div>{nextTask ? <><h3>{nextTask.title}</h3><p className="reason">{plan.allocations.find(a => a.taskId === nextTask.id)?.minutes ?? Math.min(nextTask.minutes, settings.dailyCapacity)} minutes today · {nextTask.priority.toLowerCase()} priority · due {dateLabel(nextTask.due)}.</p><div className="task-meta"><span>{nextTask.subject}</span><span>{nextTask.type}</span><span>{nextTask.minutes} min total</span></div><button className="complete" onClick={() => toggleTask(nextTask.id)}>Mark complete</button></> : <><h3>You’re clear.</h3><p className="reason">No unfinished work is currently in your PACE workspace.</p></>}</article>
        <article className="panel capacity-panel" id="workload"><div className="panel-label">DAILY CAPACITY</div><div className="capacity-number">{settings.dailyCapacity}<small>min / day</small></div><input aria-label="Daily study capacity" type="range" min="30" max="360" step="15" value={settings.dailyCapacity} onChange={e => setSettings(s => ({ ...s, dailyCapacity: Number(e.target.value) }))} /><div className="range-labels"><span>30m</span><span>360m</span></div><p><strong>{totalRemaining} minutes</strong> remain across {active.length} active {active.length === 1 ? "item" : "items"}. PACE allocates work across your available days instead of pretending every day is unlimited.</p></article></div>

      <div className="week-head"><div><span className="kicker">SEVEN-DAY PLAN</span><h3>What fits, day by day.</h3></div><div className="pressure"><span /> {plan.scheduled}m scheduled · {plan.unscheduled.reduce((n, x) => n + x.minutes, 0)}m unscheduled</div></div>
      <div className="week-grid">{week.map((date, index) => { const dayItems = plan.allocations.filter(a => a.date === date); const used = dayItems.reduce((n, a) => n + a.minutes, 0); const cap = isWeekend(date) ? settings.weekendCapacity : settings.dailyCapacity; return <div className={`day ${index === 0 ? "today" : ""}`} key={date}><div className="day-title"><span>{index === 0 ? "Today" : dateLabel(date).split(",")[0]}</span><b>{dateLabel(date, true)}</b></div>{dayItems.map(a => { const task = tasks.find(t => t.id === a.taskId); return task ? <button className="mini-task" key={`${a.taskId}-${date}`} onClick={() => toggleTask(task.id)}><i className={task.priority.toLowerCase()} />{task.title}<small>{a.minutes}m</small></button> : null; })}{used < cap && <div className="empty">{cap - used}m open</div>}</div>; })}</div>
    </section>

    <section className="work-section" id="workload"><div className="section-heading"><div><span className="kicker">02 / WORKLOAD</span><h2>Everything, without the noise.</h2></div><span className="count">{active.length} active · {tasks.length - active.length} done</span></div><div className="task-list">{tasks.length === 0 ? <div className="empty-state"><strong>Your workspace is empty.</strong><p>Add your first assignment and PACE will build the schedule around it.</p></div> : tasks.map(task => <div className={`task-row ${task.done ? "done" : ""}`} key={task.id}><button className="check" aria-label={`Mark ${task.title} complete`} onClick={() => toggleTask(task.id)}>{task.done ? "✓" : ""}</button><div className="task-main"><strong>{task.title}</strong><span>{task.subject} · {task.type}</span></div><span className={`priority ${task.priority.toLowerCase()}`}>{task.priority}</span><span className="duration">{task.minutes} min</span><span className="due">{dateLabel(task.due, true)}</span><button className="delete" aria-label={`Delete ${task.title}`} onClick={() => deleteTask(task.id)}>×</button></div>)}</div><button className="add-row" onClick={() => setShowForm(true)}>+ Add another assignment</button></section>

    <section className="insights" id="insights"><div className="section-heading"><div><span className="kicker">03 / REALITY CHECK</span><h2>The stuff a task list doesn’t tell you.</h2></div></div><div className="insight-grid"><article><span>FEASIBILITY</span><strong>{plan.unscheduled.length ? "Not fully schedulable" : "Fits your capacity"}</strong><p>{plan.unscheduled.length ? `${plan.unscheduled.reduce((n, x) => n + x.minutes, 0)} minutes still need a place. Consider starting earlier, lowering task estimates, or increasing available study time.` : "Every unfinished minute currently has a place in the plan before its deadline."}</p></article><article><span>DEADLINE PRESSURE</span><strong>{plan.overdue.length ? `${plan.overdue.length} overdue` : highPriority ? `${highPriority} high-priority` : "Low pressure"}</strong><p>{plan.overdue.length ? "Past-due work is surfaced first so it cannot disappear underneath newer tasks." : "PACE uses due dates and priority together rather than sorting by whichever task you entered most recently."}</p></article><article><span>FOCUS LOAD</span><strong>{Math.round(totalRemaining / 25)} focus blocks</strong><p>PACE estimates 25-minute focus blocks from your remaining workload. This is a planning aid, not a productivity score.</p></article></div></section>

    <section className="how" id="how"><div className="section-heading"><div><span className="kicker">04 / THE METHOD</span><h2>Capture. Understand. Act. Recalculate.</h2></div></div><div className="method-grid"><div><b>01</b><h3>Capture</h3><p>Add work with a deadline, realistic effort estimate, subject, type and priority.</p></div><div><b>02</b><h3>Understand</h3><p>PACE compares your remaining workload against the study capacity you actually set.</p></div><div><b>03</b><h3>Act</h3><p>Get a concrete next task and a day-by-day allocation instead of another giant list.</p></div><div><b>04</b><h3>Recalculate</h3><p>Complete work, change your capacity, or add a deadline. The deterministic plan recalculates immediately.</p></div></div></section>

    <section className="privacy"><div><span className="kicker">BUILT FOR STUDENTS. PRIVATE BY DEFAULT.</span><h2>Your schoolwork is yours.</h2><p>PACE stores its planning state in a browser-local workspace. There is no PACE student database, account system, analytics feed, or shared task board in this build. Separate workspace IDs isolate saved state on the same browser.</p></div><div className="privacy-card"><span>LOCAL-FIRST</span><strong>No student database</strong><small>No shared workload feed · No tracking dashboard · Export or delete your local workspace yourself</small></div></section>

    <footer><div className="brand"><span className="brand-mark">P</span><span>PACE</span></div><span>Planning Academic Capacity &amp; Effort</span><span>Built for the CSC Back-to-School Hackathon · 2026</span></footer>

    {showTools && <div className="tool-popover"><strong>Private workspace</strong><span>Workspace {workspaceId ? workspaceId.slice(0, 8) : "…"}</span><button onClick={exportData}>Export my data</button><label>Import data<input type="file" accept="application/json,.json" onChange={e => e.target.files?.[0] && importData(e.target.files[0])} /></label><button onClick={newWorkspace}>Start a new empty workspace</button><small>PACE does not upload this data to a PACE server.</small></div>}

    {showForm && <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Add assignment" onMouseDown={e => { if (e.target === e.currentTarget) setShowForm(false); }}><div className="modal"><button className="close" aria-label="Close" onClick={() => setShowForm(false)}>×</button><span className="kicker">NEW WORK</span><h2>Add an assignment</h2><p>Give PACE enough context to place it realistically.</p><label>Assignment<input autoFocus value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="e.g. Biology lab report" /></label><label>Subject<input value={newSubject} onChange={e => setNewSubject(e.target.value)} placeholder="e.g. Biology" /></label><div className="form-grid"><label>Due date<input type="date" min={today} value={newDue} onChange={e => setNewDue(e.target.value)} /></label><label>Effort (minutes)<input type="number" min="5" max="10000" value={newMinutes} onChange={e => setNewMinutes(Number(e.target.value))} /></label></div><div className="form-grid"><label>Type<select value={newType} onChange={e => setNewType(e.target.value as TaskType)}>{TASK_TYPES.map(t => <option key={t}>{t}</option>)}</select></label><label>Priority<select value={newPriority} onChange={e => setNewPriority(e.target.value as Priority)}><option>Low</option><option>Medium</option><option>High</option></select></label></div><button className="primary full" onClick={addTask}>Add to my workload →</button></div></div>}
  </main>;
}
