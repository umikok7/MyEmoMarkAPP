# AGENTS.md

This document provides guidelines for agentic coding agents operating in this repository.

## Build / Lint / Test Commands

```bash
# Development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Run linting (ESLint)
npm run lint

# Run API functions locally (Netlify)
npm run dev:api
```

**Note:** This project has no test framework configured. Do not write tests unless explicitly requested.

## Project Overview

- **Framework**: Next.js 16.1.4 with App Router
- **Language**: TypeScript 5 (strict mode enabled)
- **Styling**: Tailwind CSS 4 with class-variance-authority
- **UI Components**: Radix UI primitives (Slot, Slider)
- **Icons**: Lucide React
- **Notifications**: Sonner
- **Database**: PostgreSQL (Neon)
- **Deployment**: Vercel / Netlify

## Code Style Guidelines

### Imports

- Use absolute imports with `@/` alias (configured in tsconfig.json)
- Group imports in this order: React, Next.js, third-party, internal components/utils, types
- Use named exports for utilities and components

```typescript
import * as React from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
```

### TypeScript

- Enable strict mode; do not disable it
- Define explicit types for props, state, and function parameters
- Use TypeScript inference where types are obvious
- Avoid `any`; use `unknown` if necessary with proper type guards

```typescript
type TaskItem = {
  id: string
  title: string
  done: boolean
}
```

### React Components

- Use `"use client"` directive for client-side components
- Use named exports for page components
- Use `React.forwardRef` for components that need refs
- Prefix internal helper types with underscore if local-only (e.g., `_LocalType`)

```typescript
"use client"

export default function Home() {
  const [state, setState] = React.useState<Type>(initial)
  // ...
}
```

### Class Names

- Use `cn()` utility from `@/lib/utils` for class merging
- Leverage Tailwind's utility classes for all styling
- Follow existing patterns for variants (see Button component)

```typescript
import { cn } from "@/lib/utils"

<div className={cn("base-class", condition && "conditional-class")} />
```

### Naming Conventions

- **Components**: PascalCase (e.g., `OnboardingGuide`)
- **Variables/Functions**: camelCase (e.g., `handleSave`, `isLoggedIn`)
- **Types**: PascalCase with descriptive names (e.g., `MoodType`, `ServerTaskItem`)
- **Constants**: SCREAMING_SNAKE_CASE for globals, camelCase for locals
- **Files**: kebab-case for utilities, PascalCase for components

### Error Handling

- Wrap async operations in try/catch blocks
- Use `console.error` with descriptive messages
- Show user feedback via toast notifications (Sonner)
- Roll back optimistic updates on failure

```typescript
try {
  const response = await fetch(...)
  if (!response.ok) throw new Error("Failed to save")
} catch (error) {
  console.error("Save error:", error)
  toast("Save failed", { description: "Please try again." })
}
```

### API Routes

- Place routes in `app/api/[resource]/route.ts` or `app/api/[resource]/[id]/route.ts`
- Use standard HTTP methods: GET, POST, PATCH, DELETE
- Return JSON responses with proper structure
- Handle errors with appropriate status codes

### Environment Variables

- Prefix client-side variables with `NEXT_PUBLIC_`
- Server-only variables (database, secrets) without prefix
- Access via `process.env.VARIABLE_NAME`

### UI/UX Guidelines

This project has a custom UI/UX design system. When working on UI tasks:

1. Use the `/ui-ux-pro-max` skill for design recommendations
2. Follow the visual patterns in existing components:
   - Minimal, clean aesthetic with subtle shadows
   - Rounded corners (rounded-2xl, rounded-3xl, rounded-full)
   - Backdrop blur for overlay elements
   - Subtle transitions (150-300ms duration)
   - Muted color palette with accent gradients

3. Common patterns:
   - Floating action buttons with shadow-lg
   - Bottom navigation with safe-area inset handling
   - Gradient backgrounds for mood-based themes
   - Task progress indicators with rounded progress bars

### File Organization

```
app/
  api/           # API routes
  layout.tsx     # Root layout
  page.tsx       # Home page
  [routes]/      # Page routes
components/
  ui/            # Base UI components (Button, Card, Input, etc.)
  *.tsx          # Feature-specific components
lib/
  api.ts         # API URL builder
  utils.ts       # Utility functions (cn, etc.)
types/           # TypeScript type definitions
```

### Special Considerations

- Use `React.useCallback` for expensive operations
- Implement cleanup in `useEffect` (cancelled pattern)
- Handle hydration mismatches with `suppressHydrationWarning` when needed
- Support mobile-first responsive design
- Account for notched devices with `env(safe-area-inset-*)`
