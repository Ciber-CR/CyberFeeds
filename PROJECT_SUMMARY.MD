# CyberFeeds 2.0 - Project Summary

## 📖 Overview
**CyberFeeds 2.0** is a performance-first, modern RSS reader built for power users. Designed from the ground up to handle thousands of articles and hundreds of feeds without slowing down, it offers a premium, cyberpunk-inspired aesthetic combined with blazing-fast data processing.

## 🏗️ Architecture & Technology Stack
*   **Core Framework:** Electron (Node.js backend, Chromium frontend)
*   **Frontend UI:** React 19 + Vite (electron-vite)
*   **State Management:** Zustand (Stores for UI, Feeds, Articles, Settings)
*   **Database:** SQLite (`better-sqlite3`) utilizing WAL (Write-Ahead Logging) mode for concurrent high-speed reads/writes without locking the UI.
*   **Multi-threading:** RSS fetching and parsing are offloaded to **Node.js Worker Threads** (`feed-fetcher.worker.ts`), ensuring the main thread and UI never stutter during heavy network syncs.
*   **Styling:** Pure CSS with CSS Variables for dynamic theming (Dark, Light, Dracula).

## ✨ Core Features
*   **High-Performance Virtualization:** The central article list uses `@tanstack/react-virtual` to render only visible items, allowing instantaneous scrolling through tens of thousands of articles.
*   **Intelligent Notifications:** A custom, non-intrusive floating notification system that stacks organically, features hover-to-pause mechanics, displays original website favicons, and uses a smart anti-spam sound throttle (max 1 `ding` per minute).
*   **Robust Article Viewer:** Secure HTML sanitization via `DOMPurify`. Intercepts internal links seamlessly to open in the user's default external browser, preventing accidental in-app navigation.
*   **Native OS Integration:** Custom vectorized system tray icons, dynamic taskbar icon binding, and native Windows context menus (Copy/Paste/Cut) for text inputs.
*   **Persistent UI State:** User column widths and reading font sizes are saved instantaneously to the local cache, persisting perfectly across app restarts.
*   **Feed Management:** Complete CRUD operations on feeds, including single-feed manual refreshing and URL editing via sleek modal overlays.

## ✅ Final Polishing & Robustness (Latest)
- **Persistent "Doctor" Panel**: Diagnostic scans now persist in `localStorage` with timestamps, providing a long-term health history of feeds.
- **Smart Auto-Discovery**: The engine now handles HTML landing pages by automatically searching for RSS links or testing common paths (e.g., `/rss`, `/feed`).
- **Resilient Parsing**: Added browser-like headers and custom heuristic resolution to bypass anti-bot protections on sites like *Teletica*.
- **Enhanced Add Feed Workflow**: 
  - **Editable Titles**: Users can rename feeds directly in the preview stage before final subscription.
  - **Uncontrolled Input Pattern**: Refactored the title field using `useRef` to prevent interference from external tools (password managers/touch keyboards) and eliminate focus-loss bugs.
  - **Optimized Layout**: Repositioned the "Preview" button next to the URL input for immediate accessibility.
- **UI UX Fixes**: 
  - Moved the "Doctor" icon for better sidebar balance.
  - Implemented window-bounds checking for the sidebar context menu to prevent clipping on bottom-most items.

## 🚀 Recent Major Advancements
1.  **Iconography & Branding Overhaul:** Replaced generic placeholder icons with a custom-generated, high-resolution Purple RSS logo. This branding was hard-linked into the installer (`.exe`), Taskbar, Start Menu, and a custom transparent System Tray icon.
2.  **Native Context Menus:** Exposed Electron's native `Menu` API to the React frontend, allowing standard right-click text operations inside custom UI modals.
3.  **Notification UX Polish:**
    *   Added `onMouseEnter`/`onMouseLeave` logic to freeze notifications from disappearing while the user is reading them.
    *   Truncated long article bodies to a single line using CSS ellipsis.
    *   Fixed data bridging so notifications display the true origin Favicon instead of generic initials.
    *   Notifications now restore the main window even when the app is hidden in the system tray (not just minimized).
    *   Added a "✕ Clear All" button that appears in the floating notifier when 2+ notifications are stacked, allowing instant dismissal of all on-screen alerts with one click.
4.  **Custom Alert Sound Picker:** Added a "Browse…" button in Settings → Notifications allowing the user to select any `.wav`, `.mp3`, or `.ogg` file as the notification sound. Displays the selected filename with a reset button to revert to the system default beep. Sound throttle remains at max 1 alert per minute.
5.  **Database Migration Automation:** Successfully migrated the user's local `cybersfeeds` SQLite databases and preferences to the newly formalized `CyberFeeds` Windows profile.
6.  **Quality of Life:**
    *   Settings panel automatically closes upon saving.
    *   Direct article-opening from notifications.
    *   Progressively increased font sizes in Inbox Today (titles: 15px, timestamps: 13px) and Notification History (feed name: 12px, title: 15px) panels for better readability.
    *   Notification History panel now shows title-only (body removed) for a cleaner, more compact layout.
    *   Internal article links now open in the user's default browser instead of crashing the app.
    *   Article text is now fully selectable with native right-click context menu (Copy, Select All, etc.).
    *   Dracula theme text color softened from pure white (`#f8f8f2`) to a gentler off-white (`#d4d4d4`) for reduced eye strain.
    *   "Clear All" notifier button now uses a solid dark background for better contrast and readability.

## 🔮 Roadmap / Next Steps (Ideas)
*   **Advanced Filtering:** Implement deeper regex-based rules to auto-hide or highlight specific keywords in incoming articles.
*   **Keyboard Navigation:** Add advanced vim-like or standard arrow-key bindings to navigate feeds and articles entirely without a mouse.

## 🕰️ Future Considerations (Low Priority)
*   **Export/Backup:** Full database backup and article exporter (Planned for later, not a current priority).
