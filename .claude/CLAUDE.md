# Personal Note-Taking App - Development Guidelines

## Project Overview

This is a personal note-taking application built with Tauri + React + ProseMirror. The goal is to create a simple, fast, and extensible desktop app for taking and managing notes.

## Architecture

### Frontend Stack
- **React 19** with TypeScript for UI components
- **Tailwind CSS v4** for styling (using `@import "tailwindcss"` syntax)
- **ProseMirror** for rich text editing
- **Vite** as the build tool

### Backend
- **Tauri 2** provides the desktop wrapper and native OS integration
- **Rust** backend for potential future features (file system access, local storage, etc.)

## Key Technical Decisions

### Tailwind CSS v4
- Uses `@import "tailwindcss"` instead of `@tailwind` directives
- No `@apply` directive - use utility classes directly in JSX
- PostCSS plugin: `@tailwindcss/postcss`

### ProseMirror
- Must import `prosemirror-view/style/prosemirror.css` for proper editor behavior
- Currently using basic schema with list support
- Undo/redo history plugin enabled
- Base keymap for common editing commands

### File Organization
```
src/
├── components/        # Reusable React components
│   └── Editor.tsx    # ProseMirror editor wrapper
├── App.tsx           # Main application component
├── App.css           # Global styles (Tailwind import + custom CSS)
└── main.tsx          # React entry point
```

## Development Workflow

### When Adding Features
1. Keep the editor component focused and composable
2. ProseMirror extensions should be added as separate plugins
3. Use Tailwind utilities for styling - avoid custom CSS unless necessary
4. Consider Tauri capabilities for native features (file system, notifications, etc.)

### ProseMirror Guidelines
- The editor state is managed in `Editor.tsx`
- Custom plugins should be added to the plugins array in EditorState.create()
- For custom node types, extend the schema
- Always test undo/redo when adding new commands

### Styling Guidelines
- Use Tailwind utilities first
- Dark mode: use `dark:` prefix for dark mode variants
- Custom CSS only for:
  - ProseMirror-specific styling (`.ProseMirror` class)
  - Complex animations or interactions
  - Third-party library overrides

### Design System
**Color Palette - Amber/Warm Theme:**
- Primary: Amber shades (amber-900, amber-800, amber-700, etc.)
- Backgrounds:
  - Light: amber-50 (page), white (cards)
  - Dark: slate-950 (page), slate-900 (cards)
- Borders: 2px solid borders (no rounded corners, no shadows)
- Accent: amber-600 for highlights
- Text:
  - Light mode: amber-900 (headings), slate-700 (body)
  - Dark mode: amber-400 (headings), amber-100 (body)

**Typography:**
- System font stack
- Headings: font-medium or font-semibold (not bold)
- Body: font-normal
- Code: monospace with amber-tinted backgrounds

**Layout Principles:**
- Clean, straight lines (no rounded corners)
- 2px borders for emphasis
- No shadows or gradients
- Generous spacing
- Maximum content width: 4xl (896px)

## Future Considerations

### Planned Features
1. **Note Persistence**
   - Use Tauri's filesystem API to save notes locally
   - Consider using IndexedDB or SQLite for metadata

2. **Multiple Notes**
   - Sidebar with note list
   - Note switching and organization
   - Search across all notes

3. **Rich Formatting**
   - Toolbar for common formatting actions
   - Custom ProseMirror nodes (code blocks, tables, etc.)
   - Markdown export/import

4. **Organization**
   - Tags system
   - Folders/notebooks
   - Favorites/pinned notes

### Technical Debt to Address
- Add proper TypeScript types for ProseMirror state
- Consider state management library if app complexity grows
- Add testing (Vitest for unit tests, Playwright for e2e)
- Error boundaries for graceful error handling

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
