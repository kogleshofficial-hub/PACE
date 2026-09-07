# PACE — Planning Academic Capacity & Effort

**Academic workload, made realistic.**

PACE is a student-focused workload planner built for the CSC Back-to-School Hackathon. It answers a practical question: **what should I work on next, and can I realistically finish everything before it is due?**

## Live

**https://pace-nu-seven.vercel.app/**

## The problem

Students often have a list of assignments but no practical answer to whether the workload actually fits the time they have.

PACE combines:

- assignment and subject context
- due dates
- estimated effort
- priority
- daily study capacity
- seven-day planning
- workload pressure visibility
- explainable next-task recommendations
- automatic rebalancing as work is completed

## How it works

```text
CAPTURE
   ↓
UNDERSTAND
   ↓
ALLOCATE
   ↓
ACT
   ↓
RECALCULATE
```

The planner considers deadlines, estimated effort, priority and available capacity instead of treating every task as an equal checkbox.

## Multi-user architecture

PACE is built as a real multi-user application rather than a shared demo state.

- **Authentication:** Appwrite Account
- **Database:** Appwrite TablesDB
- **User isolation:** every task carries its authenticated `userId`
- **Row permissions:** users receive read/update/delete access only to their own rows
- **Frontend:** Next.js + React + TypeScript
- **Deployment:** Vercel

The application filters task queries by the authenticated user's ID and assigns row-level permissions when tasks are created.

## Technology

- Next.js 15
- React 19
- TypeScript
- Appwrite
- CSS
- Lucide React
- Vercel
- GitHub

## Competition

PACE was developed for the **CSC Back-to-School Hackathon** and submitted as an independently developed project.

The product direction focuses on academic workload, realistic capacity, prioritization and actionable planning.

## Pre-existing foundation disclosure

PACE is an independently developed competition-specific evolution of the author's earlier project, **SYNAPSE**. SYNAPSE established the broader workload-planning concept and some engineering patterns. PACE extends that foundation into a distinct student-focused product with its own interface, authentication, database architecture, per-user permissions, workload workflow and production implementation.

This relationship is disclosed intentionally rather than presenting PACE as an unrelated project built without prior work.

## AI disclosure

AI coding assistants may be used during development for brainstorming, implementation assistance, debugging, documentation and review. The creator remains responsible for understanding, testing and validating the final implementation and competition claims.

## Author

**Koglesh R. Murugan**

Independent student developer · Malaysia

## Links

- **Live:** https://pace-nu-seven.vercel.app/
- **GitHub:** https://github.com/kogleshofficial-hub/PACE
- **Portfolio:** https://koglesh-portfolio.vercel.app/
