# Household MD

A fast, minimal markdown editor and viewer built with [Tauri](https://tauri.app). Opens `.md` files instantly in a clean read view, and switches to a split-pane editor when you need to write.

## Features

- **Read mode** - Opens markdown files in a clean rendered view by default
- **Edit mode** - Split-pane editor with live preview updating as you type
- **Light & dark themes** - Subdued monochrome aesthetic, remembers your preference
- **Syntax highlighting** - Code blocks highlighted for 16+ languages
- **Live reload** - Detects external file changes and updates the view automatically, with a subtle indicator dot
- **Markdown toolbar** - Quick-insert buttons for headings, bold, italic, code, lists, tables, links, and more
- **File associations** - Set as your default `.md` file handler on Windows
- **Frameless window** - Clean custom title bar with no native chrome

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+E` | Toggle edit/read mode |
| `Ctrl+S` | Save |
| `Ctrl+Shift+S` | Save as |
| `Ctrl+O` | Open file |
| `Ctrl+N` | New file |
| `Ctrl+B` | Bold |
| `Ctrl+I` | Italic |
| `Esc` | Switch to read mode |
| `Tab` | Insert 2 spaces |

## Install

Download the latest installer for your platform from [Releases](https://github.com/sahko123/HouseholdMDViewer/releases).

| Platform | Format |
|---|---|
| Windows | `.exe` (NSIS) or `.msi` |
| macOS | `.dmg` (Apple Silicon & Intel) |
| Linux | `.deb` or `.AppImage` |

## Build from Source

Requires [Node.js](https://nodejs.org) and [Rust](https://rustup.rs).

```bash
git clone https://github.com/sahko123/HouseholdMDViewer.git
cd HouseholdMDViewer
npm install
npm run tauri build
```

Installers will be in `src-tauri/target/release/bundle/`.

## Tech Stack

- **Tauri v2** - Lightweight desktop app framework (~5MB exe)
- **Vanilla JS** - No frontend framework
- **marked** - Markdown parsing
- **highlight.js** - Syntax highlighting
- **notify** (Rust) - File system watching
