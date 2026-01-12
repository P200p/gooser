# replit.md

## Overview

This is a browser wrapper application with a layer management system. It allows users to inject custom JavaScript, CSS, and bookmarklets into web pages viewed through an iframe-based browser interface. The application supports split-view browsing, drag-and-drop layer reordering, and internationalization with Thai as the default language.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript, using Vite as the build tool
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack React Query for server state management
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming (light/dark mode support)
- **Animations**: Framer Motion for smooth UI transitions
- **Drag & Drop**: @dnd-kit for sortable layer lists
- **Code Editor**: Monaco Editor for editing JavaScript/CSS layer content
- **Internationalization**: react-i18next with Thai (th) as default language, English (en) as alternative

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript with ESM modules
- **API Pattern**: RESTful endpoints defined in `shared/routes.ts` with Zod validation
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **Build**: esbuild for server bundling, Vite for client

### Data Storage
- **Primary Database**: PostgreSQL via Drizzle ORM
- **Schema Location**: `shared/schema.ts`
- **Tables**: 
  - `layers`: Stores user-created JavaScript/CSS/bookmarklet layers with visibility, lock, and auto-run settings
  - `tabs`: Browser tab state for split-view functionality
  - `settings`: User preferences (language, theme)

### Project Structure
```
client/           # React frontend
  src/
    components/   # UI components including shadcn/ui
    hooks/        # Custom React hooks for data fetching
    lib/          # Utilities and i18n setup
    pages/        # Page components
server/           # Express backend
  index.ts        # Entry point
  routes.ts       # API route handlers
  storage.ts      # Database operations
  db.ts           # Database connection
shared/           # Shared between client/server
  schema.ts       # Drizzle database schema
  routes.ts       # API route definitions with Zod schemas
```

### Key Design Patterns
- **Shared Types**: Schema and route definitions shared between frontend and backend via `@shared/*` path alias
- **Type-safe API**: Zod schemas validate both request inputs and response outputs
- **Optimistic Updates**: React Query handles cache invalidation after mutations

## External Dependencies

### Database
- **PostgreSQL**: Primary data store, connection via `DATABASE_URL` environment variable
- **Drizzle Kit**: Database migrations stored in `/migrations` directory, push via `npm run db:push`

### Third-Party Services
- None currently integrated (prepared for potential future additions like Stripe, OpenAI based on package.json dependencies)

### Key NPM Packages
- `drizzle-orm` / `drizzle-zod`: Database ORM and schema validation
- `@tanstack/react-query`: Async state management
- `@dnd-kit/*`: Drag and drop functionality
- `@monaco-editor/react`: Code editing interface
- `framer-motion`: Animation library
- `i18next` / `react-i18next`: Internationalization
- `wouter`: Lightweight client-side routing