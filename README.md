# PACE — Planning Academic Capacity & Effort

**Academic workload, made realistic.**

PACE is a student-focused workload planner designed for the CSC Back-to-School Hackathon. It helps students understand whether their assignments can realistically fit into the study time they have, then surfaces a clear next action.

## The problem

Students often have a list of assignments but no practical answer to: **What should I work on next, and can I realistically finish everything before it is due?**

PACE combines:

- assignment and subject context
- due dates
- estimated effort
- priority
- daily study capacity
- a seven-day planning view
- explainable next-task recommendations
- workload pressure visibility

## Current build

The repository currently contains the competition-specific PACE interface and planning experience. The project is being developed substantially during the CSC Back-to-School Hackathon period.

### Pre-existing foundation disclosure

PACE is an independently developed competition-specific evolution of the author's earlier project, **SYNAPSE**. The earlier project established the general workload-planning concept and some engineering patterns. PACE is not presented as a project built from zero: the prior foundation is disclosed here, while the student-focused product direction, interface, academic workflow, and additional competition development are being developed during the official CSC hackathon period.

This disclosure is intentional and follows the CSC requirement that pre-existing code, projects, designs, datasets, or other major assets be clearly disclosed.

## Privacy architecture

PACE is designed around local-first planning. No account is required for the planning experience, and workload data is not intentionally sent to a PACE server or exposed as a shared student feed. A future production release must preserve this privacy boundary and make any external data processing explicit.

## AI disclosure

AI coding assistants may be used during development for brainstorming, implementation assistance, debugging, documentation, and review. The creator remains responsible for understanding, testing, and validating the final implementation and competition claims.

## Technology

- Next.js
- React
- TypeScript
- CSS
- Browser APIs
- Vercel-ready deployment

## CSC fit

The CSC Back-to-School Hackathon asks students to build technology that solves a real school-life problem. PACE focuses directly on academic workload, scheduling, organization, and realistic study capacity.

## Status

Active competition build. Features are being developed, tested, and hardened during the official hackathon period.
