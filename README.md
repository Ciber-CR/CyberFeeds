# CyberFeeds

A performance-first, full-featured RSS reader built with Electron, React, and TypeScript.

## Features

- **Feed Support** — RSS, Atom, and XML feeds with automatic discovery
- **Reddit Integration** — Native support for subreddit and user feeds with fallback chain (RSS → JSON API)
- **Background Polling** — Configurable refresh intervals with per-feed and per-folder pause/resume
- **Full-Content Extraction** — Fetches complete article content via worker threads
- **Smart Notifications** — Custom notification window with batching, keyword filtering, snooze, and multi-monitor support
- **System Tray** — Minimize to tray, quick actions menu, activity indicator
- **OPML Import/Export** — Migrate your feeds with folder structure preserved
- **Backup & Restore** — JSON-based backup of feeds, folders, and settings
- **Article Management** — Star, read/unread, soft-delete with 30-day trash auto-purge
- **Multiple Layouts** — Three-panel, two-panel, one-panel, and horizontal-split views
- **Virtualized Lists** — Smooth scrolling for large article libraries
- **Bilingual UI** — English and Spanish
- **Auto Updates** — Built-in update checker with manual download control
- **Keyboard Shortcuts** — Configurable global hotkeys
- **Feed Doctor** — Diagnostic scanner for connectivity and parsing issues

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Electron 34 |
| Build | electron-vite 5 (Vite 6) |
| UI | React 19 + TypeScript 5.9 |
| State | Zustand 5 |
| Database | better-sqlite3 (WAL mode) |
| Parsing | rss-parser, fast-xml-parser, linkedom |
| Virtualization | TanStack Virtual |
| Icons | Lucide React |
| Packaging | electron-builder (NSIS) |

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [npm](https://www.npmjs.com/)

## Installation

```bash
npm install
```

> **Note:** The `postinstall` script automatically rebuilds `better-sqlite3` for the current Electron version.

## Development

```bash
npm run dev
```

Starts the app in development mode with hot reload for both main and renderer processes.

## Build

```bash
# Production build
npm run build

# Build Windows installer
npm run build:win

# Build without installer (directory output)
npm run build:unpack
```

## Code Quality

```bash
# Type checking
npm run typecheck

# Linting
npm run lint

# Formatting
npm run format
```

## Project Structure

```
src/
├── main/                  # Electron main process
│   ├── index.ts           # App initialization, window creation
│   ├── ipc.ts             # IPC channel handlers
│   ├── db.ts              # SQLite database layer
│   ├── feed-parse.ts      # Feed parsing with fallbacks
│   ├── polling.ts         # Background polling orchestration
│   ├── tray.ts            # System tray, shortcuts, context menu
│   ├── notifications.ts   # Custom notifier window
│   ├── updater.ts         # Auto-update lifecycle
│   ├── opml.ts            # OPML import/export
│   └── workers/
│       ├── feed-fetcher.worker.ts      # Parallel feed fetching
│       └── content-extractor.worker.ts # Article content extraction
├── preload/               # Context bridge API
│   └── index.ts           # window.api exposure
├── renderer/              # React application
│   ├── notifier/          # Notification window React app
│   └── src/
│       ├── components/    # UI components
│       ├── hooks/         # Custom React hooks
│       ├── store/         # Zustand stores
│       └── styles/        # Global CSS and themes
└── shared/                # Isolated shared code
    ├── types.ts           # Shared TypeScript interfaces
    ├── translations.ts    # EN/ES UI strings
    └── reddit.ts          # Reddit URL handling
```

## Architecture

- **Worker Threads** — Feed fetching and content extraction run in dedicated workers to keep the main process responsive
- **Optimistic UI** — Article state updates immediately in the renderer, then syncs with the main process
- **CSS Variable Resizing** — Column/row resizing updates DOM directly during drag (zero React re-renders)
- **Context Bridge** — Strict preload API surface with no Node integration in renderer
- **WAL Mode SQLite** — High-performance concurrent reads with write-ahead logging

## License

This project is licensed under the [GNU General Public License v3.0](LICENSE).
