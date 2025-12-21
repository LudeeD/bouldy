# Bouldy - Development Guidelines

## Project Overview

Bouldy is a lightweight desktop note-taking application built with Tauri 2 + React 19 + MDXEditor. The app uses a vault-based system where all notes are stored as markdown files with YAML frontmatter, giving users full control over their data. Features include an MDXEditor-based markdown editor with auto-save, dual-panel layout system, integrated todos, calendar view, and customizable themes.

## Architecture

### Frontend Stack
- **React 19** with TypeScript for UI components
- **Tailwind CSS v4** for styling (using `@import "tailwindcss"` syntax)
- **MDXEditor** (@mdxeditor/editor) for rich markdown editing
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

### MDXEditor
- Uses `@mdxeditor/editor` for rich markdown editing
- Plugins enabled: headings, lists, quotes, thematic breaks, markdown shortcuts, links, toolbar
- Toolbar provides: undo/redo, bold/italic/underline, code toggle, block type select, links, lists
- Auto-save hook with 3-second debounce in `src/features/editor/hooks/useAutoSave.ts`
- Content updates via `editorRef.current?.setMarkdown()` method (not reactive prop)
- Custom styling in `src/styles/App.css` to match brutalist theme

### State Management
- **React Context API** for global state
- `NotesContext` - manages note list, current note, and note operations
- `TodosContext` - manages todo list with auto-save (500ms debounce)
- Both contexts work with vault-based storage via Tauri commands

### File Organization
```
src/
├── features/           # Feature-based modules
│   ├── editor/        # MDXEditor wrapper
│   │   ├── components/ # Editor.tsx
│   │   └── hooks/     # useAutoSave.ts
│   ├── notes/         # Note management
│   │   ├── components/ # RecentNotesBar.tsx
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

### React Performance & Architecture Principles

**CRITICAL: Fix re-render issues with proper component isolation, NOT performance hacks**

When a component re-renders on every keystroke or state change:
1. **DO NOT** reach for `useMemo`, `useCallback`, or `React.memo` as the first solution
2. **DO** identify what state is changing and extract it into a separate component
3. **DO** isolate local UI state (like input values, editing flags) in the component that owns that UI
4. **DO NOT** let parent components hold state that only affects child component UI

**Example Pattern:**
- ❌ WRONG: Parent component has `isEditing` and `inputValue` state, passes to child, uses `useMemo` everywhere
- ✅ RIGHT: Child component owns `isEditing` and `inputValue`, parent only receives callback when done

**Why this matters:**
- Memoization is a band-aid that hides architectural problems
- Proper component boundaries make the app naturally performant
- Code is clearer when state lives close to where it's used
- Re-renders only happen where they should

**Communication patterns:**
- Within a feature: Use direct props/callbacks (e.g., `onSelectNote={loadNote}`)
- Across features: Use Tauri events or React Context
- From Rust: Always use Tauri events

### When Adding Features
1. Follow the feature-based module structure (create new folders under `src/features/`)
2. Make each feature self-contained - load its own data from Tauri, manage own state
3. Integrate with Tauri backend via `invoke()` commands for file system operations
4. Keep components focused and composable - isolate state to the smallest component that needs it
5. Use Tailwind utilities for styling - avoid custom CSS unless necessary
6. Consider Tauri capabilities for native features (file system, dialog, notifications, etc.)

### Dual-Panel System
- App supports two simultaneous panels (left/right)
- Panel types: `editor`, `todos`, `calendar`, `settings`
- Panels are kept mounted but hidden when not active (preserves state)
- Responsive layout: switches to single-panel mode on narrow screens (<1200px)
- MRU (Most Recently Used) tracking determines which panel shows on narrow screens
- Panel activation logic in `App.tsx` handles slot assignment and focus management

### MDXEditor Guidelines
- The editor is managed in `src/features/editor/components/Editor.tsx`
- Content updates must use `editorRef.current?.setMarkdown()` method, not the `markdown` prop (which acts like `defaultValue`)
- Auto-save happens 3 seconds after typing stops via `useAutoSave` hook
- YAML frontmatter is stripped when loading and added back when saving
- Custom styling via `.mdxeditor-custom` class matches brutalist theme
- Always test note switching to ensure content loads correctly

### Adding Tauri Commands
1. Define Rust function in appropriate module under `src-tauri/src/`
2. Export in `src-tauri/src/lib.rs`
3. Add to command list in `src-tauri/src/main.rs`
4. Call from React via `invoke<ReturnType>("command_name", { params })`

### Styling Guidelines
- Use Tailwind utilities first
- Dark mode: use `dark:` prefix for dark mode variants
- Custom CSS only for:
  - MDXEditor styling (`.mdxeditor-custom` class)
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

Working features: Vault-based markdown storage, MDXEditor with auto-save, dual-panel layout (editor/todos/calendar/settings), note management, todo system, 4 themes, responsive design.

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

## Tauri 2 + React Patterns

See `.claude/TAURI_REACT_PATTERNS.md` for learned best practices on:
- Backend-driven UI (Rust as source of truth)
- Theme loading without flash
- Never inventing storage mechanisms
- React UI as "dumb" renderer
- Tauri 2.0 API access patterns

**Core rule**: Rust/Tauri Store owns persistence. React loads from Rust and confirms. localStorage is never for critical persistent state.
