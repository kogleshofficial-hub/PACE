"use client";

import { useMemo, useState } from "react";

type Task = { id: string; title: string; subject: string; due: string; minutes: number; priority: "Low" | "Medium" | "High"; done: boolean };

const starterTasks: Task[] = [
  { id: "1", title: "Chemistry Chapter 4 revision", subject: "Chemistry", due: "2026-09-09", minutes: 90, priority: "High", done: false },
  { id: "2", title: "History source analysis", subject: "History", due: "2026-09-10", minutes: 60, priority: "Medium", done: false },
  { id: "3", title: "Math practice set", subject: "Mathematics", due: "2026-09-12", minutes: 75, priority: "High", done: false },
];

const days = ["Today", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>(starterTasks);
  const [capacity, setCapacity] = useState(120);
  const [showForm, setShowForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [newMinutes, setNewMinutes] = useState(45);
  const [newPriority, setNewPriority] = useState<Task["priority"]>("Medium");
  const [newDue, setNewDue] = useState("2026-09-12");

  const active = tasks.filter((task) => !task.done);
  const totalMinutes = active.reduce((sum, task) => sum + task.minutes, 0);
  const highPriority = active.filter((task) => task.priority === "High").length;
  const fitDays = Math.ceil(totalMinutes / Math.max(capacity, 1));

  const nextTask = useMemo(() => {
    return [...active].sort((a, b) => {
      const due = a.due.localeCompare(b.due);
      if (due !== 0) return due;
      const priority = { High: 0, Medium: 1, Low: 2 };
      if (priority[a.priority] !== priority[b.priority]) return priority[a.priority] - priority[b.priority];
      return a.minutes - b.minutes;
    })[0];
  }, [active]);

  function addTask() {
    if (!newTitle.trim()) return;
    setTasks((current) => [...current, { id: crypto.randomUUID(), title: newTitle.trim(), subject: newSubject.trim() || "General", due: newDue, minutes: Math.max(5, newMinutes), priority: newPriority, done: false }]);
    setNewTitle("");
    setNewSubject("");
    setNewMinutes(45);
    setNewPriority("Medium");
    setShowForm(false);
  }

  function toggleTask(id: string) {
    setTasks((current) => current.map((task) => task.id === id ? { ...task, done: !task.done } : task));
  }

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#top" aria-label="PACE home"><span className="brand-mark">P</span><span>PACE</span></a>
        <nav><a href="#plan">Plan</a><a href="#workload">Workload</a><a href="#how">How it works</a></nav>
        <button className="ghost" onClick={() => setShowForm(true)}>+ Add task</button>
      </header>

      <section className="hero" id="top">
        <div className="eyebrow"><span className="live-dot" /> STUDENT WORKLOAD INTELLIGENCE</div>
        <h1>Academic workload,<br /><em>made realistic.</em></h1>
        <p className="hero-copy">PACE turns assignments, exams, effort, priorities, and the time you actually have into a plan you can realistically follow.</p>
        <div className="hero-actions"><button className="primary" onClick={() => setShowForm(true)}>Build my plan <span>→</span></button><a className="text-link" href="#how">See how PACE works ↓</a></div>
        <div className="hero-note">Private by default · No account required · Your workload stays in this browser</div>
      </section>

      <section className="dashboard" id="plan">
        <div className="section-heading"><div><span className="kicker">01 / YOUR WEEK</span><h2>A plan that knows your limits.</h2></div><span className="status">● Planning locally</span></div>
        <div className="grid">
          <article className="panel focus-panel">
            <div className="panel-label">NEXT UP <span>Recommended</span></div>
            {nextTask ? <><h3>{nextTask.title}</h3><p className="reason">PACE recommends this because it is <strong>{nextTask.priority.toLowerCase()} priority</strong> and due {nextTask.due}.</p><div className="task-meta"><span>{nextTask.subject}</span><span>{nextTask.minutes} min</span><span>{nextTask.due}</span></div><button className="complete" onClick={() => toggleTask(nextTask.id)}>Mark complete</button></> : <><h3>You’re clear.</h3><p className="reason">No unfinished work is currently in your PACE workspace.</p></>}
          </article>
          <article className="panel capacity-panel" id="workload">
            <div className="panel-label">DAILY CAPACITY</div><div className="capacity-number">{capacity}<small>min / day</small></div>
            <input aria-label="Daily study capacity" type="range" min="30" max="360" step="15" value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} />
            <div className="range-labels"><span>30m</span><span>360m</span></div>
            <p>Your active workload is <strong>{totalMinutes} minutes</strong>. At this capacity, it takes about <strong>{fitDays || 0} study days</strong> to cover.</p>
          </article>
        </div>

        <div className="week-head"><div><span className="kicker">SEVEN-DAY VIEW</span><h3>This is what fits.</h3></div><div className="pressure"><span /> {highPriority} high-priority {highPriority === 1 ? "item" : "items"}</div></div>
        <div className="week-grid">{days.map((day, index) => <div className={`day ${index === 0 ? "today" : ""}`} key={day}><div className="day-title"><span>{day}</span><b>{index === 0 ? "SEP 06" : `SEP ${String(7 + index).padStart(2, "0")}`}</b></div>{index === 0 && active.slice(0, 2).map((task) => <button className="mini-task" key={task.id} onClick={() => toggleTask(task.id)}><i className={task.priority.toLowerCase()} />{task.title}<small>{Math.min(task.minutes, capacity)}m</small></button>)}{index > 0 && active[index - 1] && <button className="mini-task"><i className={active[index - 1].priority.toLowerCase()} />{active[index - 1].title}<small>{Math.min(active[index - 1].minutes, capacity)}m</small></button>} {!active[index - 1] && index > 0 && <div className="empty">Open capacity</div>}</div>)}</div>
      </section>

      <section className="work-section">
        <div className="section-heading"><div><span className="kicker">02 / WORKLOAD</span><h2>Everything, without the noise.</h2></div><span className="count">{active.length} active</span></div>
        <div className="task-list">{tasks.map((task) => <div className={`task-row ${task.done ? "done" : ""}`} key={task.id}><button className="check" aria-label={`Mark ${task.title} complete`} onClick={() => toggleTask(task.id)}>{task.done ? "✓" : ""}</button><div className="task-main"><strong>{task.title}</strong><span>{task.subject}</span></div><span className={`priority ${task.priority.toLowerCase()}`}>{task.priority}</span><span className="duration">{task.minutes} min</span><span className="due">{task.due}</span></div>)}</div>
        <button className="add-row" onClick={() => setShowForm(true)}>+ Add another assignment</button>
      </section>

      <section className="how" id="how"><div className="section-heading"><div><span className="kicker">03 / THE METHOD</span><h2>Capture. Understand. Act. Recalculate.</h2></div></div><div className="method-grid"><div><b>01</b><h3>Capture</h3><p>Add the work you actually need to do: subject, deadline, effort and importance.</p></div><div><b>02</b><h3>Understand</h3><p>PACE compares your workload against the amount of study time you say you really have.</p></div><div><b>03</b><h3>Act</h3><p>Get one clear next action instead of another overwhelming list.</p></div><div><b>04</b><h3>Recalculate</h3><p>Finish something and the plan updates immediately. No stale schedule.</p></div></div></section>

      <section className="privacy"><div><span className="kicker">BUILT FOR STUDENTS. PRIVATE BY DEFAULT.</span><h2>Your schoolwork is yours.</h2><p>PACE does not need an account to plan your workload. The current prototype stores planning data locally in your browser, so separate browsers have separate workspaces.</p></div><div className="privacy-card"><span>LOCAL-FIRST</span><strong>No student database</strong><small>No shared workload feed · No public task data · No unnecessary account</small></div></section>

      <footer><div className="brand"><span className="brand-mark">P</span><span>PACE</span></div><span>Planning Academic Capacity &amp; Effort</span><span>Built for the CSC Back-to-School Hackathon · 2026</span></footer>

      {showForm && <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Add assignment"><div className="modal"><button className="close" onClick={() => setShowForm(false)}>×</button><span className="kicker">NEW WORK</span><h2>Add an assignment</h2><p>Give PACE enough context to place it realistically.</p><label>Assignment<input autoFocus value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="e.g. Biology lab report" /></label><label>Subject<input value={newSubject} onChange={(e) => setNewSubject(e.target.value)} placeholder="e.g. Biology" /></label><div className="form-grid"><label>Due date<input type="date" value={newDue} onChange={(e) => setNewDue(e.target.value)} /></label><label>Effort (minutes)<input type="number" min="5" value={newMinutes} onChange={(e) => setNewMinutes(Number(e.target.value))} /></label></div><label>Priority<select value={newPriority} onChange={(e) => setNewPriority(e.target.value as Task["priority"])}><option>Low</option><option>Medium</option><option>High</option></select></label><button className="primary full" onClick={addTask}>Add to my workload →</button></div></div>}
    </main>
  );
}
