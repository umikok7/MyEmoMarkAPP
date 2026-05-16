# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AwesomeMark is a gentle mood journal and daily task tracker for daily reflection. Built with Next.js 16 (App Router), React 19, PostgreSQL with Prisma ORM, and Tailwind CSS v4. Supports PWA install, couple/shared spaces for mood tracking, and time-block scheduling.

## Tech Stack

- **Framework**: Next.js 16 (App Router), React 19
- **Database**: PostgreSQL via Prisma ORM (client generated to `lib/generated/prisma`)
- **Styling**: Tailwind CSS v4 with CSS variables design tokens
- **PWA**: next-pwa (disabled in development)
- **Auth**: Cookie-based sessions (`session_id` cookie), bcrypt password hashing
- **Icons**: lucide-react
- **Toasts**: sonner
- **Charts**: echarts + echarts-for-react
- **DnD**: @dnd-kit/utilities

## Commands

```bash
npm run dev          # Start Next.js dev server (localhost:3000)
npm run dev:api      # Simulate Netlify functions locally (port 9999)
npm run build        # Production build
npm run lint         # ESLint
npx prisma generate  # Regenerate Prisma client after schema changes
npx prisma db push   # Push schema changes to database
npx prisma studio    # Open Prisma Studio (database GUI)
```

## Architecture

### App Shell
`components/app-shell.tsx` wraps all pages with the bottom navigation bar.

### API Pattern
All API routes follow a consistent response format exported from `lib/server/helpers.ts`:
```typescript
ok(data)                    // → { code: 0, msg: "success", errs: "", data }
fail(status, message)      // → { code: 1, msg: message, errs: message, data: null }
getSessionUserId(sessionId) // → user_id | null (checks expiry)
resolveUserId(queryId, sessionId, fallback)  // → prioritizes query > session > fallback
```

### Data Models
- **users** → has many `daily_tasks`, `daily_time_blocks`, `user_sessions`
- **daily_tasks** → per-day tasks with optional pinning (pinned tasks persist across days)
- **daily_time_blocks** → time-range blocks on a specific date (separate scheduling system)
- **mood_records** → individual mood entries with encrypted notes
- **couple_spaces** → shared spaces between two users for joint mood tracking
- **couple_mood_records** → mood entries within a couple space (can be pinned)

### Encryption
Task titles and mood notes are encrypted at rest using functions from `lib/encryption.ts` (encrypt/decrypt). This is handled transparently in API routes.

### Mood Types
Five moods: `happy` (Joy), `calm` (Calm), `anxious` (Worry), `sad` (Blue), `angry` (Heat). Each has a color and icon.

### Client State
`app/page.tsx` is a large client component managing all home state (tasks, moods, UI expansion state). Mood notes are optional.

### Prisma Client
The Prisma client is generated to `lib/generated/prisma/` (not `node_modules`). Import via:
```typescript
import { prisma } from "@/lib/prisma"
```

## Environment Variables

Requires PostgreSQL connection string. Key variables:
- `DATABASE_URL` — PostgreSQL connection string
- `ENCRYPTION_KEY` — encryption key for task/mood encryption
- `NETLIFY` — set to `"true"` to enable Netlify rewrites in next.config.ts