# AGENTS.md

Guidance for coding agents working in the MyFlow repository.

## Project overview

MyFlow is an agentic workflow desktop application built with Electron, React, and TypeScript. Users build a node graph (trigger, agent, tool, end) and run it; the execution engine streams events and logs back to the UI.

MVP scope:

- Node editor with palette, inspector, and canvas (React Flow).
- Save/load workflows as JSON in Electron's `userData` directory.
- Sequential DAG execution with cycle and connectivity validation.
- Ollama as the first LLM provider; additional providers are planned behind the same interface.
- Streaming tokens and per-node run logs.

## Stack

- Electron 45 + electron-vite 6
- React 19 + TypeScript 5.9
- React Flow (`@xyflow/react`) for the graph editor
- Zustand for renderer state
- Tailwind CSS 4 (via `@tailwindcss/vite`)
- Vitest for unit tests
- electron-builder for Windows packaging

## Commands

Run from the repository root:

```powershell
npm install
npm run dev        # Electron + Vite dev server with HMR
npm run build      # Production build to out/
npm run start      # Preview the production build
npm run typecheck  # tsc for node and renderer configs
npm test           # vitest run
npm run package    # Build a Windows NSIS installer
```

## Layout

```
src/
  main/        Electron main process: IPC, workflow storage, execution engine, Ollama client
  preload/     contextBridge API exposed as window.myflow
  renderer/    React app (index.html + src/)
  shared/      Types shared by all processes (types.ts, api.ts)
```

Key files:

- `src/main/engine.ts` — validation, topological sort, templating, node execution.
- `src/main/ollama.ts` — Ollama model listing and streaming chat.
- `src/main/store.ts` — JSON persistence under `app.getPath('userData')/workflows`.
- `src/main/ipc.ts` — IPC handlers and run cancellation.
- `src/preload/index.ts` — typed renderer API surface.
- `src/renderer/src/store/workflow.ts` — graph state, node updates, run event handling.

## Conventions

- Keep all provider calls and secret handling in the main process; never expose keys to the renderer.
- Add IPC channels to `src/shared/api.ts`, implement them in `src/main/ipc.ts`, and expose them in `src/preload/index.ts`.
- Use relative imports (`../shared/...`) in main/preload; `@shared/...` and `@/...` aliases are available in the renderer.
- Node IDs must match `^[a-zA-Z0-9-]+$` because they are used in template references and storage file names.
- Agent prompts support `{{node-id}}` and `{{node-id.json}}` substitutions from prior node outputs.
- Keep engine logic in `src/main/engine.ts` free of Electron imports so it stays unit-testable.
- No comments in source code unless explicitly requested.

## Runtime notes

- Ollama defaults to `http://localhost:11434`; override with the `OLLAMA_URL` environment variable.
- A workflow must contain exactly one trigger node and be fully reachable from it.
- The run `Stop` button aborts the active run through an `AbortController`.

## Verification checklist

1. `npm run typecheck`
2. `npm test`
3. `npm run build`
4. Manual smoke test: start Ollama, run the default trigger → agent → end workflow, confirm streamed tokens and logs.
