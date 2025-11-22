# Personal Note-Taking App

A lightweight, desktop note-taking application built with Tauri, React, and ProseMirror.

## Tech Stack

- **Frontend**: React 19 + TypeScript
- **Desktop Framework**: Tauri 2 (Rust-based, lightweight alternative to Electron)
- **Editor**: ProseMirror (rich text editing with extensible schema)
- **Styling**: Tailwind CSS v4
- **Build Tool**: Vite 7

## Features

- Rich text editing with ProseMirror
- Undo/redo support (Ctrl/Cmd+Z, Ctrl/Cmd+Y)
- Dark mode support
- Native desktop application
- Fast and lightweight (Tauri uses native OS webview)

## Development

### Prerequisites

- Node.js (v18 or higher)
- Rust (for Tauri)
- npm or yarn

### Setup

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

### Development Server

The app runs on `http://localhost:1420` during development.

## Project Structure

```
.
├── src/                    # React/TypeScript source
│   ├── components/         # React components
│   │   └── Editor.tsx     # ProseMirror editor component
│   ├── App.tsx            # Main app component
│   ├── App.css            # Global styles + Tailwind
│   └── main.tsx           # React entry point
├── src-tauri/             # Tauri Rust backend
│   ├── src/               # Rust source code
│   └── tauri.conf.json    # Tauri configuration
├── public/                # Static assets
└── index.html             # HTML entry point
```

## Roadmap

- [ ] Note persistence (save/load notes)
- [ ] Multiple notes management
- [ ] Search functionality
- [ ] Export notes (markdown, PDF)
- [ ] Rich formatting toolbar
- [ ] Custom themes
- [ ] Tags and organization

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/)
- Extensions:
  - [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode)
  - [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
  - [Tailwind CSS IntelliSense](https://marketplace.visualstudio.com/items?itemName=bradlc.vscode-tailwindcss)

## License

MIT
