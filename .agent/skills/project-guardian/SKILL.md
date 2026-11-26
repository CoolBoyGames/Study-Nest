---
name: project-guardian
description: Monitors project health, prevents errors, and keeps agent output concise. Use this skill at the start of every task, before and after any code change, whenever a phase is finished, and whenever something fails (build, type, lint, test, runtime, console error). Trigger even if the user does not mention verification, errors, or status.
---

# Project Guardian

Goal: ship working code with minimal errors and minimal tokens. Verify before claiming done.

## 1. Orient (start of every task, max 1 minute)

1. Read `.agent/STATE.md` if it exists; it is the single source of truth. Create it if missing (format in section 6).
2. Read only files the task touches. Do not re-read or re-print unchanged files.
3. State the task in one line and the files you expect to change.

## 2. Before changing code

- Search for existing components, hooks, types, and utils first. Reuse over rewrite.
- Prefer the smallest change that satisfies the task. No speculative features, no dead code, no placeholder logic.
- Add a new dependency only if no existing one or ~20 lines of code can do the job. Pin the version.
- Shared types live in one place; never duplicate a type across client and server.

## 3. Verify gate (after every change set)

Run in order and stop at the first failure. Use the scripts that exist in `package.json`.

1. `typecheck` (`tsc --noEmit`) on client and server
2. `lint`
3. `test` (Vitest); add or update tests for any logic change, especially pure functions such as the SRS scheduler
4. `build`
5. Runtime check: start the app, load the changed feature, confirm no console or server errors

A task is **not done** until all five pass. Never report success from reading code alone.

## 4. Error protocol

When something fails:

1. Read the **first** error only; later errors are often cascades.
2. Identify the root cause in one sentence before editing.
3. Apply one targeted fix, then rerun only the failed step, then the full gate.
4. Same error after 2 attempts: stop guessing. Re-read the relevant file and error, form a different hypothesis, and state it. After 4 total attempts, stop and report the blocker with evidence.
5. Never silence errors: no `any`, `@ts-ignore`, `eslint-disable`, empty `catch`, or deleted tests to get green. Fix the cause.

## 5. Guardrails (always on)

- Strict TypeScript. Validate all API input with zod. Handle loading, empty, and error states in UI.
- Never touch `.env`, secrets, or `node_modules`; never commit keys. Provide `.env.example` instead.
- Do not run destructive commands (`rm -rf`, `git reset --hard`, DB drops) without asking.
- No unrelated refactors or reformatting. Keep diffs small and reviewable.
- Persisted data (SQLite schema, localStorage keys) changes need a migration or a version bump; never silently break existing data.
- Accessibility basics: labels, focus rings, keyboard access, AA contrast.
- Commit after each verified unit of work with a clear message, if git is initialized.

## 6. State file: `.agent/STATE.md`

Keep under 40 lines. Update after each verified task; overwrite stale entries instead of appending.

```
# STATE
Phase: <n> - <name>
Done: <verified features, comma separated>
In progress: <one line>
Known issues: <one line each, with file path>
Commands: dev=<cmd> test=<cmd> build=<cmd>
Decisions: <short, durable choices e.g. "SQLite via better-sqlite3", "SM-2 in /server/srs.ts">
```

## 7. Output rules (token discipline)

- Reply format: **Done / Verified / Issues**, one to three lines each. Nothing else unless asked.
- Reference files by path and show diffs or changed snippets only. Never reprint whole files.
- Do not narrate steps, restate the task, or add pleasantries. No summaries of what the user already knows.
- Batch independent reads and edits into one step instead of many small ones.
- Trim command output: show the failing lines only, not full logs.
- Ask a question only when blocked; otherwise choose a sensible default, state it in one line, and proceed.

## 8. Phase completion checklist

Before saying a phase is complete, confirm:

- [ ] All features in the phase work in the running app
- [ ] Verify gate passes (typecheck, lint, test, build, runtime)
- [ ] No stray `console.log`, TODOs, or unused files/imports
- [ ] README and `.agent/STATE.md` updated
- [ ] Changes committed
