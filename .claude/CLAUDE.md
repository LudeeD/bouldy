# Bouldy - Development Guidelines

## Project Overview

Bouldy is a lightweight desktop note-taking application built with Tauri 2 + React 19 + ProseMirror. The app uses a vault-based system where all notes are stored as markdown files with YAML frontmatter, giving users full control over their data. Features include a ProseMirror editor with auto-save, dual-panel layout system, integrated todos, calendar view, and customizable themes.

## Architecture

### Frontend Stack
- **React 19** with TypeScript for UI components
- **Tailwind CSS v4** for styling (using `@import "tailwindcss"` syntax)
- **ProseMirror** for rich text editing
- **markdown-it** for markdown parsing/serialization
- **lucide-react** for icons
- **Vite** as the build tool

### Backend (Rust/Tauri 2)
- **Tauri 2** provides the desktop wrapper and native OS integration
- **Tauri plugins**: fs, dialog, store, opener
- **Rust backend** handles:
  - Vault initialization and migration
  - File system operations (read/write notes, todos)
  - Note metadata extraction
  - Vault structure management (notes/ folder, .todos.md file)

## Key Technical Decisions

### Tailwind CSS v4
- Uses `@import "tailwindcss"` instead of `@tailwind` directives
- No `@apply` directive - use utility classes directly in JSX
- PostCSS plugin: `@tailwindcss/postcss`

### ProseMirror
- Must import `prosemirror-view/style/prosemirror.css` for proper editor behavior
- Custom schema defined in `src/features/editor/utils/schema.ts`
- Markdown parser/serializer using `markdown-it` in `src/features/editor/utils/`
- Undo/redo history plugin enabled
- Auto-save hook with 2-second debounce in `src/features/editor/hooks/useAutoSave.ts`
- Editor toolbar component provides formatting controls

### State Management
- **React Context API** for global state
- `NotesContext` - manages note list, current note, and note operations
- `TodosContext` - manages todo list with auto-save (500ms debounce)
- Both contexts work with vault-based storage via Tauri commands

### File Organization
```
src/
├── features/           # Feature-based modules
│   ├── editor/        # ProseMirror editor
│   │   ├── components/ # Editor.tsx, EditorToolbar.tsx
│   │   ├── hooks/     # useAutoSave.ts
│   │   └── utils/     # schema.ts, markdown-parser.ts, markdown-serializer.ts
│   ├── notes/         # Note management
│   │   ├── components/ # NewNoteDialog.tsx, NoteItem.tsx, RecentNotesBar.tsx
│   │   └── context/   # NotesContext.tsx
│   ├── todos/         # Todo system
│   │   ├── components/ # TodoSpace.tsx
│   │   ├── context/   # TodosContext.tsx
│   │   └── utils/     # todo-parser.ts
│   ├── calendar/      # Calendar view
│   │   └── components/ # CalendarView.tsx
│   ├── settings/      # Settings panel
│   │   └── components/ # SettingsPanel.tsx
│   └── vault/         # Vault selection
│       └── components/ # VaultSelector.tsx
├── shared/            # Shared components
│   └── components/    # Sidebar.tsx, Home.tsx, WindowControls.tsx, ConfirmDialog.tsx
├── types/             # TypeScript type definitions
│   ├── note.ts       # Note, NoteMetadata
│   ├── todo.ts       # TodoItem
│   ├── panel.ts      # PanelType, PanelState
│   └── theme.ts      # Theme
├── styles/           # Global styles and themes
│   ├── App.css      # Tailwind import + custom CSS
│   └── themes.ts    # Theme definitions (midnight, dawn, forest, sunset)
├── App.tsx          # Main app with dual-panel layout logic
└── main.tsx         # React entry point

src-tauri/src/
├── contexts/        # Rust vault context
├── hooks/           # Rust lifecycle hooks
├── types/           # Rust type definitions
├── utils/           # File system utilities
├── lib.rs           # Tauri command exports
└── main.rs          # Tauri app initialization
```

### Vault Structure
```
{vault_path}/
├── notes/           # All markdown notes (created on migration)
│   └── *.md        # Individual note files with YAML frontmatter
└── .todos.md        # Single file for all todos
```

## Development Workflow

### When Adding Features
1. Follow the feature-based module structure (create new folders under `src/features/`)
2. Use React Context for state that needs to be shared across components
3. Integrate with Tauri backend via `invoke()` commands for file system operations
4. Keep components focused and composable
5. Use Tailwind utilities for styling - avoid custom CSS unless necessary
6. Consider Tauri capabilities for native features (file system, dialog, notifications, etc.)

### Dual-Panel System
- App supports two simultaneous panels (left/right)
- Panel types: `editor`, `todos`, `calendar`, `settings`
- Panels are kept mounted but hidden when not active (preserves state)
- Responsive layout: switches to single-panel mode on narrow screens (<1200px)
- MRU (Most Recently Used) tracking determines which panel shows on narrow screens
- Panel activation logic in `App.tsx` handles slot assignment and focus management

### ProseMirror Guidelines
- The editor state is managed in `src/features/editor/components/Editor.tsx`
- Custom schema in `src/features/editor/utils/schema.ts`
- Markdown bidirectional conversion via `markdown-parser.ts` and `markdown-serializer.ts`
- Auto-save happens 2 seconds after typing stops via `useAutoSave` hook
- For custom node types, extend the schema and update markdown serializer/parser
- Always test undo/redo when adding new commands

### Adding Tauri Commands
1. Define Rust function in appropriate module under `src-tauri/src/`
2. Export in `src-tauri/src/lib.rs`
3. Add to command list in `src-tauri/src/main.rs`
4. Call from React via `invoke<ReturnType>("command_name", { params })`

### Styling Guidelines
- Use Tailwind utilities first
- Dark mode: use `dark:` prefix for dark mode variants
- Custom CSS only for:
  - ProseMirror-specific styling (`.ProseMirror` class)
  - Complex animations or interactions
  - Third-party library overrides

### Design System
**Theme System:**
- Themes defined in `src/styles/themes.ts` and `src/styles/App.css`
- Uses CSS custom properties for dynamic theming
- Available themes: `midnight` (default), `dawn`, `forest`, `sunset`
- All use OKLCH color space for perceptually uniform colors
- Theme stored in Tauri store (`settings.json`) and persists across sessions
- Applied via `data-theme` attribute on document root

**Color Variables (defined per theme):**
- `--color-bg` - Main background
- `--color-bg-dark` - Darker background variant
- `--color-bg-light` - Lighter background variant
- `--color-primary` - Primary accent color
- `--color-text` - Body text
- `--color-text-muted` - Muted/secondary text
- `--color-border` - Border colors
- `--color-danger` - Error/delete actions

**Layout Principles:**
- Clean, minimalist brutalist design
- 2px borders (use `border-2`)
- NO rounded corners (never use `rounded-*` classes)
- NO shadows or gradients
- Generous spacing with padding
- Maximum content width: `max-w-6xl` for single panels
- Dotted background pattern via `bg-dots` class

**Typography:**
- System font stack via Tailwind defaults
- Font weights: `font-normal`, `font-medium`, `font-semibold` (avoid `font-bold`)
- Monospace for code and file paths

## Current Status (v0.1.0)

Working features: Vault-based markdown storage, ProseMirror editor with auto-save, dual-panel layout (editor/todos/calendar/settings), note management, todo system, 4 themes, responsive design.

## Common Commands

```bash
# Development
npm run dev           # Start dev server with hot reload

# Building
npm run build         # Build for production
npm run tauri build   # Create distributable desktop app

# Tauri
npm run tauri dev     # Run Tauri desktop app in dev mode
npm run tauri build   # Build desktop app for current platform
```

## Important Notes

- This is a personal project - prioritize simplicity and functionality
- No need for backwards compatibility - always use latest dependencies
- Focus on creating a delightful writing experience
- Performance matters - Tauri apps should feel native and responsive
